import { NextRequest, NextResponse } from 'next/server';
import { getAdminServiceClient } from '@/lib/adminAuth';
import { applyPaidJobBenefit, isStkCallbackPayload, parseStkCallback } from '@/lib/mpesa';

/**
 * Handle a Daraja STK Push callback payload.
 *
 * Matching is done via CheckoutRequestID / MerchantRequestID against the
 * PENDING payment created at initiate time (no HMAC signature on STK callbacks).
 * Always returns an "Accepted" acknowledgement so Safaricom does not retry forever.
 */
export async function handleMpesaCallback(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    if (!isStkCallbackPayload(body)) {
      console.warn('[M-Pesa] Invalid callback payload shape:', body);
      // Always acknowledge so Safaricom does not retry forever on bad payloads
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const parsed = parseStkCallback(body);
    console.info('[M-Pesa] Callback received', {
      checkoutRequestId: parsed.checkoutRequestId,
      merchantRequestId: parsed.merchantRequestId,
      resultCode: parsed.resultCode,
      status: parsed.status,
    });

    const admin = getAdminServiceClient();

    const selectCols =
      'id, status, amount, phone_number, checkout_request_id, merchant_request_id, user_id, metadata';

    let existing:
      | {
          id: string;
          status: string;
          amount: number;
          phone_number: string;
          checkout_request_id: string | null;
          merchant_request_id: string | null;
          user_id: string | null;
          metadata: Record<string, unknown> | null;
        }
      | null = null;

    const byCheckout = await admin
      .from('payments')
      .select(selectCols)
      .eq('checkout_request_id', parsed.checkoutRequestId)
      .maybeSingle();

    if (byCheckout.error) {
      console.error('[M-Pesa] Callback lookup failed:', byCheckout.error);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    existing = byCheckout.data;

    if (!existing && parsed.merchantRequestId) {
      const byMerchant = await admin
        .from('payments')
        .select(selectCols)
        .eq('merchant_request_id', parsed.merchantRequestId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (byMerchant.error) {
        console.error('[M-Pesa] MerchantRequestID lookup failed:', byMerchant.error);
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
      }
      existing = byMerchant.data;
    }

    if (!existing) {
      console.warn('[M-Pesa] No payment found for callback', {
        checkoutRequestId: parsed.checkoutRequestId,
        merchantRequestId: parsed.merchantRequestId,
      });
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // Idempotency: ignore duplicate SUCCESS callbacks
    if (existing.status === 'SUCCESS') {
      console.info('[M-Pesa] Payment already SUCCESS, ignoring duplicate callback', existing.id);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // Soft validation: warn if callback amount differs from pending amount
    if (
      parsed.status === 'SUCCESS' &&
      parsed.amount !== undefined &&
      Number(existing.amount) !== Number(parsed.amount)
    ) {
      console.warn('[M-Pesa] Amount mismatch on callback', {
        paymentId: existing.id,
        expected: existing.amount,
        received: parsed.amount,
      });
    }

    const updatePayload: Record<string, unknown> = {
      status: parsed.status,
      result_code: parsed.resultCode,
      result_desc: parsed.resultDesc,
      raw_callback: body,
      merchant_request_id: parsed.merchantRequestId || existing.merchant_request_id,
      checkout_request_id: parsed.checkoutRequestId || existing.checkout_request_id,
      updated_at: new Date().toISOString(),
    };

    if (parsed.mpesaReceiptNumber) {
      updatePayload.mpesa_receipt_number = parsed.mpesaReceiptNumber;
    }
    if (parsed.phoneNumber) {
      updatePayload.phone_number = String(parsed.phoneNumber);
    }
    if (parsed.status === 'SUCCESS') {
      updatePayload.paid_at = new Date().toISOString();
    }

    const { error: updateError } = await admin
      .from('payments')
      .update(updatePayload)
      .eq('id', existing.id);

    if (updateError) {
      console.error('[M-Pesa] Failed to update payment from callback:', updateError);
    } else {
      console.info('[M-Pesa] Payment updated', {
        paymentId: existing.id,
        status: parsed.status,
        receipt: parsed.mpesaReceiptNumber,
      });
    }

    // Apply any paid job benefit (promote / feature) after a confirmed success.
    if (parsed.status === 'SUCCESS') {
      const benefit = await applyPaidJobBenefit(admin, {
        metadata: existing.metadata,
        userId: existing.user_id,
      });
      if (benefit.applied) {
        console.info('[M-Pesa] Benefit applied from callback', benefit);
      }

      const couponId =
        typeof existing.metadata?.couponId === 'string' ? existing.metadata.couponId : null;
      if (couponId) {
        const { recordCouponRedemption } = await import('@/lib/pricing/catalog');
        await recordCouponRedemption(admin, {
          couponId,
          userId: existing.user_id,
          paymentId: existing.id,
          sku: typeof existing.metadata?.sku === 'string' ? existing.metadata.sku : null,
          amountKes: Number(existing.amount),
        });
      }
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[M-Pesa] Callback error:', msg);
    // Still return 200-style acceptance body so Daraja does not hammer retries
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
}
