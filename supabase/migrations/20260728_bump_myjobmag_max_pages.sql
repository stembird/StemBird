-- ============================================================
-- MyJobMag: deepen discover window for large posting days
-- ============================================================
-- First-run backlog needed ~10 pages (~400+ jobs). Incremental
-- discover still stops early once consecutive pages are already
-- known; maxPages is the ceiling for big new-job waves.
-- ============================================================

BEGIN;

UPDATE public.scraper_sources
SET selectors = jsonb_set(
  COALESCE(selectors, '{}'::jsonb),
  '{maxPages}',
  '15'::jsonb,
  true
)
WHERE source_id = 'myjobmag-kenya';

COMMIT;
