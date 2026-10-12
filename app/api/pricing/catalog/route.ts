import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabaseServiceClient';
import { DEFAULT_MPESA_SETTINGS, DEFAULT_PRODUCTS, toPublicMpesaSettings } from '@/lib/pricing';
import { loadPricingCatalog } from '@/lib/pricing/catalog';

export const runtime = 'nodejs';

/**
 * GET /api/pricing/catalog
 * Public catalog of products, active offers, and customer-facing M-Pesa methods.
 */
export async function GET() {
  try {
    const client = createServiceRoleClient();
    const catalog = await loadPricingCatalog(client);
    return NextResponse.json(catalog);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[pricing/catalog] GET error:', msg);
    return NextResponse.json({
      products: DEFAULT_PRODUCTS.filter((p) => p.is_active),
      offers: [],
      mpesa: toPublicMpesaSettings(DEFAULT_MPESA_SETTINGS),
    });
  }
}
