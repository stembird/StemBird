export type {
  CatalogCoupon,
  CatalogOffer,
  CatalogProduct,
  DiscountType,
  MpesaCustomerMethod,
  MpesaEnvironment,
  MpesaPaymentSettings,
  MpesaStkMode,
  PricingCatalog,
  ProductKind,
  PublicMpesaSettings,
  QuotedPrice,
} from './types';

export {
  DEFAULT_MPESA_PHONE,
  DEFAULT_MPESA_SETTINGS,
  DEFAULT_PRODUCTS,
  jobActionSku,
  productBySku,
  productForPackage,
  productForTemplateName,
  productsForService,
} from './defaults';

export {
  bestActiveOffer,
  computeDiscountAmount,
  couponAppliesToProduct,
  formatKenyanPhoneDisplay,
  formatKes,
  isCouponCurrentlyValid,
  isWithinWindow,
  normalizeCouponCode,
  quoteProductPrice,
} from './discount';

export {
  loadActiveOffers,
  loadCouponByCode,
  loadMpesaSettings,
  loadPricingCatalog,
  loadProducts,
  mapCouponRow,
  mapOfferRow,
  mapProductRow,
  mergeProductsWithDefaults,
  MPESA_SETTINGS_KEY,
  parseMpesaSettings,
  quoteSku,
  saveMpesaSettings,
  toPublicMpesaSettings,
  recordCouponRedemption,
  ensureProductsSeeded,
} from './catalog';

export {
  unpaidTemplateUnlock,
  templateUnlockDescription,
} from './templateAccess';
export type { TemplateProductKind, TemplateUnlock } from './templateAccess';
