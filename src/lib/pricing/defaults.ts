import type { CatalogProduct, MpesaPaymentSettings } from './types';

/** Default till the business registers a Buy Goods till. Admin can replace this. */
export const DEFAULT_MPESA_PHONE = '254795564135';

export const DEFAULT_MPESA_SETTINGS: MpesaPaymentSettings = {
  environment: 'sandbox',
  phoneEnabled: true,
  tillEnabled: true,
  stkEnabled: false,
  defaultMethod: 'phone',
  stkMode: 'paybill',
  phoneNumber: DEFAULT_MPESA_PHONE,
  tillNumber: '',
  paybillNumber: '',
  accountReference: 'CareerSasa',
};

function product(
  sku: string,
  kind: CatalogProduct['kind'],
  name: string,
  price_kes: number,
  extras: Partial<CatalogProduct> = {}
): CatalogProduct {
  return {
    sku,
    kind,
    name,
    description: extras.description || '',
    price_kes,
    compare_at_price_kes: extras.compare_at_price_kes ?? null,
    duration_days: extras.duration_days ?? null,
    billing_interval: extras.billing_interval ?? 'one_time',
    is_active: extras.is_active ?? true,
    sort_order: extras.sort_order ?? 0,
    metadata: extras.metadata || {},
  };
}

/**
 * Canonical catalog. Database rows overlay these by sku; missing rows fall back here
 * so the site still has prices before the migration is applied.
 */
