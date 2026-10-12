-- Pricing catalog, coupons, offers, template prices, and M-Pesa dashboard settings.

ALTER TABLE public.cv_templates
  ADD COLUMN IF NOT EXISTS price_kes NUMERIC(12, 2);

ALTER TABLE public.cover_letter_templates
  ADD COLUMN IF NOT EXISTS price_kes NUMERIC(12, 2);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('service', 'cv_template', 'cover_letter_template', 'job_action')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_kes NUMERIC(12, 2) NOT NULL CHECK (price_kes >= 0),
  compare_at_price_kes NUMERIC(12, 2) CHECK (compare_at_price_kes IS NULL OR compare_at_price_kes >= 0),
  duration_days INTEGER,
  billing_interval TEXT DEFAULT 'one_time' CHECK (billing_interval IN ('one_time', 'month')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_kind_idx ON public.products (kind);
CREATE INDEX IF NOT EXISTS products_active_idx ON public.products (is_active);

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(12, 2) NOT NULL CHECK (discount_value > 0),
  min_amount_kes NUMERIC(12, 2),
  max_discount_kes NUMERIC(12, 2),
  applies_to TEXT NOT NULL DEFAULT 'all'
    CHECK (applies_to IN ('all', 'service', 'cv_template', 'cover_letter_template', 'job_action', 'sku')),
  applicable_skus TEXT[] NOT NULL DEFAULT '{}',
  usage_limit INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  badge_text TEXT,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(12, 2) NOT NULL CHECK (discount_value > 0),
  applies_to TEXT NOT NULL DEFAULT 'all'
    CHECK (applies_to IN ('all', 'service', 'cv_template', 'cover_letter_template', 'job_action', 'sku')),
  applicable_skus TEXT[] NOT NULL DEFAULT '{}',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  product_sku TEXT,
  amount_kes NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coupon_redemptions_coupon_idx ON public.coupon_redemptions (coupon_id);
CREATE INDEX IF NOT EXISTS coupon_redemptions_user_idx ON public.coupon_redemptions (user_id);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read products" ON public.products;
CREATE POLICY "Public can read products"
  ON public.products FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons"
  ON public.coupons FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Public can read active offers" ON public.offers;
CREATE POLICY "Public can read active offers"
  ON public.offers FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage offers" ON public.offers;
CREATE POLICY "Admins can manage offers"
  ON public.offers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can view own coupon redemptions" ON public.coupon_redemptions;
CREATE POLICY "Users can view own coupon redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view coupon redemptions" ON public.coupon_redemptions;
CREATE POLICY "Admins can view coupon redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'update_updated_at_column' AND n.nspname = 'public'
  ) THEN
    DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
    CREATE TRIGGER update_products_updated_at
      BEFORE UPDATE ON public.products
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS update_coupons_updated_at ON public.coupons;
    CREATE TRIGGER update_coupons_updated_at
      BEFORE UPDATE ON public.coupons
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS update_offers_updated_at ON public.offers;
    CREATE TRIGGER update_offers_updated_at
      BEFORE UPDATE ON public.offers
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Default M-Pesa checkout: send money to the business mobile number.
-- Buy Goods (till) and STK Push can be enabled from the admin dashboard.
INSERT INTO public.app_settings (key, value)
VALUES (
  'mpesa_settings',
  '{"environment":"sandbox","phoneEnabled":true,"tillEnabled":true,"stkEnabled":false,"defaultMethod":"phone","stkMode":"paybill","phoneNumber":"254795564135","tillNumber":"","paybillNumber":"","accountReference":"CareerSasa"}'
)
ON CONFLICT (key) DO NOTHING;

-- If an earlier revision of this migration seeded the previous number, move it.
UPDATE public.app_settings
SET value = replace(value, '254795565135', '254795564135'),
    updated_at = now()
WHERE key = 'mpesa_settings'
  AND value LIKE '%254795565135%';

