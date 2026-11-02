-- ============================================================================
-- FOUNDER SECTION on About Us
-- ----------------------------------------------------------------------------
-- Adds a "Meet the Founder" block to the About page CMS so admin can edit it.
-- The founder is Emmanuel Juma Makona (BSc Industrial Chemistry with
-- Management, Kenyatta University), 7+ years in Kenya's chemical, sugar,
-- paper, beverage and manufacturing industries. ChemistryLens is his answer
-- to the keyword-only job boards that overlooked technical talent.
--
-- Source fallbacks live in app/about/page.tsx; source of truth for the copy
-- after this migration is the page_content table.
--
-- Idempotent: ON CONFLICT (page_slug, section_key) DO UPDATE keeps re-runs safe.
-- ============================================================================

INSERT INTO page_content (page_slug, section_key, content_type, content_value, metadata) VALUES
  ('about', 'founder_title', 'text', 'Meet the Founder', '{}'::jsonb),
  ('about', 'founder_name', 'text', 'Emmanuel Juma Makona', '{}'::jsonb),
  ('about', 'founder_initials', 'text', 'EM', '{}'::jsonb),
  ('about', 'founder_role', 'text', 'Founder, ChemistryLens · BSc Industrial Chemistry with Management (Kenyatta University) · Based in Kakamega, Kenya', '{}'::jsonb),
  ('about', 'founder_story_p1', 'text', 'ChemistryLens was started by Emmanuel Juma Makona — an industrial chemist by training and a plant-floor operator by trade. After graduating from Kenyatta University with a BSc in Industrial Chemistry with Management, he spent more than seven years running production and quality operations across Kenya''s chemical, sugar, paper, beverage and manufacturing industries: QC testing paint batches at Kansai Plascon, supervising juice clarification, sugar boiling and water treatment on a 4,200 TCD line at West Kenya Sugar, blending and shipping cleaning chemicals through his own company Emmax Cleaning Solutions, and today running a 20+ operator paper machine shift at Rai Paper Kenya delivering 30+ tonnes per shift.', '{}'::jsonb),
  ('about', 'founder_story_p2', 'text', 'On both sides of the hiring table — as a job seeker early in his career and, later, as the supervisor actually reading CVs — he kept seeing the same failure. Kenyan chemists, laboratory analysts, QC technicians and process engineers were applying for months with no callbacks, not because they lacked skill, but because generic job boards match keywords, not instruments run, techniques mastered or standards internalised. A chemist who has calibrated refractometers and titrated juice samples looks identical to a stranger on a keyword-based board.', '{}'::jsonb),
  ('about', 'founder_story_p3', 'text', 'ChemistryLens is his answer: a Kenyan job platform built specifically for chemistry, laboratory, quality and process careers — where AI matching reads HPLC, GC-MS, ISO 9001, HACCP, GMP, brix, effluent treatment, formulation and shift supervision the way an employer actually does. It is free for every job seeker, because Emmanuel knows what it looks like to be talented and overlooked.', '{}'::jsonb),
  ('about', 'founder_credential_1_title', 'text', 'Education', '{}'::jsonb),
  ('about', 'founder_credential_1_body', 'text', 'BSc Industrial Chemistry with Management, Kenyatta University (Second Class Honours, Upper Division)', '{}'::jsonb),
  ('about', 'founder_credential_2_title', 'text', 'Professional certifications', '{}'::jsonb),
  ('about', 'founder_credential_2_body', 'text', 'ISO 9001:2015 · HACCP · ISO 22000 · ISO 31000 Risk Management · GMP / FMP · Occupational Safety & Health · SAP ERP', '{}'::jsonb),
  ('about', 'founder_contact_label', 'text', 'Reach the founder:', '{}'::jsonb),
  ('about', 'founder_email', 'text', 'ejuma90@gmail.com', '{}'::jsonb),
  ('about', 'founder_contact_link', 'text', 'or use the ChemistryLens contact form', '{}'::jsonb)
ON CONFLICT (page_slug, section_key) DO UPDATE
SET content_value = EXCLUDED.content_value,
    updated_at    = NOW();

-- Sanity: 14 founder rows expected.
SELECT section_key, left(content_value, 60) AS preview
FROM public.page_content
WHERE page_slug = 'about' AND section_key LIKE 'founder_%'
ORDER BY section_key;
