import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_MPESA_SETTINGS, DEFAULT_PRODUCTS } from './defaults';
import { formatKenyanPhoneDisplay, isCouponCurrentlyValid, quoteProductPrice } from './discount';
import type {
  CatalogCoupon,
  CatalogOffer,
  CatalogProduct,
  MpesaCustomerMethod,
  MpesaPaymentSettings,
  PricingCatalog,
  ProductKind,
  PublicMpesaSettings,
} from './types';
import { normalizeKenyanPhone } from '@/lib/mpesa/phone';

export const MPESA_SETTINGS_KEY = 'mpesa_settings';

function isMissingRelation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const code = error.code || '';
  if (code === '42P01' || code === 'PGRST205' || code === 'PGRST204') return true;
  const msg = error.message || '';
  return /schema cache|does not exist|could not find the table/i.test(msg);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  return [];
}

export function mapProductRow(row: Record<string, unknown>): CatalogProduct {
  return {
    id: typeof row.id === 'string' ? row.id : undefined,
    sku: String(row.sku),
    kind: row.kind as ProductKind,
    name: String(row.name),
    description: typeof row.description === 'string' ? row.description : '',
    price_kes: Number(row.price_kes) || 0,
    compare_at_price_kes:
      row.compare_at_price_kes == null ? null : Number(row.compare_at_price_kes),
    duration_days: row.duration_days == null ? null : Number(row.duration_days),
    billing_interval:
      row.billing_interval === 'month' || row.billing_interval === 'one_time'
        ? row.billing_interval
        : 'one_time',
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order) || 0,
    metadata: asRecord(row.metadata),
  };
}

export function mapCouponRow(row: Record<string, unknown>): CatalogCoupon {
  return {
    id: String(row.id),
    code: String(row.code),
    description: typeof row.description === 'string' ? row.description : null,
    discount_type: row.discount_type === 'fixed' ? 'fixed' : 'percent',
    discount_value: Number(row.discount_value) || 0,
    min_amount_kes: row.min_amount_kes == null ? null : Number(row.min_amount_kes),
    max_discount_kes: row.max_discount_kes == null ? null : Number(row.max_discount_kes),
    applies_to: (row.applies_to as CatalogCoupon['applies_to']) || 'all',
    applicable_skus: asStringArray(row.applicable_skus),
    usage_limit: row.usage_limit == null ? null : Number(row.usage_limit),
    used_count: Number(row.used_count) || 0,
    starts_at: typeof row.starts_at === 'string' ? row.starts_at : null,
    expires_at: typeof row.expires_at === 'string' ? row.expires_at : null,
    is_active: row.is_active !== false,
  };
}

export function mapOfferRow(row: Record<string, unknown>): CatalogOffer {
  return {
    id: String(row.id),
    name: String(row.name),
    badge_text: typeof row.badge_text === 'string' ? row.badge_text : null,
    description: typeof row.description === 'string' ? row.description : null,
    discount_type: row.discount_type === 'fixed' ? 'fixed' : 'percent',
    discount_value: Number(row.discount_value) || 0,
    applies_to: (row.applies_to as CatalogOffer['applies_to']) || 'all',
    applicable_skus: asStringArray(row.applicable_skus),
    starts_at: typeof row.starts_at === 'string' ? row.starts_at : null,
    ends_at: typeof row.ends_at === 'string' ? row.ends_at : null,
    is_active: row.is_active !== false,
  };
}

