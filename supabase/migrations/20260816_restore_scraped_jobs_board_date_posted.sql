-- ============================================================
-- Restore scraped jobs.date_posted to the source board's
-- original employer posting date where that date is available
-- ============================================================
-- 20260813_reset_scraped_jobs_date_posted.sql set date_posted = created_at
-- for all published scraped jobs, so Google's datePosted no longer reflects
-- the employer's original posting date. Google requires datePosted to be
-- "the original date that employer posted the job."
--
-- This migration reverses that for jobs where scraped_job_sources.raw_data
-- still holds the source board's datePosted (the same signal used by the
-- 20260801 backfill). Jobs without a recoverable board date keep their
-- current value (created_at fallback).
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
  -- Only rewrite jobs that still carry the publish-time fallback, so we never
  -- clobber a manually corrected date_posted.
  AND (
    j.date_posted IS NULL
    OR j.date_posted IS NOT DISTINCT FROM j.created_at
    OR ABS(EXTRACT(EPOCH FROM (j.date_posted - j.created_at))) < 120
  );

COMMIT;