export const DEFAULT_PRODUCTS: CatalogProduct[] = [
  // Career services — CV
  product('service.cv.writing', 'service', 'CV / Resume Writing', 4000, {
    compare_at_price_kes: 5000,
    sort_order: 10,
    description: 'Professionally written CV from scratch or rewrite.',
    metadata: { service: 'cv', packageId: 'writing' },
  }),
  product('service.cv.graduate', 'service', 'Graduate & Entry-Level CVs', 2500, {
    compare_at_price_kes: 3500,
    sort_order: 11,
    description: 'Skills-based CV for students and fresh graduates.',
    metadata: { service: 'cv', packageId: 'graduate' },
  }),
  product('service.cv.transition', 'service', 'Career Transition CVs', 5000, {
    compare_at_price_kes: 6000,
    sort_order: 12,
    description: 'Reposition experience for a new career direction.',
    metadata: { service: 'cv', packageId: 'transition' },
  }),
  product('service.cv.executive', 'service', 'Executive & Senior-Level CVs', 10000, {
    compare_at_price_kes: 12000,
    sort_order: 13,
    description: 'Strategic, results-driven CV for leaders.',
    metadata: { service: 'cv', packageId: 'executive' },
  }),
  product('service.cv.alignment', 'service', 'CV + LinkedIn Alignment', 3000, {
    compare_at_price_kes: 4000,
    sort_order: 14,
    description: 'Align CV language and positioning with LinkedIn.',
    metadata: { service: 'cv', packageId: 'alignment' },
  }),

  // Career services — cover letter
  product('service.cover-letter.professional', 'service', 'Professional Cover Letter Writing', 3000, {
    compare_at_price_kes: 4000,
    sort_order: 20,
    metadata: { service: 'cover-letter', packageId: 'professional' },
  }),
  product('service.cover-letter.graduate', 'service', 'Graduate & Entry-Level Cover Letters', 2000, {
    compare_at_price_kes: 2500,
    sort_order: 21,
    metadata: { service: 'cover-letter', packageId: 'graduate' },
  }),
  product('service.cover-letter.transition', 'service', 'Career Transition Cover Letters', 4000, {
    compare_at_price_kes: 5000,
    sort_order: 22,
    metadata: { service: 'cover-letter', packageId: 'transition' },
  }),
  product('service.cover-letter.executive', 'service', 'Executive & Senior-Level Cover Letters', 6500, {
    compare_at_price_kes: 8000,
    sort_order: 23,
    metadata: { service: 'cover-letter', packageId: 'executive' },
  }),
  product('service.cover-letter.alignment', 'service', 'CV + Cover Letter Alignment', 3000, {
    compare_at_price_kes: 4000,
    sort_order: 24,
    metadata: { service: 'cover-letter', packageId: 'alignment' },
  }),

  // Career services — LinkedIn
  product('service.linkedin.audit', 'service', 'LinkedIn Profile Audit', 3000, {
    compare_at_price_kes: 4000,
    sort_order: 30,
    metadata: { service: 'linkedin', packageId: 'audit' },
  }),
  product('service.linkedin.optimization', 'service', 'LinkedIn Profile Optimization', 6500, {
    compare_at_price_kes: 8000,
    sort_order: 31,
    metadata: { service: 'linkedin', packageId: 'optimization' },
  }),
  product('service.linkedin.alignment', 'service', 'LinkedIn + CV Alignment', 5000, {
    compare_at_price_kes: 6000,
    sort_order: 32,
    metadata: { service: 'linkedin', packageId: 'alignment' },
  }),
  product('service.linkedin.branding', 'service', 'LinkedIn Personal Branding', 10000, {
    compare_at_price_kes: 12000,
    sort_order: 33,
    metadata: { service: 'linkedin', packageId: 'branding' },
  }),
  product('service.linkedin.management', 'service', 'LinkedIn Social Media Management', 12000, {
    compare_at_price_kes: 15000,
    billing_interval: 'month',
    sort_order: 34,
    metadata: { service: 'linkedin', packageId: 'management' },
  }),

  // Paid job actions
  product('job.promote.basic', 'job_action', 'Promote job (7 days)', 1000, {
    duration_days: 7,
    sort_order: 40,
    description: 'Boosts the job above organic results for 7 days.',
    metadata: { action: 'promote', tier: 'basic' },
  }),
  product('job.promote.premium', 'job_action', 'Promote job (14 days)', 2500, {
    duration_days: 14,
    sort_order: 41,
    description: 'Boosts the job above organic results for 14 days.',
    metadata: { action: 'promote', tier: 'premium' },
  }),
  product('job.feature', 'job_action', 'Feature job (7 days)', 2000, {
    duration_days: 7,
    sort_order: 42,
    description: 'Places the job in the featured section for 7 days.',
    metadata: { action: 'feature' },
  }),

  // CV templates
  product('template.cv.classic-professional', 'cv_template', 'Classic Professional', 350, {
    sort_order: 50,
    metadata: { templateName: 'Classic Professional' },
  }),
  product('template.cv.modern-professional', 'cv_template', 'Modern Professional', 350, {
    sort_order: 51,
    metadata: { templateName: 'Modern Professional' },
  }),
  product('template.cv.graduate-starter-cv', 'cv_template', 'Graduate Starter CV', 350, {
    sort_order: 52,
    metadata: { templateName: 'Graduate Starter CV' },
  }),
  product('template.cv.internship-industrial-attachment', 'cv_template', 'Internship / Industrial Attachment', 350, {
    sort_order: 53,
    metadata: { templateName: 'Internship / Industrial Attachment' },
  }),
  product('template.cv.skills-based-functional', 'cv_template', 'Skills-Based (Functional)', 350, {
    sort_order: 54,
    metadata: { templateName: 'Skills-Based (Functional)' },
  }),
  product('template.cv.creative-portfolio', 'cv_template', 'Creative Portfolio', 750, {
    sort_order: 55,
    metadata: { templateName: 'Creative Portfolio', premium: true },
  }),
  product('template.cv.digital-professional', 'cv_template', 'Digital Professional', 750, {
    sort_order: 56,
    metadata: { templateName: 'Digital Professional', premium: true },
  }),
  product('template.cv.executive-leadership', 'cv_template', 'Executive Leadership', 750, {
    sort_order: 57,
    metadata: { templateName: 'Executive Leadership', premium: true },
  }),
  product('template.cv.personal-brand-cv', 'cv_template', 'Personal Brand CV', 750, {
    sort_order: 58,
    metadata: { templateName: 'Personal Brand CV', premium: true },
  }),
  product('template.cv.technical-engineering-cv', 'cv_template', 'Technical / Engineering CV', 750, {
    sort_order: 59,
    metadata: { templateName: 'Technical / Engineering CV', premium: true },
  }),
  product('template.cv.international-ats-optimized-cv', 'cv_template', 'International / ATS Optimized CV', 750, {
    sort_order: 60,
    metadata: { templateName: 'International / ATS Optimized CV', premium: true },
  }),
  product('template.cv.academic-research-cv', 'cv_template', 'Academic / Research CV', 750, {
    sort_order: 61,
    metadata: { templateName: 'Academic / Research CV', premium: true },
  }),

  // Cover letter templates
  product('template.cover-letter.classic-professional', 'cover_letter_template', 'Classic Professional Cover Letter', 250, {
    sort_order: 70,
    metadata: { templateName: 'Classic Professional Cover Letter', registryId: 'classic-professional' },
  }),
  product('template.cover-letter.modern-professional', 'cover_letter_template', 'Modern Professional Cover Letter', 250, {
    sort_order: 71,
    metadata: { templateName: 'Modern Professional Cover Letter', registryId: 'modern-professional' },
  }),
  product('template.cover-letter.short-direct', 'cover_letter_template', 'Short & Direct Cover Letter', 250, {
    sort_order: 72,
    metadata: { templateName: 'Short & Direct Cover Letter', registryId: 'short-direct' },
  }),
  product('template.cover-letter.graduate-entry-level', 'cover_letter_template', 'Graduate / Entry-Level Cover Letter', 250, {
    sort_order: 73,
    metadata: { templateName: 'Graduate / Entry-Level Cover Letter', registryId: 'graduate-entry-level' },
  }),
  product('template.cover-letter.internship-attachment', 'cover_letter_template', 'Internship / Attachment Cover Letter', 250, {
    sort_order: 74,
    metadata: { templateName: 'Internship / Attachment Cover Letter', registryId: 'internship-attachment' },
  }),
  product('template.cover-letter.skills-entry-level', 'cover_letter_template', 'Skills-Focused Entry-Level Cover Letter', 250, {
    sort_order: 75,
    metadata: { templateName: 'Skills-Focused Entry-Level Cover Letter', registryId: 'skills-entry-level' },
  }),
  product('template.cover-letter.career-change', 'cover_letter_template', 'Career Change Cover Letter', 450, {
    sort_order: 76,
    metadata: { templateName: 'Career Change Cover Letter' },
  }),
  product('template.cover-letter.personal-brand', 'cover_letter_template', 'Personal Brand Cover Letter', 450, {
    sort_order: 77,
    metadata: { templateName: 'Personal Brand Cover Letter' },
  }),
  product('template.cover-letter.international-ats', 'cover_letter_template', 'International / ATS-Friendly Cover Letter', 450, {
    sort_order: 78,
    metadata: { templateName: 'International / ATS-Friendly Cover Letter' },
  }),
];

