-- ============================================================================
-- STEM-INCLUSIVE homepage copy
-- ----------------------------------------------------------------------------
-- Update the homepage content to reflect all STEM careers (science, technology,
-- engineering, mathematics) rather than chemistry-specific language.
--
-- Idempotent UPDATEs: safe to re-run; only touches page_content.
-- ============================================================================

-- ── home ────────────────────────────────────────────────────────────────────
UPDATE page_content SET content_value = 'You''ve sent dozens of applications with zero callbacks. StemBird changes that. We match your STEM skills (science & healthcare, technology, engineering & architecture, mathematics) directly to employers who are hiring right now, so you skip the black hole and land your next interview faster.'
WHERE page_slug = 'home' AND section_key = 'hero_subtitle';

UPDATE page_content SET content_value = 'Hand-picked STEM roles from top Kenyan employers, with new jobs added daily'
WHERE page_slug = 'home' AND section_key = 'featured_section_subtitle';

UPDATE page_content SET content_value = 'Why 95% of Our STEM Talent Lands Interviews Within 3 Months'
WHERE page_slug = 'home' AND section_key = 'why_choose_title';

UPDATE page_content SET content_value = 'Your Next STEM Career Interview Is 60 Seconds Away'
WHERE page_slug = 'home' AND section_key = 'cta_title';

UPDATE page_content SET content_value = 'StemBird matches your technical skills directly to employer requirements, not just keywords. That''s why our users get 3x more interview callbacks than on generic job boards. Join free today.'
WHERE page_slug = 'home' AND section_key = 'cta_subtitle';

-- ── about ───────────────────────────────────────────────────────────────────
UPDATE page_content SET content_value = 'StemBird was built to fix that. We use AI-powered matching that connects STEM candidates to jobs they''ll actually get, not just jobs that exist. We give every user free career tools worth KES 10,000+: CV builder, cover letter generator, LinkedIn optimizer. We believe the barrier to getting hired should never be money. And we give employers pre-screened, qualified candidates so they can hire in days, not months.'
WHERE page_slug = 'about' AND section_key = 'story_p2';

-- ── sanity: verify no residual chemistry-specific wording remains ───────────
DO $$
DECLARE
  residual INT;
BEGIN
  SELECT count(*) INTO residual
  FROM public.page_content
  WHERE page_slug = 'home'
    AND (content_value ~* 'chemistry|chemist|chemical|lab.*scientist|analytical.*chem'
         OR content_value ~* '\bQC/QA\b');
  IF residual > 0 THEN
    RAISE NOTICE 'WARNING: % home page_content row(s) still carry chemistry-specific wording', residual;
  ELSE
    RAISE NOTICE 'OK: home page_content is fully STEM-inclusive.';
  END IF;
END $$;
