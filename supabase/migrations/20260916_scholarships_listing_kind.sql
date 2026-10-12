-- Scholarships as a listing kind on jobs, plus labelled fact columns.
-- Public /jobs queries must filter listing_kind = 'job'. Scholarships use
-- /scholarships and /scholarships/{slug}.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS listing_kind TEXT NOT NULL DEFAULT 'job';

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_listing_kind_check;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_listing_kind_check
  CHECK (listing_kind IN ('job', 'scholarship'));

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS scholarship_level TEXT,
  ADD COLUMN IF NOT EXISTS scholarship_coverage TEXT,
  ADD COLUMN IF NOT EXISTS scholarship_duration TEXT,
  ADD COLUMN IF NOT EXISTS scholarship_nationality TEXT,
  ADD COLUMN IF NOT EXISTS scholarship_age_limit TEXT,
  ADD COLUMN IF NOT EXISTS scholarship_bonding TEXT,
  ADD COLUMN IF NOT EXISTS scholarship_host_institution TEXT,
  ADD COLUMN IF NOT EXISTS scholarship_awards_count INTEGER,
  ADD COLUMN IF NOT EXISTS scholarship_programme_start DATE;

CREATE INDEX IF NOT EXISTS idx_jobs_listing_kind_status
  ON public.jobs (listing_kind, status);

CREATE INDEX IF NOT EXISTS idx_jobs_scholarships_active
  ON public.jobs (status, created_at DESC)
  WHERE listing_kind = 'scholarship';

-- Backfill awards. Admin / employment titles stay jobs.
UPDATE public.jobs
SET listing_kind = 'scholarship'
WHERE listing_kind = 'job'
  AND (
    title ~* '\y(scholarship|bursar(y|ies)|scholars? programme|scholars? program)\y'
    OR COALESCE(tags::text, '') ~* 'bursary and scholarships'
  )
  AND title !~* '\y(coordinator|officer|manager|administrator|clerk|director|specialist|analyst)\y';

CREATE OR REPLACE VIEW public.active_jobs_by_industry
WITH (security_invoker = true) AS
SELECT
  COALESCE(NULLIF(TRIM(industry), ''), 'Non-classified / Miscellaneous') AS industry_name,
  COUNT(*)::bigint AS job_count
FROM public.jobs
WHERE status = 'active'
  AND COALESCE(listing_kind, 'job') = 'job'
GROUP BY COALESCE(NULLIF(TRIM(industry), ''), 'Non-classified / Miscellaneous');

GRANT SELECT ON public.active_jobs_by_industry TO anon, authenticated;

CREATE OR REPLACE VIEW public.active_jobs_by_function
WITH (security_invoker = true) AS
SELECT
  COALESCE(NULLIF(TRIM(job_function), ''), 'Other / Miscellaneous') AS function_name,
  COUNT(*)::bigint AS job_count
FROM public.jobs
WHERE status = 'active'
  AND COALESCE(listing_kind, 'job') = 'job'
GROUP BY COALESCE(NULLIF(TRIM(job_function), ''), 'Other / Miscellaneous');

GRANT SELECT ON public.active_jobs_by_function TO anon, authenticated;

CREATE OR REPLACE VIEW public.active_jobs_by_county
WITH (security_invoker = true) AS
SELECT
  job_location_county AS county,
  COUNT(*)::bigint AS job_count
FROM public.jobs
WHERE status = 'active'
  AND COALESCE(listing_kind, 'job') = 'job'
GROUP BY job_location_county;

GRANT SELECT ON public.active_jobs_by_county TO anon, authenticated;

CREATE OR REPLACE VIEW public.active_jobs_by_company
WITH (security_invoker = true) AS
SELECT
  company_id,
  COUNT(*)::bigint AS job_count
FROM public.jobs
WHERE status = 'active'
  AND COALESCE(listing_kind, 'job') = 'job'
  AND company_id IS NOT NULL
GROUP BY company_id;

GRANT SELECT ON public.active_jobs_by_company TO anon, authenticated;
