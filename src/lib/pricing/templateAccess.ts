import { productForTemplateName } from './defaults';
import { quoteProductPrice } from './discount';
import type { CatalogOffer, CatalogProduct } from './types';

export type TemplateProductKind = 'cv_template' | 'cover_letter_template';

export type TemplateUnlock = {
  kind: TemplateProductKind;
  sku: string;
  title: string;
  amount: number;
};

/** Payment is due when the user downloads, shares, copies, or applies — not when they start editing. */
export function unpaidTemplateUnlock(
  kind: TemplateProductKind,
  templateName: string,
  products: CatalogProduct[],
  offers: CatalogOffer[],
  purchasedSkus: Set<string>,
): TemplateUnlock | null {
  const product = productForTemplateName(kind, templateName, products);
  if (!product) return null;
  const quote = quoteProductPrice(product, offers);
  if (quote.amount <= 0 || purchasedSkus.has(product.sku)) return null;
  return {
    kind,
    sku: product.sku,
    title: product.name,
    amount: quote.amount,
  };
}

export function templateUnlockDescription(kind: TemplateProductKind): string {
  return kind === 'cv_template'
    ? 'Pay with M-Pesa to download, share, or apply with this CV template.'
    : 'Pay with M-Pesa to download or use this cover letter template.';
}
