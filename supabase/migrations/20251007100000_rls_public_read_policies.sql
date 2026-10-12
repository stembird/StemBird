-- Enable RLS and add read policies for public data
BEGIN;

-- Jobs: public readable
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Public can read jobs"
    ON public.jobs FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Blog posts: public readable
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Public can read blog posts"
    ON public.blog_posts FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Companies: public readable (already existed, ensure enabled)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Public can read companies"
    ON public.companies FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_roles: restrict read to admins only
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Admins can read user roles"
    ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;


