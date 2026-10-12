import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { getAdminServiceClient } from '@/lib/adminAuth';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabaseEnv';
import { initiateStkPush } from './client';
import type { MpesaConfig } from './types';
import { normalizeKenyanPhone } from './phone';
import { generateTransactionReference } from './utils';
import type { InitiateStkPushInput, InitiateStkPushResult } from './types';

export type UserAuthResult =
  | { ok: true; user: User; adminClient: SupabaseClient }
  | { ok: false; status: number; message: string };

export interface PaidJobBenefitInput {
  metadata: Record<string, unknown> | null;
  userId: string | null;
}

export interface PaidJobBenefitResult {
  applied: boolean;
  action?: string;
  jobId?: string;
}

/**
 * Apply a paid job benefit (promote / feature) after a successful M-Pesa payment.
 *
 * Called from the Daraja callback (service role), so it updates jobs directly
 * rather than via the promote_job / feature_job RPCs, which scope to auth.uid().
 * The job is verified to belong to the paying user to prevent cross-user benefits.
 */
export async function applyPaidJobBenefit(
  adminClient: SupabaseClient,
  payment: PaidJobBenefitInput
): Promise<PaidJobBenefitResult> {
  const action = typeof payment.metadata?.action === 'string' ? payment.metadata.action : undefined;
  const jobId = typeof payment.metadata?.jobId === 'string' ? payment.metadata.jobId : undefined;

  if (!action || !jobId) {
    return { applied: false };
  }

  const tier = typeof payment.metadata.tier === 'string' ? payment.metadata.tier : 'basic';
  const durationDays = Math.max(1, Number(payment.metadata.durationDays) || 7);
  const now = new Date();
  const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: job, error: jobError } = await adminClient
    .from('jobs')
    .select('id, user_id')
    .eq('id', jobId)
    .maybeSingle();

  if (jobError || !job) {
    console.warn('[M-Pesa] Benefit job not found', { jobId, error: jobError });
    return { applied: false };
  }

  if (payment.userId && job.user_id && job.user_id !== payment.userId) {
    console.warn('[M-Pesa] Benefit ownership mismatch, skipping', {
      jobId,
      payer: payment.userId,
      owner: job.user_id,
    });
    return { applied: false };
  }

  let error: { message?: string } | null = null;

  if (action === 'promote') {
    const result = await adminClient
      .from('jobs')
      .update({
        is_promoted: true,
        promotion_tier: tier,
        promotion_start_date: now.toISOString(),
        promotion_end_date: endDate,
        updated_at: now.toISOString(),
      })
      .eq('id', jobId);
    error = result.error;
  } else if (action === 'feature') {
    const result = await adminClient
      .from('jobs')
      .update({
        is_featured: true,
        featured_until: endDate,
        updated_at: now.toISOString(),
      })
      .eq('id', jobId);
    error = result.error;
  } else {
    console.warn('[M-Pesa] Unknown benefit action, skipping', { action });
    return { applied: false };
  }

  if (error) {
    console.error('[M-Pesa] Failed to apply paid job benefit', { jobId, action, error });
    return { applied: false };
  }

  console.info('[M-Pesa] Paid job benefit applied', {
    jobId,
    action,
    tier,
    durationDays,
    paymentUser: payment.userId,
  });
  return { applied: true, action, jobId };
}

export async function requireAuthenticatedUser(
  request: NextRequest
): Promise<UserAuthResult> {
  const accessToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!accessToken) {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }

  const userClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }

  return { ok: true, user, adminClient: getAdminServiceClient() };
}

/**
 * Create a PENDING payment row, initiate Daraja STK Push, then store request IDs.
 */
export async function createPendingPaymentAndStkPush(
  adminClient: SupabaseClient,
  input: InitiateStkPushInput,
  config?: MpesaConfig
): Promise<InitiateStkPushResult> {
  const phoneNumber = normalizeKenyanPhone(input.phoneNumber);
  const amount = Math.round(Number(input.amount));

  if (!Number.isFinite(amount) || amount < 1) {
    throw new Error('Amount must be at least 1 KES');
  }

  const description = (input.description || 'CareerSasa payment').trim().slice(0, 100);
  const transactionReference = generateTransactionReference();

  const { data: payment, error: insertError } = await adminClient
    .from('payments')
    .insert({
      provider: 'mpesa',
      transaction_reference: transactionReference,
      amount,
      phone_number: phoneNumber,
      status: 'PENDING',
      description,
      user_id: input.userId || null,
      job_id: input.jobId || null,
      metadata: input.metadata || {},
    })
    .select('id, transaction_reference')
    .single();

  if (insertError || !payment) {
    console.error('[M-Pesa] Failed to create payment row:', insertError);
    throw new Error('Failed to create payment record');
  }

  try {
    const stk = await initiateStkPush(
      {
        amount,
        phoneNumber,
        accountReference: transactionReference,
        transactionDesc: description,
      },
      config
    );

    const { error: updateError } = await adminClient
      .from('payments')
      .update({
        merchant_request_id: stk.MerchantRequestID,
        checkout_request_id: stk.CheckoutRequestID,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('[M-Pesa] Failed to store STK request IDs:', updateError);
    }

    return {
      paymentId: payment.id,
      transactionReference: payment.transaction_reference,
      merchantRequestId: stk.MerchantRequestID,
      checkoutRequestId: stk.CheckoutRequestID,
      customerMessage: stk.CustomerMessage,
      status: 'PENDING',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'STK Push failed';
    await adminClient
      .from('payments')
      .update({
        status: 'FAILED',
        result_desc: message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    throw err;
  }
}
