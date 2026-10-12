-- ============================================================
-- Backfill jobs.date_posted from board JSON-LD datePosted
-- ============================================================
-- Scraped MyJobMag / BrighterMonday / Fuzu jobs previously defaulted
-- date_posted to insert time (now()), so day buckets on CareerSasa
-- did not match the source board. raw_data on scraped_job_sources
-- still holds the original datePosted for published rows.
-- ============================================================

BEGIN;

UPDATE public.jobs AS j
SET date_posted = (s.raw_data->>'datePosted')::timestamptz
FROM public.scraped_job_sources AS s
WHERE s.job_id = j.id
  AND s.status = 'published'
  AND s.source_id IN ('myjobmag-kenya', 'brightermonday-kenya', 'fuzu-kenya')
  AND s.raw_data ? 'datePosted'
  AND NULLIF(TRIM(s.raw_data->>'datePosted'), '') IS NOT NULL
  AND (s.raw_data->>'datePosted') ~ '^[0-9]{4}-'
  AND (
    j.date_posted IS NULL
    OR j.date_posted IS NOT DISTINCT FROM j.created_at
    OR ABS(EXTRACT(EPOCH FROM (j.date_posted - j.created_at))) < 120
  );

COMMIT;
