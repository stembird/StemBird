-- Enhance blog_posts table with publishing workflow and metadata
-- Add status field for draft/published workflow
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived'));
-- Add published_at timestamp
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS published_at timestamp with time zone;
-- Set published_at for existing published posts
UPDATE blog_posts SET published_at = created_at WHERE status = 'published' AND published_at IS NULL;
-- Add reading_time in minutes
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS reading_time integer;
-- Index for fast filtering by status
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);

-- Update RLS: public only sees published posts (drop all variants for idempotency)
DROP POLICY IF EXISTS "Anyone can view blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Anyone can view published blog posts" ON blog_posts;
DROP POLICY IF EXISTS "Admins can view all blog posts" ON blog_posts;
CREATE POLICY "Anyone can view published blog posts"
ON blog_posts FOR SELECT USING (status = 'published');
-- Admins can see all posts (drafts too)
CREATE POLICY "Admins can view all blog posts"
ON blog_posts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Add blog_categories table for structured categories
CREATE TABLE IF NOT EXISTS blog_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view blog categories" ON blog_categories;
DROP POLICY IF EXISTS "Admins can manage blog categories" ON blog_categories;
CREATE POLICY "Anyone can view blog categories" ON blog_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage blog categories" ON blog_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed some default categories
INSERT INTO blog_categories (name, slug, description) VALUES
  ('Career Tips', 'career-tips', 'Practical advice for advancing your career'),
  ('Job Market', 'job-market', 'Insights into the current job market and trends'),
  ('Interview Prep', 'interview-prep', 'How to ace your next interview'),
  ('CV & Resume', 'cv-resume', 'Tips for building standout CVs and resumes'),
  ('Company Spotlight', 'company-spotlight', 'Deep dives into top employers'),
  ('Success Stories', 'success-stories', 'Real stories from job seekers who landed their dream roles')
ON CONFLICT (slug) DO NOTHING;

-- Fix blog_comments RLS to use has_role() instead of user_roles table
DROP POLICY IF EXISTS "Admins can manage all comments" ON blog_comments;
CREATE POLICY "Admins can manage all comments"
ON blog_comments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
