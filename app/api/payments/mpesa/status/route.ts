import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/mpesa';

/**
 * GET /api/payments/mpesa/status?paymentId=... | ?checkoutRequestId=... | ?transactionReference=...
 * Returns the current payment status for the authenticated owner (or any user if they own it).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth.ok === false) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');
    const checkoutRequestId = searchParams.get('checkoutRequestId');
    const transactionReference = searchParams.get('transactionReference');

    if (!paymentId && !checkoutRequestId && !transactionReference) {
      return NextResponse.json(
        { error: 'Provide paymentId, checkoutRequestId, or transactionReference' },
        { status: 400 }
      );
    }

    let query = auth.adminClient
      .from('payments')
      .select(
        'id, provider, transaction_reference, merchant_request_id, checkout_request_id, mpesa_receipt_number, amount, phone_number, status, description, result_code, result_desc, paid_at, created_at, updated_at'
      )
      .eq('user_id', auth.user.id);

    if (paymentId) {
      query = query.eq('id', paymentId);
    } else if (checkoutRequestId) {
      query = query.eq('checkout_request_id', checkoutRequestId);
    } else if (transactionReference) {
      query = query.eq('transaction_reference', transactionReference);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('[M-Pesa] Status lookup failed:', error);
      return NextResponse.json({ error: 'Failed to fetch payment status' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[M-Pesa] Status endpoint error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
