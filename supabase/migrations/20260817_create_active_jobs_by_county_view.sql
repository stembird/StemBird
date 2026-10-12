-- ============================================================
-- Active jobs grouped by county — efficient feed for the
-- "Live Jobs Across Kenya" homepage map.
-- ============================================================
-- The map must count active/live jobs per county without shipping every
-- job record to the client. This view pre-aggregates the county column in
-- Postgres using the same active-status rule the rest of the application
-- uses (status = 'active'), so the homepage can read one small result set.
--
-- The application layer (src/lib/jobsByCounty.ts) prefers this view and
-- falls back to a server-side column scan if it has not been applied yet.
--
-- APPLYING: run this file in the Supabase dashboard SQL editor (or `supabase
-- db push` once the local/remote migration history is in sync). Until then
-- the homepage still works via the built-in fallback scan.
-- ============================================================

CREATE OR REPLACE VIEW public.active_jobs_by_county
WITH (security_invoker = true) AS
SELECT
  job_location_county AS county,
  COUNT(*)::bigint AS job_count
FROM public.jobs
WHERE status = 'active'
GROUP BY job_location_county;

-- Expose to the anon + authenticated roles (the same public-read audience
-- that can already read the jobs table).
GRANT SELECT ON public.active_jobs_by_county TO anon, authenticated;

-- Index used by the grouped scan (status + county).
CREATE INDEX IF NOT EXISTS idx_jobs_status_county
  ON public.jobs (status, job_location_county);
