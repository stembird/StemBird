-- Update CMS content to match the new "Sell Like Crazy" copy
-- This prevents flickering where old CMS content overrides new fallback text

-- ============================================================
-- HOMEPAGE (page_slug = 'home')
-- ============================================================
UPDATE page_content SET content_value = 'Stop Searching. Start Getting Hired.'
WHERE page_slug = 'home' AND section_key = 'hero_title';

UPDATE page_content SET content_value = 'You''ve sent dozens of applications with zero callbacks. CareerSasa changes that. We match your skills directly to employers who are hiring right now, so you skip the black hole and land your next interview faster.'
WHERE page_slug = 'home' AND section_key = 'hero_subtitle';

UPDATE page_content SET content_value = 'Featured Opportunities'
WHERE page_slug = 'home' AND section_key = 'featured_section_title';

UPDATE page_content SET content_value = 'Hand-picked roles from top Kenyan employers, with new jobs added daily'
WHERE page_slug = 'home' AND section_key = 'featured_section_subtitle';

UPDATE page_content SET content_value = 'Why 95% of Our Users Land Interviews Within 3 Months'
WHERE page_slug = 'home' AND section_key = 'why_choose_title';

UPDATE page_content SET content_value = 'Your Next Interview Is 60 Seconds Away'
WHERE page_slug = 'home' AND section_key = 'cta_title';

UPDATE page_content SET content_value = 'CareerSasa matches your skills directly to employer requirements, not just keywords. That''s why our users get 3x more interview callbacks than on other job boards. Join free today.'
WHERE page_slug = 'home' AND section_key = 'cta_subtitle';

-- ============================================================
-- CV SERVICES (page_slug = 'services-cv')
-- ============================================================
UPDATE page_content SET content_value = 'Your CV Has 6 Seconds. Make Them Count.'
WHERE page_slug = 'services-cv' AND section_key = 'hero_title';

UPDATE page_content SET content_value = 'Recruiters scan your CV in 6 seconds. Most CVs fail that test. Ours don''t.'
WHERE page_slug = 'services-cv' AND section_key = 'hero_subtitle';

UPDATE page_content SET content_value = '<p>You''ve been sending applications for weeks. Zero callbacks. Not because you''re unqualified. Your CV just doesn''t survive the 6-second scan. Before interviews. Before LinkedIn. Before you can explain yourself, your CV decides if you get a chance.</p>'
WHERE page_slug = 'services-cv' AND section_key = 'hero_description';

UPDATE page_content SET content_value = 'The 6-Second Problem That''s Costing You Interviews'
WHERE page_slug = 'services-cv' AND section_key = 'why_cv_matters_title';

UPDATE page_content SET content_value = 'Why CareerSasa CVs Get 3x More Interview Callbacks'
WHERE page_slug = 'services-cv' AND section_key = 'what_we_do_title';

-- ============================================================
-- LINKEDIN SERVICES (page_slug = 'services-linkedin')
-- ============================================================
UPDATE page_content SET content_value = 'Recruiters Google You Before They Call. What Do They Find?'
WHERE page_slug = 'services-linkedin' AND section_key = 'hero_title';

UPDATE page_content SET content_value = 'Your LinkedIn profile is the interview filter most people don''t know is working against them'
WHERE page_slug = 'services-linkedin' AND section_key = 'hero_subtitle';

UPDATE page_content SET content_value = '<p>Before a recruiter calls you, they search your LinkedIn. Before a hiring manager schedules an interview, they compare your CV to your profile. If your LinkedIn is weak, outdated, or doesn''t match your CV, you''ve lost the interview before it started.</p>'
WHERE page_slug = 'services-linkedin' AND section_key = 'hero_description';

UPDATE page_content SET content_value = 'The LinkedIn Problem That''s Silently Costing You Jobs'
WHERE page_slug = 'services-linkedin' AND section_key = 'why_linkedin_matters_title';

-- ============================================================
-- COVER LETTER SERVICES (page_slug = 'services-cover-letter')
-- ============================================================
UPDATE page_content SET content_value = 'Your CV Gets You Seen. Your Cover Letter Gets You Hired.'
WHERE page_slug = 'services-cover-letter' AND section_key = 'hero_title';

UPDATE page_content SET content_value = 'The letter that explains why you''re the right fit, not just another applicant'
WHERE page_slug = 'services-cover-letter' AND section_key = 'hero_subtitle';

UPDATE page_content SET content_value = '<p>Your CV shows what you''ve done. But it can''t explain why you''re perfect for THIS role at THIS company. That''s what a cover letter does when it''s done right. Most cover letters repeat the CV or sound like they were written for a different job entirely. Ours don''t.</p>'
WHERE page_slug = 'services-cover-letter' AND section_key = 'hero_description';
