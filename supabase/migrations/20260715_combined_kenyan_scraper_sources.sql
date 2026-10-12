-- ============================================================
-- COMBINED: Kenyan scraper sources (CareerSasa — 2026-07-15)
-- ============================================================
-- Run this once in Supabase SQL Editor to apply all scraper source
-- changes from today's session. Safe to re-run (uses ON CONFLICT).
--
-- Prerequisites:
--   - scraper_sources table exists (20260528_create_job_scraper_tables.sql)
--
-- What this sets up:
--   • Workable: Inkomoko (+ paused pipeline: Tala, Branch, KCB, etc.)
--   • SmartRecruiters: Amref, SALIX, DDD, PowerGen, iHub
--   • Government: PSC PDF adverts (full detail from publicservice.go.ke)
--   • Backup: PSC portal table source (paused — listing-only)
-- ============================================================

BEGIN;

-- ── 1. Inkomoko (Workable) ───────────────────────────────────────────────────
INSERT INTO public.scraper_sources (source_id, name, base_url, is_active, selectors)
VALUES (
  'inkomoko-careers',
  'Inkomoko',
  'https://apply.workable.com/inkomoko/',
  true,
  '{
    "type": "workable",
    "slug": "inkomoko",
    "filterCountry": "Kenya",
    "category": "employer"
  }'::jsonb
)
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  selectors = EXCLUDED.selectors;

-- Ensure category on existing Inkomoko row if already seeded without it
UPDATE public.scraper_sources
SET selectors = selectors || '{"category": "employer"}'::jsonb
WHERE source_id = 'inkomoko-careers'
  AND NOT (selectors ? 'category');

-- ── 2. SmartRecruiters employers & NGO ─────────────────────────────────────
INSERT INTO public.scraper_sources (source_id, name, base_url, is_active, selectors)
VALUES
  (
    'amref-health-africa',
    'Amref Health Africa',
    'https://careers.smartrecruiters.com/AmrefHealthAfrica4',
    true,
    '{
      "type": "smartrecruiters",
      "slug": "AmrefHealthAfrica4",
      "filterCountry": "ke",
      "category": "ngo"
    }'::jsonb
  ),
  (
    'salix-data-africa',
    'SALIX Data Africa',
    'https://careers.smartrecruiters.com/SALIXDataAfricaLimited',
    true,
    '{
      "type": "smartrecruiters",
      "slug": "SALIXDataAfricaLimited",
      "filterCountry": "ke",
      "category": "employer"
    }'::jsonb
  ),
  (
    'digital-divide-data',
    'Digital Divide Data',
    'https://careers.smartrecruiters.com/DigitalDivideData',
    true,
    '{
      "type": "smartrecruiters",
      "slug": "DigitalDivideData",
      "filterCountry": "ke",
      "category": "employer"
    }'::jsonb
  ),
  (
    'powergen-renewable-energy',
    'PowerGen Renewable Energy',
    'https://careers.smartrecruiters.com/PowerGenRenewableEnergy',
    true,
    '{
      "type": "smartrecruiters",
      "slug": "PowerGenRenewableEnergy",
      "filterCountry": "ke",
      "category": "employer"
    }'::jsonb
  ),
  (
    'ihub-nairobi',
    'iHub Nairobi',
    'https://careers.smartrecruiters.com/iHub',
    true,
    '{
      "type": "smartrecruiters",
      "slug": "iHub",
      "filterCountry": "ke",
      "category": "employer"
    }'::jsonb
  )
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  selectors = EXCLUDED.selectors;

-- ── 3. Government: PSC PDF (primary) + portal table (backup, paused) ───────
INSERT INTO public.scraper_sources (source_id, name, base_url, is_active, selectors)
VALUES
  (
    'psc-pdf-adverts',
    'Public Service Commission — PDF Adverts',
    'https://www.publicservice.go.ke/jobs/',
    true,
    '{
      "type": "psc_pdf",
      "category": "government",
      "maxListingPages": 3
    }'::jsonb
  ),
  (
    'psc-ministries-adverts',
    'Public Service Commission — Ministries & State Departments',
    'https://www.psckjobs.go.ke/ActiveJobsAdverts.aspx',
    false,
    '{
      "type": "psc",
      "category": "government"
    }'::jsonb
  )
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  selectors = EXCLUDED.selectors;

-- ── 4. Workable pipeline (valid accounts; paused until Kenya roles appear) ───
INSERT INTO public.scraper_sources (source_id, name, base_url, is_active, selectors)
VALUES
  (
    'tala-finance',
    'Tala',
    'https://apply.workable.com/tala/',
    false,
    '{
      "type": "workable",
      "slug": "tala",
      "filterCountry": "Kenya",
      "category": "employer"
    }'::jsonb
  ),
  (
    'branch-international',
    'Branch International',
    'https://apply.workable.com/branch/',
    false,
    '{
      "type": "workable",
      "slug": "branch",
      "filterCountry": "Kenya",
      "category": "employer"
    }'::jsonb
  ),
  (
    'kcb-group',
    'KCB Group',
    'https://apply.workable.com/kcb/',
    false,
    '{
      "type": "workable",
      "slug": "kcb",
      "filterCountry": "Kenya",
      "category": "employer"
    }'::jsonb
  ),
  (
    'komaza',
    'Komaza',
    'https://apply.workable.com/komaza/',
    false,
    '{
      "type": "workable",
      "slug": "komaza",
      "filterCountry": "Kenya",
      "category": "employer"
    }'::jsonb
  ),
  (
    'sanergy',
    'Sanergy',
    'https://apply.workable.com/sanergy/',
    false,
    '{
      "type": "workable",
      "slug": "sanergy",
      "filterCountry": "Kenya",
      "category": "employer"
    }'::jsonb
  ),
  (
    'copia-global',
    'Copia Global',
    'https://apply.workable.com/copia/',
    false,
    '{
      "type": "workable",
      "slug": "copia",
      "filterCountry": "Kenya",
      "category": "employer"
    }'::jsonb
  ),
  (
    'apollo-agriculture',
    'Apollo Agriculture',
    'https://apply.workable.com/apollo/',
    false,
    '{
      "type": "workable",
      "slug": "apollo",
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

-- ── Summary (expect 15 rows) ───────────────────────────────────────────────
-- Active (7):  inkomoko, amref, salix, ddd, powergen, ihub, psc-pdf-adverts
-- Paused (8):  psc-ministries, tala, branch, kcb, komaza, sanergy, copia, apollo
SELECT source_id, name, is_active, selectors->>'type' AS adapter, selectors->>'category' AS category
FROM public.scraper_sources
WHERE source_id IN (
  'inkomoko-careers',
  'amref-health-africa',
  'salix-data-africa',
  'digital-divide-data',
  'powergen-renewable-energy',
  'ihub-nairobi',
  'psc-pdf-adverts',
  'psc-ministries-adverts',
  'tala-finance',
  'branch-international',
  'kcb-group',
  'komaza',
  'sanergy',
  'copia-global',
  'apollo-agriculture'
)
ORDER BY is_active DESC, name;