-- Seed catalog. Application also upserts these on first load if the table is empty.
INSERT INTO public.products (
  sku, kind, name, description, price_kes, compare_at_price_kes, duration_days,
  billing_interval, is_active, sort_order, metadata
) VALUES
  ('service.cv.writing', 'service', 'CV / Resume Writing', 'Professionally written CV from scratch or rewrite.', 4000, 5000, NULL, 'one_time', true, 10, '{"service":"cv","packageId":"writing"}'),
  ('service.cv.graduate', 'service', 'Graduate & Entry-Level CVs', 'Skills-based CV for students and fresh graduates.', 2500, 3500, NULL, 'one_time', true, 11, '{"service":"cv","packageId":"graduate"}'),
  ('service.cv.transition', 'service', 'Career Transition CVs', 'Reposition experience for a new career direction.', 5000, 6000, NULL, 'one_time', true, 12, '{"service":"cv","packageId":"transition"}'),
  ('service.cv.executive', 'service', 'Executive & Senior-Level CVs', 'Strategic, results-driven CV for leaders.', 10000, 12000, NULL, 'one_time', true, 13, '{"service":"cv","packageId":"executive"}'),
  ('service.cv.alignment', 'service', 'CV + LinkedIn Alignment', 'Align CV language and positioning with LinkedIn.', 3000, 4000, NULL, 'one_time', true, 14, '{"service":"cv","packageId":"alignment"}'),
  ('service.cover-letter.professional', 'service', 'Professional Cover Letter Writing', '', 3000, 4000, NULL, 'one_time', true, 20, '{"service":"cover-letter","packageId":"professional"}'),
  ('service.cover-letter.graduate', 'service', 'Graduate & Entry-Level Cover Letters', '', 2000, 2500, NULL, 'one_time', true, 21, '{"service":"cover-letter","packageId":"graduate"}'),
  ('service.cover-letter.transition', 'service', 'Career Transition Cover Letters', '', 4000, 5000, NULL, 'one_time', true, 22, '{"service":"cover-letter","packageId":"transition"}'),
  ('service.cover-letter.executive', 'service', 'Executive & Senior-Level Cover Letters', '', 6500, 8000, NULL, 'one_time', true, 23, '{"service":"cover-letter","packageId":"executive"}'),
  ('service.cover-letter.alignment', 'service', 'CV + Cover Letter Alignment', '', 3000, 4000, NULL, 'one_time', true, 24, '{"service":"cover-letter","packageId":"alignment"}'),
  ('service.linkedin.audit', 'service', 'LinkedIn Profile Audit', '', 3000, 4000, NULL, 'one_time', true, 30, '{"service":"linkedin","packageId":"audit"}'),
  ('service.linkedin.optimization', 'service', 'LinkedIn Profile Optimization', '', 6500, 8000, NULL, 'one_time', true, 31, '{"service":"linkedin","packageId":"optimization"}'),
  ('service.linkedin.alignment', 'service', 'LinkedIn + CV Alignment', '', 5000, 6000, NULL, 'one_time', true, 32, '{"service":"linkedin","packageId":"alignment"}'),
  ('service.linkedin.branding', 'service', 'LinkedIn Personal Branding', '', 10000, 12000, NULL, 'one_time', true, 33, '{"service":"linkedin","packageId":"branding"}'),
  ('service.linkedin.management', 'service', 'LinkedIn Social Media Management', '', 12000, 15000, NULL, 'month', true, 34, '{"service":"linkedin","packageId":"management"}'),
  ('job.promote.basic', 'job_action', 'Promote job (7 days)', 'Boosts the job above organic results for 7 days.', 1000, NULL, 7, 'one_time', true, 40, '{"action":"promote","tier":"basic"}'),
  ('job.promote.premium', 'job_action', 'Promote job (14 days)', 'Boosts the job above organic results for 14 days.', 2500, NULL, 14, 'one_time', true, 41, '{"action":"promote","tier":"premium"}'),
  ('job.feature', 'job_action', 'Feature job (7 days)', 'Places the job in the featured section for 7 days.', 2000, NULL, 7, 'one_time', true, 42, '{"action":"feature"}'),
  ('template.cv.classic-professional', 'cv_template', 'Classic Professional', '', 350, NULL, NULL, 'one_time', true, 50, '{"templateName":"Classic Professional"}'),
  ('template.cv.modern-professional', 'cv_template', 'Modern Professional', '', 350, NULL, NULL, 'one_time', true, 51, '{"templateName":"Modern Professional"}'),
  ('template.cv.graduate-starter-cv', 'cv_template', 'Graduate Starter CV', '', 350, NULL, NULL, 'one_time', true, 52, '{"templateName":"Graduate Starter CV"}'),
  ('template.cv.internship-industrial-attachment', 'cv_template', 'Internship / Industrial Attachment', '', 350, NULL, NULL, 'one_time', true, 53, '{"templateName":"Internship / Industrial Attachment"}'),
  ('template.cv.skills-based-functional', 'cv_template', 'Skills-Based (Functional)', '', 350, NULL, NULL, 'one_time', true, 54, '{"templateName":"Skills-Based (Functional)"}'),
  ('template.cv.creative-portfolio', 'cv_template', 'Creative Portfolio', '', 750, NULL, NULL, 'one_time', true, 55, '{"templateName":"Creative Portfolio","premium":true}'),
  ('template.cv.digital-professional', 'cv_template', 'Digital Professional', '', 750, NULL, NULL, 'one_time', true, 56, '{"templateName":"Digital Professional","premium":true}'),
  ('template.cv.executive-leadership', 'cv_template', 'Executive Leadership', '', 750, NULL, NULL, 'one_time', true, 57, '{"templateName":"Executive Leadership","premium":true}'),
  ('template.cv.personal-brand-cv', 'cv_template', 'Personal Brand CV', '', 750, NULL, NULL, 'one_time', true, 58, '{"templateName":"Personal Brand CV","premium":true}'),
  ('template.cv.technical-engineering-cv', 'cv_template', 'Technical / Engineering CV', '', 750, NULL, NULL, 'one_time', true, 59, '{"templateName":"Technical / Engineering CV","premium":true}'),
  ('template.cv.international-ats-optimized-cv', 'cv_template', 'International / ATS Optimized CV', '', 750, NULL, NULL, 'one_time', true, 60, '{"templateName":"International / ATS Optimized CV","premium":true}'),
  ('template.cv.academic-research-cv', 'cv_template', 'Academic / Research CV', '', 750, NULL, NULL, 'one_time', true, 61, '{"templateName":"Academic / Research CV","premium":true}'),
  ('template.cover-letter.classic-professional', 'cover_letter_template', 'Classic Professional Cover Letter', '', 250, NULL, NULL, 'one_time', true, 70, '{"templateName":"Classic Professional Cover Letter","registryId":"classic-professional"}'),
  ('template.cover-letter.modern-professional', 'cover_letter_template', 'Modern Professional Cover Letter', '', 250, NULL, NULL, 'one_time', true, 71, '{"templateName":"Modern Professional Cover Letter","registryId":"modern-professional"}'),
  ('template.cover-letter.short-direct', 'cover_letter_template', 'Short & Direct Cover Letter', '', 250, NULL, NULL, 'one_time', true, 72, '{"templateName":"Short & Direct Cover Letter","registryId":"short-direct"}'),
  ('template.cover-letter.graduate-entry-level', 'cover_letter_template', 'Graduate / Entry-Level Cover Letter', '', 250, NULL, NULL, 'one_time', true, 73, '{"templateName":"Graduate / Entry-Level Cover Letter","registryId":"graduate-entry-level"}'),
  ('template.cover-letter.internship-attachment', 'cover_letter_template', 'Internship / Attachment Cover Letter', '', 250, NULL, NULL, 'one_time', true, 74, '{"templateName":"Internship / Attachment Cover Letter","registryId":"internship-attachment"}'),
  ('template.cover-letter.skills-entry-level', 'cover_letter_template', 'Skills-Focused Entry-Level Cover Letter', '', 250, NULL, NULL, 'one_time', true, 75, '{"templateName":"Skills-Focused Entry-Level Cover Letter","registryId":"skills-entry-level"}'),
  ('template.cover-letter.career-change', 'cover_letter_template', 'Career Change Cover Letter', '', 450, NULL, NULL, 'one_time', true, 76, '{"templateName":"Career Change Cover Letter"}'),
  ('template.cover-letter.personal-brand', 'cover_letter_template', 'Personal Brand Cover Letter', '', 450, NULL, NULL, 'one_time', true, 77, '{"templateName":"Personal Brand Cover Letter"}'),
  ('template.cover-letter.international-ats', 'cover_letter_template', 'International / ATS-Friendly Cover Letter', '', 450, NULL, NULL, 'one_time', true, 78, '{"templateName":"International / ATS-Friendly Cover Letter"}')
ON CONFLICT (sku) DO NOTHING;

UPDATE public.cv_templates t
SET price_kes = p.price_kes
FROM public.products p
WHERE p.kind = 'cv_template'
  AND p.name = t.name
  AND t.price_kes IS NULL;

UPDATE public.cover_letter_templates t
SET price_kes = p.price_kes
FROM public.products p
WHERE p.kind = 'cover_letter_template'
  AND p.name = t.name
  AND t.price_kes IS NULL;

COMMENT ON TABLE public.products IS 'Sellable catalog: career services, CV/cover-letter templates, and paid job actions';
COMMENT ON TABLE public.coupons IS 'Admin-managed coupon codes applied at checkout';
COMMENT ON TABLE public.offers IS 'Time-boxed discounts automatically applied to matching products';
