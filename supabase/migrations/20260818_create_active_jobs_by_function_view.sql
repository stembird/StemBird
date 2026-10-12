-- ============================================================
-- Active jobs grouped by function — efficient feed for the
-- "Explore Jobs by Function" homepage visualization.
-- ============================================================
-- The bars/donut must count active/live jobs per function without shipping
-- every job record to the client. This view pre-aggregates the job_function
-- column in Postgres using the same active-status rule the rest of the
-- application uses (status = 'active'), so the homepage reads one small
-- result set.
--
-- Jobs without a function are bucketed under "Other / Miscellaneous" (a real
-- canonical function) so the sum of the view always equals the total active
-- job count shown elsewhere on the homepage.
--
-- The application layer (src/lib/jobsByFunction.ts) prefers this view and
-- falls back to a server-side column scan if it has not been applied yet.
--
-- APPLYING: run this file in the Supabase dashboard SQL editor (or `supabase
-- db push` once the local/remote migration history is in sync). Until then
-- the homepage still works via the built-in fallback scan.
-- ============================================================

CREATE OR REPLACE VIEW public.active_jobs_by_function
WITH (security_invoker = true) AS
SELECT
  COALESCE(NULLIF(TRIM(job_function), ''), 'Other / Miscellaneous') AS function_name,
  COUNT(*)::bigint AS job_count
FROM public.jobs
WHERE status = 'active'
GROUP BY COALESCE(NULLIF(TRIM(job_function), ''), 'Other / Miscellaneous');

-- Expose to the anon + authenticated roles (the same public-read audience
-- that can already read the jobs table).
GRANT SELECT ON public.active_jobs_by_function TO anon, authenticated;

-- Index used by the grouped scan (status + function).
CREATE INDEX IF NOT EXISTS idx_jobs_status_function
  ON public.jobs (status, job_function);
