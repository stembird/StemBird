-- ============================================================================
-- REBRAND: CareerSasa -> StemBird  (LIVE DATABASE fix-up)
-- ============================================================================
-- Why: SCHEMA-FRESH-INSTALL.sql was applied while the seeds still said
-- 'CareerSasa'. Source migration files are now corrected for FUTURE installs,
-- but the rows already sitting in THIS database still show the old brand.
-- This script rebrands the live data.
--
-- SAFETY:
--   * Only the CamelCase brand 'CareerSasa' / 'Careersasa' is replaced.
--   * Lowercase functional values are NOT touched, because they never match
--     the CamelCase token: domains (careersasa.co.ke), emails
--     (support@careersasa.co.ke), canonical URLs, slugs.
--   * jsonb columns are intentionally EXCLUDED (e.g. mpesa_settings stores the
--     paybill "accountReference":"CareerSasa" inside jsonb — that is a real
--     M-Pesa value and must NOT be renamed).
--   * Idempotent: after the first run the LIKE filters match nothing, so
--     re-running is a harmless no-op.
--
-- Run top-to-bottom in the Supabase SQL Editor of the NEW project
-- (qhfdjccudtqnlkbtsjgg). Safe to run more than once.
-- ============================================================================

-- 1) BEFORE: how many text values still carry the old brand?
SELECT count(*) AS brand_cells_before
FROM (
  SELECT c.table_name, c.column_name
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_schema = c.table_schema AND t.table_name = c.table_name
  WHERE c.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND c.data_type IN ('text', 'character varying', 'character')
) cols;

-- 2) Fix the column DEFAULT so any future insert is correct.
ALTER TABLE public.site_settings
  ALTER COLUMN site_name SET DEFAULT 'StemBird';

-- 3) Replace the brand in every TEXT/VARCHAR/CHAR column of the public schema.
DO $$
DECLARE
  r RECORD;
  affected INT;
  total INT := 0;
BEGIN
  FOR r IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.data_type IN ('text', 'character varying', 'character')
  LOOP
    EXECUTE format(
      'UPDATE public.%I SET %I = replace(replace(%I, %L, %L), %L, %L)
       WHERE %I LIKE %L OR %I LIKE %L',
      r.table_name, r.column_name, r.column_name,
      'CareerSasa', 'StemBird',
      'Careersasa', 'StemBird',
      r.column_name, '%CareerSasa%',
      r.column_name, '%Careersasa%'
    );
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected > 0 THEN
      total := total + affected;
      RAISE NOTICE 'Rebranded %.% : % row(s)', r.table_name, r.column_name, affected;
    END IF;
  END LOOP;
  RAISE NOTICE 'DONE. Total rows updated across all columns: %', total;
END $$;

-- 4) AFTER: sanity check — expect 0 in the CMS/branding spots.
SELECT site_name FROM public.site_settings;

SELECT count(*) AS home_cta_with_old_brand
FROM public.page_content
WHERE page_slug = 'home'
  AND content_value ~ 'CareerSasa|Careersasa';
