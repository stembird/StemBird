-- ============================================================================
-- STEM-NICHE homepage copy
-- StemBird serves STEM professionals and employers (engineers, lab scientists,
-- technologists, data & research roles). This repositions the CMS-driven
-- homepage hero/CTA copy from generic job-board language to STEM-specific.
-- Matches the fallback copy in src/components/HomePage.tsx.
-- Idempotent UPDATEs: safe to re-run; only touches the home page_slug.
-- ============================================================================

UPDATE page_content SET content_value = 'You''ve sent dozens of applications with zero callbacks. StemBird changes that. We match your STEM skills (engineering, labs, tech, data and research) directly to employers who are hiring right now, so you skip the black hole and land your next interview faster.'
WHERE page_slug = 'home' AND section_key = 'hero_subtitle';

UPDATE page_content SET content_value = 'Hand-picked STEM roles from top Kenyan employers, with new jobs added daily'
WHERE page_slug = 'home' AND section_key = 'featured_section_subtitle';

UPDATE page_content SET content_value = 'Why 95% of Our STEM Talent Lands Interviews Within 3 Months'
WHERE page_slug = 'home' AND section_key = 'why_choose_title';

UPDATE page_content SET content_value = 'Your Next STEM Interview Is 60 Seconds Away'
WHERE page_slug = 'home' AND section_key = 'cta_title';

UPDATE page_content SET content_value = 'StemBird matches your technical skills directly to employer requirements, not just keywords. That''s why our users get 3x more interview callbacks than on generic job boards. Join free today.'
WHERE page_slug = 'home' AND section_key = 'cta_subtitle';
