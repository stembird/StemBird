-- ============================================================
-- Seed BrighterMonday Kenya as an in-app scraper source
-- ============================================================
-- BrighterMonday has no public API. Discover reads /jobs listing
-- pages; process parses JobPosting JSON-LD on /listings/{slug}.
-- Safe to re-run (ON CONFLICT).
-- ============================================================

BEGIN;

INSERT INTO public.scraper_sources (source_id, name, base_url, is_active, selectors)
VALUES (
  'brightermonday-kenya',
  'BrighterMonday Kenya',
  'https://www.brightermonday.co.ke/jobs',
  true,
  '{
    "type": "brightermonday",
    "category": "other",
    "sourceKind": "job_board",
    "maxPages": 5
  }'::jsonb
)
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  selectors = EXCLUDED.selectors;

COMMIT;
