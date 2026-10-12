-- Ensure BrighterMonday is marked as a job board (not an employer ATS).
-- Prefer employer apply links/emails from listing detail; board URL is fallback only.
UPDATE public.scraper_sources
SET selectors = selectors || '{"sourceKind": "job_board"}'::jsonb
WHERE source_id = 'brightermonday-kenya'
  AND COALESCE(selectors->>'sourceKind', '') IS DISTINCT FROM 'job_board';
