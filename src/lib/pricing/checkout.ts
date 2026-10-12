import type { SupabaseClient } from '@supabase/supabase-js';
import { jobActionSku } from './defaults';
import { normalizeCouponCode } from './discount';
import { quoteSku } from './catalog';
import type { CatalogCoupon, CatalogProduct, QuotedPrice } from './types';

export interface CheckoutQuoteInput {
  sku?: string;
  action?: string;
  tier?: string;
  couponCode?: string;
  jobId?: string;
  amount?: number;
}

export interface CheckoutQuoteResult {
  sku: string | null;
  product: CatalogProduct | null;
  quote: QuotedPrice | null;
  coupon: CatalogCoupon | null;
  amount: number;
  metadata: Record<string, unknown>;
}

export async function resolveCheckoutQuote(
  client: SupabaseClient,
  input: CheckoutQuoteInput
): Promise<CheckoutQuoteResult> {
  let sku = typeof input.sku === 'string' && input.sku.trim() ? input.sku.trim() : '';
  const action = input.action;
  const tier = input.tier;

  if (!sku && (action === 'promote' || action === 'feature')) {
    sku = jobActionSku(action, tier);
  }

  const couponCode = normalizeCouponCode(input.couponCode || '');

  if (sku) {
    const { product, quote, coupon } = await quoteSku(client, sku, couponCode || null);
    const metadata: Record<string, unknown> = {
      sku: product.sku,
      couponCode: quote.coupon?.code || null,
      couponId: quote.coupon?.id || coupon?.id || null,
      offerId: quote.offer?.id || null,
    };

    const productAction = product.metadata?.action;
    if (productAction === 'promote' || productAction === 'feature') {
      metadata.action = productAction;
      metadata.tier = product.metadata?.tier || null;
      metadata.durationDays = product.duration_days || 7;
      if (input.jobId) metadata.jobId = input.jobId;
    }

    return {
      sku: product.sku,
      product,
      quote,
      coupon,
      amount: Math.max(0, quote.amount),
      metadata,
    };
  }

  const amount = Math.round(Number(input.amount));
  if (!Number.isFinite(amount) || amount < 1) {
    throw new Error('Amount must be a number of at least 1 KES');
  }

  return {
    sku: null,
    product: null,
    quote: null,
    coupon: null,
    amount,
    metadata: {},
  };
}