export function mergeProductsWithDefaults(rows: CatalogProduct[]): CatalogProduct[] {
  const bySku = new Map(rows.map((p) => [p.sku, p]));
  const merged = DEFAULT_PRODUCTS.map((fallback) => {
    const row = bySku.get(fallback.sku);
    if (!row) return fallback;
    bySku.delete(fallback.sku);
    return { ...fallback, ...row, metadata: { ...fallback.metadata, ...row.metadata } };
  });
  for (const extra of bySku.values()) merged.push(extra);
  return merged.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

export function parseMpesaSettings(raw: unknown): MpesaPaymentSettings {
  const obj = typeof raw === 'string' ? safeJson(raw) : asRecord(raw);
  const environment = obj.environment === 'production' ? 'production' : 'sandbox';
  const defaultMethod: MpesaCustomerMethod =
    obj.defaultMethod === 'till' || obj.defaultMethod === 'stk' ? obj.defaultMethod : 'phone';
  const stkMode = obj.stkMode === 'till' ? 'till' : 'paybill';

  let phoneNumber = DEFAULT_MPESA_SETTINGS.phoneNumber;
  try {
    if (typeof obj.phoneNumber === 'string' && obj.phoneNumber.trim()) {
      phoneNumber = normalizeKenyanPhone(obj.phoneNumber);
    }
  } catch {
    phoneNumber = DEFAULT_MPESA_SETTINGS.phoneNumber;
  }

  return {
    environment,
    phoneEnabled: obj.phoneEnabled !== false,
    tillEnabled: obj.tillEnabled !== false,
    stkEnabled: obj.stkEnabled === true,
    defaultMethod,
    stkMode,
    phoneNumber,
    tillNumber: typeof obj.tillNumber === 'string' ? obj.tillNumber.replace(/\D/g, '') : '',
    paybillNumber: typeof obj.paybillNumber === 'string' ? obj.paybillNumber.replace(/\D/g, '') : '',
    accountReference:
      typeof obj.accountReference === 'string' && obj.accountReference.trim()
        ? obj.accountReference.trim().slice(0, 12)
        : DEFAULT_MPESA_SETTINGS.accountReference,
  };
}

function safeJson(raw: string): Record<string, unknown> {
  try {
    return asRecord(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function toPublicMpesaSettings(settings: MpesaPaymentSettings): PublicMpesaSettings {
  const methods: PublicMpesaSettings['methods'] = [];

  if (settings.phoneEnabled && settings.phoneNumber) {
    methods.push({
      id: 'phone',
      label: 'Send Money (M-Pesa)',
      description: `Send to ${formatKenyanPhoneDisplay(settings.phoneNumber)}`,
      phoneNumber: settings.phoneNumber,
    });
  }

  if (settings.tillEnabled && settings.tillNumber) {
    methods.push({
      id: 'till',
      label: 'Buy Goods and Services',
      description: `Till number ${settings.tillNumber}`,
      tillNumber: settings.tillNumber,
    });
  }

  if (settings.stkEnabled) {
    methods.push({
      id: 'stk',
      label: 'Lipa Na M-Pesa (STK Push)',
      description: 'Confirm the payment prompt on your phone',
    });
  }

  const defaultMethod = methods.some((m) => m.id === settings.defaultMethod)
    ? settings.defaultMethod
    : methods[0]?.id || 'phone';

  return {
    environment: settings.environment,
    defaultMethod,
    methods,
    accountReference: settings.accountReference,
  };
}

export async function loadProducts(client: SupabaseClient): Promise<CatalogProduct[]> {
  await ensureProductsSeeded(client);
  const { data, error } = await client
    .from('products')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    if (isMissingRelation(error)) return DEFAULT_PRODUCTS;
    console.error('[pricing] Failed to load products:', error.message);
    return DEFAULT_PRODUCTS;
  }

  const rows = (data || []).map((row) => mapProductRow(row as Record<string, unknown>));
  return mergeProductsWithDefaults(rows);
}

export async function loadActiveOffers(client: SupabaseClient): Promise<CatalogOffer[]> {
  const { data, error } = await client.from('offers').select('*').eq('is_active', true);
  if (error) {
    if (isMissingRelation(error)) return [];
    console.error('[pricing] Failed to load offers:', error.message);
    return [];
  }
  return (data || []).map((row) => mapOfferRow(row as Record<string, unknown>));
}

export async function loadCouponByCode(
  client: SupabaseClient,
  code: string
): Promise<CatalogCoupon | null> {
  const { data, error } = await client
    .from('coupons')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (error) {
    if (isMissingRelation(error)) return null;
    console.error('[pricing] Failed to load coupon:', error.message);
    return null;
  }
  return data ? mapCouponRow(data as Record<string, unknown>) : null;
}

export async function loadMpesaSettings(client: SupabaseClient): Promise<MpesaPaymentSettings> {
  const { data, error } = await client
    .from('app_settings')
    .select('value')
    .eq('key', MPESA_SETTINGS_KEY)
    .maybeSingle();

  if (error || !data) return { ...DEFAULT_MPESA_SETTINGS };
  return parseMpesaSettings((data as { value: string }).value);
}

export async function saveMpesaSettings(
  client: SupabaseClient,
  settings: MpesaPaymentSettings
): Promise<MpesaPaymentSettings> {
  const parsed = parseMpesaSettings(settings);
  const { error } = await client.from('app_settings').upsert(
    {
      key: MPESA_SETTINGS_KEY,
      value: JSON.stringify(parsed),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  );
  if (error) throw new Error(error.message);
  return parsed;
}

export async function loadPricingCatalog(client: SupabaseClient): Promise<PricingCatalog> {
  const [products, offers, mpesa] = await Promise.all([
    loadProducts(client),
    loadActiveOffers(client),
    loadMpesaSettings(client),
  ]);

  return {
    products: products.filter((p) => p.is_active),
    offers,
    mpesa: toPublicMpesaSettings(mpesa),
  };
}

export async function recordCouponRedemption(
  client: SupabaseClient,
  input: {
    couponId: string;
    userId?: string | null;
    paymentId?: string | null;
    sku?: string | null;
    amountKes?: number | null;
  }
): Promise<void> {
  const { error: insertError } = await client.from('coupon_redemptions').insert({
    coupon_id: input.couponId,
    user_id: input.userId || null,
    payment_id: input.paymentId || null,
    product_sku: input.sku || null,
    amount_kes: input.amountKes ?? null,
  });
  if (insertError && !isMissingRelation(insertError)) {
    console.error('[pricing] Failed to record coupon redemption:', insertError.message);
  }

  const { data: coupon } = await client
    .from('coupons')
    .select('used_count')
    .eq('id', input.couponId)
    .maybeSingle();
  const used = Number((coupon as { used_count?: number } | null)?.used_count) || 0;
  const { error: updateError } = await client
    .from('coupons')
    .update({ used_count: used + 1, updated_at: new Date().toISOString() })
    .eq('id', input.couponId);
  if (updateError && !isMissingRelation(updateError)) {
    console.error('[pricing] Failed to increment coupon usage:', updateError.message);
  }
}

export async function ensureProductsSeeded(client: SupabaseClient): Promise<void> {
  const { count, error } = await client.from('products').select('sku', { count: 'exact', head: true });
  if (error) {
    if (!isMissingRelation(error)) {
      console.error('[pricing] Failed to count products:', error.message);
    }
    return;
  }
  if ((count || 0) > 0) return;

  const rows = DEFAULT_PRODUCTS.map((p) => ({
    sku: p.sku,
    kind: p.kind,
    name: p.name,
    description: p.description,
    price_kes: p.price_kes,
    compare_at_price_kes: p.compare_at_price_kes,
    duration_days: p.duration_days,
    billing_interval: p.billing_interval,
    is_active: p.is_active,
    sort_order: p.sort_order,
    metadata: p.metadata,
  }));

  const { error: insertError } = await client.from('products').insert(rows);
  if (insertError && !isMissingRelation(insertError)) {
    console.error('[pricing] Failed to seed products:', insertError.message);
  }
}

export async function quoteSku(
  client: SupabaseClient,
  sku: string,
  couponCode?: string | null
) {
  const products = await loadProducts(client);
  const product = products.find((p) => p.sku === sku && p.is_active);
  if (!product) throw new Error(`Unknown product "${sku}"`);

  const offers = await loadActiveOffers(client);
  let coupon: CatalogCoupon | null = null;
  if (couponCode) {
    coupon = await loadCouponByCode(client, couponCode);
    if (!coupon) throw new Error('Invalid coupon code');
    const validity = isCouponCurrentlyValid(coupon);
    if (validity !== true) throw new Error(validity);
  }

  const quote = quoteProductPrice(product, offers, coupon);
  if (couponCode && coupon && !quote.coupon) {
    throw new Error('This coupon does not apply to the selected item');
  }

  return { product, quote, coupon };
}

export { isMissingRelation as isMissingPricingRelation };
