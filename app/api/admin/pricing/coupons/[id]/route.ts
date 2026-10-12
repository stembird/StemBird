import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { mapCouponRow } from '@/lib/pricing/catalog';
import { normalizeCouponCode } from '@/lib/pricing/discount';

export const runtime = 'nodejs';

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
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.code === 'string') updates.code = normalizeCouponCode(body.code);
  if (typeof body.description === 'string' || body.description === null) updates.description = body.description;
  if (body.discount_type === 'fixed' || body.discount_type === 'percent') updates.discount_type = body.discount_type;
  if (body.discount_value != null) updates.discount_value = Number(body.discount_value);
  if ('min_amount_kes' in body) updates.min_amount_kes = body.min_amount_kes === '' ? null : body.min_amount_kes;
  if ('max_discount_kes' in body) updates.max_discount_kes = body.max_discount_kes === '' ? null : body.max_discount_kes;
  if (typeof body.applies_to === 'string') updates.applies_to = body.applies_to;
  if (Array.isArray(body.applicable_skus)) updates.applicable_skus = body.applicable_skus;
  if ('usage_limit' in body) updates.usage_limit = body.usage_limit === '' ? null : body.usage_limit;
  if ('starts_at' in body) updates.starts_at = body.starts_at || null;
  if ('expires_at' in body) updates.expires_at = body.expires_at || null;
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;

  const { data, error } = await auth.adminClient
    .from('coupons')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ coupon: mapCouponRow(data as Record<string, unknown>) });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id } = await params;
  const { error } = await auth.adminClient.from('coupons').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