export function productBySku(sku: string, products: CatalogProduct[] = DEFAULT_PRODUCTS): CatalogProduct | undefined {
  return products.find((p) => p.sku === sku);
}

export function productsForService(
  service: string,
  products: CatalogProduct[] = DEFAULT_PRODUCTS
): CatalogProduct[] {
  return products.filter(
    (p) => p.kind === 'service' && p.metadata?.service === service && p.is_active
  );
}

export function productForPackage(
  service: string,
  packageId: string,
  products: CatalogProduct[] = DEFAULT_PRODUCTS
): CatalogProduct | undefined {
  return products.find(
    (p) =>
      p.kind === 'service' &&
      p.metadata?.service === service &&
      p.metadata?.packageId === packageId
  );
}

export function productForTemplateName(
  kind: 'cv_template' | 'cover_letter_template',
  templateName: string,
  products: CatalogProduct[] = DEFAULT_PRODUCTS
): CatalogProduct | undefined {
  const needle = templateName.trim().toLowerCase();
  return products.find((p) => {
    if (p.kind !== kind) return false;
    const metaName = typeof p.metadata?.templateName === 'string' ? p.metadata.templateName : '';
    return p.name.toLowerCase() === needle || metaName.toLowerCase() === needle;
  });
}

export function jobActionSku(action: 'promote' | 'feature', tier?: string): string {
  if (action === 'feature') return 'job.feature';
  if (tier === 'premium') return 'job.promote.premium';
  return 'job.promote.basic';
}
