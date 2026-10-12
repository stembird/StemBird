import { NextRequest, NextResponse } from 'next/server';
import {
  createPendingPaymentAndStkPush,
  getMpesaConfig,
  isMpesaConfigured,
  isValidKenyanPhone,
  requireAuthenticatedUser,
} from '@/lib/mpesa';
import { loadMpesaSettings } from '@/lib/pricing/catalog';
import { resolveCheckoutQuote } from '@/lib/pricing/checkout';

export const runtime = 'nodejs';

/**
 * POST /api/payments/mpesa/stkpush
 * Body: { amount?: number, phoneNumber: string, description?: string, jobId?: string,
 *         action?: 'promote' | 'feature', tier?: string, sku?: string, couponCode?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth.ok === false) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const settings = await loadMpesaSettings(auth.adminClient);
    if (!settings.stkEnabled) {
      return NextResponse.json(
        { error: 'STK Push is disabled. Pay via Send Money or Buy Goods, or enable STK in admin settings.' },
        { status: 400 }
      );
    }

    if (!isMpesaConfigured(settings)) {
      console.error('[M-Pesa] Missing required environment variables for', settings.environment);
      return NextResponse.json(
        { error: `M-Pesa ${settings.environment} credentials are not configured on this server` },
        { status: 503 }
      );
    }

    const body = await request.json();
    const phoneNumber = String(body.phoneNumber || body.phone || '').trim();
    const description =
      typeof body.description === 'string' ? body.description.trim() : undefined;
    const jobId = typeof body.jobId === 'string' ? body.jobId : undefined;

    if (!phoneNumber || !isValidKenyanPhone(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Use 07XXXXXXXX or 2547XXXXXXXX' },
        { status: 400 }
      );
    }

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

    if (
      quoted.sku &&
      body.amount != null &&
      Number.isFinite(Number(body.amount)) &&
      Number(body.amount) !== quoted.amount
    ) {
      return NextResponse.json(
        { error: `Amount must be exactly KES ${quoted.amount}` },
        { status: 400 }
      );
    }

    if ((quoted.metadata.action === 'promote' || quoted.metadata.action === 'feature') && !jobId) {
      return NextResponse.json({ error: 'jobId is required for a paid job action' }, { status: 400 });
    }

    const config = getMpesaConfig(settings);
    const result = await createPendingPaymentAndStkPush(
      auth.adminClient,
      {
        amount: quoted.amount,
        phoneNumber,
        description: description || quoted.product?.name,
        userId: auth.user.id,
        jobId,
        metadata: { ...quoted.metadata, method: 'stk', environment: settings.environment },
      },
      config
    );

    return NextResponse.json({
      success: true,
      message: result.customerMessage || 'STK Push sent. Check your phone to complete payment.',
      data: {
        paymentId: result.paymentId,
        transactionReference: result.transactionReference,
        merchantRequestId: result.merchantRequestId,
        checkoutRequestId: result.checkoutRequestId,
        status: result.status,
        amount: quoted.amount,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[M-Pesa] STK Push endpoint error:', msg);
    return NextResponse.json(
      { success: false, error: msg || 'Failed to initiate STK Push' },
      { status: 500 }
    );
  }
}
