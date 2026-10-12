-- ============================================================
-- Seed: KCB Group Oracle Cloud HCM career site
-- ============================================================
-- Live-verified:
--   https://eoin.fa.em3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_3001/jobs
--   Public REST recruitingCEJobRequisitions / Details (filterCountry KE)
--
-- Replaces the empty paused Workable board (kcb-group) for Kenya intake.
-- Safe to re-run (ON CONFLICT upserts).
-- ============================================================

BEGIN;

INSERT INTO public.scraper_sources (source_id, name, base_url, is_active, selectors)
VALUES (
  'kcb-group-oracle-cloud',
  'KCB Group',
  'https://eoin.fa.em3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_3001/jobs',
  true,
  '{
    "type": "oracle_cloud",
    "host": "eoin.fa.em3.oraclecloud.com",
    "siteNumber": "CX_3001",
    "filterCountry": "KE",
    "category": "employer"
  }'::jsonb
)
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  selectors = EXCLUDED.selectors;

-- Keep legacy Workable KCB source paused (board currently empty)
UPDATE public.scraper_sources
SET is_active = false
WHERE source_id = 'kcb-group';

COMMIT;
