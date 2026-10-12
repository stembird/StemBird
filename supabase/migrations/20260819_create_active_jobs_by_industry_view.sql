-- ============================================================
-- Active jobs grouped by industry — efficient feed for the
-- "Jobs by Industry" hub and homepage teaser.
-- ============================================================
-- Counts active/live jobs per industry without shipping every job
-- record to the client. Uses the same active-status rule as the rest of
-- the application (status = 'active').
--
-- Jobs without an industry are bucketed under
-- "Non-classified / Miscellaneous" (a real canonical industry) so the
-- sum of the view always equals the total active job count.
--
-- The application layer (src/lib/jobsByIndustry.ts) prefers this view and
-- falls back to a server-side column scan if it has not been applied yet.
-- ============================================================

CREATE OR REPLACE VIEW public.active_jobs_by_industry
WITH (security_invoker = true) AS
SELECT
  COALESCE(NULLIF(TRIM(industry), ''), 'Non-classified / Miscellaneous') AS industry_name,
  COUNT(*)::bigint AS job_count
FROM public.jobs
WHERE status = 'active'
GROUP BY COALESCE(NULLIF(TRIM(industry), ''), 'Non-classified / Miscellaneous');

GRANT SELECT ON public.active_jobs_by_industry TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_jobs_status_industry
  ON public.jobs (status, industry);
