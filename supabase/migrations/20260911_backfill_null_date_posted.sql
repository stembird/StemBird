-- ============================================================
-- Backfill jobs.date_posted when NULL
-- ============================================================
-- Scraped adapters (MyJobMag / BrighterMonday / Fuzu) set
-- date_posted: null when the source JSON-LD omitted datePosted.
-- Spreading that onto the insert payload wrote an explicit NULL,
-- which skipped the column DEFAULT now() and left Google JobPosting
-- markup without the required datePosted field (GSC: Regenerative
-- Market Garden Lead, crawled 2026-09-09).
--
-- Fill remaining NULLs from created_at (CareerSasa publish time).
-- ============================================================

BEGIN;

UPDATE public.jobs
SET date_posted = COALESCE(created_at, now())
WHERE date_posted IS NULL;

COMMIT;
