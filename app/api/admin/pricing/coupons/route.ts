import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { mapCouponRow } from '@/lib/pricing/catalog';
import { normalizeCouponCode } from '@/lib/pricing/discount';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { data, error } = await auth.adminClient
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    coupons: (data || []).map((row) => mapCouponRow(row as Record<string, unknown>)),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const code = normalizeCouponCode(body.code || '');
    if (!code) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
    }

    const discountValue = Number(body.discount_value);
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return NextResponse.json({ error: 'discount_value must be greater than 0' }, { status: 400 });
    }

    const payload = {
      code,
      description: typeof body.description === 'string' ? body.description : null,
      discount_type: body.discount_type === 'fixed' ? 'fixed' : 'percent',
      discount_value: discountValue,
      min_amount_kes: body.min_amount_kes == null || body.min_amount_kes === '' ? null : Number(body.min_amount_kes),
      max_discount_kes: body.max_discount_kes == null || body.max_discount_kes === '' ? null : Number(body.max_discount_kes),
      applies_to: body.applies_to || 'all',
      applicable_skus: Array.isArray(body.applicable_skus) ? body.applicable_skus : [],
      usage_limit: body.usage_limit == null || body.usage_limit === '' ? null : Number(body.usage_limit),
      starts_at: body.starts_at || null,
      expires_at: body.expires_at || null,
      is_active: body.is_active !== false,
    };

    const { data, error } = await auth.adminClient.from('coupons').insert(payload).select('*').single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ coupon: mapCouponRow(data as Record<string, unknown>) });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create coupon';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
