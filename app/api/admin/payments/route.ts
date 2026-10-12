import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { applyPaidJobBenefit } from '@/lib/mpesa';
import { recordCouponRedemption } from '@/lib/pricing/catalog';

export const runtime = 'nodejs';

/**
 * GET /api/admin/payments — recent M-Pesa payments for admin review.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 50)));

  let query = auth.adminClient
    .from('payments')
    .select(
      'id, provider, transaction_reference, mpesa_receipt_number, amount, phone_number, status, description, user_id, job_id, result_desc, metadata, paid_at, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status && ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'].includes(status)) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ payments: data || [] });
}
