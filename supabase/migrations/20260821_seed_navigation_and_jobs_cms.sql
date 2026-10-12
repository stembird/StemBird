-- Seed CMS rows for site navigation and the jobs browse hubs added to the public site.
-- Existing keys are left unchanged (ON CONFLICT DO NOTHING).

INSERT INTO page_content (page_slug, section_key, content_type, content_value, metadata) VALUES
  ('navigation', 'nav_browse_label', 'text', 'Browse Jobs', '{"location": "header", "note": "Desktop and mobile nav trigger"}'),
  ('navigation', 'nav_browse_all_jobs', 'text', 'All jobs', '{"href": "/jobs"}'),
  ('navigation', 'nav_browse_all_jobs_description', 'text', 'Search and filter every live role', '{}'),
  ('navigation', 'nav_browse_by_industry', 'text', 'By industry', '{"href": "/jobs/industries"}'),
  ('navigation', 'nav_browse_by_industry_description', 'text', 'See which sectors are hiring now', '{}'),
  ('navigation', 'nav_browse_by_function', 'text', 'By function', '{"href": "/jobs/functions"}'),
  ('navigation', 'nav_browse_by_function_description', 'text', 'Browse jobs by what you do', '{}'),
  ('navigation', 'nav_browse_by_county', 'text', 'By county', '{"href": "/jobs/counties"}'),
  ('navigation', 'nav_browse_by_county_description', 'text', 'Find roles across Kenya''s 47 counties', '{}')
ON CONFLICT (page_slug, section_key) DO NOTHING;

INSERT INTO page_content (page_slug, section_key, content_type, content_value, metadata) VALUES
  ('jobs', 'hero_title', 'text', 'Find Your Next Job in Kenya', '{}'),
  ('jobs', 'hero_subtitle', 'text', 'Verified jobs from real employers, updated daily. Apply now. Early applicants get 4x more interview callbacks.', '{}')
ON CONFLICT (page_slug, section_key) DO NOTHING;

INSERT INTO page_content (page_slug, section_key, content_type, content_value, metadata, seo_title, seo_meta_description, seo_url_slug, seo_canonical_url, seo_h1_title) VALUES
  (
    'jobs-industries',
    'hero_title',
    'text',
    'Jobs by Industry',
    '{}',
    'Jobs by Industry',
    'Browse live jobs in Kenya by industry. See which sectors are hiring and jump into open roles.',
    '/jobs/industries',
    'https://www.careersasa.co.ke/jobs/industries',
    'Jobs by Industry'
  ),
  (
    'jobs-industries',
    'eyebrow',
    'text',
    'Browse jobs',
    '{}',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  ),
  (
    'jobs-industries',
    'hero_subtitle',
    'text',
    'Pick a sector to see live roles. Industry names are shown in full so you can compare hiring at a glance.',
    '{}',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  )
ON CONFLICT (page_slug, section_key) DO NOTHING;

INSERT INTO page_content (page_slug, section_key, content_type, content_value, metadata, seo_title, seo_meta_description, seo_url_slug, seo_canonical_url, seo_h1_title) VALUES
  (
    'jobs-functions',
    'hero_title',
    'text',
    'Jobs by Function',
    '{}',
    'Jobs by Function',
    'Browse every job function on CareerSasa. See live counts, compare fields, and open roles in the area you work.',
    '/jobs/functions',
    'https://www.careersasa.co.ke/jobs/functions',
    'Jobs by Function'
  ),
  (
    'jobs-functions',
    'eyebrow',
    'text',
    'Browse jobs',
    '{}',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  ),
  (
    'jobs-functions',
    'hero_subtitle',
    'text',
    'Every field we hire for — including those with no live roles right now. Search, sort, and click through to open jobs.',
    '{}',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  )
ON CONFLICT (page_slug, section_key) DO NOTHING;

INSERT INTO page_content (page_slug, section_key, content_type, content_value, metadata, seo_title, seo_meta_description, seo_url_slug, seo_canonical_url, seo_h1_title) VALUES
  (
    'jobs-counties',
    'hero_title',
    'text',
    'Jobs by County',
    '{}',
    'Jobs by County',
    'Explore live jobs across Kenya''s 47 counties. Tap the map or pick a county to see open roles.',
    '/jobs/counties',
    'https://www.careersasa.co.ke/jobs/counties',
    'Jobs by County'
  ),
  (
    'jobs-counties',
    'eyebrow',
    'text',
    'Browse jobs',
    '{}',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  ),
  (
    'jobs-counties',
    'hero_subtitle',
    'text',
    'The interactive map belongs here — tap a county or pick from the ranked list to see live jobs nearby.',
    '{}',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  )
ON CONFLICT (page_slug, section_key) DO NOTHING;
