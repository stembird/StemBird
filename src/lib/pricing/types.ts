export type ProductKind =
  | 'service'
  | 'cv_template'
  | 'cover_letter_template'
  | 'job_action';

export type DiscountType = 'percent' | 'fixed';

export type ProductAppliesTo = 'all' | ProductKind | 'sku';

export interface CatalogProduct {
  id?: string;
  sku: string;
  kind: ProductKind;
  name: string;
  description: string;
  price_kes: number;
  compare_at_price_kes: number | null;
  duration_days: number | null;
  billing_interval: 'one_time' | 'month' | null;
  is_active: boolean;
  sort_order: number;
  metadata: Record<string, unknown>;
}

export interface CatalogCoupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_amount_kes: number | null;
  max_discount_kes: number | null;
  applies_to: ProductAppliesTo;
  applicable_skus: string[];
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

export interface CatalogOffer {
  id: string;
  name: string;
  badge_text: string | null;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  applies_to: ProductAppliesTo;
  applicable_skus: string[];
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export interface QuotedPrice {
  sku: string;
  listPrice: number;
  compareAtPrice: number | null;
  offerDiscount: number;
  couponDiscount: number;
  amount: number;
  offer: Pick<CatalogOffer, 'id' | 'name' | 'badge_text'> | null;
  coupon: Pick<CatalogCoupon, 'id' | 'code'> | null;
}

export type MpesaEnvironment = 'sandbox' | 'production';

export type MpesaCustomerMethod = 'phone' | 'till' | 'stk';

export type MpesaStkMode = 'paybill' | 'till';

export interface MpesaPaymentSettings {
  environment: MpesaEnvironment;
  phoneEnabled: boolean;
  tillEnabled: boolean;
  stkEnabled: boolean;
  defaultMethod: MpesaCustomerMethod;
  stkMode: MpesaStkMode;
  phoneNumber: string;
  tillNumber: string;
  paybillNumber: string;
  accountReference: string;
}

export interface PublicMpesaMethod {
  id: MpesaCustomerMethod;
  label: string;
  description: string;
  phoneNumber?: string;
  tillNumber?: string;
}

export interface PublicMpesaSettings {
  environment: MpesaEnvironment;
  defaultMethod: MpesaCustomerMethod;
  methods: PublicMpesaMethod[];
  accountReference: string;
}

export interface PricingCatalog {
  products: CatalogProduct[];
  offers: CatalogOffer[];
  mpesa: PublicMpesaSettings;
}
