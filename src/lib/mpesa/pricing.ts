/**
 * Pricing for paid job actions (M-Pesa STK Push).
 *
 * Amounts come from the shared pricing catalog (admin-editable). This module
 * stays a synchronous fallback for client components before the catalog loads.
 */

import { DEFAULT_PRODUCTS, jobActionSku } from '@/lib/pricing/defaults';
import type { CatalogProduct } from '@/lib/pricing/types';

export type PaidJobAction = 'promote' | 'feature';

export interface PaidJobActionPricing {
  action: PaidJobAction;
  tier?: 'basic' | 'premium' | 'enterprise';
  amount: number;
  durationDays: number;
  label: string;
  description: string;
  sku: string;
}

function toPaidJobPricing(product: CatalogProduct): PaidJobActionPricing | undefined {
  const action = product.metadata?.action;
  if (action !== 'promote' && action !== 'feature') return undefined;
  const tier = product.metadata?.tier;
  return {
    action,
    tier: tier === 'premium' || tier === 'enterprise' || tier === 'basic' ? tier : undefined,
    amount: Math.round(Number(product.price_kes) || 0),
    durationDays: Math.max(1, Number(product.duration_days) || 7),
    label: product.name,
    description: product.description,
    sku: product.sku,
  };
}

export const PAID_JOB_ACTIONS: PaidJobActionPricing[] = DEFAULT_PRODUCTS.map(toPaidJobPricing).filter(
  (p): p is PaidJobActionPricing => Boolean(p)
);

export function getPaidJobActionPricing(
  action: PaidJobAction,
  tier?: string,
  products: CatalogProduct[] = DEFAULT_PRODUCTS
): PaidJobActionPricing | undefined {
  if (action === 'feature' && tier) return undefined;
  if (action === 'promote' && tier && tier !== 'basic' && tier !== 'premium') return undefined;
  const sku = jobActionSku(action, tier);
  const product = products.find((p) => p.sku === sku && p.is_active);
  return product ? toPaidJobPricing(product) : undefined;
}

export function paidJobPricingFromCatalog(
  products: CatalogProduct[]
): PaidJobActionPricing[] {
  return products.map(toPaidJobPricing).filter((p): p is PaidJobActionPricing => Boolean(p));
}
