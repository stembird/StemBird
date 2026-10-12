-- Create page_content table for managing front-facing page content
CREATE TABLE IF NOT EXISTS page_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug TEXT NOT NULL, -- e.g., 'home', 'services-cv', 'services-linkedin'
  section_key TEXT NOT NULL, -- e.g., 'hero_title', 'hero_description', 'stats'
  content_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'html', 'json', 'number'
  content_value TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- For additional data like images, links, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_slug, section_key)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_page_content_slug ON page_content(page_slug);

-- Enable RLS
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON page_content
  FOR SELECT USING (true);

-- Allow authenticated users to update (you can restrict this to admin role later)
CREATE POLICY "Allow authenticated users to update" ON page_content
  FOR ALL USING (auth.role() = 'authenticated');

-- Insert default homepage content
INSERT INTO page_content (page_slug, section_key, content_type, content_value, metadata) VALUES
  ('home', 'hero_title', 'text', 'Your Dream Career Starts Here', '{}'),
  ('home', 'hero_subtitle', 'text', 'Join thousands of Kenyan professionals who''ve found their perfect role. Connect with top employers and unlock your potential.', '{}'),
  ('home', 'stats_jobs', 'number', '1070', '{"label": "Active Jobs"}'),
  ('home', 'stats_companies', 'number', '103', '{"label": "Companies"}'),
  ('home', 'stats_success_rate', 'number', '90', '{"label": "Success Rate", "suffix": "%"}'),
  ('home', 'featured_section_title', 'text', 'Featured Opportunities', '{}'),
  ('home', 'featured_section_subtitle', 'text', 'Hand-picked roles from top employers', '{}'),
  ('home', 'why_choose_title', 'text', 'Why Kenyan Professionals Choose CareerSasa', '{}'),
  ('home', 'cta_title', 'text', 'Ready to Transform Your Career?', '{}'),
  ('home', 'cta_subtitle', 'text', 'Join thousands of Kenyan professionals who''ve found their dream jobs through CareerSasa', '{}')
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- Insert default CV services page content
INSERT INTO page_content (page_slug, section_key, content_type, content_value, metadata) VALUES
  ('services-cv', 'hero_title', 'text', 'CV & Resume Services by CareerSasa', '{}'),
  ('services-cv', 'hero_subtitle', 'text', 'Professional CVs That Open Doors 🚪📄', '{}'),
  ('services-cv', 'hero_description', 'html', '<p>Your CV is often the <strong>first decision-maker</strong> in your job search. Before interviews. Before LinkedIn. Before explanations.</p><p>At CareerSasa, we don''t just rewrite CVs — we <strong>position you to be shortlisted</strong>.</p>', '{}'),
  ('services-cv', 'why_cv_matters_title', 'text', 'Why Your CV Matters More Than You Think', '{}'),
  ('services-cv', 'what_we_do_title', 'text', 'What We Do Differently at CareerSasa', '{}')
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- Insert default LinkedIn services page content
INSERT INTO page_content (page_slug, section_key, content_type, content_value, metadata) VALUES
  ('services-linkedin', 'hero_title', 'text', 'LinkedIn Career Services by CareerSasa', '{}'),
  ('services-linkedin', 'hero_subtitle', 'text', 'Turn Your LinkedIn Profile Into Opportunities 🚀', '{}'),
  ('services-linkedin', 'hero_description', 'html', '<p>Your LinkedIn profile is no longer optional. It''s your <strong>digital CV</strong>, your <strong>personal brand</strong>, and often the <strong>first interview filter</strong>.</p>', '{}'),
  ('services-linkedin', 'why_linkedin_matters_title', 'text', 'Why LinkedIn Matters More Than Ever', '{}')
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- Insert default Cover Letter services page content
INSERT INTO page_content (page_slug, section_key, content_type, content_value, metadata) VALUES
  ('services-cover-letter', 'hero_title', 'text', 'Outstanding Cover Letters by CareerSasa', '{}'),
  ('services-cover-letter', 'hero_subtitle', 'text', 'Cover Letters That Get Read 📄✉️', '{}'),
  ('services-cover-letter', 'hero_description', 'html', '<p>Your CV shows what you''ve done. Your cover letter explains <strong>why you''re the right fit</strong>.</p>', '{}')
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_page_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_page_content_timestamp
  BEFORE UPDATE ON page_content
  FOR EACH ROW
  EXECUTE FUNCTION update_page_content_updated_at();
