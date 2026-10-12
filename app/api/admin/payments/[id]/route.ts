import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { applyPaidJobBenefit } from '@/lib/mpesa';
import { recordCouponRedemption } from '@/lib/pricing/catalog';

export const runtime = 'nodejs';

/**
 * PATCH /api/admin/payments/:id
 * Confirm or reject a manual M-Pesa payment (Send Money / Buy Goods).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = body.status === 'FAILED' ? 'FAILED' : body.status === 'SUCCESS' ? 'SUCCESS' : null;
  if (!status) {
    return NextResponse.json({ error: 'status must be SUCCESS or FAILED' }, { status: 400 });
  }

  const { data: existing, error: loadError } = await auth.adminClient
    .from('payments')
    .select('id, status, amount, user_id, metadata')
    .eq('id', id)
    .maybeSingle();

  if (loadError || !existing) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  if (existing.status === 'SUCCESS' && status === 'SUCCESS') {
    return NextResponse.json({ payment: existing });
  }

  const updates: Record<string, unknown> = {
    status,
    result_desc: typeof body.result_desc === 'string' ? body.result_desc : status === 'SUCCESS' ? 'Confirmed by admin' : 'Rejected by admin',
    updated_at: new Date().toISOString(),
  };
  if (typeof body.mpesa_receipt_number === 'string' && body.mpesa_receipt_number.trim()) {
    updates.mpesa_receipt_number = body.mpesa_receipt_number.trim().toUpperCase();
  }
  if (status === 'SUCCESS') {
    updates.paid_at = new Date().toISOString();
  }

  const { data: payment, error } = await auth.adminClient
    .from('payments')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !payment) {
    return NextResponse.json({ error: error?.message || 'Failed to update payment' }, { status: 500 });
  }

  if (status === 'SUCCESS' && existing.status !== 'SUCCESS') {
    const metadata = (existing.metadata || {}) as Record<string, unknown>;
    await applyPaidJobBenefit(auth.adminClient, {
      metadata,
      userId: existing.user_id,
    });
    if (typeof metadata.couponId === 'string') {
      await recordCouponRedemption(auth.adminClient, {
        couponId: metadata.couponId,
        userId: existing.user_id,
        paymentId: existing.id,
        sku: typeof metadata.sku === 'string' ? metadata.sku : null,
        amountKes: Number(existing.amount),
      });
    }
  }

  return NextResponse.json({ payment });
}
