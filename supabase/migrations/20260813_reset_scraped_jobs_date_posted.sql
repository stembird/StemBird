-- ============================================================
-- Reset scraped jobs.date_posted to when CareerSasa added them
-- ============================================================
-- 20260801_backfill_board_date_posted.sql copied the source board's
-- datePosted into jobs.date_posted, which made Google see stale
-- freshness on recrawl and shifted the day buckets. CareerSasa's
-- date_posted should be the time the job was added/published here
-- (DB default now() == created_at), not the source's publication date.
-- ============================================================

BEGIN;

UPDATE public.jobs AS j
SET date_posted = j.created_at
FROM public.scraped_job_sources AS s
WHERE s.job_id = j.id
  AND s.status = 'published'
  AND j.date_posted IS DISTINCT FROM j.created_at;

COMMIT;
