-- ============================================================
-- Seed: Kenyan Oracle Taleo Enterprise scraper sources
-- ============================================================
-- Live-verified Kenyan Taleo Enterprise boards:
--   • Equity Bank          — equitybank.taleo.net / ext_new  (REST searchjobs)
--   • Britam               — britam.taleo.net / ke           (REST; filterCountry)
--   • Aga Khan University  — aku.taleo.net / ex              (legacy joblist.ftl)
--
-- Requires taleo adapter wired in scrapeDiscover / scrapeProcess.
-- Safe to re-run (ON CONFLICT upserts).
-- ============================================================

BEGIN;

INSERT INTO public.scraper_sources (source_id, name, base_url, is_active, selectors)
VALUES
  (
    'equity-bank-taleo',
    'Equity Bank',
    'https://equitybank.taleo.net/careersection/ext_new/jobsearch.ftl',
    true,
    '{
      "type": "taleo",
      "host": "equitybank.taleo.net",
      "section": "ext_new",
      "filterCountry": "Kenya",
      "category": "employer"
    }'::jsonb
  ),
  (
    'britam-taleo',
    'Britam',
    'https://britam.taleo.net/careersection/ke/jobsearch.ftl',
    true,
    '{
      "type": "taleo",
      "host": "britam.taleo.net",
      "section": "ke",
      "filterCountry": "Kenya",
      "category": "employer"
    }'::jsonb
  ),
  (
    'aga-khan-university-taleo',
    'Aga Khan University',
    'https://aku.taleo.net/careersection/ex/joblist.ftl',
    true,
    '{
      "type": "taleo",
      "host": "aku.taleo.net",
      "section": "ex",
      "filterCountry": "Kenya",
      "category": "employer"
    }'::jsonb
  )
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  selectors = EXCLUDED.selectors;

COMMIT;
