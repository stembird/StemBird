-- ============================================================
-- Seed Fuzu Kenya as an in-app scraper source
-- ============================================================
-- Fuzu has no public API. Discover reads /kenya/job listing
-- pages (ItemList JSON-LD); process parses JobPosting JSON-LD
-- on /kenya/jobs/{slug}. Safe to re-run (ON CONFLICT).
-- ============================================================

BEGIN;

INSERT INTO public.scraper_sources (source_id, name, base_url, is_active, selectors)
VALUES (
  'fuzu-kenya',
  'Fuzu Kenya',
  'https://www.fuzu.com/kenya/job',
  true,
  '{
    "type": "fuzu",
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
