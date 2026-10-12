import type {
  CatalogCoupon,
  CatalogOffer,
  CatalogProduct,
  DiscountType,
  ProductAppliesTo,
  QuotedPrice,
} from './types';

export function formatKes(amount: number, billingInterval?: 'one_time' | 'month' | null): string {
  if (!Number.isFinite(amount) || amount <= 0) return 'Free';
  const base = `KES ${Math.round(amount).toLocaleString('en-KE')}`;
  return billingInterval === 'month' ? `${base}/month` : base;
}

export function formatKenyanPhoneDisplay(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return phone;
}

function applies(
  appliesTo: ProductAppliesTo,
  applicableSkus: string[],
  product: CatalogProduct
): boolean {
  if (appliesTo === 'all') return true;
  if (appliesTo === product.kind) return true;
  if (appliesTo === 'sku') return applicableSkus.includes(product.sku);
  return false;
}

export function isWithinWindow(start: string | null, end: string | null, now = new Date()): boolean {
  if (start && new Date(start).getTime() > now.getTime()) return false;
  if (end && new Date(end).getTime() < now.getTime()) return false;
  return true;
}

export function isCouponCurrentlyValid(coupon: CatalogCoupon, now = new Date()): true | string {
  if (!coupon.is_active) return 'This coupon is not active';
  if (!isWithinWindow(coupon.starts_at, coupon.expires_at, now)) {
    return 'This coupon is expired or not yet valid';
  }
  if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit) {
    return 'This coupon has reached its usage limit';
  }
  return true;
}

export function couponAppliesToProduct(coupon: CatalogCoupon, product: CatalogProduct): boolean {
  return applies(coupon.applies_to, coupon.applicable_skus || [], product);
}

export function offerAppliesToProduct(offer: CatalogOffer, product: CatalogProduct): boolean {
  return offer.is_active && applies(offer.applies_to, offer.applicable_skus || [], product);
}

export function computeDiscountAmount(
  amount: number,
  discountType: DiscountType,
  discountValue: number,
  maxDiscountKes: number | null = null
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (!Number.isFinite(discountValue) || discountValue <= 0) return 0;

  let discount =
    discountType === 'percent' ? (amount * discountValue) / 100 : discountValue;

  if (maxDiscountKes != null && Number.isFinite(maxDiscountKes) && maxDiscountKes > 0) {
    discount = Math.min(discount, maxDiscountKes);
  }

  return Math.max(0, Math.min(Math.round(discount), Math.round(amount)));
}

export function bestActiveOffer(
  product: CatalogProduct,
  offers: CatalogOffer[],
  now = new Date()
): CatalogOffer | null {
  const eligible = offers.filter(
    (offer) =>
      offerAppliesToProduct(offer, product) && isWithinWindow(offer.starts_at, offer.ends_at, now)
  );
  if (eligible.length === 0) return null;

  return eligible.reduce((best, offer) => {
    const bestAmt = computeDiscountAmount(product.price_kes, best.discount_type, best.discount_value);
    const offerAmt = computeDiscountAmount(product.price_kes, offer.discount_type, offer.discount_value);
    return offerAmt > bestAmt ? offer : best;
  });
}

export function quoteProductPrice(
  product: CatalogProduct,
  offers: CatalogOffer[] = [],
  coupon: CatalogCoupon | null = null,
  now = new Date()
): QuotedPrice {
  const listPrice = Math.max(0, Math.round(Number(product.price_kes) || 0));
  const offer = bestActiveOffer(product, offers, now);
  const offerDiscount = offer
    ? computeDiscountAmount(listPrice, offer.discount_type, offer.discount_value)
    : 0;

  const remaining = Math.max(0, listPrice - offerDiscount);
  let couponDiscount = 0;
  let appliedCoupon: CatalogCoupon | null = null;

  if (coupon) {
    const validity = isCouponCurrentlyValid(coupon, now);
    if (validity === true && couponAppliesToProduct(coupon, product)) {
      if (coupon.min_amount_kes != null && listPrice < coupon.min_amount_kes) {
        couponDiscount = 0;
      } else {
        couponDiscount = computeDiscountAmount(
          remaining,
          coupon.discount_type,
          coupon.discount_value,
          coupon.max_discount_kes
        );
        appliedCoupon = coupon;
      }
    }
  }

  const amount = Math.max(0, remaining - couponDiscount);
  const compareAt =
    product.compare_at_price_kes && product.compare_at_price_kes > listPrice
      ? product.compare_at_price_kes
      : offerDiscount > 0 || couponDiscount > 0
        ? listPrice
        : product.compare_at_price_kes;

  return {
    sku: product.sku,
    listPrice,
    compareAtPrice: compareAt && compareAt > amount ? compareAt : null,
    offerDiscount,
    couponDiscount,
    amount,
    offer: offer
      ? { id: offer.id, name: offer.name, badge_text: offer.badge_text }
      : null,
    coupon: appliedCoupon ? { id: appliedCoupon.id, code: appliedCoupon.code } : null,
  };
}

export function normalizeCouponCode(code: string): string {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}
