-- ============================================================================
-- SCRAPE SCOPE (config-only): reduce scraper_sources to the useful boards
-- ============================================================================
-- GOAL CONTEXT: focus StemBird on biology / chemistry roles in Kenya.
--
-- IMPORTANT LIMITATION (verified in the adapter code):
--   * BrighterMonday + Fuzu adapters rebuild the listing URL from the ORIGIN
--     + a hardcoded path (they DISCARD the base_url path/query). So you CANNOT
--     scope them to "chemistry" by editing base_url.
--   * MyJobMag honors the base_url PATH, but only as a directory path; query
--     strings like ?search=chemistry are stripped, so subject-scoping is still
--     unreliable.
--   * scrapeProcess has no keyword/subject filter (only filterCountry + expired
--     /duplicate skips).
-- => This script only trims WHICH sources run. For a true bio/chem subject
--    filter, a small keyword gate in the publish step is required (see the
--    assistant note accompanying this file).
--
-- Safe to re-run. Review the preview first, then run the UPDATE, then confirm.
-- ============================================================================

-- 1) PREVIEW: everything currently configured.
SELECT source_id, name, base_url, is_active,
       (selectors ->> 'type')     AS adapter_type,
       (selectors ->> 'category') AS category
FROM public.scraper_sources
ORDER BY is_active DESC, source_id;

-- 2) PAUSE non-science single-employer / broad-government sources.
--    These flood the queue with roles outside biology/chemistry and, being
--    employer- or PDF-specific, can't be subject-filtered via URL.
UPDATE public.scraper_sources
SET is_active = false
WHERE source_id IN (
  'kcb-group',
  'kcb-group-oracle-cloud',
  'psc-pdf-adverts',
  'psc-ministries-adverts',
  'inkomoko-careers',
  'inkomoko-workable'
);

-- 3) KEEP the three national aggregators active (they DO carry science roles,
--    mixed with everything else — this is why the code gate matters).
UPDATE public.scraper_sources
SET is_active = true
WHERE source_id IN (
  'myjobmag-kenya',
  'brightermonday-kenya',
  'fuzu-kenya'
);

-- 4) CONFIRM: only the three aggregators should be active.
SELECT source_id, name, is_active
FROM public.scraper_sources
ORDER BY is_active DESC, source_id;
