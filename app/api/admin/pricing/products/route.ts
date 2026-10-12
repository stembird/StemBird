import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/adminAuth';
import { loadProducts } from '@/lib/pricing/catalog';
import type { CatalogProduct } from '@/lib/pricing/types';

export const runtime = 'nodejs';

/**
 * GET /api/admin/pricing/products
 * PUT /api/admin/pricing/products  { products: Partial<CatalogProduct>[] }
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const products = await loadProducts(auth.adminClient);
    return NextResponse.json({ products });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to load products';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const incoming = Array.isArray(body.products) ? body.products : [];
    if (incoming.length === 0) {
      return NextResponse.json({ error: 'products array is required' }, { status: 400 });
    }

    const existing = await loadProducts(auth.adminClient);
    const bySku = new Map(existing.map((p) => [p.sku, p]));

    for (const raw of incoming) {
      const sku = typeof raw.sku === 'string' ? raw.sku.trim() : '';
      if (!sku) continue;
      const current = bySku.get(sku);
      const price = Number(raw.price_kes);
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json({ error: `Invalid price for ${sku}` }, { status: 400 });
      }

      const compareAt =
        raw.compare_at_price_kes === '' || raw.compare_at_price_kes == null
          ? null
          : Number(raw.compare_at_price_kes);

      const payload = {
        sku,
        kind: raw.kind || current?.kind || 'service',
        name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : current?.name || sku,
        description:
          typeof raw.description === 'string' ? raw.description : current?.description || '',
        price_kes: Math.round(price),
        compare_at_price_kes:
          compareAt != null && Number.isFinite(compareAt) ? Math.round(compareAt) : null,
        duration_days:
          raw.duration_days == null || raw.duration_days === ''
            ? current?.duration_days ?? null
            : Number(raw.duration_days),
        billing_interval: raw.billing_interval || current?.billing_interval || 'one_time',
        is_active: raw.is_active !== false,
        sort_order: Number.isFinite(Number(raw.sort_order))
          ? Number(raw.sort_order)
          : current?.sort_order || 0,
        metadata: raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : current?.metadata || {},
        updated_at: new Date().toISOString(),
      };

      const { error } = await auth.adminClient.from('products').upsert(payload, { onConflict: 'sku' });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await syncLinkedTemplatePrice(auth.adminClient, payload as CatalogProduct);
    }

    const products = await loadProducts(auth.adminClient);
    return NextResponse.json({ products });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to save products';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function syncLinkedTemplatePrice(client: SupabaseClient, product: CatalogProduct) {
  const table =
    product.kind === 'cv_template'
      ? 'cv_templates'
      : product.kind === 'cover_letter_template'
        ? 'cover_letter_templates'
        : null;
  if (!table) return;

  const templateName =
    typeof product.metadata?.templateName === 'string' ? product.metadata.templateName : product.name;

  await client.from(table).update({ price_kes: product.price_kes }).eq('name', templateName);
}
