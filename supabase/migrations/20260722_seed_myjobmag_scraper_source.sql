-- ============================================================
-- Seed MyJobMag Kenya as an in-app scraper source
-- ============================================================
-- MyJobMag has no public API. Discover reads /jobs listing pages
-- (href="/job/{slug}"); process parses JobPosting JSON-LD (with
-- HTML fallback for .job-details / .job-key-info). Safe to re-run
-- (ON CONFLICT).
-- ============================================================

BEGIN;

INSERT INTO public.scraper_sources (source_id, name, base_url, is_active, selectors)
VALUES (
  'myjobmag-kenya',
  'MyJobMag Kenya',
  'https://www.myjobmag.co.ke/jobs',
  true,
  '{
    "type": "myjobmag",
    "category": "other",
    "sourceKind": "job_board",
    "maxPages": 15
  }'::jsonb
)
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  selectors = EXCLUDED.selectors;

COMMIT;
