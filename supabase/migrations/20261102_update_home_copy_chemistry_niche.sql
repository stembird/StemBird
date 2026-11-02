-- ============================================================================
-- CHEMISTRY-NICHE homepage + about copy
-- ----------------------------------------------------------------------------
-- ChemistryLens serves chemists, laboratory scientists, quality professionals
-- and process engineers — not general STEM. This supersedes the earlier
-- "sell like crazy" generic copy and the interim STEM-niche pass
-- (20261018000000_update_home_copy_stem_niche.sql) with chemistry-focused
-- wording that matches the fallback copy in src/components/HomePage.tsx and
-- the PAGE_COPY_REWRITES table in scripts/rebrand-db-to-chemistrylens.ts.
--
-- Idempotent UPDATEs: safe to re-run; only touches page_content.
-- The live DB has already been reconciled by rebrand-db-to-chemistrylens.ts
-- --execute; this file exists so a fresh `supabase db push` on a new project
-- lands in the same state.
-- ============================================================================

-- ── home ────────────────────────────────────────────────────────────────────
UPDATE page_content SET content_value = 'You''ve sent dozens of applications with zero callbacks. ChemistryLens changes that. We match your chemistry skills (analytical labs, QC/QA, formulation, process engineering and industrial testing) directly to employers who are hiring right now, so you skip the black hole and land your next interview faster.'
WHERE page_slug = 'home' AND section_key = 'hero_subtitle';

UPDATE page_content SET content_value = 'Hand-picked chemistry roles from top Kenyan employers, with new jobs added daily'
WHERE page_slug = 'home' AND section_key = 'featured_section_subtitle';

UPDATE page_content SET content_value = 'Why 95% of Our Chemistry Talent Lands Interviews Within 3 Months'
WHERE page_slug = 'home' AND section_key = 'why_choose_title';

UPDATE page_content SET content_value = 'Your Next Chemistry Career Interview Is 60 Seconds Away'
WHERE page_slug = 'home' AND section_key = 'cta_title';

UPDATE page_content SET content_value = 'ChemistryLens matches your technical skills directly to employer requirements, not just keywords. That''s why our users get 3x more interview callbacks than on generic job boards. Join free today.'
WHERE page_slug = 'home' AND section_key = 'cta_subtitle';

-- ── about ───────────────────────────────────────────────────────────────────
UPDATE page_content SET content_value = 'ChemistryLens was built to fix that. We use AI-powered matching that connects chemistry candidates to jobs they''ll actually get, not just jobs that exist. We give every user free career tools worth KES 10,000+: CV builder, cover letter generator, LinkedIn optimizer. We believe the barrier to getting hired should never be money. And we give employers pre-screened, qualified candidates so they can hire in days, not months.'
WHERE page_slug = 'about' AND section_key = 'story_p2';

-- ── sanity: no residual StemBird / CareerSasa / generic-STEM wording ────────
-- Expected: 0 rows after this migration.
DO $$
DECLARE
  residual INT;
BEGIN
  SELECT count(*) INTO residual
  FROM public.page_content
  WHERE content_value ~ 'StemBird|CareerSasa'
     OR content_value ~ '\bSTEM (skills|roles|Talent|Interview|professionals|careers|employers)\b';
  IF residual > 0 THEN
    RAISE NOTICE 'WARNING: % page_content row(s) still carry old brand/STEM wording', residual;
  ELSE
    RAISE NOTICE 'OK: page_content is fully chemistry-branded.';
  END IF;
END $$;
