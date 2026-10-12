-- Add SEO fields to page_content table
ALTER TABLE page_content
ADD COLUMN IF NOT EXISTS seo_title TEXT,
ADD COLUMN IF NOT EXISTS seo_meta_description TEXT,
ADD COLUMN IF NOT EXISTS seo_url_slug TEXT,
ADD COLUMN IF NOT EXISTS seo_canonical_url TEXT,
ADD COLUMN IF NOT EXISTS seo_index BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS seo_h1_title TEXT,
ADD COLUMN IF NOT EXISTS seo_follow BOOLEAN DEFAULT true;

-- Create index for URL slug lookups
CREATE INDEX IF NOT EXISTS idx_page_content_url_slug ON page_content(seo_url_slug);

-- Add unique constraint for URL slugs (optional, but recommended)
-- ALTER TABLE page_content ADD CONSTRAINT unique_url_slug UNIQUE (seo_url_slug);

-- Insert default SEO values for existing pages
UPDATE page_content SET
  seo_title = 'CareerSasa - Find Your Dream Job in Kenya | Top Job Listings',
  seo_meta_description = 'Discover thousands of job opportunities in Kenya. Connect with top employers, build your career, and find your perfect role with CareerSasa.',
  seo_url_slug = '/',
  seo_canonical_url = 'https://www.careersasa.co.ke/',
  seo_index = true,
  seo_h1_title = 'Your Dream Career Starts Here',
  seo_follow = true
WHERE page_slug = 'home' AND section_key = 'hero_title';

UPDATE page_content SET
  seo_title = 'Professional CV Writing Services Kenya | CareerSasa',
  seo_meta_description = 'Get a professionally written CV that opens doors. Expert CV writing services tailored for the Kenyan job market. Stand out and get shortlisted.',
  seo_url_slug = '/services/cv',
  seo_canonical_url = 'https://www.careersasa.co.ke/services/cv',
  seo_index = true,
  seo_h1_title = 'CV & Resume Services by CareerSasa',
  seo_follow = true
WHERE page_slug = 'services-cv' AND section_key = 'hero_title';

UPDATE page_content SET
  seo_title = 'LinkedIn Profile Optimization Services Kenya | CareerSasa',
  seo_meta_description = 'Transform your LinkedIn profile into a powerful career tool. Professional LinkedIn optimization services that attract recruiters and opportunities.',
  seo_url_slug = '/services/linkedin',
  seo_canonical_url = 'https://www.careersasa.co.ke/services/linkedin',
  seo_index = true,
  seo_h1_title = 'LinkedIn Career Services by CareerSasa',
  seo_follow = true
WHERE page_slug = 'services-linkedin' AND section_key = 'hero_title';

UPDATE page_content SET
  seo_title = 'Professional Cover Letter Writing Services Kenya | CareerSasa',
  seo_meta_description = 'Get a compelling cover letter that gets read. Expert cover letter writing services that showcase why you''re the perfect fit for the role.',
  seo_url_slug = '/services/cover-letter',
  seo_canonical_url = 'https://www.careersasa.co.ke/services/cover-letter',
  seo_index = true,
  seo_h1_title = 'Outstanding Cover Letters by CareerSasa',
  seo_follow = true
WHERE page_slug = 'services-cover-letter' AND section_key = 'hero_title';

-- Add comment to explain the SEO fields
COMMENT ON COLUMN page_content.seo_title IS 'SEO Title - Controls the clickable headline shown in Google search results';
COMMENT ON COLUMN page_content.seo_meta_description IS 'Meta Description - Short summary shown under the title in search results';
COMMENT ON COLUMN page_content.seo_url_slug IS 'URL Slug - Defines the clean, readable page URL';
COMMENT ON COLUMN page_content.seo_canonical_url IS 'Canonical URL - Tells search engines which version is the main one';
COMMENT ON COLUMN page_content.seo_index IS 'Index/No-Index - Controls whether the page appears in search results';
COMMENT ON COLUMN page_content.seo_h1_title IS 'H1 Title - The main heading for search engines';
COMMENT ON COLUMN page_content.seo_follow IS 'Follow/No-Follow - Controls whether search engines follow links on the page';
