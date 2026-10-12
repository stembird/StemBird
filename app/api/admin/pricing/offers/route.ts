import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { mapOfferRow } from '@/lib/pricing/catalog';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { data, error } = await auth.adminClient
    .from('offers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    offers: (data || []).map((row) => mapOfferRow(row as Record<string, unknown>)),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Offer name is required' }, { status: 400 });
    }

    const discountValue = Number(body.discount_value);
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return NextResponse.json({ error: 'discount_value must be greater than 0' }, { status: 400 });
    }

    const payload = {
      name,
      badge_text: typeof body.badge_text === 'string' ? body.badge_text : null,
      description: typeof body.description === 'string' ? body.description : null,
      discount_type: body.discount_type === 'fixed' ? 'fixed' : 'percent',
      discount_value: discountValue,
      applies_to: body.applies_to || 'all',
      applicable_skus: Array.isArray(body.applicable_skus) ? body.applicable_skus : [],
      starts_at: body.starts_at || null,
      ends_at: body.ends_at || null,
      is_active: body.is_active !== false,
    };

    const { data, error } = await auth.adminClient.from('offers').insert(payload).select('*').single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ offer: mapOfferRow(data as Record<string, unknown>) });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create offer';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
