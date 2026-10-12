-- ============================================================
-- Seed: Kenyan Oracle Taleo Business Edition (TBE) sources
-- ============================================================
-- Live-verified public TBE boards with Kenya location filters:
--   • CARE                          — phg.tbe.taleo.net/phg02 / CAREUSA / cws=63
--   • Conservation International    — phh.tbe.taleo.net/phh04 / CONSERVATION / cws=39
--
-- Note: Kenya openings fluctuate; filterCountry keeps only KE rows when present.
-- Requires taleo_be adapter wired in scrapeDiscover / scrapeProcess.
-- Safe to re-run (ON CONFLICT upserts).
-- ============================================================

BEGIN;

INSERT INTO public.scraper_sources (source_id, name, base_url, is_active, selectors)
VALUES
  (
    'care-taleo-be',
    'CARE',
    'https://phg.tbe.taleo.net/phg02/ats/careers/v2/jobSearch?org=CAREUSA&cws=63',
    true,
    '{
      "type": "taleo_be",
      "org": "CAREUSA",
      "cws": "63",
      "hostPath": "phg.tbe.taleo.net/phg02",
      "filterCountry": "Kenya",
      "category": "ngo"
    }'::jsonb
  ),
  (
    'conservation-international-taleo-be',
    'Conservation International',
    'https://phh.tbe.taleo.net/phh04/ats/careers/v2/jobSearch?org=CONSERVATION&cws=39',
    true,
    '{
      "type": "taleo_be",
      "org": "CONSERVATION",
      "cws": "39",
      "hostPath": "phh.tbe.taleo.net/phh04",
      "filterCountry": "Kenya",
      "category": "ngo"
    }'::jsonb
  )
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  selectors = EXCLUDED.selectors;

COMMIT;
