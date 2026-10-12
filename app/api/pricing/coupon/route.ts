import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabaseServiceClient';
import { normalizeCouponCode, quoteSku } from '@/lib/pricing';

export const runtime = 'nodejs';

/**
 * POST /api/pricing/coupon
 * Body: { sku: string, code: string }
 * Validates a coupon against a product and returns the quoted price.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sku = typeof body.sku === 'string' ? body.sku.trim() : '';
    const code = normalizeCouponCode(typeof body.code === 'string' ? body.code : '');

    if (!sku || !code) {
      return NextResponse.json({ error: 'sku and code are required' }, { status: 400 });
    }

    const client = createServiceRoleClient();
    const quoted = await quoteSku(client, sku, code);
    return NextResponse.json({
      product: quoted.product,
      quote: quoted.quote,
      coupon: quoted.quote.coupon,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Invalid coupon';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
