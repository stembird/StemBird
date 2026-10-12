import { NextRequest, NextResponse } from 'next/server';
import { isValidKenyanPhone, normalizeKenyanPhone, requireAuthenticatedUser } from '@/lib/mpesa';
import { generateTransactionReference } from '@/lib/mpesa/utils';
import { loadMpesaSettings } from '@/lib/pricing/catalog';
import { resolveCheckoutQuote } from '@/lib/pricing/checkout';
import type { MpesaCustomerMethod } from '@/lib/pricing/types';

export const runtime = 'nodejs';

/**
 * POST /api/payments/mpesa/manual
 * Record a Send Money (phone) or Buy Goods (till) payment after the customer pays.
 * Body: { method: 'phone' | 'till', phoneNumber, receiptNumber, sku?, action?, couponCode?, amount?, jobId?, description? }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth.ok === false) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const settings = await loadMpesaSettings(auth.adminClient);
    const body = await request.json().catch(() => ({}));
    const method = body.method === 'till' ? 'till' : 'phone';
    const methodEnabled = method === 'till' ? settings.tillEnabled : settings.phoneEnabled;

    if (!methodEnabled) {
      return NextResponse.json(
        { error: `M-Pesa ${method === 'till' ? 'Buy Goods' : 'Send Money'} is not enabled` },
        { status: 400 }
      );
    }

    if (method === 'till' && !settings.tillNumber) {
      return NextResponse.json(
        { error: 'Buy Goods till number is not configured yet' },
        { status: 400 }
      );
    }

    const phoneNumber = String(body.phoneNumber || body.phone || '').trim();
    if (!phoneNumber || !isValidKenyanPhone(phoneNumber)) {
      return NextResponse.json(
        { error: 'Enter the M-Pesa number you paid from (07XXXXXXXX)' },
        { status: 400 }
      );
    }

    const receiptNumber = String(body.receiptNumber || body.mpesaReceipt || '')
      .trim()
      .toUpperCase();
    if (receiptNumber.length < 6) {
      return NextResponse.json(
        { error: 'Enter the M-Pesa confirmation / receipt code' },
        { status: 400 }
      );
    }

    const jobId = typeof body.jobId === 'string' ? body.jobId : undefined;
    const quoted = await resolveCheckoutQuote(auth.adminClient, {
      sku: body.sku,
      action: body.action,
      tier: body.tier,
      couponCode: body.couponCode,
      jobId,
      amount: body.amount,
    });

    if (quoted.amount < 1) {
      return NextResponse.json({ error: 'Nothing to charge for this item' }, { status: 400 });
    }

    if ((quoted.metadata.action === 'promote' || quoted.metadata.action === 'feature') && !jobId) {
      return NextResponse.json({ error: 'jobId is required for a paid job action' }, { status: 400 });
    }

    const destination: Record<string, unknown> =
      method === 'till'
        ? { tillNumber: settings.tillNumber }
        : { phoneNumber: settings.phoneNumber };

    const description =
      (typeof body.description === 'string' && body.description.trim()) ||
      quoted.product?.name ||
      'CareerSasa payment';

    const transactionReference = generateTransactionReference();
    const { data: payment, error } = await auth.adminClient
      .from('payments')
      .insert({
        provider: 'mpesa',
        transaction_reference: transactionReference,
        mpesa_receipt_number: receiptNumber,
        amount: quoted.amount,
        phone_number: normalizeKenyanPhone(phoneNumber),
        status: 'PENDING',
        description,
        user_id: auth.user.id,
        job_id: jobId || null,
        metadata: {
          ...quoted.metadata,
          method: method as MpesaCustomerMethod,
          destination,
          environment: settings.environment,
        },
      })
      .select('id, transaction_reference, status, amount, mpesa_receipt_number')
      .single();

    if (error || !payment) {
      console.error('[M-Pesa] Failed to record manual payment:', error);
      return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message:
        method === 'till'
          ? 'Payment submitted. We will confirm the Buy Goods receipt shortly.'
          : 'Payment submitted. We will confirm the M-Pesa receipt shortly.',
      data: {
        paymentId: payment.id,
        transactionReference: payment.transaction_reference,
        status: payment.status,
        amount: Number(payment.amount),
        mpesa_receipt_number: payment.mpesa_receipt_number,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to record payment';
    console.error('[M-Pesa] Manual payment error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
