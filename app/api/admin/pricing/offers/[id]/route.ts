import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { mapOfferRow } from '@/lib/pricing/catalog';

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

  if (typeof body.name === 'string') updates.name = body.name.trim();
  if ('badge_text' in body) updates.badge_text = body.badge_text || null;
  if ('description' in body) updates.description = body.description || null;
  if (body.discount_type === 'fixed' || body.discount_type === 'percent') updates.discount_type = body.discount_type;
  if (body.discount_value != null) updates.discount_value = Number(body.discount_value);
  if (typeof body.applies_to === 'string') updates.applies_to = body.applies_to;
  if (Array.isArray(body.applicable_skus)) updates.applicable_skus = body.applicable_skus;
  if ('starts_at' in body) updates.starts_at = body.starts_at || null;
  if ('ends_at' in body) updates.ends_at = body.ends_at || null;
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;

  const { data, error } = await auth.adminClient
    .from('offers')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ offer: mapOfferRow(data as Record<string, unknown>) });
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
  const { error } = await auth.adminClient.from('offers').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
