import assert from 'node:assert/strict';
import { DEFAULT_PRODUCTS, jobActionSku, productForPackage, productForTemplateName } from './defaults';
import {
  computeDiscountAmount,
  formatKes,
  normalizeCouponCode,
  quoteProductPrice,
} from './discount';
import { mergeProductsWithDefaults, parseMpesaSettings, toPublicMpesaSettings } from './catalog';
import { unpaidTemplateUnlock, templateUnlockDescription } from './templateAccess';
import type { CatalogCoupon, CatalogOffer, CatalogProduct } from './types';

function testDefaultCatalogCoverage() {
  assert.ok(productForPackage('cv', 'writing'), 'CV writing package priced');
  assert.ok(productForPackage('cover-letter', 'professional'), 'cover letter package priced');
  assert.ok(productForPackage('linkedin', 'optimization'), 'linkedin package priced');
  assert.ok(productForTemplateName('cv_template', 'Classic Professional'), 'classic CV template priced');
  assert.ok(
    productForTemplateName('cover_letter_template', 'Classic Professional Cover Letter'),
    'classic cover letter template priced'
  );
  assert.equal(jobActionSku('promote', 'basic'), 'job.promote.basic');
  assert.equal(jobActionSku('feature'), 'job.feature');
  assert.ok(DEFAULT_PRODUCTS.every((p) => p.price_kes >= 0));
  assert.ok(DEFAULT_PRODUCTS.length >= 30, 'expected a full catalog of services and templates');
  console.log('✓ default catalog coverage');
}

function testDiscountMath() {
  assert.equal(computeDiscountAmount(1000, 'percent', 10), 100);
  assert.equal(computeDiscountAmount(1000, 'fixed', 250), 250);
  assert.equal(computeDiscountAmount(1000, 'percent', 50, 200), 200);
  assert.equal(computeDiscountAmount(100, 'fixed', 250), 100);
  assert.equal(formatKes(0), 'Free');
  assert.equal(formatKes(4000, 'month'), 'KES 4,000/month');
  assert.equal(normalizeCouponCode('  save 10 '), 'SAVE10');
  console.log('✓ discount math');
}

function testQuoteWithOfferAndCoupon() {
  const product: CatalogProduct = {
    sku: 'service.cv.writing',
    kind: 'service',
    name: 'CV Writing',
    description: '',
    price_kes: 4000,
    compare_at_price_kes: 5000,
    duration_days: null,
    billing_interval: 'one_time',
    is_active: true,
    sort_order: 1,
    metadata: {},
  };
  const offer: CatalogOffer = {
    id: 'o1',
    name: 'Spring sale',
    badge_text: '10% OFF',
    description: null,
    discount_type: 'percent',
    discount_value: 10,
    applies_to: 'all',
    applicable_skus: [],
    starts_at: null,
    ends_at: null,
    is_active: true,
  };
  const coupon: CatalogCoupon = {
    id: 'c1',
    code: 'SAVE500',
    description: null,
    discount_type: 'fixed',
    discount_value: 500,
    min_amount_kes: null,
    max_discount_kes: null,
    applies_to: 'all',
    applicable_skus: [],
    usage_limit: null,
    used_count: 0,
    starts_at: null,
    expires_at: null,
    is_active: true,
  };

  const quote = quoteProductPrice(product, [offer], coupon);
  assert.equal(quote.offerDiscount, 400);
  assert.equal(quote.couponDiscount, 500);
  assert.equal(quote.amount, 3100);
  assert.equal(quote.coupon?.code, 'SAVE500');
  console.log('✓ quote with offer + coupon');
}

function testMergeOverlay() {
  const overlay: CatalogProduct = {
    ...DEFAULT_PRODUCTS[0],
    price_kes: 1234,
    id: 'db-id',
  };
  const merged = mergeProductsWithDefaults([overlay]);
  const first = merged.find((p) => p.sku === overlay.sku);
  assert.equal(first?.price_kes, 1234);
  assert.equal(first?.id, 'db-id');
  assert.ok(merged.length >= DEFAULT_PRODUCTS.length);
  console.log('✓ merge overlay');
}

function testMpesaSettingsParse() {
  const parsed = parseMpesaSettings({
    environment: 'production',
    phoneEnabled: true,
    tillEnabled: true,
    stkEnabled: true,
    defaultMethod: 'phone',
    stkMode: 'till',
    phoneNumber: '+254795564135',
    tillNumber: '123456',
    paybillNumber: '',
    accountReference: 'CareerSasaPay',
  });
  assert.equal(parsed.environment, 'production');
  assert.equal(parsed.phoneNumber, '254795564135');
  assert.equal(parsed.stkMode, 'till');

  const pub = toPublicMpesaSettings(parsed);
  assert.equal(pub.methods.length, 3);
  assert.ok(pub.methods.some((m) => m.id === 'phone'));
  assert.ok(pub.methods.some((m) => m.id === 'till'));
  assert.ok(pub.methods.some((m) => m.id === 'stk'));

  const sandboxOnlyPhone = toPublicMpesaSettings(
    parseMpesaSettings({
      phoneEnabled: true,
      tillEnabled: true,
      stkEnabled: false,
      phoneNumber: '254795564135',
      tillNumber: '',
    })
  );
  assert.deepEqual(
    sandboxOnlyPhone.methods.map((m) => m.id),
    ['phone']
  );
  console.log('✓ mpesa settings parse');
}

function testUnpaidTemplateUnlock() {
  const empty = new Set<string>();
  const classic = unpaidTemplateUnlock(
    'cv_template',
    'Classic Professional',
    DEFAULT_PRODUCTS,
    [],
    empty,
  );
  assert.ok(classic, 'priced CV template should require payment until purchased');
  assert.equal(classic.sku, 'template.cv.classic-professional');
  assert.ok(classic.amount > 0);

  const owned = unpaidTemplateUnlock(
    'cv_template',
    'Classic Professional',
    DEFAULT_PRODUCTS,
    [],
    new Set(['template.cv.classic-professional']),
  );
  assert.equal(owned, null);

  const letter = unpaidTemplateUnlock(
    'cover_letter_template',
    'Classic Professional Cover Letter',
    DEFAULT_PRODUCTS,
    [],
    empty,
  );
  assert.ok(letter, 'priced cover letter should require payment until purchased');
  assert.equal(letter.kind, 'cover_letter_template');

  const unknown = unpaidTemplateUnlock('cv_template', 'Not A Real Template', DEFAULT_PRODUCTS, [], empty);
  assert.equal(unknown, null);

  const freeProduct: CatalogProduct = {
    ...DEFAULT_PRODUCTS[0],
    sku: 'template.cv.free-preview',
    kind: 'cv_template',
    name: 'Free Preview',
    price_kes: 0,
    metadata: { templateName: 'Free Preview' },
  };
  assert.equal(
    unpaidTemplateUnlock('cv_template', 'Free Preview', [freeProduct], [], empty),
    null,
  );
  assert.match(templateUnlockDescription('cv_template'), /download, share, or apply/i);
  assert.match(templateUnlockDescription('cover_letter_template'), /download or use/i);
  console.log('✓ unpaid template unlock is delayed until download/use');
}

function main() {
  testDefaultCatalogCoverage();
  testDiscountMath();
  testQuoteWithOfferAndCoupon();
  testMergeOverlay();
  testMpesaSettingsParse();
  testUnpaidTemplateUnlock();
  console.log('All pricing unit tests passed');
}

main();
