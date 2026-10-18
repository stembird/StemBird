-- ============================================================================
-- StemBird / StemBird - FRESH-INSTALL SCHEMA (all migrations, ordered)
-- Target Supabase project: qhfdjccudtqnlkbtsjgg
-- GLOBAL dependency-aware topological order (every CREATE before its referencers),
-- base = migration timestamp. Excludes buggy 20260307_candidate_career_tools.sql.
-- profiles->user_profiles fixed; storage policies idempotent. Non-destructive.
-- Files included: 116
-- ============================================================================

-- ----------------------------------------------------------------
-- >>> 20251001060506_df480a6b-80af-4a07-800f-91a87be36c31.sql
-- ----------------------------------------------------------------
-- Create jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  salary TEXT,
  apply_link TEXT,
  apply_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view jobs (public portal)
CREATE POLICY "Anyone can view jobs" 
ON public.jobs 
FOR SELECT 
USING (true);

-- For now, allow anyone to insert jobs (we'll add auth later)
CREATE POLICY "Anyone can create jobs" 
ON public.jobs 
FOR INSERT 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- ----------------------------------------------------------------
-- >>> 20251001061422_6982fa73-6c72-463b-bf88-4f0eb7d9bcc0.sql
-- ----------------------------------------------------------------
-- Update jobs table to track which user posted the job
ALTER TABLE public.jobs ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies to require authentication for posting jobs
DROP POLICY IF EXISTS "Anyone can create jobs" ON public.jobs;

CREATE POLICY "Authenticated users can create jobs" 
ON public.jobs 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Keep public viewing
-- "Anyone can view jobs" policy already exists


-- ----------------------------------------------------------------
-- >>> 20251002021940_a71f5d63-f451-43c0-9d4a-3c588e9e5747.sql
-- ----------------------------------------------------------------
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('employer', 'candidate', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Create function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create job_applications table
CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (job_id, user_id)
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for job_applications
CREATE POLICY "Users can view their own applications"
ON public.job_applications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Employers can view applications for their jobs"
ON public.job_applications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = job_applications.job_id
    AND jobs.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all applications"
ON public.job_applications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Candidates can create applications"
ON public.job_applications FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND public.has_role(auth.uid(), 'candidate')
);

CREATE POLICY "Users can delete their own applications"
ON public.job_applications FOR DELETE
USING (auth.uid() = user_id);

-- Create saved_jobs table
CREATE TABLE public.saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (job_id, user_id)
);

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for saved_jobs
CREATE POLICY "Users can view their own saved jobs"
ON public.saved_jobs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can save jobs"
ON public.saved_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave jobs"
ON public.saved_jobs FOR DELETE
USING (auth.uid() = user_id);

-- Update jobs table RLS policies
DROP POLICY IF EXISTS "Authenticated users can create jobs" ON public.jobs;

CREATE POLICY "Employers and admins can create jobs"
ON public.jobs FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND (
    public.has_role(auth.uid(), 'employer') 
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Employers can update their own jobs"
ON public.jobs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all jobs"
ON public.jobs FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Employers can delete their own jobs"
ON public.jobs FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete all jobs"
ON public.jobs FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));


-- ----------------------------------------------------------------
-- >>> 20251003063255_c28f601a-a60b-4b1f-a00a-936e68a1aee5.sql
-- ----------------------------------------------------------------
-- Create a function to handle new user role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert the user role from the metadata, defaulting to 'candidate' if not specified
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'candidate')::app_role
  );
  RETURN NEW;
END;
$$;

-- Create trigger to automatically assign role on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- Add RLS policy to allow viewing of roles
CREATE POLICY "Allow users to insert their own role during signup"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix any existing users without roles (assign them as candidates by default)
INSERT INTO public.user_roles (user_id, role)
SELECT au.id, 'candidate'::app_role
FROM auth.users au
LEFT JOIN public.user_roles ur ON au.id = ur.user_id
WHERE ur.id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;


-- ----------------------------------------------------------------
-- >>> 20251003064057_8676323d-c092-4df4-926c-ee6cd241bfbe.sql
-- ----------------------------------------------------------------
-- Create blog_posts table
CREATE TABLE public.blog_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  featured_image text,
  content text NOT NULL,
  excerpt text,
  category text,
  tags text[],
  author_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Anyone can view
CREATE POLICY "Anyone can view blog posts"
ON public.blog_posts
FOR SELECT
USING (true);

-- Admins can do everything
CREATE POLICY "Admins can create blog posts"
ON public.blog_posts
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update blog posts"
ON public.blog_posts
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete blog posts"
ON public.blog_posts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Employers can manage their own posts
CREATE POLICY "Employers can create their own blog posts"
ON public.blog_posts
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'employer'::app_role) AND auth.uid() = author_id);

CREATE POLICY "Employers can update their own blog posts"
ON public.blog_posts
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'employer'::app_role) AND auth.uid() = author_id);

CREATE POLICY "Employers can delete their own blog posts"
ON public.blog_posts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'employer'::app_role) AND auth.uid() = author_id);

-- Add trigger for updated_at
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- ----------------------------------------------------------------
-- >>> create_blog_comments_table.sql
-- ----------------------------------------------------------------
-- Create blog_comments table
CREATE TABLE IF NOT EXISTS blog_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  content TEXT NOT NULL,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_blog_comments_post_id ON blog_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_approved ON blog_comments(approved);

-- Enable RLS
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert comments (they need approval)
CREATE POLICY "Anyone can insert comments" ON blog_comments
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only approved comments are visible to public
CREATE POLICY "Approved comments are visible" ON blog_comments
  FOR SELECT
  USING (approved = true);

-- Policy: Admins can see and manage all comments
CREATE POLICY "Admins can manage all comments" ON blog_comments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );


-- ----------------------------------------------------------------
-- >>> 20251003065852_8d64c5eb-161f-4b4c-8126-acc9db5b7064.sql
-- ----------------------------------------------------------------
-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  logo TEXT,
  website TEXT,
  industry TEXT,
  location TEXT,
  size TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Anyone can view companies"
  ON public.companies
  FOR SELECT
  USING (true);

CREATE POLICY "Employers can create their own company"
  ON public.companies
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND 
    has_role(auth.uid(), 'employer'::app_role)
  );

CREATE POLICY "Employers can update their own company"
  ON public.companies
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Employers can delete their own company"
  ON public.companies
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can create any company"
  ON public.companies
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update any company"
  ON public.companies
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any company"
  ON public.companies
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add company_id to jobs table
ALTER TABLE public.jobs ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ----------------------------------------------------------------
-- >>> 20251005094451_make_careersasa90_admin.sql
-- ----------------------------------------------------------------



-- ----------------------------------------------------------------
-- >>> 20251007063752_28d53ed5-4149-4c15-8488-38745d1de79a.sql
-- ----------------------------------------------------------------
-- Create enums for job fields
CREATE TYPE public.employment_type AS ENUM (
  'FULL_TIME',
  'PART_TIME',
  'CONTRACTOR',
  'INTERN',
  'TEMPORARY',
  'VOLUNTEER',
  'PER_DIEM'
);

CREATE TYPE public.job_location_type AS ENUM (
  'ON_SITE',
  'REMOTE',
  'HYBRID'
);

CREATE TYPE public.experience_level AS ENUM (
  'Entry',
  'Mid',
  'Senior',
  'Managerial',
  'Internship'
);

CREATE TYPE public.salary_period AS ENUM (
  'YEAR',
  'MONTH',
  'WEEK',
  'DAY',
  'HOUR'
);

CREATE TYPE public.job_status AS ENUM (
  'active',
  'expired',
  'draft',
  'pending'
);

CREATE TYPE public.visa_sponsorship AS ENUM (
  'Yes',
  'No',
  'Not Applicable'
);

CREATE TYPE public.posted_by AS ENUM (
  'admin',
  'employer'
);

-- Add new columns to jobs table
ALTER TABLE public.jobs
  -- Core Google Job Posting Fields (keeping existing title, description)
  ADD COLUMN date_posted TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ADD COLUMN valid_through TIMESTAMP WITH TIME ZONE,
  ADD COLUMN employment_type employment_type DEFAULT 'FULL_TIME',
  ADD COLUMN hiring_organization_name TEXT,
  ADD COLUMN hiring_organization_logo TEXT,
  ADD COLUMN hiring_organization_url TEXT,
  ADD COLUMN job_location_type job_location_type DEFAULT 'ON_SITE',
  ADD COLUMN job_location_country TEXT DEFAULT 'Kenya',
  ADD COLUMN job_location_county TEXT,
  ADD COLUMN job_location_city TEXT,
  ADD COLUMN job_location_address TEXT,
  ADD COLUMN identifier TEXT UNIQUE,
  ADD COLUMN applicant_location_requirements TEXT,
  ADD COLUMN direct_apply BOOLEAN DEFAULT true,
  ADD COLUMN application_url TEXT,
  
  -- STEM/Health/Architecture Fields
  ADD COLUMN industry TEXT,
  ADD COLUMN specialization TEXT,
  ADD COLUMN required_qualifications JSONB,
  ADD COLUMN preferred_qualifications JSONB,
  ADD COLUMN education_requirements TEXT,
  ADD COLUMN license_requirements TEXT,
  ADD COLUMN practice_area TEXT,
  ADD COLUMN software_skills JSONB,
  ADD COLUMN project_type TEXT,
  ADD COLUMN experience_level experience_level,
  ADD COLUMN language_requirements TEXT,
  ADD COLUMN visa_sponsorship visa_sponsorship,
  
  -- Compensation & Schedule
  ADD COLUMN salary_currency TEXT DEFAULT 'KES',
  ADD COLUMN salary_min INTEGER,
  ADD COLUMN salary_max INTEGER,
  ADD COLUMN salary_period salary_period DEFAULT 'MONTH',
  ADD COLUMN work_schedule TEXT,
  
  -- Functional Portal Fields
  ADD COLUMN job_slug TEXT UNIQUE,
  ADD COLUMN posted_by posted_by DEFAULT 'employer',
  ADD COLUMN status job_status DEFAULT 'active',
  ADD COLUMN views_count INTEGER DEFAULT 0,
  ADD COLUMN applications_count INTEGER DEFAULT 0,
  ADD COLUMN tags JSONB,
  ADD COLUMN job_function TEXT;

-- Create function to generate job slug
CREATE OR REPLACE FUNCTION public.generate_job_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from title
  base_slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  final_slug := base_slug;
  
  -- Check for uniqueness and append counter if needed
  WHILE EXISTS (SELECT 1 FROM public.jobs WHERE job_slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.job_slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating job slug
CREATE TRIGGER generate_job_slug_trigger
  BEFORE INSERT OR UPDATE OF title ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_job_slug();

-- Create function to auto-populate identifier
CREATE OR REPLACE FUNCTION public.generate_job_identifier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.identifier IS NULL THEN
    NEW.identifier := NEW.id::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating identifier
CREATE TRIGGER generate_job_identifier_trigger
  BEFORE INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_job_identifier();

-- Create indexes for search performance
CREATE INDEX idx_jobs_title ON public.jobs USING gin(to_tsvector('english', title));
CREATE INDEX idx_jobs_industry ON public.jobs(industry);
CREATE INDEX idx_jobs_specialization ON public.jobs(specialization);
CREATE INDEX idx_jobs_job_location_county ON public.jobs(job_location_county);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_employment_type ON public.jobs(employment_type);
CREATE INDEX idx_jobs_experience_level ON public.jobs(experience_level);
CREATE INDEX idx_jobs_valid_through ON public.jobs(valid_through);
CREATE INDEX idx_jobs_job_slug ON public.jobs(job_slug);

-- Update existing jobs with default values
UPDATE public.jobs
SET 
  date_posted = COALESCE(created_at, now()),
  hiring_organization_name = company,
  identifier = id::TEXT,
  job_slug = lower(regexp_replace(title || '-' || substring(id::TEXT, 1, 8), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE date_posted IS NULL;


-- ----------------------------------------------------------------
-- >>> 20251007063814_a4031fd0-dcfb-43e5-8cdd-1b18e95f0b2b.sql
-- ----------------------------------------------------------------
-- Fix function search path security warnings

-- Update generate_job_slug function with security definer and search_path
CREATE OR REPLACE FUNCTION public.generate_job_slug()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from title
  base_slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  final_slug := base_slug;
  
  -- Check for uniqueness and append counter if needed
  WHILE EXISTS (SELECT 1 FROM public.jobs WHERE job_slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.job_slug := final_slug;
  RETURN NEW;
END;
$$;

-- Update generate_job_identifier function with security definer and search_path
CREATE OR REPLACE FUNCTION public.generate_job_identifier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.identifier IS NULL THEN
    NEW.identifier := NEW.id::TEXT;
  END IF;
  RETURN NEW;
END;
$$;


-- ----------------------------------------------------------------
-- >>> 20251007080000_optional_constraints_and_indexes.sql
-- ----------------------------------------------------------------
-- Optional constraints and indexes for jobs table

-- CHECK: enforce either direct apply OR an application URL is provided
ALTER TABLE public.jobs
ADD CONSTRAINT chk_jobs_apply_path
CHECK (
  direct_apply = true OR application_url IS NOT NULL
);

-- CHECK: salary_min <= salary_max when both are provided
ALTER TABLE public.jobs
ADD CONSTRAINT chk_jobs_salary_bounds
CHECK (
  salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max
);

-- Index for job_function filtering/sorting
CREATE INDEX IF NOT EXISTS idx_jobs_job_function ON public.jobs(job_function);

-- GIN index for tags (JSONB) for keyword filtering
CREATE INDEX IF NOT EXISTS idx_jobs_tags ON public.jobs USING gin(tags);

-- Optional partial index to accelerate queries for currently active jobs
-- Note: queries should reference the same predicate to leverage this index
-- Use a composite btree index instead (functions like now() are not IMMUTABLE)
CREATE INDEX IF NOT EXISTS idx_jobs_status_valid_through
ON public.jobs(status, valid_through);


-- ----------------------------------------------------------------
-- >>> 20251007090000_job_schema_lookup_and_sync.sql
-- ----------------------------------------------------------------
-- Lookup tables for standardized dropdowns and FKs

-- Industries
CREATE TABLE IF NOT EXISTS public.industries (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Job Functions
CREATE TABLE IF NOT EXISTS public.job_functions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Education Levels
CREATE TABLE IF NOT EXISTS public.education_levels (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Experience Levels
CREATE TABLE IF NOT EXISTS public.experience_levels (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Counties (Kenya 47)
CREATE TABLE IF NOT EXISTS public.counties (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enums for job schema additions
DO $$ BEGIN
  CREATE TYPE public.salary_visibility AS ENUM ('Show', 'Hide');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.salary_type AS ENUM ('Monthly', 'Weekly', 'Hourly', 'Annually');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.job_source AS ENUM ('Employer', 'Admin', 'Scraper');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Optional currency enum (keep TEXT if migration risk). Convert if safe.
DO $$ BEGIN
  CREATE TYPE public.currency_code AS ENUM ('KES', 'USD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add new columns to jobs with FKs and indexes
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS responsibilities TEXT,
  ADD COLUMN IF NOT EXISTS qualifications TEXT,
  ADD COLUMN IF NOT EXISTS minimum_experience INTEGER,
  ADD COLUMN IF NOT EXISTS education_level_id INTEGER REFERENCES public.education_levels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS job_function_id INTEGER REFERENCES public.job_functions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS industry_id INTEGER REFERENCES public.industries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS experience_level_ref_id INTEGER REFERENCES public.experience_levels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS county_id INTEGER REFERENCES public.counties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location_town TEXT,
  ADD COLUMN IF NOT EXISTS salary_visibility public.salary_visibility DEFAULT 'Show',
  ADD COLUMN IF NOT EXISTS salary_type public.salary_type,
  ADD COLUMN IF NOT EXISTS source public.job_source DEFAULT 'Employer',
  ADD COLUMN IF NOT EXISTS google_indexed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS application_deadline DATE,
  ADD COLUMN IF NOT EXISTS posted_date DATE;

-- Keep salary_currency as-is (TEXT) to avoid data conversion issues; default remains handled by prior migration

-- Keep application_deadline in sync with valid_through (date part)
CREATE OR REPLACE FUNCTION public.sync_application_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.valid_through IS DISTINCT FROM OLD.valid_through THEN
    NEW.application_deadline := CASE WHEN NEW.valid_through IS NULL THEN NULL ELSE CAST(NEW.valid_through AT TIME ZONE 'UTC' AS DATE) END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_application_deadline ON public.jobs;
CREATE TRIGGER trg_sync_application_deadline
BEFORE INSERT OR UPDATE OF valid_through ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.sync_application_deadline();

-- Keep posted_date in sync with date_posted (date part)
CREATE OR REPLACE FUNCTION public.sync_posted_date()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.date_posted IS DISTINCT FROM OLD.date_posted THEN
    NEW.posted_date := CASE WHEN NEW.date_posted IS NULL THEN CAST(now() AT TIME ZONE 'UTC' AS DATE) ELSE CAST(NEW.date_posted AT TIME ZONE 'UTC' AS DATE) END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_posted_date ON public.jobs;
CREATE TRIGGER trg_sync_posted_date
BEFORE INSERT OR UPDATE OF date_posted ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.sync_posted_date();

-- Update slug generation to also populate slug alongside job_slug
CREATE OR REPLACE FUNCTION public.generate_job_slug()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  base_slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.jobs WHERE (job_slug = final_slug OR slug = final_slug) AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  NEW.job_slug := final_slug;
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$;

-- Ensure trigger exists (already created earlier, keep it)
DO $$ BEGIN
  PERFORM 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid WHERE t.tgname = 'generate_job_slug_trigger' AND c.relname = 'jobs';
  IF NOT FOUND THEN
    CREATE TRIGGER generate_job_slug_trigger
    BEFORE INSERT OR UPDATE OF title ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_job_slug();
  END IF;
END $$;

-- Backfill slug from existing job_slug if empty
UPDATE public.jobs SET slug = job_slug WHERE slug IS NULL AND job_slug IS NOT NULL;

-- Indexes for new FKs and slug
CREATE INDEX IF NOT EXISTS idx_jobs_slug ON public.jobs(slug);
CREATE INDEX IF NOT EXISTS idx_jobs_job_function_id ON public.jobs(job_function_id);
CREATE INDEX IF NOT EXISTS idx_jobs_industry_id ON public.jobs(industry_id);
CREATE INDEX IF NOT EXISTS idx_jobs_county_id ON public.jobs(county_id);
CREATE INDEX IF NOT EXISTS idx_jobs_experience_level_ref_id ON public.jobs(experience_level_ref_id);
CREATE INDEX IF NOT EXISTS idx_jobs_education_level_id ON public.jobs(education_level_id);

-- Seed 47 Kenyan counties (id auto-increments; insert ignore duplicates)
INSERT INTO public.counties (name, slug)
VALUES
  ('Baringo', 'baringo'),
  ('Bomet', 'bomet'),
  ('Bungoma', 'bungoma'),
  ('Busia', 'busia'),
  ('Elgeyo-Marakwet', 'elgeyo-marakwet'),
  ('Embu', 'embu'),
  ('Garissa', 'garissa'),
  ('Homa Bay', 'homa-bay'),
  ('Isiolo', 'isiolo'),
  ('Kajiado', 'kajiado'),
  ('Kakamega', 'kakamega'),
  ('Kericho', 'kericho'),
  ('Kiambu', 'kiambu'),
  ('Kilifi', 'kilifi'),
  ('Kirinyaga', 'kirinyaga'),
  ('Kisii', 'kisii'),
  ('Kisumu', 'kisumu'),
  ('Kitui', 'kitui'),
  ('Kwale', 'kwale'),
  ('Laikipia', 'laikipia'),
  ('Lamu', 'lamu'),
  ('Machakos', 'machakos'),
  ('Makueni', 'makueni'),
  ('Mandera', 'mandera'),
  ('Marsabit', 'marsabit'),
  ('Meru', 'meru'),
  ('Migori', 'migori'),
  ('Mombasa', 'mombasa'),
  ('Murang’a', 'muranga'),
  ('Nairobi', 'nairobi'),
  ('Nakuru', 'nakuru'),
  ('Nandi', 'nandi'),
  ('Narok', 'narok'),
  ('Nyamira', 'nyamira'),
  ('Nyandarua', 'nyandarua'),
  ('Nyeri', 'nyeri'),
  ('Samburu', 'samburu'),
  ('Siaya', 'siaya'),
  ('Taita–Taveta', 'taita-taveta'),
  ('Tana River', 'tana-river'),
  ('Tharaka–Nithi', 'tharaka-nithi'),
  ('Trans Nzoia', 'trans-nzoia'),
  ('Turkana', 'turkana'),
  ('Uasin Gishu', 'uasin-gishu'),
  ('Vihiga', 'vihiga'),
  ('Wajir', 'wajir'),
  ('West Pokot', 'west-pokot')
ON CONFLICT (name) DO NOTHING;


-- ----------------------------------------------------------------
-- >>> 20251007093000_create_towns.sql
-- ----------------------------------------------------------------
-- Create towns table with FK to counties and indexes
BEGIN;

CREATE TABLE IF NOT EXISTS public.towns (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  county_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_towns_name_per_county UNIQUE (name, county_id),
  CONSTRAINT uq_towns_slug UNIQUE (slug),
  CONSTRAINT fk_towns_county
    FOREIGN KEY (county_id)
    REFERENCES public.counties(id)
    ON DELETE CASCADE
);

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_towns_county_id ON public.towns(county_id);
CREATE INDEX IF NOT EXISTS idx_towns_name ON public.towns(name);

-- trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_towns_updated_at ON public.towns;
CREATE TRIGGER update_towns_updated_at
  BEFORE UPDATE ON public.towns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;


-- ----------------------------------------------------------------
-- >>> 20251007093100_seed_towns.sql
-- ----------------------------------------------------------------
-- Seed towns via migration (idempotent via ON CONFLICT)
BEGIN;

-- Ensure towns table exists
DO $$ BEGIN
  PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'towns';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Table public.towns does not exist; run migrations creating towns first.';
  END IF;
END $$;

-- Inline seed content (idempotent via ON CONFLICT)

-- 1. Baringo (county_id = 1)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kabarnet', 1, 'kabarnet'),
  ('Eldama Ravine', 1, 'eldama-ravine'),
  ('Marigat', 1, 'marigat'),
  ('Kabartonjo', 1, 'kabartonjo'),
  ('Mogotio', 1, 'mogotio'),
  ('Tenges', 1, 'tenges'),
  ('Barwessa', 1, 'barwessa'),
  ('Bartabwa', 1, 'bartabwa'),
  ('Kabarnet Town', 1, 'kabarnet-town'),
  ('Kisanana', 1, 'kisanana'),
  ('Kabenes', 1, 'kabenes'),
  ('Riong’ak', 1, 'riongak')
ON CONFLICT (name, county_id) DO NOTHING;

-- 2. Bomet (county_id = 2)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Bomet', 2, 'bomet'),
  ('Sotik', 2, 'sotik'),
  ('Mulot', 2, 'mulot'),
  ('Chebunyo', 2, 'chebunyo'),
  ('Litein', 2, 'litein'),
  ('Kapkugerwet', 2, 'kapkugerwet'),
  ('Mogogosiek', 2, 'mogogosiek'),
  ('Bomet Town', 2, 'bomet-town'),
  ('Silibwet', 2, 'silibwet')
ON CONFLICT (name, county_id) DO NOTHING;

-- 3. Bungoma (county_id = 3)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Bungoma', 3, 'bungoma'),
  ('Webuye', 3, 'webuye'),
  ('Kimilili', 3, 'kimilili'),
  ('Chwele', 3, 'chwele'),
  ('Sirisia', 3, 'sirisia'),
  ('Bungoma Town', 3, 'bungoma-town'),
  ('Tongaren', 3, 'tongaren'),
  ('Kapsokwony', 3, 'kapsokwony'),
  ('Malakisi', 3, 'malakisi'),
  ('Kabula', 3, 'kabula'),
  ('Webuye East', 3, 'webuye-east'),
  ('Kanduyi', 3, 'kanduyi')
ON CONFLICT (name, county_id) DO NOTHING;

-- 4. Busia (county_id = 4)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Busia', 4, 'busia'),
  ('Malaba', 4, 'malaba'),
  ('Nambale', 4, 'nambale'),
  ('Funyula', 4, 'funyula'),
  ('Butula', 4, 'butula'),
  ('Teso North (Amagoro)', 4, 'teso-north-amagoro'),
  ('Budalangi', 4, 'budalangi'),
  ('Samia', 4, 'samia'),
  ('Busia Town', 4, 'busia-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 5. Elgeyo-Marakwet (county_id = 5)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Iten', 5, 'iten'),
  ('Kapsowar', 5, 'kapsowar'),
  ('Kieno', 5, 'kieno'),
  ('Kapyego', 5, 'kapyego'),
  ('Chepkorio', 5, 'chepkorio'),
  ('Chebara', 5, 'chebara'),
  ('Embobut', 5, 'embobut'),
  ('Kapkuikui', 5, 'kapkuikui'),
  ('Tot', 5, 'tot'),
  ('Talai', 5, 'talai'),
  ('Iten Town', 5, 'iten-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 6. Embu (county_id = 6)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Embu', 6, 'embu'),
  ('Runyenjes', 6, 'runyenjes'),
  ('Siakago (Mbeere)', 6, 'siakago-mbeere'),
  ('Kiritiri', 6, 'kiritiri'),
  ('Karurumo', 6, 'karurumo'),
  ('Kianjai', 6, 'kianjai'),
  ('Manyatta', 6, 'manyatta'),
  ('Embu Town', 6, 'embu-town'),
  ('Kangaru', 6, 'kangaru')
ON CONFLICT (name, county_id) DO NOTHING;

-- 7. Garissa (county_id = 7)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Garissa', 7, 'garissa'),
  ('Dadaab', 7, 'dadaab'),
  ('Modika', 7, 'modika'),
  ('Hulugho', 7, 'hulugho'),
  ('Fafi', 7, 'fafi'),
  ('Balambala', 7, 'balambala'),
  ('Lagdera', 7, 'lagdera'),
  ('Ijara', 7, 'ijara'),
  ('Madogo', 7, 'madogo'),
  ('Garissa Town', 7, 'garissa-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 8. Homa Bay (county_id = 8)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Homa Bay', 8, 'homa-bay'),
  ('Mbita', 8, 'mbita'),
  ('Oyugis', 8, 'oyugis'),
  ('Kendu Bay', 8, 'kendu-bay'),
  ('Rodi', 8, 'rodi'),
  ('Sindo', 8, 'sindo'),
  ('Rangwe', 8, 'rangwe'),
  ('Kabondo', 8, 'kabondo'),
  ('Ndhiwa', 8, 'ndhiwa'),
  ('Homa Bay Town', 8, 'homa-bay-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 9. Isiolo (county_id = 9)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Isiolo', 9, 'isiolo'),
  ('Garbatulla', 9, 'garbatulla'),
  ('Kinna', 9, 'kinna'),
  ('Sericho', 9, 'sericho'),
  ('Oldonyiro', 9, 'oldonyiro'),
  ('Merti', 9, 'merti'),
  ('Jima', 9, 'jima'),
  ('Kulamawe', 9, 'kulamawe'),
  ('Isiolo Town', 9, 'isiolo-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 10. Kajiado (county_id = 10)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kajiado', 10, 'kajiado'),
  ('Kitengela', 10, 'kitengela'),
  ('Ongata Rongai', 10, 'ongata-rongai'),
  ('Ngong', 10, 'ngong'),
  ('Namanga', 10, 'namanga'),
  ('Isinya', 10, 'isinya'),
  ('Kajiado Town', 10, 'kajiado-town'),
  ('Maili Tisa', 10, 'maili-tisa'),
  ('Kitonyoni', 10, 'kitonyoni')
ON CONFLICT (name, county_id) DO NOTHING;

-- 11. Kakamega (county_id = 11)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kakamega', 11, 'kakamega'),
  ('Mumias', 11, 'mumias'),
  ('Malava', 11, 'malava'),
  ('Butere', 11, 'butere'),
  ('Shinyalu', 11, 'shinyalu'),
  ('Lurambi', 11, 'lurambi'),
  ('Ikolomani', 11, 'ikolomani'),
  ('Matungu', 11, 'matungu'),
  ('Khwisero', 11, 'khwisero'),
  ('Likuyani', 11, 'likuyani')
ON CONFLICT (name, county_id) DO NOTHING;

-- 12. Kericho (county_id = 12)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kericho', 12, 'kericho'),
  ('Londiani', 12, 'londiani'),
  ('Litein', 12, 'litein-kericho'),
  ('Ainamoi', 12, 'ainamoi'),
  ('Kipkelion', 12, 'kipkelion'),
  ('Kapkatet', 12, 'kapkatet'),
  ('Kabianga', 12, 'kabianga'),
  ('Zedern', 12, 'zedern'),
  ('Belgut', 12, 'belgut')
ON CONFLICT (name, county_id) DO NOTHING;

-- 13. Kiambu (county_id = 13)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kiambu Town', 13, 'kiambu-town'),
  ('Thika', 13, 'thika'),
  ('Ruiru', 13, 'ruiru'),
  ('Limuru', 13, 'limuru'),
  ('Githunguri', 13, 'githunguri'),
  ('Kikuyu', 13, 'kikuyu'),
  ('Juja', 13, 'juja'),
  ('Gatundu', 13, 'gatundu'),
  ('Karuri', 13, 'karuri'),
  ('Kiambu', 13, 'kiambu'),
  ('Kabete', 13, 'kabete'),
  ('Wangige', 13, 'wangige'),
  ('Kiambu Road towns', 13, 'kiambu-road-towns')
ON CONFLICT (name, county_id) DO NOTHING;

-- 14. Kilifi (county_id = 14)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kilifi', 14, 'kilifi'),
  ('Malindi', 14, 'malindi'),
  ('Watamu', 14, 'watamu'),
  ('Mariakani', 14, 'mariakani'),
  ('Kaloleni', 14, 'kaloleni'),
  ('Kilifi Town', 14, 'kilifi-town'),
  ('Mpeketoni', 14, 'mpeketoni-kilifi'),
  ('Rabai', 14, 'rabai'),
  ('Ganze', 14, 'ganze'),
  ('Marafa', 14, 'marafa')
ON CONFLICT (name, county_id) DO NOTHING;

-- 15. Kirinyaga (county_id = 15)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kerugoya', 15, 'kerugoya'),
  ('Kutus', 15, 'kutus'),
  ('Sagana', 15, 'sagana'),
  ('Kagio', 15, 'kagio'),
  ('Wanguru', 15, 'wanguru'),
  ('Kianyaga', 15, 'kianyaga'),
  ('Mukure', 15, 'mukure'),
  ('Makutano', 15, 'makutano'),
  ('Kirinyaga', 15, 'kirinyaga'),
  ('Kerugoya Town', 15, 'kerugoya-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 16. Kisii (county_id = 16)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kisii', 16, 'kisii'),
  ('Ogembo', 16, 'ogembo'),
  ('Nyamache', 16, 'nyamache'),
  ('Tabaka', 16, 'tabaka'),
  ('Nyamira', 16, 'nyamira'),
  ('Bomachoge', 16, 'bomachoge'),
  ('Gesusu', 16, 'gesusu'),
  ('Kitutu Chache towns', 16, 'kitutu-chache-towns'),
  ('Kisii Town', 16, 'kisii-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 17. Kisumu (county_id = 17)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kisumu', 17, 'kisumu'),
  ('Ahero', 17, 'ahero'),
  ('Maseno', 17, 'maseno'),
  ('Muhoroni', 17, 'muhoroni'),
  ('Nyando', 17, 'nyando'),
  ('Seme', 17, 'seme'),
  ('Kibos', 17, 'kibos'),
  ('Kisumu Town', 17, 'kisumu-town'),
  ('Kondele', 17, 'kondele'),
  ('Manyatta', 17, 'manyatta-kisumu'),
  ('Migosi', 17, 'migosi')
ON CONFLICT (name, county_id) DO NOTHING;

-- 18. Kitui (county_id = 18)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kitui', 18, 'kitui'),
  ('Mwingi', 18, 'mwingi'),
  ('Mutomo', 18, 'mutomo'),
  ('Kyuso', 18, 'kyuso'),
  ('Kwa Vonza', 18, 'kwa-vonza'),
  ('Kibwezi', 18, 'kibwezi-kitui'),
  ('Ikutha', 18, 'ikutha'),
  ('Kitui Town', 18, 'kitui-town'),
  ('Machakos-border towns', 18, 'machakos-border-towns')
ON CONFLICT (name, county_id) DO NOTHING;

-- 19. Kwale (county_id = 19)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kwale', 19, 'kwale'),
  ('Ukunda', 19, 'ukunda'),
  ('Msambweni', 19, 'msambweni'),
  ('Kinango', 19, 'kinango'),
  ('Lunga Lunga', 19, 'lunga-lunga'),
  ('Diani', 19, 'diani'),
  ('Tsunza', 19, 'tsunza'),
  ('Kwale Town', 19, 'kwale-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 20. Laikipia (county_id = 20)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Nanyuki', 20, 'nanyuki'),
  ('Rumuruti', 20, 'rumuruti'),
  ('Nyahururu', 20, 'nyahururu'),
  ('Dol Dol', 20, 'dol-dol'),
  ('Ng’arua', 20, 'ngarua'),
  ('Timau', 20, 'timau'),
  ('Nanyuki Town', 20, 'nanyuki-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 21. Lamu (county_id = 21)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Lamu', 21, 'lamu'),
  ('Mpeketoni', 21, 'mpeketoni'),
  ('Faza', 21, 'faza'),
  ('Shela', 21, 'shela'),
  ('Lamu Old Town', 21, 'lamu-old-town'),
  ('Kiunga', 21, 'kiunga'),
  ('Mokowe', 21, 'mokowe'),
  ('Witu', 21, 'witu')
ON CONFLICT (name, county_id) DO NOTHING;

-- 22. Machakos (county_id = 22)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Machakos', 22, 'machakos'),
  ('Kangundo', 22, 'kangundo'),
  ('Matuu', 22, 'matuu'),
  ('Tala', 22, 'tala'),
  ('Kathiani', 22, 'kathiani'),
  ('Athi River', 22, 'athi-river'),
  ('Masii', 22, 'masii'),
  ('Emali', 22, 'emali-machakos'),
  ('Machakos Town', 22, 'machakos-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 23. Makueni (county_id = 23)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Wote', 23, 'wote'),
  ('Kibwezi', 23, 'kibwezi'),
  ('Makindu', 23, 'makindu'),
  ('Emali', 23, 'emali'),
  ('Kathonzweni', 23, 'kathonzweni'),
  ('Makueni Town', 23, 'makueni-town'),
  ('Mbooni', 23, 'mbooni'),
  ('Kaiti', 23, 'kaiti')
ON CONFLICT (name, county_id) DO NOTHING;

-- 24. Mandera (county_id = 24)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Mandera Town', 24, 'mandera-town'),
  ('Elwak', 24, 'elwak'),
  ('Rhamu', 24, 'rhamu'),
  ('Banissa', 24, 'banissa'),
  ('Lafey', 24, 'lafey'),
  ('Takaba', 24, 'takaba'),
  ('Mandera East towns', 24, 'mandera-east-towns'),
  ('Arabia', 24, 'arabia')
ON CONFLICT (name, county_id) DO NOTHING;

-- 25. Marsabit (county_id = 25)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Marsabit', 25, 'marsabit'),
  ('Moyale', 25, 'moyale'),
  ('North Horr', 25, 'north-horr'),
  ('Saku', 25, 'saku'),
  ('Laisamis', 25, 'laisamis'),
  ('Merille', 25, 'merille'),
  ('Karare', 25, 'karare'),
  ('Korr', 25, 'korr'),
  ('Marsabit Town', 25, 'marsabit-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 26. Meru (county_id = 26)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Meru Town', 26, 'meru-town'),
  ('Maua', 26, 'maua'),
  ('Timau', 26, 'timau-meru'),
  ('Chuka', 26, 'chuka-meru'),
  ('Imenti', 26, 'imenti'),
  ('Kianjai', 26, 'kianjai-meru'),
  ('Nkubu', 26, 'nkubu-meru'),
  ('Buuri', 26, 'buuri')
ON CONFLICT (name, county_id) DO NOTHING;

-- 27. Migori (county_id = 27)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Migori', 27, 'migori'),
  ('Awendo', 27, 'awendo'),
  ('Rongo', 27, 'rongo'),
  ('Kehancha', 27, 'kehancha'),
  ('Oyugis', 27, 'oyugis-migori'),
  ('Macalder', 27, 'macalder'),
  ('Migori Town', 27, 'migori-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 28. Mombasa (county_id = 28)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Mombasa', 28, 'mombasa'),
  ('Likoni', 28, 'likoni'),
  ('Changamwe', 28, 'changamwe'),
  ('Nyali', 28, 'nyali'),
  ('Kisauni', 28, 'kisauni'),
  ('Bamburi', 28, 'bamburi'),
  ('Mtwapa', 28, 'mtwapa'),
  ('Port Reitz', 28, 'port-reitz'),
  ('Mombasa Town', 28, 'mombasa-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 29. Murang’a (county_id = 29)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Murang’a', 29, 'muranga'),
  ('Kangema', 29, 'kangema'),
  ('Kenol', 29, 'kenol'),
  ('Maragua', 29, 'maragua'),
  ('Kigumo', 29, 'kigumo'),
  ('Kijabe', 29, 'kijabe'),
  ('Maragua Town', 29, 'maragua-town'),
  ('Mathioya', 29, 'mathioya')
ON CONFLICT (name, county_id) DO NOTHING;

-- 30. Nairobi (county_id = 30)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Nairobi (CBD)', 30, 'nairobi-cbd'),
  ('Westlands', 30, 'westlands'),
  ('Industrial Area', 30, 'industrial-area'),
  ('Embakasi', 30, 'embakasi'),
  ('Kasarani', 30, 'kasarani'),
  ('Karen', 30, 'karen'),
  ('Lang’ata', 30, 'langata'),
  ('Dagoretti', 30, 'dagoretti'),
  ('Parklands', 30, 'parklands'),
  ('South C', 30, 'south-c'),
  ('South B', 30, 'south-b'),
  ('Lavington', 30, 'lavington'),
  ('Kilimani', 30, 'kilimani'),
  ('Upper Hill', 30, 'upper-hill'),
  ('Ruaraka', 30, 'ruaraka'),
  ('Roysambu', 30, 'roysambu')
ON CONFLICT (name, county_id) DO NOTHING;

-- 31. Nakuru (county_id = 31)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Nakuru', 31, 'nakuru'),
  ('Naivasha', 31, 'naivasha'),
  ('Gilgil', 31, 'gilgil'),
  ('Molo', 31, 'molo'),
  ('Subukia', 31, 'subukia'),
  ('Njoro', 31, 'njoro'),
  ('Eldama Ravine', 31, 'eldama-ravine-nakuru'),
  ('Bahati', 31, 'bahati'),
  ('Gilgil Town', 31, 'gilgil-town'),
  ('Rongai', 31, 'rongai'),
  ('Lanet', 31, 'lanet')
ON CONFLICT (name, county_id) DO NOTHING;

-- 32. Nandi (county_id = 32)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kapsabet', 32, 'kapsabet'),
  ('Nandi Hills', 32, 'nandi-hills'),
  ('Mosoriot', 32, 'mosoriot'),
  ('Tinderet', 32, 'tinderet'),
  ('Kabiyet', 32, 'kabiyet'),
  ('Nandi Town', 32, 'nandi-town'),
  ('Emgwen', 32, 'emgwen')
ON CONFLICT (name, county_id) DO NOTHING;

-- 33. Narok (county_id = 33)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Narok', 33, 'narok'),
  ('Kilgoris', 33, 'kilgoris'),
  ('Ololulung’a', 33, 'ololulunga'),
  ('Emali', 33, 'emali-narok'),
  ('Loita', 33, 'loita'),
  ('Narok Town', 33, 'narok-town'),
  ('Bissil', 33, 'bissil'),
  ('Naikara', 33, 'naikara')
ON CONFLICT (name, county_id) DO NOTHING;

-- 34. Nyamira (county_id = 34)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Nyamira', 34, 'nyamira-nyamira'),
  ('Keroka', 34, 'keroka'),
  ('Manga', 34, 'manga'),
  ('Kenyenya', 34, 'kenyenya'),
  ('Nyamira Town', 34, 'nyamira-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 35. Nyandarua (county_id = 35)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Ol Kalou', 35, 'ol-kalou'),
  ('Nyahururu', 35, 'nyahururu-nyandarua'),
  ('Kinangop', 35, 'kinangop'),
  ('Ol Kalou Town', 35, 'ol-kalou-town'),
  ('Njabini', 35, 'njabini'),
  ('Ndaragwa', 35, 'ndaragwa')
ON CONFLICT (name, county_id) DO NOTHING;

-- 36. Nyeri (county_id = 36)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Nyeri', 36, 'nyeri'),
  ('Karatina', 36, 'karatina'),
  ('Othaya', 36, 'othaya'),
  ('Nanyuki', 36, 'nanyuki-nyeri'),
  ('Mathira', 36, 'mathira'),
  ('Kieni', 36, 'kieni'),
  ('Chaka', 36, 'chaka'),
  ('Nyeri Town', 36, 'nyeri-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 37. Samburu (county_id = 37)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Maralal', 37, 'maralal'),
  ('Baragoi', 37, 'baragoi'),
  ('Wamba', 37, 'wamba'),
  ('Archer’s Post', 37, 'archers-post'),
  ('Suguta Marmar', 37, 'suguta-marmar'),
  ('Lodokejek', 37, 'lodokejek'),
  ('Sukutan', 37, 'sukutan')
ON CONFLICT (name, county_id) DO NOTHING;

-- 38. Siaya (county_id = 38)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Siaya', 38, 'siaya'),
  ('Bondo', 38, 'bondo'),
  ('Ugunja', 38, 'ugunja'),
  ('Ukwala', 38, 'ukwala'),
  ('Alego', 38, 'alego'),
  ('Rarieda', 38, 'rarieda'),
  ('Siaya Town', 38, 'siaya-town'),
  ('Gem', 38, 'gem')
ON CONFLICT (name, county_id) DO NOTHING;

-- 39. Taita–Taveta (county_id = 39)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Voi', 39, 'voi'),
  ('Wundanyi', 39, 'wundanyi'),
  ('Taveta', 39, 'taveta'),
  ('Mwatate', 39, 'mwatate'),
  ('Hola', 39, 'hola-taita-taveta'),
  ('Dawida', 39, 'dawida'),
  ('Mkaani', 39, 'mkaani')
ON CONFLICT (name, county_id) DO NOTHING;

-- 40. Tana River (county_id = 40)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Hola', 40, 'hola'),
  ('Garsen', 40, 'garsen'),
  ('Bura', 40, 'bura'),
  ('Kipini', 40, 'kipini'),
  ('Bangale', 40, 'bangale'),
  ('Tana Delta centres', 40, 'tana-delta-centres'),
  ('Bura Town', 40, 'bura-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 41. Tharaka–Nithi (county_id = 41)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Chuka', 41, 'chuka'),
  ('Marimanti', 41, 'marimanti'),
  ('Nkondi', 41, 'nkondi'),
  ('Itumbe', 41, 'itumbe'),
  ('Chogoria', 41, 'chogoria'),
  ('Nkubu', 41, 'nkubu'),
  ('Chuka Town', 41, 'chuka-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 42. Trans Nzoia (county_id = 42)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kitale', 42, 'kitale'),
  ('Endebess', 42, 'endebess'),
  ('Kiminini', 42, 'kiminini'),
  ('Kwanza', 42, 'kwanza'),
  ('Turbo', 42, 'turbo-trans-nzoia'),
  ('Kitale Town', 42, 'kitale-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 43. Turkana (county_id = 43)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Lodwar', 43, 'lodwar'),
  ('Kakuma', 43, 'kakuma'),
  ('Lokichoggio', 43, 'lokichoggio'),
  ('Turkana Central towns', 43, 'turkana-central-towns'),
  ('Kalokol', 43, 'kalokol'),
  ('Lomelo', 43, 'lomelo'),
  ('Lokitaung', 43, 'lokitaung')
ON CONFLICT (name, county_id) DO NOTHING;

-- 44. Uasin Gishu (county_id = 44)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Eldoret', 44, 'eldoret'),
  ('Turbo', 44, 'turbo'),
  ('Burnt Forest', 44, 'burnt-forest'),
  ('Kesses', 44, 'kesses'),
  ('Moiben', 44, 'moiben'),
  ('Soy', 44, 'soy'),
  ('Turbo Town', 44, 'turbo-town'),
  ('Eldoret Town', 44, 'eldoret-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 45. Vihiga (county_id = 45)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Mbale', 45, 'mbale'),
  ('Chavakali', 45, 'chavakali'),
  ('Vihiga Town', 45, 'vihiga-town'),
  ('Luanda', 45, 'luanda'),
  ('Emuhaya', 45, 'emuhaya'),
  ('Sabatia', 45, 'sabatia'),
  ('Maragoli centres', 45, 'maragoli-centres')
ON CONFLICT (name, county_id) DO NOTHING;

-- 46. Wajir (county_id = 46)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Wajir', 46, 'wajir'),
  ('Griftu', 46, 'griftu'),
  ('Bute', 46, 'bute'),
  ('Tarbaj', 46, 'tarbaj'),
  ('Habaswein', 46, 'habaswein'),
  ('Eldas', 46, 'eldas'),
  ('Bute Town', 46, 'bute-town')
ON CONFLICT (name, county_id) DO NOTHING;

-- 47. West Pokot (county_id = 47)
INSERT INTO public.towns (name, county_id, slug)
VALUES
  ('Kapenguria', 47, 'kapenguria'),
  ('Makutano', 47, 'makutano-west-pokot'),
  ('Ortum', 47, 'ortum'),
  ('Kacheliba', 47, 'kacheliba'),
  ('Sigor', 47, 'sigor'),
  ('Chepareria', 47, 'chepareria'),
  ('Lomut', 47, 'lomut'),
  ('Sook', 47, 'sook')
ON CONFLICT (name, county_id) DO NOTHING;

COMMIT;


-- ----------------------------------------------------------------
-- >>> 20251007094000_seed_lookup_tables.sql
-- ----------------------------------------------------------------
-- Seed lookup tables: education_levels, experience_levels, job_functions, industries
BEGIN;

-- Education Levels
INSERT INTO public.education_levels (name, slug)
VALUES
  ('KCSE', 'kcse'),
  ('Diploma', 'diploma'),
  ('Bachelor’s', 'bachelors'),
  ('Master’s', 'masters'),
  ('PhD', 'phd')
ON CONFLICT (name) DO NOTHING;

-- Experience Levels
INSERT INTO public.experience_levels (name, slug, description)
VALUES
  ('Internship', 'internship', 'For students, fresh graduates, or field entry'),
  ('Entry Level', 'entry-level', '0–2 years, training and supervision common'),
  ('Mid Level', 'mid-level', '2–5 years, growing autonomy'),
  ('Senior Level', 'senior-level', '5–10 years, leads projects, mentors'),
  ('Management / Supervisory', 'management-supervisory', 'Team leads, supervisors, heads'),
  ('Executive / Director', 'executive-director', 'Top leadership and strategy'),
  ('Volunteer / Casual', 'volunteer-casual', 'Unpaid/part-time roles (optional)')
ON CONFLICT (name) DO NOTHING;

-- Job Functions (STEM)
INSERT INTO public.job_functions (name, slug)
VALUES
  ('Research & Development (R&D)', 'research-and-development-rd'),
  ('Analytical Chemistry', 'analytical-chemistry'),
  ('Laboratory Operations & Testing', 'laboratory-operations-testing'),
  ('Quality Control (QC)', 'quality-control-qc'),
  ('Quality Assurance & Quality Management', 'quality-assurance-quality-management'),
  ('Regulatory Affairs & Compliance', 'regulatory-affairs-compliance'),
  ('Product Development & Formulation', 'product-development-formulation'),
  ('Microbiology & Biotechnology', 'microbiology-biotechnology'),
  ('Clinical Research & Trials', 'clinical-research-trials'),
  ('Materials Science & Engineering', 'materials-science-engineering'),
  ('Food Science & Technology', 'food-science-technology'),
  ('Environmental Science & Management', 'environmental-science-management'),
  ('Geology, Geoscience & Mineral Exploration', 'geology-geoscience-mineral-exploration'),
  ('Agricultural Science & Technology', 'agricultural-science-technology'),
  ('Public Health Science & Epidemiology', 'public-health-science-epidemiology'),
  ('Biostatistics & Bioinformatics', 'biostatistics-bioinformatics'),
  ('Scientific Data Management', 'scientific-data-management'),
  ('Chemical & Process Engineering', 'chemical-process-engineering'),
  ('Industrial & Manufacturing Engineering', 'industrial-manufacturing-engineering'),
  ('Mechanical Engineering', 'mechanical-engineering'),
  ('Electrical & Electronics Engineering', 'electrical-electronics-engineering'),
  ('Civil & Structural Engineering', 'civil-structural-engineering'),
  ('Biomedical Engineering', 'biomedical-engineering'),
  ('Robotics, Mechatronics & Automation', 'robotics-mechatronics-automation'),
  ('Instrumentation, Control & Metrology', 'instrumentation-control-metrology'),
  ('Maintenance & Reliability Engineering', 'maintenance-reliability-engineering'),
  ('Production & Manufacturing Operations', 'production-manufacturing-operations'),
  ('Process Optimisation & Production Planning', 'process-optimisation-production-planning'),
  ('Health, Safety & Process Risk Management', 'health-safety-process-risk-management'),
  ('Energy Systems & Renewable Energy', 'energy-systems-renewable-energy'),
  ('Water & Wastewater Engineering', 'water-wastewater-engineering'),
  ('Mining & Mineral Processing', 'mining-mineral-processing'),
  ('Surveying & Geospatial Science', 'surveying-geospatial-science'),
  ('Software Development & Engineering', 'software-development-engineering'),
  ('IT Infrastructure, Systems & Support', 'it-infrastructure-systems-support'),
  ('Cybersecurity', 'cybersecurity'),
  ('Cloud Computing & DevOps', 'cloud-computing-devops'),
  ('Data Science, Analytics & Artificial Intelligence', 'data-science-analytics-artificial-intelligence'),
  ('Networking & Telecommunications', 'networking-telecommunications'),
  ('Mathematics, Statistics & Actuarial Science', 'mathematics-statistics-actuarial-science'),
  ('Operations Research & Optimisation', 'operations-research-optimisation'),
  ('Technical Support & Field Service', 'technical-support-field-service'),
  ('Technical Sales & Business Development', 'technical-sales-business-development'),
  ('Technical Procurement & Supply Chain', 'technical-procurement-supply-chain'),
  ('Technical Project Management & Operations', 'technical-project-management-operations'),
  ('STEM Education, Teaching & Curriculum Development', 'stem-education-teaching-curriculum-development'),
  ('Technical Training, Academic Research & Science Communication', 'technical-training-academic-research-science-communication')
ON CONFLICT (name) DO NOTHING;

-- Industries (STEM)
INSERT INTO public.industries (name, slug)
VALUES
  ('Agriculture, Agribusiness & Agricultural Technology', 'agriculture-agribusiness-agricultural-technology'),
  ('Food & Beverage Manufacturing', 'food-beverage-manufacturing'),
  ('Chemicals, Paints, Polymers & Industrial Materials', 'chemicals-paints-polymers-industrial-materials'),
  ('Pharmaceuticals & Biotechnology', 'pharmaceuticals-biotechnology'),
  ('Healthcare, Hospitals & Medical Laboratories', 'healthcare-hospitals-medical-laboratories'),
  ('Manufacturing & Industrial Production', 'manufacturing-industrial-production'),
  ('Paper, Pulp & Packaging', 'paper-pulp-packaging'),
  ('Plastics, Rubber & Composites', 'plastics-rubber-composites'),
  ('Oil, Gas & Petrochemicals', 'oil-gas-petrochemicals'),
  ('Energy, Power & Renewable Energy', 'energy-power-renewable-energy'),
  ('Water, Wastewater & Water Treatment', 'water-wastewater-water-treatment'),
  ('Environmental Services & Conservation', 'environmental-services-conservation'),
  ('Mining, Geology & Mineral Processing', 'mining-geology-mineral-processing'),
  ('Construction, Infrastructure & Built Environment', 'construction-infrastructure-built-environment'),
  ('Electrical & Electronics Manufacturing', 'electrical-electronics-manufacturing'),
  ('Automotive & Transport Equipment', 'automotive-transport-equipment'),
  ('Aerospace & Defence', 'aerospace-defence'),
  ('Information Technology & Software', 'information-technology-software'),
  ('Telecommunications & Networking', 'telecommunications-networking'),
  ('Data, Artificial Intelligence & Analytics', 'data-artificial-intelligence-analytics'),
  ('Banking, Finance & Insurance', 'banking-finance-insurance'),
  ('Consulting & Professional Services', 'consulting-professional-services'),
  ('Scientific Research & Development', 'scientific-research-development'),
  ('Testing, Inspection, Certification & Calibration', 'testing-inspection-certification-calibration'),
  ('Schools & Secondary Education', 'schools-secondary-education'),
  ('Universities & Higher Education', 'universities-higher-education'),
  ('Technical & Vocational Education and Training (TVET)', 'technical-vocational-education-and-training-tvet'),
  ('STEM Training & Professional Development', 'stem-training-professional-development'),
  ('Educational Technology (EdTech)', 'educational-technology-edtech'),
  ('Government & Public Sector', 'government-public-sector'),
  ('NGOs, Development & International Organisations', 'ngos-development-international-organisations'),
  ('Logistics, Supply Chain & Distribution', 'logistics-supply-chain-distribution'),
  ('Consumer Goods & Retail', 'consumer-goods-retail'),
  ('Textiles, Apparel & Leather Manufacturing', 'textiles-apparel-leather-manufacturing'),
  ('Life Sciences & Biomedical Research', 'life-sciences-biomedical-research'),
  ('Laboratories & Scientific Services', 'laboratories-scientific-services'),
  ('Aviation & Aerospace Services', 'aviation-aerospace-services'),
  ('Real Estate & Facilities Management', 'real-estate-facilities-management'),
  ('Telecommunications Infrastructure', 'telecommunications-infrastructure'),
  ('Waste Management & Recycling', 'waste-management-recycling')
ON CONFLICT (name) DO NOTHING;

COMMIT;


-- ----------------------------------------------------------------
-- >>> 20251007100000_rls_public_read_policies.sql
-- ----------------------------------------------------------------
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


-- ----------------------------------------------------------------
-- >>> 20251007110000_add_additional_info_to_jobs.sql
-- ----------------------------------------------------------------
-- Add additional_info column to jobs table for rich text content below warning alert
ALTER TABLE public.jobs
ADD COLUMN additional_info TEXT;


-- ----------------------------------------------------------------
-- >>> 20251023153000_update_job_application_constraint.sql
-- ----------------------------------------------------------------
-- Update constraint to allow any of the three application methods
ALTER TABLE public.jobs
DROP CONSTRAINT IF EXISTS chk_jobs_apply_path;

-- CHECK: enforce either direct apply OR at least one application method is provided
ALTER TABLE public.jobs
ADD CONSTRAINT chk_jobs_apply_path
CHECK (
  direct_apply = true OR application_url IS NOT NULL OR apply_email IS NOT NULL OR apply_link IS NOT NULL
);


-- ----------------------------------------------------------------
-- >>> 20251024153000_remove_unused_job_fields.sql
-- ----------------------------------------------------------------
-- Remove unused job fields that are no longer needed in the UI
ALTER TABLE public.jobs
DROP COLUMN IF EXISTS license_requirements,
DROP COLUMN IF EXISTS software_skills,
DROP COLUMN IF EXISTS practice_area,
DROP COLUMN IF EXISTS project_type,
DROP COLUMN IF EXISTS visa_sponsorship;


-- ----------------------------------------------------------------
-- >>> 20251027000000_update_education_levels.sql
-- ----------------------------------------------------------------
-- Update education levels with comprehensive list
BEGIN;

-- Clear existing education levels
DELETE FROM public.education_levels;

-- Insert comprehensive education levels
INSERT INTO public.education_levels (name, slug)
VALUES
  ('No Formal Education', 'no-formal-education'),
  ('Primary Certificate (KCPE / CBA)', 'primary-certificate'),
  ('Junior Secondary Certificate (Grade 9 / Equivalent)', 'junior-secondary'),
  ('KCSE / Senior Secondary Certificate', 'kcse'),
  ('Artisan Certificate / Trade Test', 'artisan-certificate'),
  ('Craft Certificate (Certificate Level)', 'craft-certificate'),
  ('Diploma', 'diploma'),
  ('Higher National Diploma (HND)', 'hnd'),
  ('Bachelor’s Degree', 'bachelors'),
  ('Postgraduate Diploma', 'postgraduate-diploma'),
  ('Master’s Degree', 'masters'),
  ('Doctorate (PhD)', 'phd'),
  ('Post-Doctoral / Professional Fellowship', 'post-doctoral')
ON CONFLICT (name) DO NOTHING;

COMMIT;


-- ----------------------------------------------------------------
-- >>> 20251030000000_remove_job_address_and_requirements_fields.sql
-- ----------------------------------------------------------------
-- Remove Full Address and Requirements fields from jobs table
ALTER TABLE public.jobs
DROP COLUMN IF EXISTS job_location_address,
DROP COLUMN IF EXISTS preferred_qualifications,
DROP COLUMN IF EXISTS applicant_location_requirements;


-- ----------------------------------------------------------------
-- >>> 20251030000001_insert_qms_specialist_job.sql
-- ----------------------------------------------------------------
-- Insert Quality Management Systems Specialist job at Kenya Wine Agencies Limited (KWAL)
INSERT INTO public.jobs (
  title,
  company,
  location,
  county_id,
  description,
  responsibilities,
  qualifications,
  education_level_id,
  experience_level_ref_id,
  minimum_experience,
  job_function_id,
  industry_id,
  application_deadline,
  apply_link,
  salary_visibility,
  source
) VALUES (
  'Quality Management Systems Specialist',
  'Kenya Wine Agencies Limited (KWAL)',
  'Kiambu',
  (SELECT id FROM public.counties WHERE name = 'Kiambu'),
  'This position is responsible for execution and management of KWAL''s ISO standards certifications, legal and statutory compliance requirements for alcoholic beverage manufacturing plant, Heineken requirements per Heirules/Heiquest as well as the internal KWAL''s standards and procedures. The role ensures the delivery of the above through deployment, coordination of initiatives and capability development, ultimately ensuring KWAL''s products meet expected quality standards set internally and externally to the satisfaction of the customers in a world-class compliant environment.',
  'Oversee effective implementation of KWAL''s Quality Management System across operations; Develop and update the QA/QC policies, procedures, protocols and checklists in line with Food Safety and QMS standards; Conduct regular internal and 3rd-party audits to assess compliance with QMS requirements; Lead quality control and assurance of manufacturing processes, managing process non-conformances/outputs; Identify and train teams as Internal Auditors and Lead Auditors for the QMS standard; Run capability development initiatives across the organization to improve awareness on QMS standards and compliance; Collaborate with the QSHE Manager to recommend process improvements; Work with customer service to ensure product complaints are investigated and resolved promptly; Manage Pre-Requisite Programs (PRPs) including pest control, waste management, drainage, hygiene, calibrations, and utilities; Update policies and procedures in line with Food Safety Management Systems; Maintain an up-to-date HACCP register with identified CCPs and verification protocols; Conduct regular internal and 3rd-party audits to assess compliance with FSSC and other food safety requirements; Run capability initiatives to improve awareness on hygiene and food safety mandates; Identify and train teams as Internal/Lead Auditors on FSSC, HACCP, and control protocols; Lead quality control, assurance, and food safety assessments for non-conformances/outputs; Review inspection results, reports, and logs to identify trends and recommend remedial actions; Support development and review of EMS/OHMS/NEMA/EMCA/DOSH/EPR procedures; Maintain up-to-date Risk Assessment (HIRA) and Environmental Aspect Registers; Conduct regular audits for compliance with legal, statutory, and ISO standards; Run awareness initiatives to promote environmental, health, and safety culture; Train teams as Internal/Lead Auditors on EMS/OHMS/NEMA/EMCA/DOSH/EPR standards; Manage QMS processes for main and mini laboratories; Plan calibration and servicing of lab equipment; Monitor compliance to LSS requirements per Heineken standards; Track legal and statutory compliance for manufacturing labs; Prepare analysis reports on abnormalities, recommend corrective actions, and oversee their implementation; Maintain detailed documentation on EMS/OHMS/NEMA/EMCA/DOSH/EPR/QMS/FSSC and other regulatory standards; Conduct regular audits to ensure adherence to standards and regulatory compliance; Ensure compliance with GLP, GMP, and ISO standards; Liaise with regulatory bodies (Public Health, KEBS, NEMA, DOSH, etc.) for certification and legal requirements; Participate in technical root-cause analyses for quality and safety non-conformances; Participate in OHS and environment incident investigations; Manage supplier quality and conduct audits per QMS & FSSC standards; Validate compliance of service providers (Canteen, Sheer Logic & Cyka); Support the TPM way of working; Support implementation of improvement initiatives',
  'Bachelor of Science in Food Science, Microbiology, Chemistry, Biotechnology, Biochemistry, or related field',
  (SELECT id FROM public.education_levels WHERE name = 'Bachelor''s Degree'),
  (SELECT id FROM public.experience_levels WHERE name = 'Senior Level'),
  5,
  (SELECT id FROM public.job_functions WHERE name = 'Quality Control & Assurance'),
  (SELECT id FROM public.industries WHERE name = 'Manufacturing & Warehousing'),
  '2025-11-11',
  'https://careers.theheinekencompany.com',
  'Hide',
  'Employer'
);


-- ----------------------------------------------------------------
-- >>> 20251030000002_insert_wellness_lead_job.sql
-- ----------------------------------------------------------------
-- Insert Wellness Lead job at Teleperformance Kenya
INSERT INTO public.jobs (
  title,
  company,
  location,
  location_town,
  county_id,
  description,
  responsibilities,
  qualifications,
  salary_type,
  salary_visibility,
  apply_link,
  industry_id,
  job_function_id,
  education_level_id,
  experience_level_ref_id,
  minimum_experience,
  source
) VALUES (
  'Wellness Lead',
  'Teleperformance Kenya',
  'Nairobi',
  'Westlands',
  (SELECT id FROM public.counties WHERE name = 'Nairobi'),
  'TP is a trusted partner to global brands, delivering integrated, human-centric experiences through advanced business solutions that optimize business processes and performance. The Wellness Lead role will ensure employee mental health, wellbeing, and resilience programs are implemented effectively and aligned with Teleperformance''s global standards.',
  '• Implement occupational health management tools with a focus on mental health and resilience. • Lead local research on employee wellbeing and ensure employee engagement initiatives are well organized. • Develop and optimize strategies for health and wellbeing, including KPI measurability and organizational resilience. • Align site initiatives with client wellbeing programs. • Report on mental health and resiliency topics at business meetings. • Mentor and lead resiliency coaches at the Nairobi site. • Support and manage the Feel Good Program. • Create an atmosphere of collaboration between managers and the Wellbeing & Resiliency team.',
  '3–5 years of experience in HR, Operations, or Employee Assistance Programs with a focus on wellbeing. Master''s degree in HR, Psychology, Occupational Health, or related field. Leadership experience required. Strong command of English. Experience in BPO industry and project management preferred. Strong organizational, coordination, stakeholder management, and interpersonal skills. Empathic, innovative, and able to manage multiple priorities.',
  'Monthly',
  'Hide',
  'https://www.myjobmag.co.ke/jobs/teleperformance-kenya/wellness-lead',
  (SELECT id FROM public.industries WHERE name = 'Human Resources & Recruitment'),
  (SELECT id FROM public.job_functions WHERE name = 'Human Resources / HR'),
  (SELECT id FROM public.education_levels WHERE name = 'Master''s Degree'),
  (SELECT id FROM public.experience_levels WHERE name = 'Mid Level'),
  3,
  'Employer'
);


-- ----------------------------------------------------------------
-- >>> 20251104_remove_unique_user_id_on_companies.sql
-- ----------------------------------------------------------------
-- Allow admins to create multiple companies by removing unique constraint on user_id
-- and enforce uniqueness on company name (case-insensitive) to avoid duplicates.

-- Drop UNIQUE(user_id) constraint if it exists
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_user_id_key;

-- Add case-insensitive unique index on company name
CREATE UNIQUE INDEX IF NOT EXISTS companies_name_unique ON public.companies (LOWER(name));

-- Note: RLS policies already allow admins to insert any company.
-- Employers can still create their own company; multiple by same user_id are now allowed.


-- ----------------------------------------------------------------
-- >>> 20251104010000_insert_kitchen_steward_job.sql
-- ----------------------------------------------------------------
-- Insert Kitchen Steward job at People FOCO
INSERT INTO public.jobs (
  title,
  company,
  location,
  location_town,
  county_id,
  description,
  responsibilities,
  qualifications,
  salary,
  salary_type,
  salary_visibility,
  apply_email,
  industry_id,
  job_function_id,
  education_level_id,
  experience_level_ref_id,
  minimum_experience,
  is_featured,
  additional_info,
  source
) VALUES (
  'Kitchen Steward',
  'People FOCO',
  'Nairobi',
  'Nairobi (CBD)',
  (SELECT id FROM public.counties WHERE name = 'Nairobi'),
  'The Kitchen Steward ensures cleanliness, sanitation, and proper organization of the kitchen, dishwashing area, equipment, and storage areas. The role supports smooth restaurant operations by maintaining high hygiene standards in line with food safety regulations.',
  '• Wash and sanitize dishes, cutlery, pots, pans, glassware, and utensils. • Clean kitchen equipment, work surfaces, storage areas, walk-in fridges, and floors. • Maintain cleanliness of back-of-house areas according to HACCP and food safety standards. • Dispose of garbage, sort recyclables, and ensure proper waste removal. • Operate and maintain dishwashing machines and cleaning tools. • Support chefs by providing clean equipment promptly. • Store clean equipment in designated areas. • Assist with basic food prep tasks when required. • Ensure service stations are stocked. • Report damaged or malfunctioning equipment. • Follow daily and weekly cleaning checklists. • Handle cleaning chemicals safely. • Adhere to grooming standards and wear PPE at all times.',
  'Minimum 1 year experience as steward/dishwasher/cleaner in a hotel or restaurant (fine dining experience is an added advantage). Knowledge of food safety & hygiene standards. Ability to work in a fast-paced kitchen environment. KCSE qualification.',
  'Confidential',
  'Monthly',
  'Hide',
  'recruitmenttrat@gmail.com',
  (SELECT id FROM public.industries WHERE name = 'Food Services, Hospitality & Catering'),
  (SELECT id FROM public.job_functions WHERE name = 'Food Services & Catering'),
  (SELECT id FROM public.education_levels WHERE name = 'KCSE'),
  (SELECT id FROM public.experience_levels WHERE name = 'Entry Level'),
  1,
  true,
  'Candidates should use the job title as the email subject when applying.',
  'Employer'
);


-- ----------------------------------------------------------------
-- >>> 20251119000000_create_site_settings.sql
-- ----------------------------------------------------------------
-- Create site_settings table for branding customization
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name TEXT NOT NULL DEFAULT 'StemBird',
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#8B5CF6',
  secondary_color TEXT DEFAULT '#EC4899',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default settings
INSERT INTO site_settings (site_name, primary_color, secondary_color)
VALUES ('StemBird', '#8B5CF6', '#EC4899')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to site settings"
  ON site_settings
  FOR SELECT
  TO public
  USING (true);

-- Allow admin update access
CREATE POLICY "Allow admin update access to site settings"
  ON site_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_site_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_site_settings_timestamp
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_timestamp();


-- ----------------------------------------------------------------
-- >>> 20251119000001_create_branding_storage.sql
-- ----------------------------------------------------------------
-- Create public storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('public', 'public', true)
ON CONFLICT (id) DO NOTHING;

-- Create branding folder policy
DROP POLICY IF EXISTS "Allow public read access to branding files" ON storage.objects;
CREATE POLICY "Allow public read access to branding files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'public' AND (storage.foldername(name))[1] = 'branding');

-- Allow authenticated admins to upload branding files
DROP POLICY IF EXISTS "Allow admin upload to branding folder" ON storage.objects;
CREATE POLICY "Allow admin upload to branding folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'public' 
    AND (storage.foldername(name))[1] = 'branding'
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Allow authenticated admins to update branding files
DROP POLICY IF EXISTS "Allow admin update to branding folder" ON storage.objects;
CREATE POLICY "Allow admin update to branding folder"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'public' 
    AND (storage.foldername(name))[1] = 'branding'
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Allow authenticated admins to delete branding files
DROP POLICY IF EXISTS "Allow admin delete from branding folder" ON storage.objects;
CREATE POLICY "Allow admin delete from branding folder"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'public' 
    AND (storage.foldername(name))[1] = 'branding'
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );


-- ----------------------------------------------------------------
-- >>> 20251214000000_create_job_parsing_infrastructure.sql
-- ----------------------------------------------------------------
-- Create job parsing queue and caching infrastructure
BEGIN;

-- Job parsing queue table
CREATE TABLE IF NOT EXISTS public.job_parsing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_text TEXT NOT NULL,
  job_text_hash TEXT NOT NULL, -- For deduplication
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result JSONB, -- Parsed job data
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3
);

-- AI response cache table
CREATE TABLE IF NOT EXISTS public.ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_hash TEXT NOT NULL UNIQUE, -- Hash of the input text
  input_text TEXT NOT NULL,
  response_data JSONB NOT NULL,
  model_used TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'), -- Cache for 7 days
  hit_count INTEGER DEFAULT 1
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_parsing_queue_status ON public.job_parsing_queue(status);
CREATE INDEX IF NOT EXISTS idx_job_parsing_queue_created_at ON public.job_parsing_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_job_parsing_queue_hash ON public.job_parsing_queue(job_text_hash);
CREATE INDEX IF NOT EXISTS idx_ai_response_cache_hash ON public.ai_response_cache(input_hash);
CREATE INDEX IF NOT EXISTS idx_ai_response_cache_expires ON public.ai_response_cache(expires_at);

-- Enable RLS
ALTER TABLE public.job_parsing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow authenticated users to manage their parsing jobs
CREATE POLICY "Users can manage parsing queue" 
ON public.job_parsing_queue 
FOR ALL 
USING (true); -- For now, allow all operations

CREATE POLICY "Users can access cache" 
ON public.ai_response_cache 
FOR ALL 
USING (true); -- For now, allow all operations

-- Trigger for updating timestamps
CREATE TRIGGER update_job_parsing_queue_updated_at
BEFORE UPDATE ON public.job_parsing_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION public.clean_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_response_cache 
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create cache entry
CREATE OR REPLACE FUNCTION public.get_cached_response(input_text TEXT)
RETURNS JSONB AS $$
DECLARE
  cache_entry RECORD;
  text_hash TEXT;
BEGIN
  -- Generate hash of input text
  text_hash := encode(digest(input_text, 'sha256'), 'hex');
  
  -- Try to find cached response
  SELECT response_data, id INTO cache_entry
  FROM public.ai_response_cache 
  WHERE input_hash = text_hash 
    AND expires_at > now()
  LIMIT 1;
  
  IF FOUND THEN
    -- Update hit count
    UPDATE public.ai_response_cache 
    SET hit_count = hit_count + 1 
    WHERE id = cache_entry.id;
    
    RETURN cache_entry.response_data;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to save response to cache
CREATE OR REPLACE FUNCTION public.save_to_cache(
  input_text TEXT, 
  response_data JSONB, 
  model_used TEXT DEFAULT 'unknown'
)
RETURNS UUID AS $$
DECLARE
  text_hash TEXT;
  cache_id UUID;
BEGIN
  -- Generate hash of input text
  text_hash := encode(digest(input_text, 'sha256'), 'hex');
  
  -- Insert or update cache entry
  INSERT INTO public.ai_response_cache (input_hash, input_text, response_data, model_used)
  VALUES (text_hash, input_text, response_data, model_used)
  ON CONFLICT (input_hash) DO UPDATE SET
    response_data = EXCLUDED.response_data,
    model_used = EXCLUDED.model_used,
    created_at = now(),
    expires_at = now() + INTERVAL '7 days',
    hit_count = ai_response_cache.hit_count + 1
  RETURNING id INTO cache_id;
  
  RETURN cache_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;


-- ----------------------------------------------------------------
-- >>> 20260210_create_page_content.sql
-- ----------------------------------------------------------------
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
  ('home', 'why_choose_title', 'text', 'Why Kenyan Professionals Choose StemBird', '{}'),
  ('home', 'cta_title', 'text', 'Ready to Transform Your Career?', '{}'),
  ('home', 'cta_subtitle', 'text', 'Join thousands of Kenyan professionals who''ve found their dream jobs through StemBird', '{}')
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- Insert default CV services page content
INSERT INTO page_content (page_slug, section_key, content_type, content_value, metadata) VALUES
  ('services-cv', 'hero_title', 'text', 'CV & Resume Services by StemBird', '{}'),
  ('services-cv', 'hero_subtitle', 'text', 'Professional CVs That Open Doors 🚪📄', '{}'),
  ('services-cv', 'hero_description', 'html', '<p>Your CV is often the <strong>first decision-maker</strong> in your job search. Before interviews. Before LinkedIn. Before explanations.</p><p>At StemBird, we don''t just rewrite CVs — we <strong>position you to be shortlisted</strong>.</p>', '{}'),
  ('services-cv', 'why_cv_matters_title', 'text', 'Why Your CV Matters More Than You Think', '{}'),
  ('services-cv', 'what_we_do_title', 'text', 'What We Do Differently at StemBird', '{}')
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- Insert default LinkedIn services page content
INSERT INTO page_content (page_slug, section_key, content_type, content_value, metadata) VALUES
  ('services-linkedin', 'hero_title', 'text', 'LinkedIn Career Services by StemBird', '{}'),
  ('services-linkedin', 'hero_subtitle', 'text', 'Turn Your LinkedIn Profile Into Opportunities 🚀', '{}'),
  ('services-linkedin', 'hero_description', 'html', '<p>Your LinkedIn profile is no longer optional. It''s your <strong>digital CV</strong>, your <strong>personal brand</strong>, and often the <strong>first interview filter</strong>.</p>', '{}'),
  ('services-linkedin', 'why_linkedin_matters_title', 'text', 'Why LinkedIn Matters More Than Ever', '{}')
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- Insert default Cover Letter services page content
INSERT INTO page_content (page_slug, section_key, content_type, content_value, metadata) VALUES
  ('services-cover-letter', 'hero_title', 'text', 'Outstanding Cover Letters by StemBird', '{}'),
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


-- ----------------------------------------------------------------
-- >>> 20260210_add_seo_fields.sql
-- ----------------------------------------------------------------
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
  seo_title = 'StemBird - Find Your Dream Job in Kenya | Top Job Listings',
  seo_meta_description = 'Discover thousands of job opportunities in Kenya. Connect with top employers, build your career, and find your perfect role with StemBird.',
  seo_url_slug = '/',
  seo_canonical_url = 'https://www.careersasa.co.ke/',
  seo_index = true,
  seo_h1_title = 'Your Dream Career Starts Here',
  seo_follow = true
WHERE page_slug = 'home' AND section_key = 'hero_title';

UPDATE page_content SET
  seo_title = 'Professional CV Writing Services Kenya | StemBird',
  seo_meta_description = 'Get a professionally written CV that opens doors. Expert CV writing services tailored for the Kenyan job market. Stand out and get shortlisted.',
  seo_url_slug = '/services/cv',
  seo_canonical_url = 'https://www.careersasa.co.ke/services/cv',
  seo_index = true,
  seo_h1_title = 'CV & Resume Services by StemBird',
  seo_follow = true
WHERE page_slug = 'services-cv' AND section_key = 'hero_title';

UPDATE page_content SET
  seo_title = 'LinkedIn Profile Optimization Services Kenya | StemBird',
  seo_meta_description = 'Transform your LinkedIn profile into a powerful career tool. Professional LinkedIn optimization services that attract recruiters and opportunities.',
  seo_url_slug = '/services/linkedin',
  seo_canonical_url = 'https://www.careersasa.co.ke/services/linkedin',
  seo_index = true,
  seo_h1_title = 'LinkedIn Career Services by StemBird',
  seo_follow = true
WHERE page_slug = 'services-linkedin' AND section_key = 'hero_title';

UPDATE page_content SET
  seo_title = 'Professional Cover Letter Writing Services Kenya | StemBird',
  seo_meta_description = 'Get a compelling cover letter that gets read. Expert cover letter writing services that showcase why you''re the perfect fit for the role.',
  seo_url_slug = '/services/cover-letter',
  seo_canonical_url = 'https://www.careersasa.co.ke/services/cover-letter',
  seo_index = true,
  seo_h1_title = 'Outstanding Cover Letters by StemBird',
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


-- ----------------------------------------------------------------
-- >>> 20260224_create_candidate_profiles.sql
-- ----------------------------------------------------------------
-- Migration: Create Candidate Profile Tables
-- Description: Complete schema for candidate profiles, work experience, education, skills, and documents

-- ============================================================================
-- 1. CANDIDATE PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS candidate_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Information
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    location VARCHAR(255),
    bio TEXT,
    
    -- Professional Information
    current_title VARCHAR(255),
    years_experience INTEGER CHECK (years_experience >= 0),
    expected_salary_min DECIMAL(12, 2),
    expected_salary_max DECIMAL(12, 2),
    expected_salary_currency VARCHAR(3) DEFAULT 'NGN',
    
    -- Links
    linkedin_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    github_url VARCHAR(500),
    
    -- Settings
    profile_visibility VARCHAR(20) DEFAULT 'private' CHECK (profile_visibility IN ('private', 'public', 'recruiters_only')),
    job_alerts_enabled BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id)
);

-- ============================================================================
-- 2. CANDIDATE WORK EXPERIENCE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS candidate_work_experience (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    
    -- Job Details
    company_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    employment_type VARCHAR(50) CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'freelance', 'internship')),
    location VARCHAR(255),
    
    -- Duration
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT false,
    
    -- Description
    description TEXT,
    achievements TEXT[],
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CHECK (end_date IS NULL OR end_date >= start_date)
);

-- ============================================================================
-- 3. CANDIDATE EDUCATION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS candidate_education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    
    -- Institution Details
    institution_name VARCHAR(255) NOT NULL,
    degree_type VARCHAR(100) NOT NULL, -- e.g., Bachelor's, Master's, PhD, Diploma
    field_of_study VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    
    -- Duration
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT false,
    
    -- Additional Info
    grade VARCHAR(50), -- e.g., First Class, 3.8 GPA
    description TEXT,
    achievements TEXT[],
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CHECK (end_date IS NULL OR end_date >= start_date)
);

-- ============================================================================
-- 4. CANDIDATE SKILLS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS candidate_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    
    -- Skill Details
    skill_name VARCHAR(100) NOT NULL,
    skill_category VARCHAR(50), -- e.g., technical, soft, language, tool
    proficiency_level VARCHAR(20) CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    years_of_experience INTEGER CHECK (years_of_experience >= 0),
    
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    endorsed_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(candidate_id, skill_name)
);

-- ============================================================================
-- 5. CANDIDATE DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS candidate_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    
    -- Document Details
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('cv', 'resume', 'cover_letter', 'certificate', 'portfolio', 'other')),
    document_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(1000) NOT NULL,
    file_size INTEGER, -- in bytes
    file_type VARCHAR(50), -- e.g., application/pdf
    
    -- Status
    is_primary BOOLEAN DEFAULT false, -- Primary CV/Resume
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_candidate_profiles_user_id ON candidate_profiles(user_id);
CREATE INDEX idx_candidate_profiles_visibility ON candidate_profiles(profile_visibility);
CREATE INDEX idx_work_experience_candidate_id ON candidate_work_experience(candidate_id);
CREATE INDEX idx_work_experience_current ON candidate_work_experience(is_current);
CREATE INDEX idx_education_candidate_id ON candidate_education(candidate_id);
CREATE INDEX idx_education_current ON candidate_education(is_current);
CREATE INDEX idx_skills_candidate_id ON candidate_skills(candidate_id);
CREATE INDEX idx_skills_category ON candidate_skills(skill_category);
CREATE INDEX idx_documents_candidate_id ON candidate_documents(candidate_id);
CREATE INDEX idx_documents_type ON candidate_documents(document_type);
CREATE INDEX idx_documents_primary ON candidate_documents(is_primary);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_candidate_profiles_updated_at
    BEFORE UPDATE ON candidate_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_experience_updated_at
    BEFORE UPDATE ON candidate_work_experience
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_education_updated_at
    BEFORE UPDATE ON candidate_education
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skills_updated_at
    BEFORE UPDATE ON candidate_skills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON candidate_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_work_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_documents ENABLE ROW LEVEL SECURITY;

-- Candidate Profiles Policies
CREATE POLICY "Users can view their own profile"
    ON candidate_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
    ON candidate_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON candidate_profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
    ON candidate_profiles FOR DELETE
    USING (auth.uid() = user_id);

-- Public profiles viewable by recruiters/admins
CREATE POLICY "Public profiles viewable by authenticated users"
    ON candidate_profiles FOR SELECT
    USING (profile_visibility = 'public' AND auth.role() = 'authenticated');

-- Work Experience Policies
CREATE POLICY "Users can manage their own work experience"
    ON candidate_work_experience FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM candidate_profiles
            WHERE candidate_profiles.id = candidate_work_experience.candidate_id
            AND candidate_profiles.user_id = auth.uid()
        )
    );

-- Education Policies
CREATE POLICY "Users can manage their own education"
    ON candidate_education FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM candidate_profiles
            WHERE candidate_profiles.id = candidate_education.candidate_id
            AND candidate_profiles.user_id = auth.uid()
        )
    );

-- Skills Policies
CREATE POLICY "Users can manage their own skills"
    ON candidate_skills FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM candidate_profiles
            WHERE candidate_profiles.id = candidate_skills.candidate_id
            AND candidate_profiles.user_id = auth.uid()
        )
    );

-- Documents Policies
CREATE POLICY "Users can manage their own documents"
    ON candidate_documents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM candidate_profiles
            WHERE candidate_profiles.id = candidate_documents.candidate_id
            AND candidate_profiles.user_id = auth.uid()
        )
    );

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE candidate_profiles IS 'Main candidate profile information';
COMMENT ON TABLE candidate_work_experience IS 'Candidate work history and experience';
COMMENT ON TABLE candidate_education IS 'Candidate educational background';
COMMENT ON TABLE candidate_skills IS 'Candidate skills and proficiencies';
COMMENT ON TABLE candidate_documents IS 'Candidate uploaded documents (CVs, certificates, etc.)';


-- ----------------------------------------------------------------
-- >>> 20260224_update_job_applications.sql
-- ----------------------------------------------------------------
-- Migration: Update Job Applications System
-- Description: Add full application data storage, CV upload support, and proper RLS policies

-- ============================================================================
-- 1. UPDATE JOB_APPLICATIONS TABLE
-- ============================================================================

-- Add new columns to store full application data
ALTER TABLE public.job_applications
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS years_experience INTEGER CHECK (years_experience >= 0),
ADD COLUMN IF NOT EXISTS cover_letter TEXT,
ADD COLUMN IF NOT EXISTS expected_salary_min DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS expected_salary_max DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS salary_negotiable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS application_method VARCHAR(20) CHECK (application_method IN ('profile', 'cv', 'external')),
ADD COLUMN IF NOT EXISTS cv_file_url VARCHAR(1000),
ADD COLUMN IF NOT EXISTS cv_file_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS cv_file_size INTEGER,
ADD COLUMN IF NOT EXISTS candidate_profile_id UUID REFERENCES candidate_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update status column to use proper enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
        CREATE TYPE application_status AS ENUM ('pending', 'reviewing', 'shortlisted', 'interviewed', 'offered', 'rejected', 'withdrawn', 'accepted');
    END IF;
END $$;

-- Alter status column to use enum (if not already)
-- First drop the default, then change type, then add new default
ALTER TABLE public.job_applications 
ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.job_applications 
ALTER COLUMN status TYPE application_status USING status::application_status;

ALTER TABLE public.job_applications 
ALTER COLUMN status SET DEFAULT 'pending'::application_status;

-- ============================================================================
-- 2. CREATE STORAGE BUCKET FOR CVS
-- ============================================================================

-- Create storage bucket for application CVs
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-cvs', 'application-cvs', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. STORAGE POLICIES FOR CV UPLOADS
-- ============================================================================

-- Allow authenticated users to upload their own CVs
CREATE POLICY "Users can upload their own CVs"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'application-cvs' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own CVs
CREATE POLICY "Users can view their own CVs"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'application-cvs' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow employers to view CVs for applications to their jobs
CREATE POLICY "Employers can view CVs for their job applications"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'application-cvs'
    AND EXISTS (
        SELECT 1 
        FROM public.job_applications ja
        JOIN public.jobs j ON j.id = ja.job_id
        WHERE ja.cv_file_url LIKE '%' || name || '%'
        AND j.user_id = auth.uid()
    )
);

-- Allow users to delete their own CVs
CREATE POLICY "Users can delete their own CVs"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'application-cvs' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON public.job_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_candidate_profile ON public.job_applications(candidate_profile_id);

-- ============================================================================
-- 5. UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER update_job_applications_updated_at
    BEFORE UPDATE ON public.job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. UPDATE RLS POLICIES
-- ============================================================================

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own applications" ON public.job_applications;
DROP POLICY IF EXISTS "Employers can view applications for their jobs" ON public.job_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.job_applications;
DROP POLICY IF EXISTS "Candidates can create applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can delete their own applications" ON public.job_applications;

-- Recreate with updated logic

-- SELECT policies
CREATE POLICY "Users can view their own applications"
ON public.job_applications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Employers can view applications for their jobs"
ON public.job_applications FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.jobs
        WHERE jobs.id = job_applications.job_id
        AND jobs.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all applications"
ON public.job_applications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- INSERT policy
CREATE POLICY "Authenticated users can create applications"
ON public.job_applications FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    AND auth.role() = 'authenticated'
);

-- UPDATE policies
CREATE POLICY "Users can update their own applications"
ON public.job_applications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employers can update application status for their jobs"
ON public.job_applications FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.jobs
        WHERE jobs.id = job_applications.job_id
        AND jobs.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can update all applications"
ON public.job_applications FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- DELETE policy
CREATE POLICY "Users can delete their own applications"
ON public.job_applications FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to get application count for a job
CREATE OR REPLACE FUNCTION get_job_application_count(job_uuid UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.job_applications
    WHERE job_id = job_uuid;
$$;

-- Function to check if user has applied to a job
CREATE OR REPLACE FUNCTION has_user_applied(job_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.job_applications
        WHERE job_id = job_uuid AND user_id = user_uuid
    );
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.job_applications IS 'Job applications with full candidate data and CV storage';
COMMENT ON COLUMN public.job_applications.application_method IS 'How the candidate applied: profile (using their profile), cv (uploaded CV), or external';
COMMENT ON COLUMN public.job_applications.cv_file_url IS 'URL to the uploaded CV in Supabase Storage';
COMMENT ON COLUMN public.job_applications.candidate_profile_id IS 'Reference to candidate profile if they applied using their profile';


-- ----------------------------------------------------------------
-- >>> 20260227_create_candidate_documents_bucket.sql
-- ----------------------------------------------------------------
-- Create storage bucket for candidate documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate-documents', 'candidate-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for candidate documents
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'candidate-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'candidate-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'candidate-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'candidate-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (for when employers view applications)
DROP POLICY IF EXISTS "Public can view documents" ON storage.objects;
CREATE POLICY "Public can view documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'candidate-documents');


-- ----------------------------------------------------------------
-- >>> 20260227_fix_candidate_documents_column_sizes.sql
-- ----------------------------------------------------------------
-- Fix column sizes in candidate_documents table
-- The file_type field needs to be larger to accommodate long MIME types

ALTER TABLE candidate_documents 
ALTER COLUMN file_type TYPE VARCHAR(255);

-- Also increase document_type just to be safe
ALTER TABLE candidate_documents 
ALTER COLUMN document_type TYPE VARCHAR(100);

-- Add comment
COMMENT ON COLUMN candidate_documents.file_type IS 'MIME type of the file (e.g., application/vnd.openxmlformats-officedocument.wordprocessingml.document)';


-- ----------------------------------------------------------------
-- >>> 20260228_create_messages_table.sql
-- ----------------------------------------------------------------
-- Create messages table for employer-candidate communication
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    receiver_id UUID NOT NULL REFERENCES auth.users(id),
    conversation_id UUID DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    subject VARCHAR(255),
    message_type VARCHAR(50) DEFAULT 'message' CHECK (message_type IN ('message', 'notification', 'system')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for messages
CREATE POLICY "Users can view their own messages" ON messages
    FOR SELECT USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
    );

CREATE POLICY "Users can send messages to other users" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
    );

CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (
        auth.uid() = sender_id
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at column
CREATE TRIGGER update_messages_updated_at 
    BEFORE UPDATE ON messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create conversations view to get conversation summaries
CREATE OR REPLACE VIEW conversation_summaries AS
SELECT 
    conversation_id,
    CASE 
        WHEN auth.uid() = sender_id THEN receiver_id
        WHEN auth.uid() = receiver_id THEN sender_id
    END AS other_party_id,
    MAX(created_at) as last_message_time,
    COUNT(*) as total_messages,
    SUM(CASE WHEN is_read = false AND receiver_id = auth.uid() THEN 1 ELSE 0 END) as unread_count,
    (SELECT message FROM messages m2 WHERE m2.conversation_id = messages.conversation_id ORDER BY created_at DESC LIMIT 1) as last_message
FROM messages
WHERE auth.uid() = sender_id OR auth.uid() = receiver_id
GROUP BY conversation_id, other_party_id;


-- ----------------------------------------------------------------
-- >>> 20260228_add_user_profiles_table.sql
-- ----------------------------------------------------------------
-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'candidate' CHECK (role IN ('candidate', 'employer', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user profiles
CREATE POLICY "Users can view all profiles" ON user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (
        auth.uid() = id
    );

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at column
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraints to messages table if they don't exist
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey 
        FOREIGN KEY (sender_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER TABLE messages ADD CONSTRAINT messages_receiver_id_fkey 
        FOREIGN KEY (receiver_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;


-- ----------------------------------------------------------------
-- >>> 20260228_create_notifications_table.sql
-- ----------------------------------------------------------------
-- Migration: Create Notifications System
-- Description: Create notifications table and related infrastructure for employer-candidate communication

-- ============================================================================
-- 1. CREATE NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'new_application',      -- Employer receives new job application
        'application_status',  -- Candidate receives application status update
        'new_message',         -- New message in conversation
        'job_alert',          -- Job matching user's alerts
        'system'              -- System announcements
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,               -- Additional structured data (job_id, application_id, etc.)
    read BOOLEAN DEFAULT FALSE,
    emailed BOOLEAN DEFAULT FALSE,  -- Track if email notification was sent
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);

-- ============================================================================
-- 3. CREATE UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Authenticated users can insert their own notifications
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    AND auth.role() = 'authenticated'
);

-- Admins can manage all notifications
CREATE POLICY "Admins can manage all notifications"
ON public.notifications FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to get unread notifications count for a user
CREATE OR REPLACE FUNCTION get_unread_notifications_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.notifications
    WHERE user_id = user_uuid AND read = false;
$$;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    user_uuid UUID,
    notification_type VARCHAR(50),
    notification_title VARCHAR(255),
    notification_message TEXT,
    notification_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (user_uuid, notification_type, notification_title, notification_message, notification_data)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notifications
    SET read = true, updated_at = NOW()
    WHERE id = notification_uuid AND user_id = auth.uid();
END;
$$;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notifications
    SET read = true, updated_at = NOW()
    WHERE user_id = user_uuid;
END;
$$;

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON TABLE public.notifications IS 'User notifications for job applications, messages, and system alerts';
COMMENT ON COLUMN public.notifications.type IS 'Type of notification: new_application, application_status, new_message, job_alert, system';
COMMENT ON COLUMN public.notifications.data IS 'JSON data containing related IDs (job_id, application_id, message_id, etc.)';
COMMENT ON COLUMN public.notifications.emailed IS 'Whether email notification was sent for this notification';
COMMENT ON FUNCTION public.get_unread_notifications_count IS 'Get count of unread notifications for a user';
COMMENT ON FUNCTION public.create_notification IS 'Create a new notification for a user';
COMMENT ON FUNCTION public.mark_notification_as_read IS 'Mark a specific notification as read';
COMMENT ON FUNCTION public.mark_all_notifications_as_read IS 'Mark all notifications as read for a user';

-- ============================================================================
-- 7. ENABLE REALTIME
-- ============================================================================

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- ----------------------------------------------------------------
-- >>> 20260228_update_conversation_summaries_view.sql
-- ----------------------------------------------------------------
-- Drop the existing conversation_summaries view
DROP VIEW IF EXISTS conversation_summaries;

-- Recreate the conversation_summaries view with user profile information
CREATE OR REPLACE VIEW conversation_summaries AS
SELECT 
    m.conversation_id,
    CASE 
        WHEN auth.uid() = m.sender_id THEN m.receiver_id
        WHEN auth.uid() = m.receiver_id THEN m.sender_id
    END AS other_party_id,
    MAX(m.created_at) as last_message_time,
    COUNT(*) as total_messages,
    SUM(CASE WHEN m.is_read = false AND m.receiver_id = auth.uid() THEN 1 ELSE 0 END) as unread_count,
    (SELECT message FROM messages m2 WHERE m2.conversation_id = m.conversation_id ORDER BY created_at DESC LIMIT 1) as last_message,
    -- Join with user_profiles to get the other party's information
    (SELECT up.full_name FROM user_profiles up 
     WHERE up.id = CASE 
         WHEN auth.uid() = m.sender_id THEN m.receiver_id
         WHEN auth.uid() = m.receiver_id THEN m.sender_id
     END) AS other_party_name,
    (SELECT up.avatar_url FROM user_profiles up 
     WHERE up.id = CASE 
         WHEN auth.uid() = m.sender_id THEN m.receiver_id
         WHEN auth.uid() = m.receiver_id THEN m.sender_id
     END) AS other_party_avatar
FROM messages m
WHERE auth.uid() = m.sender_id OR auth.uid() = m.receiver_id
GROUP BY m.conversation_id, 
         CASE 
             WHEN auth.uid() = m.sender_id THEN m.receiver_id
             WHEN auth.uid() = m.receiver_id THEN m.sender_id
         END,
         other_party_name,
         other_party_avatar;


-- ----------------------------------------------------------------
-- >>> 20260301_create_job_recommendations.sql
-- ----------------------------------------------------------------
-- Migration: Job Recommendations and Alerts System
-- Description: Tables for saved searches, job alerts, and recommendation tracking

-- ============================================================================
-- 1. SAVED SEARCHES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Search Criteria
    search_name VARCHAR(255) NOT NULL,
    keywords TEXT,
    location VARCHAR(255),
    employment_type VARCHAR(50),
    experience_level VARCHAR(50),
    salary_min DECIMAL(12, 2),
    salary_max DECIMAL(12, 2),
    job_function VARCHAR(255),
    industry VARCHAR(255),
    
    -- Alert Settings
    alert_enabled BOOLEAN DEFAULT true,
    alert_frequency VARCHAR(20) DEFAULT 'daily' CHECK (alert_frequency IN ('instant', 'daily', 'weekly')),
    last_alert_sent_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. JOB RECOMMENDATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS job_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    
    -- Recommendation Score
    match_score DECIMAL(5, 2) NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
    
    -- Match Breakdown
    skills_match_score DECIMAL(5, 2) DEFAULT 0,
    experience_match_score DECIMAL(5, 2) DEFAULT 0,
    location_match_score DECIMAL(5, 2) DEFAULT 0,
    salary_match_score DECIMAL(5, 2) DEFAULT 0,
    
    -- Match Details (JSON for flexibility)
    match_details JSONB,
    
    -- User Interaction
    viewed BOOLEAN DEFAULT false,
    viewed_at TIMESTAMPTZ,
    dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    applied BOOLEAN DEFAULT false,
    applied_at TIMESTAMPTZ,
    
    -- Metadata
    recommended_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- Constraints
    UNIQUE(user_id, job_id)
);

-- ============================================================================
-- 3. JOB ALERTS LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS job_alerts_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    saved_search_id UUID REFERENCES saved_searches(id) ON DELETE SET NULL,
    
    -- Alert Details
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('saved_search', 'recommendation', 'application_update')),
    jobs_count INTEGER DEFAULT 0,
    jobs_data JSONB,
    
    -- Delivery
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivery_status VARCHAR(20) DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'failed', 'bounced')),
    email_opened BOOLEAN DEFAULT false,
    email_opened_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. CANDIDATE PREFERENCES TABLE (for better recommendations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS candidate_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Job Preferences
    preferred_job_functions TEXT[],
    preferred_industries TEXT[],
    preferred_locations TEXT[],
    preferred_employment_types TEXT[],
    preferred_work_schedule TEXT[], -- remote, hybrid, onsite
    
    -- Salary Preferences
    min_salary DECIMAL(12, 2),
    max_salary DECIMAL(12, 2),
    salary_currency VARCHAR(3) DEFAULT 'NGN',
    salary_negotiable BOOLEAN DEFAULT true,
    
    -- Work Preferences
    willing_to_relocate BOOLEAN DEFAULT false,
    available_to_start VARCHAR(50), -- immediate, 2_weeks, 1_month, 3_months
    
    -- Notification Preferences
    job_alert_frequency VARCHAR(20) DEFAULT 'daily' CHECK (job_alert_frequency IN ('instant', 'daily', 'weekly', 'never')),
    recommendation_emails BOOLEAN DEFAULT true,
    application_updates BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_alert_enabled ON saved_searches(alert_enabled);
CREATE INDEX idx_job_recommendations_user_id ON job_recommendations(user_id);
CREATE INDEX idx_job_recommendations_job_id ON job_recommendations(job_id);
CREATE INDEX idx_job_recommendations_match_score ON job_recommendations(match_score DESC);
CREATE INDEX idx_job_recommendations_viewed ON job_recommendations(viewed);
CREATE INDEX idx_job_recommendations_dismissed ON job_recommendations(dismissed);
CREATE INDEX idx_job_recommendations_expires_at ON job_recommendations(expires_at);
CREATE INDEX idx_job_alerts_log_user_id ON job_alerts_log(user_id);
CREATE INDEX idx_job_alerts_log_sent_at ON job_alerts_log(sent_at);
CREATE INDEX idx_candidate_preferences_user_id ON candidate_preferences(user_id);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE TRIGGER update_saved_searches_updated_at
    BEFORE UPDATE ON saved_searches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidate_preferences_updated_at
    BEFORE UPDATE ON candidate_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_alerts_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_preferences ENABLE ROW LEVEL SECURITY;

-- Saved Searches Policies
CREATE POLICY "Users can manage their own saved searches"
    ON saved_searches FOR ALL
    USING (auth.uid() = user_id);

-- Job Recommendations Policies
CREATE POLICY "Users can view their own recommendations"
    ON job_recommendations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations"
    ON job_recommendations FOR UPDATE
    USING (auth.uid() = user_id);

-- Job Alerts Log Policies
CREATE POLICY "Users can view their own alerts log"
    ON job_alerts_log FOR SELECT
    USING (auth.uid() = user_id);

-- Candidate Preferences Policies
CREATE POLICY "Users can manage their own preferences"
    ON candidate_preferences FOR ALL
    USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to clean up expired recommendations
CREATE OR REPLACE FUNCTION cleanup_expired_recommendations()
RETURNS void AS $$
BEGIN
    DELETE FROM job_recommendations
    WHERE expires_at < NOW()
    AND viewed = false
    AND dismissed = false;
END;
$$ LANGUAGE plpgsql;

-- Function to mark recommendation as viewed
CREATE OR REPLACE FUNCTION mark_recommendation_viewed(
    p_user_id UUID,
    p_job_id UUID
)
RETURNS void AS $$
BEGIN
    UPDATE job_recommendations
    SET viewed = true,
        viewed_at = NOW()
    WHERE user_id = p_user_id
    AND job_id = p_job_id
    AND viewed = false;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE saved_searches IS 'User saved job searches with alert settings';
COMMENT ON TABLE job_recommendations IS 'AI-powered job recommendations for candidates';
COMMENT ON TABLE job_alerts_log IS 'Log of all job alerts sent to users';
COMMENT ON TABLE candidate_preferences IS 'Candidate job preferences for better matching';


-- ----------------------------------------------------------------
-- >>> 20260301_fix_messages_foreign_keys.sql
-- ----------------------------------------------------------------
-- Fix messages table to reference user_profiles instead of auth.users
-- First, drop the existing foreign key constraints to auth.users
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;

-- Add foreign key constraints to user_profiles
ALTER TABLE messages 
    ADD CONSTRAINT messages_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES user_profiles(id) ON DELETE CASCADE;

ALTER TABLE messages 
    ADD CONSTRAINT messages_receiver_id_fkey 
    FOREIGN KEY (receiver_id) REFERENCES user_profiles(id) ON DELETE CASCADE;


-- ----------------------------------------------------------------
-- >>> 20260302_enhance_application_tracking.sql
-- ----------------------------------------------------------------
-- Migration: Enhanced Application Tracking
-- Description: Add application timeline, notes, and withdrawal functionality

-- ============================================================================
-- 1. APPLICATION TIMELINE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS application_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    
    -- Event Details
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'submitted', 'viewed', 'screening', 'interview_scheduled', 
        'interview_completed', 'offer', 'rejected', 'withdrawn', 
        'status_changed', 'note_added', 'document_updated'
    )),
    event_title VARCHAR(255) NOT NULL,
    event_description TEXT,
    
    -- Event Metadata
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    metadata JSONB, -- For additional event-specific data
    
    -- Actor
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_role VARCHAR(20), -- 'candidate', 'employer', 'system'
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. APPLICATION NOTES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS application_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Note Content
    note_text TEXT NOT NULL,
    note_type VARCHAR(20) DEFAULT 'general' CHECK (note_type IN ('general', 'reminder', 'follow_up', 'interview_prep')),
    
    -- Reminder
    is_reminder BOOLEAN DEFAULT false,
    reminder_date TIMESTAMPTZ,
    reminder_sent BOOLEAN DEFAULT false,
    
    -- Status
    is_pinned BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. ADD WITHDRAWAL FIELDS TO JOB_APPLICATIONS
-- ============================================================================
ALTER TABLE job_applications 
ADD COLUMN IF NOT EXISTS withdrawn BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS withdrawal_reason TEXT;

-- ============================================================================
-- 4. ADD APPLICATION METADATA FIELDS
-- ============================================================================
ALTER TABLE job_applications
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS viewed_by_employer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS employer_viewed_at TIMESTAMPTZ;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_application_timeline_application_id ON application_timeline(application_id);
CREATE INDEX idx_application_timeline_event_type ON application_timeline(event_type);
CREATE INDEX idx_application_timeline_created_at ON application_timeline(created_at DESC);
CREATE INDEX idx_application_notes_application_id ON application_notes(application_id);
CREATE INDEX idx_application_notes_user_id ON application_notes(user_id);
CREATE INDEX idx_application_notes_reminder_date ON application_notes(reminder_date) WHERE is_reminder = true;
CREATE INDEX idx_application_notes_is_pinned ON application_notes(is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_job_applications_withdrawn ON job_applications(withdrawn);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE TRIGGER update_application_notes_updated_at
    BEFORE UPDATE ON application_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE application_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_notes ENABLE ROW LEVEL SECURITY;

-- Application Timeline Policies
CREATE POLICY "Users can view timeline for their applications"
    ON application_timeline FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM job_applications
            WHERE job_applications.id = application_timeline.application_id
            AND job_applications.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert timeline events"
    ON application_timeline FOR INSERT
    WITH CHECK (true); -- Will be controlled by application logic

-- Application Notes Policies
CREATE POLICY "Users can manage their own application notes"
    ON application_notes FOR ALL
    USING (user_id = auth.uid());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to add timeline event
CREATE OR REPLACE FUNCTION add_application_timeline_event(
    p_application_id UUID,
    p_event_type VARCHAR,
    p_event_title VARCHAR,
    p_event_description TEXT DEFAULT NULL,
    p_old_status VARCHAR DEFAULT NULL,
    p_new_status VARCHAR DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_created_by_role VARCHAR DEFAULT 'system'
)
RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO application_timeline (
        application_id,
        event_type,
        event_title,
        event_description,
        old_status,
        new_status,
        metadata,
        created_by,
        created_by_role
    ) VALUES (
        p_application_id,
        p_event_type,
        p_event_title,
        p_event_description,
        p_old_status,
        p_new_status,
        p_metadata,
        p_created_by,
        p_created_by_role
    ) RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to withdraw application
CREATE OR REPLACE FUNCTION withdraw_application(
    p_application_id UUID,
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old_status VARCHAR;
BEGIN
    -- Get current status
    SELECT status INTO v_old_status
    FROM job_applications
    WHERE id = p_application_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found or unauthorized';
    END IF;
    
    -- Update application
    UPDATE job_applications
    SET 
        withdrawn = true,
        withdrawn_at = NOW(),
        withdrawal_reason = p_reason,
        status = 'withdrawn'
    WHERE id = p_application_id AND user_id = p_user_id;
    
    -- Add timeline event
    PERFORM add_application_timeline_event(
        p_application_id,
        'withdrawn',
        'Application Withdrawn',
        COALESCE(p_reason, 'Candidate withdrew application'),
        v_old_status,
        'withdrawn',
        jsonb_build_object('reason', p_reason),
        p_user_id,
        'candidate'
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create initial timeline event on application submission
CREATE OR REPLACE FUNCTION create_application_submitted_event()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM add_application_timeline_event(
        NEW.id,
        'submitted',
        'Application Submitted',
        'Your application has been submitted successfully',
        NULL,
        NEW.status,
        jsonb_build_object(
            'cv_submitted', NEW.cv_file_url IS NOT NULL,
            'cover_letter_submitted', NEW.cover_letter IS NOT NULL
        ),
        NEW.user_id,
        'candidate'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER application_submitted_timeline
    AFTER INSERT ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION create_application_submitted_event();

-- Trigger to track status changes
CREATE OR REPLACE FUNCTION track_application_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM add_application_timeline_event(
            NEW.id,
            'status_changed',
            'Status Updated',
            'Application status changed from ' || OLD.status || ' to ' || NEW.status,
            OLD.status,
            NEW.status,
            NULL,
            NULL,
            'system'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER application_status_change_timeline
    AFTER UPDATE ON job_applications
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION track_application_status_change();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE application_timeline IS 'Timeline of events for job applications';
COMMENT ON TABLE application_notes IS 'Candidate notes and reminders for applications';
COMMENT ON FUNCTION add_application_timeline_event IS 'Helper function to add timeline events';
COMMENT ON FUNCTION withdraw_application IS 'Withdraw a job application with reason';


-- ----------------------------------------------------------------
-- >>> 20260306_create_employer_analytics.sql
-- ----------------------------------------------------------------
-- Create job_views table for tracking individual job views
CREATE TABLE IF NOT EXISTS job_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  session_id TEXT,
  CONSTRAINT fk_job_views_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_views_job_id ON job_views(job_id);
CREATE INDEX IF NOT EXISTS idx_job_views_viewed_at ON job_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_job_views_user_id ON job_views(user_id);

-- Create application_sources table for tracking where applications come from
CREATE TABLE IF NOT EXISTS application_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  source_type TEXT, -- 'direct', 'job_board', 'social_media', 'referral', 'email', 'other'
  source_name TEXT, -- specific platform name
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_application_sources_application FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_application_sources_application_id ON application_sources(application_id);
CREATE INDEX IF NOT EXISTS idx_application_sources_source_type ON application_sources(source_type);

-- Add RLS policies
ALTER TABLE job_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_sources ENABLE ROW LEVEL SECURITY;

-- Job views policies
CREATE POLICY "Users can view their own job views" ON job_views
  FOR SELECT USING (
    job_id IN (SELECT id FROM jobs WHERE user_id = auth.uid())
  );

CREATE POLICY "Anyone can insert job views" ON job_views
  FOR INSERT WITH CHECK (true);

-- Application sources policies
CREATE POLICY "Employers can view application sources for their jobs" ON application_sources
  FOR SELECT USING (
    application_id IN (
      SELECT ja.id FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      WHERE j.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert application sources" ON application_sources
  FOR INSERT WITH CHECK (true);

-- Create function to update views_count on jobs table
CREATE OR REPLACE FUNCTION update_job_views_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE jobs
  SET views_count = (
    SELECT COUNT(*) FROM job_views WHERE job_id = NEW.job_id
  )
  WHERE id = NEW.job_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating views_count
DROP TRIGGER IF EXISTS trigger_update_job_views_count ON job_views;
CREATE TRIGGER trigger_update_job_views_count
  AFTER INSERT ON job_views
  FOR EACH ROW
  EXECUTE FUNCTION update_job_views_count();

-- Create materialized view for analytics aggregation (for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS job_analytics_summary AS
SELECT 
  j.id as job_id,
  j.user_id as employer_id,
  j.title,
  j.status,
  j.created_at as posted_at,
  COUNT(DISTINCT jv.id) as total_views,
  COUNT(DISTINCT ja.id) as total_applications,
  COUNT(DISTINCT CASE WHEN ja.status = 'shortlisted' THEN ja.id END) as shortlisted_count,
  COUNT(DISTINCT CASE WHEN ja.status = 'interviewed' THEN ja.id END) as interview_count,
  COUNT(DISTINCT CASE WHEN ja.status = 'offered' THEN ja.id END) as offered_count,
  COUNT(DISTINCT CASE WHEN ja.status = 'accepted' THEN ja.id END) as hired_count,
  COUNT(DISTINCT CASE WHEN ja.status = 'rejected' THEN ja.id END) as rejected_count,
  CASE 
    WHEN COUNT(DISTINCT jv.id) > 0 
    THEN (COUNT(DISTINCT ja.id)::FLOAT / COUNT(DISTINCT jv.id)::FLOAT * 100)
    ELSE 0 
  END as conversion_rate,
  MIN(ja.created_at) as first_application_at,
  MAX(ja.created_at) as last_application_at
FROM jobs j
LEFT JOIN job_views jv ON j.id = jv.job_id
LEFT JOIN job_applications ja ON j.id = ja.job_id
WHERE j.status = 'active'
GROUP BY j.id, j.user_id, j.title, j.status, j.created_at;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_analytics_summary_job_id ON job_analytics_summary(job_id);
CREATE INDEX IF NOT EXISTS idx_job_analytics_summary_employer_id ON job_analytics_summary(employer_id);

-- Create function to refresh analytics
CREATE OR REPLACE FUNCTION refresh_job_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY job_analytics_summary;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON job_analytics_summary TO authenticated;
GRANT SELECT ON job_views TO authenticated;
GRANT INSERT ON job_views TO authenticated, anon;
GRANT SELECT ON application_sources TO authenticated;
GRANT INSERT ON application_sources TO authenticated, anon;


-- ----------------------------------------------------------------
-- >>> 20260306_create_saved_searches.sql
-- ----------------------------------------------------------------
-- Create saved_searches table
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  search_params JSONB NOT NULL,
  email_alerts_enabled BOOLEAN DEFAULT false,
  alert_frequency VARCHAR(50) DEFAULT 'daily' CHECK (alert_frequency IN ('instant', 'daily', 'weekly')),
  last_alert_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create saved_jobs table
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- Create job_comparisons table
CREATE TABLE IF NOT EXISTS public.job_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  job_ids UUID[] NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (schema-qualified). Create partial index only if column exists.
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'saved_searches'
      AND column_name = 'email_alerts_enabled'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_saved_searches_email_alerts ON public.saved_searches(user_id, email_alerts_enabled) WHERE email_alerts_enabled = true';
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON public.saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id ON public.saved_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_comparisons_user_id ON public.job_comparisons(user_id);

-- Enable RLS
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_comparisons ENABLE ROW LEVEL SECURITY;

-- RLS Policies: create only if not already present (check pg_policy)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    JOIN pg_namespace n ON c.relnamespace = n.oid 
    WHERE c.relname = 'saved_searches' AND p.polname = 'users_can_view_their_own_saved_searches'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_view_their_own_saved_searches
      ON public.saved_searches FOR SELECT
      USING (auth.uid() = user_id);
    $q$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    WHERE c.relname = 'saved_searches' AND p.polname = 'users_can_create_their_own_saved_searches'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_create_their_own_saved_searches
      ON public.saved_searches FOR INSERT
      WITH CHECK (auth.uid() = user_id);
    $q$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    WHERE c.relname = 'saved_searches' AND p.polname = 'users_can_update_their_own_saved_searches'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_update_their_own_saved_searches
      ON public.saved_searches FOR UPDATE
      USING (auth.uid() = user_id);
    $q$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    WHERE c.relname = 'saved_searches' AND p.polname = 'users_can_delete_their_own_saved_searches'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_delete_their_own_saved_searches
      ON public.saved_searches FOR DELETE
      USING (auth.uid() = user_id);
    $q$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    WHERE c.relname = 'saved_jobs' AND p.polname = 'users_can_view_their_own_saved_jobs'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_view_their_own_saved_jobs
      ON public.saved_jobs FOR SELECT
      USING (auth.uid() = user_id);
    $q$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    WHERE c.relname = 'saved_jobs' AND p.polname = 'users_can_save_jobs'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_save_jobs
      ON public.saved_jobs FOR INSERT
      WITH CHECK (auth.uid() = user_id);
    $q$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    WHERE c.relname = 'saved_jobs' AND p.polname = 'users_can_update_their_saved_jobs'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_update_their_saved_jobs
      ON public.saved_jobs FOR UPDATE
      USING (auth.uid() = user_id);
    $q$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    WHERE c.relname = 'saved_jobs' AND p.polname = 'users_can_delete_their_saved_jobs'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_delete_their_saved_jobs
      ON public.saved_jobs FOR DELETE
      USING (auth.uid() = user_id);
    $q$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    WHERE c.relname = 'job_comparisons' AND p.polname = 'users_can_view_their_own_job_comparisons'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_view_their_own_job_comparisons
      ON public.job_comparisons FOR SELECT
      USING (auth.uid() = user_id);
    $q$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    WHERE c.relname = 'job_comparisons' AND p.polname = 'users_can_create_job_comparisons'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_create_job_comparisons
      ON public.job_comparisons FOR INSERT
      WITH CHECK (auth.uid() = user_id);
    $q$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    WHERE c.relname = 'job_comparisons' AND p.polname = 'users_can_update_their_own_job_comparisons'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_update_their_own_job_comparisons
      ON public.job_comparisons FOR UPDATE
      USING (auth.uid() = user_id);
    $q$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    WHERE c.relname = 'job_comparisons' AND p.polname = 'users_can_delete_their_own_job_comparisons'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_delete_their_own_job_comparisons
      ON public.job_comparisons FOR DELETE
      USING (auth.uid() = user_id);
    $q$;
  END IF;
END$$;

-- Create function to update updated_at timestamp (schema-qualified)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;

-- Create triggers for updated_at if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'update_saved_searches_updated_at'
      AND c.relname = 'saved_searches'
  ) THEN
    EXECUTE 'CREATE TRIGGER update_saved_searches_updated_at
      BEFORE UPDATE ON public.saved_searches
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'update_job_comparisons_updated_at'
      AND c.relname = 'job_comparisons'
  ) THEN
    EXECUTE 'CREATE TRIGGER update_job_comparisons_updated_at
      BEFORE UPDATE ON public.job_comparisons
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();';
  END IF;
END$$;


-- ----------------------------------------------------------------
-- >>> 20260306_job_management_enhancements.sql
-- ----------------------------------------------------------------
-- Step 4.3: Job Management Enhancements
-- Job templates, duplicate functionality, promotion, auto-expire, bulk actions

-- Job Templates Table
CREATE TABLE IF NOT EXISTS job_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  responsibilities TEXT,
  benefits TEXT,
  job_type TEXT,
  experience_level TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  location TEXT,
  remote_type TEXT,
  category TEXT,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Promotion/Featured Options
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_promoted BOOLEAN DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS promotion_start_date TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS promotion_end_date TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS promotion_tier TEXT CHECK (promotion_tier IN ('basic', 'premium', 'enterprise'));

-- Auto-expire and Renewal
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS renewal_duration_days INTEGER DEFAULT 30;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_renewed_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS renewal_count INTEGER DEFAULT 0;

-- Job History for tracking changes
CREATE TABLE IF NOT EXISTS job_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'duplicated', 'expired', 'renewed', 'promoted', 'unpromoted', 'featured', 'unfeatured')),
  changed_by UUID REFERENCES auth.users(id),
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bulk Job Actions Log
CREATE TABLE IF NOT EXISTS bulk_job_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('delete', 'expire', 'renew', 'promote', 'unpromote', 'feature', 'unfeature', 'update_status')),
  job_ids UUID[] NOT NULL,
  parameters JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_templates_user ON job_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_featured ON jobs(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_jobs_promoted ON jobs(is_promoted) WHERE is_promoted = TRUE;
CREATE INDEX IF NOT EXISTS idx_jobs_expires_at ON jobs(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_auto_renew ON jobs(auto_renew) WHERE auto_renew = TRUE;
CREATE INDEX IF NOT EXISTS idx_job_history_job_id ON job_history(job_id);
CREATE INDEX IF NOT EXISTS idx_bulk_job_actions_user ON bulk_job_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_job_actions_status ON bulk_job_actions(status);

-- RLS Policies for Job Templates
ALTER TABLE job_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates"
  ON job_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create templates"
  ON job_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON job_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON job_templates FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for Job History
ALTER TABLE job_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history of their jobs"
  ON job_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_history.job_id
      AND jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert job history"
  ON job_history FOR INSERT
  WITH CHECK (true);

-- RLS Policies for Bulk Job Actions
ALTER TABLE bulk_job_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bulk actions"
  ON bulk_job_actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create bulk actions"
  ON bulk_job_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bulk actions"
  ON bulk_job_actions FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to duplicate a job
CREATE OR REPLACE FUNCTION duplicate_job(source_job_id UUID, new_title TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  new_job_id UUID;
  source_job jobs%ROWTYPE;
BEGIN
  -- Get source job
  SELECT * INTO source_job FROM jobs WHERE id = source_job_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found';
  END IF;
  
  -- Check permission
  IF source_job.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Create duplicate
  INSERT INTO jobs (
    user_id, title, description, requirements, responsibilities, benefits,
    job_type, experience_level, salary_min, salary_max, salary_currency,
    location, remote_type, category, tags, custom_fields, status
  ) VALUES (
    source_job.user_id,
    COALESCE(new_title, source_job.title || ' (Copy)'),
    source_job.description,
    source_job.requirements,
    source_job.responsibilities,
    source_job.benefits,
    source_job.job_type,
    source_job.experience_level,
    source_job.salary_min,
    source_job.salary_max,
    source_job.salary_currency,
    source_job.location,
    source_job.remote_type,
    source_job.category,
    source_job.tags,
    source_job.custom_fields,
    'draft'
  ) RETURNING id INTO new_job_id;
  
  -- Log the duplication
  INSERT INTO job_history (job_id, action, changed_by, changes)
  VALUES (
    new_job_id,
    'duplicated',
    auth.uid(),
    jsonb_build_object('source_job_id', source_job_id)
  );
  
  RETURN new_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to renew a job
CREATE OR REPLACE FUNCTION renew_job(job_id_param UUID)
RETURNS VOID AS $$
DECLARE
  job_record jobs%ROWTYPE;
BEGIN
  SELECT * INTO job_record FROM jobs WHERE id = job_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found';
  END IF;
  
  -- Update job
  UPDATE jobs
  SET
    expires_at = NOW() + INTERVAL '1 day' * COALESCE(renewal_duration_days, 30),
    last_renewed_at = NOW(),
    renewal_count = renewal_count + 1,
    status = 'active',
    updated_at = NOW()
  WHERE id = job_id_param;
  
  -- Log the renewal
  INSERT INTO job_history (job_id, action, changed_by)
  VALUES (job_id_param, 'renewed', auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-renew expired jobs
CREATE OR REPLACE FUNCTION auto_renew_expired_jobs()
RETURNS INTEGER AS $$
DECLARE
  renewed_count INTEGER := 0;
  job_record RECORD;
BEGIN
  FOR job_record IN
    SELECT id FROM jobs
    WHERE auto_renew = TRUE
    AND expires_at <= NOW()
    AND status = 'active'
  LOOP
    PERFORM renew_job(job_record.id);
    renewed_count := renewed_count + 1;
  END LOOP;
  
  RETURN renewed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to expire jobs
CREATE OR REPLACE FUNCTION expire_old_jobs()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE jobs
    SET status = 'expired', updated_at = NOW()
    WHERE expires_at <= NOW()
    AND status = 'active'
    AND auto_renew = FALSE
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM expired;
  
  -- Log expired jobs
  INSERT INTO job_history (job_id, action)
  SELECT id, 'expired' FROM jobs
  WHERE expires_at <= NOW()
  AND status = 'expired'
  AND NOT EXISTS (
    SELECT 1 FROM job_history
    WHERE job_history.job_id = jobs.id
    AND action = 'expired'
    AND created_at > NOW() - INTERVAL '1 hour'
  );
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to promote a job
CREATE OR REPLACE FUNCTION promote_job(
  job_id_param UUID,
  tier TEXT DEFAULT 'basic',
  duration_days INTEGER DEFAULT 7
)
RETURNS VOID AS $$
BEGIN
  UPDATE jobs
  SET
    is_promoted = TRUE,
    promotion_tier = tier,
    promotion_start_date = NOW(),
    promotion_end_date = NOW() + INTERVAL '1 day' * duration_days,
    updated_at = NOW()
  WHERE id = job_id_param
  AND user_id = auth.uid();
  
  INSERT INTO job_history (job_id, action, changed_by, changes)
  VALUES (
    job_id_param,
    'promoted',
    auth.uid(),
    jsonb_build_object('tier', tier, 'duration_days', duration_days)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to feature a job
CREATE OR REPLACE FUNCTION feature_job(
  job_id_param UUID,
  duration_days INTEGER DEFAULT 7
)
RETURNS VOID AS $$
BEGIN
  UPDATE jobs
  SET
    is_featured = TRUE,
    featured_until = NOW() + INTERVAL '1 day' * duration_days,
    updated_at = NOW()
  WHERE id = job_id_param
  AND user_id = auth.uid();
  
  INSERT INTO job_history (job_id, action, changed_by, changes)
  VALUES (
    job_id_param,
    'featured',
    auth.uid(),
    jsonb_build_object('duration_days', duration_days)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute bulk job actions
CREATE OR REPLACE FUNCTION execute_bulk_job_action(
  action_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  action_record bulk_job_actions%ROWTYPE;
  job_id UUID;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
  results JSONB := '[]'::JSONB;
BEGIN
  SELECT * INTO action_record FROM bulk_job_actions WHERE id = action_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bulk action not found';
  END IF;
  
  -- Update status to processing
  UPDATE bulk_job_actions SET status = 'processing' WHERE id = action_id_param;
  
  -- Process each job
  FOREACH job_id IN ARRAY action_record.job_ids
  LOOP
    BEGIN
      CASE action_record.action_type
        WHEN 'delete' THEN
          DELETE FROM jobs WHERE id = job_id AND user_id = action_record.user_id;
        WHEN 'expire' THEN
          UPDATE jobs SET status = 'expired', updated_at = NOW()
          WHERE id = job_id AND user_id = action_record.user_id;
        WHEN 'renew' THEN
          PERFORM renew_job(job_id);
        WHEN 'promote' THEN
          PERFORM promote_job(
            job_id,
            COALESCE(action_record.parameters->>'tier', 'basic'),
            COALESCE((action_record.parameters->>'duration_days')::INTEGER, 7)
          );
        WHEN 'feature' THEN
          PERFORM feature_job(
            job_id,
            COALESCE((action_record.parameters->>'duration_days')::INTEGER, 7)
          );
        WHEN 'update_status' THEN
          UPDATE jobs SET status = action_record.parameters->>'status', updated_at = NOW()
          WHERE id = job_id AND user_id = action_record.user_id;
      END CASE;
      
      success_count := success_count + 1;
      results := results || jsonb_build_object('job_id', job_id, 'status', 'success');
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      results := results || jsonb_build_object('job_id', job_id, 'status', 'error', 'message', SQLERRM);
    END;
  END LOOP;
  
  -- Update bulk action with results
  UPDATE bulk_job_actions
  SET
    status = CASE WHEN error_count = 0 THEN 'completed' ELSE 'failed' END,
    results = jsonb_build_object(
      'success_count', success_count,
      'error_count', error_count,
      'details', results
    ),
    completed_at = NOW()
  WHERE id = action_id_param;
  
  RETURN results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated trigger for job_templates
CREATE OR REPLACE FUNCTION update_job_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_job_template_timestamp
  BEFORE UPDATE ON job_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_job_template_timestamp();

-- Comments
COMMENT ON TABLE job_templates IS 'Reusable job posting templates for employers';
COMMENT ON TABLE job_history IS 'Audit log of all job changes and actions';
COMMENT ON TABLE bulk_job_actions IS 'Bulk operations on multiple jobs';
COMMENT ON FUNCTION duplicate_job IS 'Creates a copy of an existing job posting';
COMMENT ON FUNCTION renew_job IS 'Extends the expiration date of a job posting';
COMMENT ON FUNCTION auto_renew_expired_jobs IS 'Automatically renews jobs with auto_renew enabled';
COMMENT ON FUNCTION expire_old_jobs IS 'Marks expired jobs as expired';
COMMENT ON FUNCTION promote_job IS 'Promotes a job with specified tier and duration';
COMMENT ON FUNCTION feature_job IS 'Features a job for specified duration';
COMMENT ON FUNCTION execute_bulk_job_action IS 'Executes a bulk action on multiple jobs';


-- ----------------------------------------------------------------
-- >>> 20260307_candidate_career_tools_fixed.sql
-- ----------------------------------------------------------------
-- Phase 5.1: Candidate Career Tools
-- CV Builder, Cover Letter Templates, Skill Assessments, Career Path, Salary Insights

-- ============================================================================
-- CV BUILDER & VERSIONS
-- ============================================================================

-- CV Templates
CREATE TABLE IF NOT EXISTS cv_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    thumbnail_url TEXT,
    template_data JSONB NOT NULL,
    is_premium BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User CVs (Multiple versions)
CREATE TABLE IF NOT EXISTS candidate_cvs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES cv_templates(id),
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    file_url TEXT,
    last_generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, title)
);

CREATE INDEX IF NOT EXISTS idx_candidate_cvs_user ON candidate_cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_cvs_primary ON candidate_cvs(user_id, is_primary) WHERE is_primary = true;

-- ============================================================================
-- COVER LETTER TEMPLATES & GENERATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS cover_letter_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    template_text TEXT NOT NULL,
    placeholders JSONB,
    is_premium BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidate_cover_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES cover_letter_templates(id),
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    generated_content TEXT,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cover_letters_user ON candidate_cover_letters(user_id);
CREATE INDEX IF NOT EXISTS idx_cover_letters_job ON candidate_cover_letters(job_id);

-- ============================================================================
-- SKILL ASSESSMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS skill_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_name TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty_level TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER DEFAULT 15,
    passing_score INTEGER DEFAULT 70,
    questions JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_assessments_skill ON skill_assessments(skill_name);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_category ON skill_assessments(category);

CREATE TABLE IF NOT EXISTS candidate_assessment_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES skill_assessments(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    time_taken_minutes INTEGER,
    answers JSONB,
    certificate_url TEXT,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_public BOOLEAN DEFAULT false,
    UNIQUE(user_id, assessment_id, completed_at)
);

CREATE INDEX IF NOT EXISTS idx_assessment_results_user ON candidate_assessment_results(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_passed ON candidate_assessment_results(user_id, passed) WHERE passed = true;

-- ============================================================================
-- CAREER PATH SUGGESTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS career_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_role TEXT NOT NULL,
    to_role TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    typical_duration_months INTEGER,
    required_skills JSONB,
    recommended_certifications JSONB,
    salary_increase_percentage INTEGER,
    description TEXT,
    steps JSONB,
    success_rate INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_career_paths_from ON career_paths(from_role);
CREATE INDEX IF NOT EXISTS idx_career_paths_to ON career_paths(to_role);

CREATE TABLE IF NOT EXISTS candidate_career_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_current_role TEXT NOT NULL,
    target_role TEXT NOT NULL,
    target_timeline_months INTEGER,
    career_path_id UUID REFERENCES career_paths(id),
    progress_percentage INTEGER DEFAULT 0,
    completed_steps JSONB DEFAULT '[]',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_career_goals_user ON candidate_career_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_career_goals_active ON candidate_career_goals(user_id, is_active) WHERE is_active = true;

-- ============================================================================
-- SALARY INSIGHTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS salary_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_title TEXT NOT NULL,
    location TEXT NOT NULL,
    country TEXT NOT NULL,
    experience_level TEXT NOT NULL,
    min_salary INTEGER NOT NULL,
    max_salary INTEGER NOT NULL,
    median_salary INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    sample_size INTEGER DEFAULT 1,
    industry TEXT,
    company_size TEXT,
    remote_type TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    data_source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salary_data_title ON salary_data(job_title);
CREATE INDEX IF NOT EXISTS idx_salary_data_location ON salary_data(location);
CREATE INDEX IF NOT EXISTS idx_salary_data_level ON salary_data(experience_level);
CREATE INDEX IF NOT EXISTS idx_salary_data_composite ON salary_data(job_title, location, experience_level);

CREATE TABLE IF NOT EXISTS candidate_salary_expectations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_title TEXT NOT NULL,
    min_salary INTEGER NOT NULL,
    max_salary INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    is_negotiable BOOLEAN DEFAULT true,
    preferred_benefits JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, job_title)
);

CREATE INDEX IF NOT EXISTS idx_salary_expectations_user ON candidate_salary_expectations(user_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- CV Templates (Public read, admin write)
ALTER TABLE cv_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cv_templates' AND policyname = 'Anyone can view active templates') THEN
        CREATE POLICY "Anyone can view active templates" ON cv_templates FOR SELECT USING (is_active = true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cv_templates' AND policyname = 'Admins can manage templates') THEN
        CREATE POLICY "Admins can manage templates" ON cv_templates FOR ALL USING (
            EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
        );
    END IF;
END $$;

-- Candidate CVs (User owns their CVs)
ALTER TABLE candidate_cvs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'candidate_cvs' AND policyname = 'Users can view own CVs') THEN
        CREATE POLICY "Users can view own CVs" ON candidate_cvs FOR SELECT USING (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'candidate_cvs' AND policyname = 'Users can create own CVs') THEN
        CREATE POLICY "Users can create own CVs" ON candidate_cvs FOR INSERT WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'candidate_cvs' AND policyname = 'Users can update own CVs') THEN
        CREATE POLICY "Users can update own CVs" ON candidate_cvs FOR UPDATE USING (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'candidate_cvs' AND policyname = 'Users can delete own CVs') THEN
        CREATE POLICY "Users can delete own CVs" ON candidate_cvs FOR DELETE USING (user_id = auth.uid());
    END IF;
END $$;

-- Cover Letter Templates (Public read, admin write)
ALTER TABLE cover_letter_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cover_letter_templates' AND policyname = 'Anyone can view active cover letter templates') THEN
        CREATE POLICY "Anyone can view active cover letter templates" ON cover_letter_templates FOR SELECT USING (is_active = true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cover_letter_templates' AND policyname = 'Admins can manage cover letter templates') THEN
        CREATE POLICY "Admins can manage cover letter templates" ON cover_letter_templates FOR ALL USING (
            EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
        );
    END IF;
END $$;

-- Candidate Cover Letters (User owns their letters)
ALTER TABLE candidate_cover_letters ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'candidate_cover_letters' AND policyname = 'Users can view own cover letters') THEN
        CREATE POLICY "Users can view own cover letters" ON candidate_cover_letters FOR SELECT USING (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'candidate_cover_letters' AND policyname = 'Users can create own cover letters') THEN
        CREATE POLICY "Users can create own cover letters" ON candidate_cover_letters FOR INSERT WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'candidate_cover_letters' AND policyname = 'Users can update own cover letters') THEN
        CREATE POLICY "Users can update own cover letters" ON candidate_cover_letters FOR UPDATE USING (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'candidate_cover_letters' AND policyname = 'Users can delete own cover letters') THEN
        CREATE POLICY "Users can delete own cover letters" ON candidate_cover_letters FOR DELETE USING (user_id = auth.uid());
    END IF;
END $$;

-- Skill Assessments (Public read)
ALTER TABLE skill_assessments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'skill_assessments' AND policyname = 'Anyone can view active assessments') THEN
        CREATE POLICY "Anyone can view active assessments" ON skill_assessments FOR SELECT USING (is_active = true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'skill_assessments' AND policyname = 'Admins can manage assessments') THEN
        CREATE POLICY "Admins can manage assessments" ON skill_assessments FOR ALL USING (
            EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
        );
    END IF;
END $$;

-- Assessment Results (User owns their results, public if marked)
ALTER TABLE candidate_assessment_results ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'candidate_assessment_results' AND policyname = 'Users can view own results') THEN
        CREATE POLICY "Users can view own results" ON candidate_assessment_results FOR SELECT USING (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'candidate_assessment_results' AND policyname = 'Public results are viewable') THEN
        CREATE POLICY "Public results are viewable" ON candidate_assessment_results FOR SELECT USING (is_public = true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'candidate_assessment_results' AND policyname = 'Users can create own results') THEN
        CREATE POLICY "Users can create own results" ON candidate_assessment_results FOR INSERT WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'candidate_assessment_results' AND policyname = 'Users can update own results') THEN
        CREATE POLICY "Users can update own results" ON candidate_assessment_results FOR UPDATE USING (user_id = auth.uid());
    END IF;
END $$;

-- Career Paths (Public read)
ALTER TABLE career_paths ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'career_paths' AND policyname = 'Anyone can view career paths') THEN
        CREATE POLICY "Anyone can view career paths" ON career_paths FOR SELECT USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'career_paths' AND policyname = 'Admins can manage career paths') THEN
        CREATE POLICY "Admins can manage career paths" ON career_paths FOR ALL USING (
            EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
        );
    END IF;
END $$;

-- Career Goals (User owns their goals)
ALTER TABLE candidate_career_goals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'candidate_career_goals' AND policyname = 'Users can view own goals') THEN
        CREATE POLICY "Users can view own goals" ON candidate_career_goals FOR SELECT USING (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'candidate_career_goals' AND policyname = 'Users can create own goals') THEN
        CREATE POLICY "Users can create own goals" ON candidate_career_goals FOR INSERT WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'candidate_career_goals' AND policyname = 'Users can update own goals') THEN
        CREATE POLICY "Users can update own goals" ON candidate_career_goals FOR UPDATE USING (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'candidate_career_goals' AND policyname = 'Users can delete own goals') THEN
        CREATE POLICY "Users can delete own goals" ON candidate_career_goals FOR DELETE USING (user_id = auth.uid());
    END IF;
END $$;

-- Salary Data (Public read)
ALTER TABLE salary_data ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'salary_data' AND policyname = 'Anyone can view salary data') THEN
        CREATE POLICY "Anyone can view salary data" ON salary_data FOR SELECT USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'salary_data' AND policyname = 'Authenticated users can contribute') THEN
        CREATE POLICY "Authenticated users can contribute" ON salary_data FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- Salary Expectations (User owns their expectations)
ALTER TABLE candidate_salary_expectations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'candidate_salary_expectations' AND policyname = 'Users can view own expectations') THEN
        CREATE POLICY "Users can view own expectations" ON candidate_salary_expectations FOR SELECT USING (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'candidate_salary_expectations' AND policyname = 'Users can create own expectations') THEN
        CREATE POLICY "Users can create own expectations" ON candidate_salary_expectations FOR INSERT WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'candidate_salary_expectations' AND policyname = 'Users can update own expectations') THEN
        CREATE POLICY "Users can update own expectations" ON candidate_salary_expectations FOR UPDATE USING (user_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'candidate_salary_expectations' AND policyname = 'Users can delete own expectations') THEN
        CREATE POLICY "Users can delete own expectations" ON candidate_salary_expectations FOR DELETE USING (user_id = auth.uid());
    END IF;
END $$;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get salary insights for a role
CREATE OR REPLACE FUNCTION get_salary_insights(
    p_job_title TEXT,
    p_location TEXT DEFAULT NULL,
    p_experience_level TEXT DEFAULT NULL
)
RETURNS TABLE (
    min_salary INTEGER,
    max_salary INTEGER,
    median_salary INTEGER,
    percentile_25 INTEGER,
    percentile_75 INTEGER,
    sample_size BIGINT,
    currency TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        MIN(sd.min_salary)::INTEGER,
        MAX(sd.max_salary)::INTEGER,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sd.median_salary)::INTEGER,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY sd.median_salary)::INTEGER,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY sd.median_salary)::INTEGER,
        COUNT(*)::BIGINT,
        sd.currency
    FROM salary_data sd
    WHERE sd.job_title ILIKE '%' || p_job_title || '%'
        AND (p_location IS NULL OR sd.location ILIKE '%' || p_location || '%')
        AND (p_experience_level IS NULL OR sd.experience_level = p_experience_level)
    GROUP BY sd.currency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to suggest career paths based on current profile
CREATE OR REPLACE FUNCTION suggest_career_paths(p_user_id UUID)
RETURNS TABLE (
    path_id UUID,
    from_role TEXT,
    to_role TEXT,
    difficulty TEXT,
    duration_months INTEGER,
    salary_increase_percentage INTEGER,
    match_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH user_skills AS (
        SELECT UNNEST(skills) as skill
        FROM candidate_profiles
        WHERE id = p_user_id
    ),
    user_current_role AS (
        SELECT current_job_title
        FROM candidate_profiles
        WHERE id = p_user_id
    )
    SELECT 
        cp.id,
        cp.from_role,
        cp.to_role,
        cp.difficulty,
        cp.typical_duration_months,
        cp.salary_increase_percentage,
        (
            SELECT COUNT(*)::INTEGER * 20
            FROM user_skills us
            WHERE us.skill = ANY(
                SELECT jsonb_array_elements_text(cp.required_skills)
            )
        ) as match_score
    FROM career_paths cp
    CROSS JOIN user_current_role ucr
    WHERE cp.from_role ILIKE '%' || ucr.current_job_title || '%'
    ORDER BY match_score DESC, cp.salary_increase_percentage DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert sample CV templates
INSERT INTO cv_templates (name, description, category, template_data, is_premium) VALUES
('Modern Professional', 'Clean and modern design perfect for tech roles', 'modern', '{"sections": ["header", "summary", "experience", "education", "skills"], "colors": {"primary": "#2563eb", "secondary": "#64748b"}}', false),
('Classic Executive', 'Traditional format for senior positions', 'classic', '{"sections": ["header", "summary", "experience", "education", "certifications"], "colors": {"primary": "#1e293b", "secondary": "#475569"}}', false),
('Creative Designer', 'Eye-catching layout for creative professionals', 'creative', '{"sections": ["header", "portfolio", "experience", "skills", "education"], "colors": {"primary": "#8b5cf6", "secondary": "#a78bfa"}}', true)
ON CONFLICT DO NOTHING;

-- Insert sample cover letter templates
INSERT INTO cover_letter_templates (name, description, category, template_text, placeholders, is_premium) VALUES
('Professional Standard', 'Formal cover letter for corporate positions', 'formal', 
'Dear {{hiring_manager}},

I am writing to express my strong interest in the {{job_title}} position at {{company_name}}. With {{years_experience}} years of experience in {{industry}}, I am confident in my ability to contribute to your team.

{{custom_paragraph}}

I am particularly drawn to {{company_name}} because {{company_reason}}. My background in {{key_skills}} aligns perfectly with the requirements outlined in your job posting.

Thank you for considering my application. I look forward to discussing how my experience and skills can benefit your organization.

Sincerely,
{{candidate_name}}',
'{"placeholders": ["hiring_manager", "job_title", "company_name", "years_experience", "industry", "custom_paragraph", "company_reason", "key_skills", "candidate_name"]}', false),

('Tech Enthusiast', 'Engaging letter for technology roles', 'technical',
'Hi {{hiring_manager}},

I''m excited to apply for the {{job_title}} role at {{company_name}}. As a passionate {{profession}} with expertise in {{tech_stack}}, I''ve been following your company''s work in {{company_focus}} and would love to contribute.

{{achievement_paragraph}}

What excites me most about this opportunity is {{excitement_reason}}. I believe my experience with {{relevant_experience}} would make me a valuable addition to your team.

Looking forward to connecting!

Best regards,
{{candidate_name}}',
'{"placeholders": ["hiring_manager", "job_title", "company_name", "profession", "tech_stack", "company_focus", "achievement_paragraph", "excitement_reason", "relevant_experience", "candidate_name"]}', false)
ON CONFLICT DO NOTHING;

-- Insert sample skill assessments
INSERT INTO skill_assessments (skill_name, category, difficulty_level, description, duration_minutes, questions) VALUES
('JavaScript Fundamentals', 'technical', 'intermediate', 'Test your knowledge of core JavaScript concepts', 20, 
'{"questions": [
    {"id": 1, "question": "What is closure in JavaScript?", "type": "multiple_choice", "options": ["A function with access to outer scope", "A loop structure", "A data type", "An operator"], "correct": 0, "points": 10},
    {"id": 2, "question": "Explain the difference between let and var", "type": "text", "points": 15},
    {"id": 3, "question": "What does ''use strict'' do?", "type": "multiple_choice", "options": ["Enables strict mode", "Imports a module", "Declares a constant", "Creates a class"], "correct": 0, "points": 10}
]}'),

('Communication Skills', 'soft', 'beginner', 'Assess your professional communication abilities', 15,
'{"questions": [
    {"id": 1, "question": "How do you handle difficult conversations with colleagues?", "type": "text", "points": 20},
    {"id": 2, "question": "What is active listening?", "type": "multiple_choice", "options": ["Fully concentrating and responding", "Hearing words", "Taking notes", "Interrupting"], "correct": 0, "points": 15}
]}')
ON CONFLICT DO NOTHING;

-- Insert sample career paths
INSERT INTO career_paths (from_role, to_role, difficulty, typical_duration_months, required_skills, salary_increase_percentage, description, steps, success_rate) VALUES
('Junior Developer', 'Senior Developer', 'moderate', 36, 
'["Advanced programming", "System design", "Mentoring", "Code review", "Architecture"]',
40,
'Progress from junior to senior developer through technical mastery and leadership',
'{"steps": [
    {"title": "Master core technologies", "duration_months": 12, "description": "Deep dive into your primary tech stack"},
    {"title": "Lead small projects", "duration_months": 12, "description": "Take ownership of features and modules"},
    {"title": "Mentor juniors", "duration_months": 6, "description": "Help onboard and guide new team members"},
    {"title": "System design", "duration_months": 6, "description": "Learn to architect scalable solutions"}
]}',
75),

('Marketing Coordinator', 'Marketing Manager', 'moderate', 24,
'["Team leadership", "Budget management", "Strategy", "Analytics", "Campaign management"]',
35,
'Transition from coordinator to manager with leadership and strategic skills',
'{"steps": [
    {"title": "Lead campaigns", "duration_months": 8, "description": "Own end-to-end campaign execution"},
    {"title": "Develop strategy skills", "duration_months": 8, "description": "Learn market analysis and planning"},
    {"title": "Build team skills", "duration_months": 8, "description": "Mentor team members and manage projects"}
]}',
70)
ON CONFLICT DO NOTHING;

-- Insert sample salary data
INSERT INTO salary_data (job_title, location, country, experience_level, min_salary, max_salary, median_salary, industry, company_size, remote_type) VALUES
('Software Engineer', 'San Francisco, CA', 'USA', 'mid', 120000, 180000, 150000, 'Technology', 'large', 'hybrid'),
('Software Engineer', 'New York, NY', 'USA', 'mid', 110000, 170000, 140000, 'Technology', 'large', 'hybrid'),
('Software Engineer', 'Austin, TX', 'USA', 'mid', 95000, 145000, 120000, 'Technology', 'medium', 'hybrid'),
('Senior Software Engineer', 'San Francisco, CA', 'USA', 'senior', 160000, 250000, 200000, 'Technology', 'large', 'hybrid'),
('Marketing Manager', 'New York, NY', 'USA', 'mid', 80000, 120000, 100000, 'Marketing', 'medium', 'onsite'),
('Product Manager', 'Seattle, WA', 'USA', 'mid', 130000, 180000, 155000, 'Technology', 'large', 'hybrid')
ON CONFLICT DO NOTHING;


-- ----------------------------------------------------------------
-- >>> 20260307_fix_duplicate_job_function.sql
-- ----------------------------------------------------------------
-- Fix duplicate_job function to match actual jobs table structure

CREATE OR REPLACE FUNCTION duplicate_job(source_job_id UUID, new_title TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  new_job_id UUID;
  source_job jobs%ROWTYPE;
BEGIN
  -- Get source job
  SELECT * INTO source_job FROM jobs WHERE id = source_job_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found';
  END IF;
  
  -- Check permission
  IF source_job.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Create duplicate with all relevant columns (excluding auto-generated and status fields)
  INSERT INTO jobs (
    user_id, title, company, company_id, location, description, salary, 
    apply_link, apply_email, additional_info, application_deadline, application_url,
    direct_apply, education_level_id, education_requirements, employment_type,
    experience_level, experience_level_ref_id, industry, industry_id,
    job_function, job_function_id, job_location_city, job_location_country,
    job_location_county, job_location_type, location_town, minimum_experience,
    qualifications, required_qualifications, responsibilities,
    salary_currency, salary_max, salary_min, salary_period, salary_type,
    salary_visibility, specialization, tags, work_schedule, language_requirements,
    county_id, hiring_organization_logo, hiring_organization_name, hiring_organization_url
  ) VALUES (
    source_job.user_id,
    COALESCE(new_title, source_job.title || ' (Copy)'),
    source_job.company,
    source_job.company_id,
    source_job.location,
    source_job.description,
    source_job.salary,
    source_job.apply_link,
    source_job.apply_email,
    source_job.additional_info,
    source_job.application_deadline,
    source_job.application_url,
    source_job.direct_apply,
    source_job.education_level_id,
    source_job.education_requirements,
    source_job.employment_type,
    source_job.experience_level,
    source_job.experience_level_ref_id,
    source_job.industry,
    source_job.industry_id,
    source_job.job_function,
    source_job.job_function_id,
    source_job.job_location_city,
    source_job.job_location_country,
    source_job.job_location_county,
    source_job.job_location_type,
    source_job.location_town,
    source_job.minimum_experience,
    source_job.qualifications,
    source_job.required_qualifications,
    source_job.responsibilities,
    source_job.salary_currency,
    source_job.salary_max,
    source_job.salary_min,
    source_job.salary_period,
    source_job.salary_type,
    source_job.salary_visibility,
    source_job.specialization,
    source_job.tags,
    source_job.work_schedule,
    source_job.language_requirements,
    source_job.county_id,
    source_job.hiring_organization_logo,
    source_job.hiring_organization_name,
    source_job.hiring_organization_url
  ) RETURNING id INTO new_job_id;
  
  -- Log the duplication
  INSERT INTO job_history (job_id, action, changed_by, changes)
  VALUES (
    new_job_id,
    'duplicated',
    auth.uid(),
    jsonb_build_object('source_job_id', source_job_id)
  );
  
  RETURN new_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------
-- >>> 20260309_add_classic_professional_cv_template.sql
-- ----------------------------------------------------------------
-- Add Classic Professional CV Template for Kenyan Candidates
-- This template is specifically designed for the Kenyan job market

-- First, check if the template already exists and delete it if it does
DELETE FROM cv_templates WHERE name = 'Classic Professional';

-- Insert the new Classic Professional template
INSERT INTO cv_templates (
    name, 
    description, 
    category, 
    template_data, 
    is_premium,
    is_active
) VALUES (
    'Classic Professional',
    'Clean, single-column CV template perfect for Kenyan professionals. ATS-friendly design suitable for administrative, corporate, and government positions.',
    'classic',
    '{
        "component": "ClassicTemplate",
        "sections": [
            "header",
            "professional_summary",
            "key_skills",
            "professional_experience",
            "education",
            "certifications",
            "referees"
        ],
        "colors": {
            "primary": "#111827",
            "secondary": "#374151",
            "accent": "#1d4ed8"
        },
        "fonts": {
            "primary": "system-ui, -apple-system, sans-serif"
        },
        "layout": {
            "type": "single-column",
            "width": "794px",
            "height": "1123px",
            "padding": "48px"
        },
        "features": [
            "ATS-friendly",
            "A4 print-ready",
            "Kenyan format",
            "Professional typography",
            "Clean sections"
        ],
        "best_for": [
            "Administrative roles",
            "Management positions",
            "Corporate jobs",
            "Government applications",
            "Entry to mid-level positions"
        ]
    }'::jsonb,
    false,
    true
);

-- Add comment for documentation
COMMENT ON TABLE cv_templates IS 'Stores CV template definitions with metadata and configuration';


-- ----------------------------------------------------------------
-- >>> 20260309_add_creative_portfolio_cv_template.sql
-- ----------------------------------------------------------------
-- Migration: Add Creative Portfolio CV Template
-- Template #7: Creative Portfolio CV for designers, photographers, and creative professionals

-- First, check if the template already exists and delete it if it does
DELETE FROM cv_templates WHERE name = 'Creative Portfolio';

-- Insert the new Creative Portfolio template
INSERT INTO cv_templates (
    name, 
    description, 
    category, 
    template_data, 
    is_premium,
    is_active
) VALUES (
    'Creative Portfolio',
    'Eye-catching template for graphic designers, UI/UX designers, photographers, and creative professionals. Features portfolio projects prominently with a bold sidebar design.',
    'creative',
    '{
        "component": "CreativeTemplate",
        "sections": [
            "header",
            "tagline",
            "contact",
            "creative_profile",
            "core_skills",
            "design_tools",
            "portfolio_projects",
            "work_experience",
            "education"
        ],
        "colors": {
            "primary": "#4f46e5",
            "secondary": "#ffffff",
            "accent": "#6366f1",
            "text": "#374151"
        },
        "fonts": {
            "primary": "system-ui, -apple-system, sans-serif"
        },
        "layout": {
            "type": "two-column",
            "width": "794px",
            "height": "1123px",
            "sidebar_width": "33%",
            "main_width": "67%"
        },
        "features": [
            "Portfolio showcase",
            "Creative sidebar design",
            "Project highlights",
            "Skills visualization",
            "Bold color scheme"
        ],
        "best_for": [
            "Graphic designers",
            "UI/UX designers",
            "Photographers",
            "Video editors",
            "Creative directors",
            "Social media creatives"
        ],
        "default_data": {
            "name": "Your Name",
            "tagline": "Your Creative Title | Specialization",
            "contact": {
                "location": "City, Country",
                "phone": "+254 XXX XXX XXX",
                "email": "your.email@example.com",
                "website": "www.yourportfolio.com"
            },
            "profile": "Brief creative profile highlighting your design philosophy, experience, and what makes your work unique. Focus on your creative approach and impact.",
            "skills": [
                "Brand Identity Design",
                "Logo Design",
                "Typography",
                "Social Media Graphics",
                "Illustration",
                "Visual Storytelling"
            ],
            "tools": [
                "Adobe Photoshop",
                "Adobe Illustrator",
                "Figma",
                "Canva",
                "After Effects"
            ],
            "projects": [
                {
                    "title": "Project Name",
                    "client": "Client Name",
                    "year": "2024",
                    "description": "Brief description of the project, your role, and the impact or results achieved."
                }
            ],
            "experience": [
                {
                    "role": "Job Title",
                    "company": "Company Name",
                    "location": "City",
                    "dates": "Start – End"
                }
            ],
            "education": [
                {
                    "degree": "Degree/Diploma Name",
                    "institution": "Institution Name",
                    "dates": "Start – End"
                }
            ]
        }
    }'::jsonb,
    false,
    true
);

-- Add comment for documentation
COMMENT ON TABLE cv_templates IS 'Stores CV template definitions with metadata and configuration';


-- ----------------------------------------------------------------
-- >>> 20260309_add_digital_professional_cv_template.sql
-- ----------------------------------------------------------------
-- Migration: Add Digital Professional CV Template
-- Template #8: Digital Professional CV for tech and digital professionals

-- First, check if the template already exists and delete it if it does
DELETE FROM cv_templates WHERE name = 'Digital Professional';

-- Insert the new Digital Professional template
INSERT INTO cv_templates (
  name,
  description,
  category,
  template_data,
  is_premium,
  is_active
) VALUES (
  'Digital Professional',
  'Modern tech-focused CV highlighting projects, tech stack, and certifications. Perfect for software developers, data scientists, and IT professionals.',
  'technical',
  '{
    "name": "Kevin Otieno Ouma",
    "title": "Full Stack Software Developer",
    "contact": {
      "location": "Nairobi, Kenya",
      "phone": "+254 712 888 999",
      "email": "kevin.otieno@email.com",
      "github": "github.com/kevinotieno",
      "linkedin": "linkedin.com/in/kevinotieno"
    },
    "summary": "Full stack developer with 4+ years of experience building scalable web applications using modern JavaScript frameworks and cloud technologies. Specialized in React, Next.js, and Node.js ecosystems with a strong focus on performance optimization, user experience, and clean code architecture. Proven track record of delivering high-quality solutions for startups and enterprise clients across fintech, e-commerce, and SaaS industries.",
    "techStack": [
      "JavaScript / TypeScript",
      "React / Next.js",
      "Node.js / Express",
      "PostgreSQL / MongoDB",
      "Supabase / Firebase",
      "Tailwind CSS",
      "GraphQL / REST APIs",
      "Python / Django"
    ],
    "tools": [
      "Git / GitHub",
      "Docker / Kubernetes",
      "AWS / Vercel",
      "Postman / Insomnia",
      "VS Code / WebStorm",
      "Figma / Adobe XD",
      "Jira / Linear",
      "Jest / Cypress"
    ],
    "certifications": [
      "AWS Certified Developer Associate (2023)",
      "Google Data Analytics Professional Certificate",
      "Meta Front-End Developer Professional Certificate",
      "MongoDB Certified Developer"
    ],
    "projects": [
      {
        "name": "E-Commerce Platform",
        "tech": "Next.js, Supabase, Stripe, Tailwind CSS",
        "description": "Built a full-stack e-commerce platform with authentication, payment integration, inventory management, and admin dashboard. Implemented real-time order tracking and email notifications. Achieved 99.9% uptime and handled 10K+ monthly transactions.",
        "link": "demo.ecommerce-platform.com"
      },
      {
        "name": "Job Board Application",
        "tech": "React, Node.js, PostgreSQL, Redis",
        "description": "Developed a comprehensive job board platform allowing companies to post jobs and candidates to apply online. Features include advanced search filters, application tracking, and automated email campaigns. Serves 500+ active employers.",
        "link": "github.com/kevinotieno/job-board"
      },
      {
        "name": "Real-Time Analytics Dashboard",
        "tech": "React, D3.js, WebSocket, Express",
        "description": "Created a real-time analytics dashboard for monitoring business metrics with interactive charts and live data updates. Integrated with multiple data sources and implemented custom visualization components.",
        "link": "analytics-demo.vercel.app"
      },
      {
        "name": "Mobile Banking App (Backend)",
        "tech": "Node.js, PostgreSQL, JWT, Docker",
        "description": "Designed and implemented secure RESTful APIs for a mobile banking application. Handled transaction processing, account management, and third-party payment gateway integration with PCI DSS compliance."
      }
    ],
    "experience": [
      {
        "role": "Senior Software Developer",
        "company": "TechNova Solutions",
        "location": "Nairobi, Kenya",
        "dates": "Jan 2022 – Present",
        "responsibilities": [
          "Lead development of client-facing web applications using React and Next.js",
          "Architect and implement scalable backend services with Node.js and PostgreSQL",
          "Mentor junior developers and conduct code reviews",
          "Reduced application load time by 40% through performance optimization"
        ]
      },
      {
        "role": "Full Stack Developer",
        "company": "Digital Edge Ltd",
        "location": "Nairobi, Kenya",
        "dates": "Mar 2020 – Dec 2021",
        "responsibilities": [
          "Developed and maintained multiple client projects using MERN stack",
          "Implemented CI/CD pipelines using GitHub Actions and Docker",
          "Collaborated with designers to create responsive user interfaces",
          "Integrated third-party APIs including payment gateways and analytics tools"
        ]
      },
      {
        "role": "Junior Developer",
        "company": "StartUp Hub Kenya",
        "location": "Nairobi, Kenya",
        "dates": "Jun 2019 – Feb 2020",
        "responsibilities": [
          "Built responsive web applications using React and Bootstrap",
          "Assisted in database design and optimization",
          "Participated in agile development processes and daily standups"
        ]
      }
    ],
    "education": [
      {
        "degree": "BSc Computer Science",
        "institution": "University of Nairobi",
        "dates": "2016 – 2020",
        "gpa": "3.7/4.0"
      }
    ]
  }'::jsonb,
  false,
  true
);

-- Add comment for documentation
COMMENT ON TABLE cv_templates IS 'Stores CV template definitions with metadata and configuration';


-- ----------------------------------------------------------------
-- >>> 20260309_add_executive_leadership_cv_template.sql
-- ----------------------------------------------------------------
-- Add Executive Leadership CV Template
-- Premium layout for senior executives emphasizing leadership and strategic impact

-- First delete if exists
DELETE FROM cv_templates WHERE name = 'Executive Leadership';

-- Insert the new Executive Leadership template
INSERT INTO cv_templates (
  name,
  description,
  category,
  template_data,
  is_premium,
  is_active
) VALUES (
  'Executive Leadership',
  'A premium layout emphasizing leadership achievements, strategic impact, and measurable results. Perfect for directors, CEOs, senior managers, and consultants who need to highlight impact and leadership metrics.',
  'Executive',
  '{
    "component": "ExecutiveTemplate",
    "sections": [
      "header",
      "leadership_profile",
      "key_achievements",
      "strategic_experience",
      "board_memberships",
      "strategic_initiatives",
      "education",
      "certifications"
    ],
    "colors": {
      "primary": "#111827",
      "secondary": "#374151",
      "accent": "#1d4ed8"
    },
    "fonts": {
      "primary": "Georgia, serif",
      "secondary": "system-ui, sans-serif"
    },
    "layout": {
      "type": "single-column",
      "width": "794px",
      "height": "1123px",
      "padding": "32px"
    },
    "features": [
      "Premium serif typography",
      "Leadership-focused sections",
      "Strategic impact emphasis",
      "Board memberships section",
      "Executive education"
    ],
    "best_for": [
      "Directors",
      "CEOs and C-suite",
      "Senior managers",
      "Consultants",
      "Board members"
    ]
  }'::jsonb,
  true,
  true
);

-- Update descriptions for existing templates
UPDATE cv_templates 
SET description = 'A clean, ATS-friendly single-column layout perfect for entry to mid-level professionals. Emphasizes clarity and readability for administrative, technical, and general professional roles.'
WHERE name = 'Classic Professional';

UPDATE cv_templates 
SET description = 'A stylized two-column design with blue accents and modern aesthetics. Ideal for mid-career professionals in corporate roles, marketing, business, and communications positions.'
WHERE name = 'Modern Professional';


-- ----------------------------------------------------------------
-- >>> 20260309_add_functional_skills_cv_template.sql
-- ----------------------------------------------------------------
-- Add Skills-Based (Functional) CV Template
-- This template emphasizes skills and competencies over chronological work history
-- Ideal for career changers, people with employment gaps, and entry-level candidates

-- First, check if the template already exists and delete it if it does
DELETE FROM cv_templates WHERE name = 'Skills-Based (Functional)';

-- Insert the Skills-Based (Functional) CV template
INSERT INTO cv_templates (
    name, 
    description, 
    category, 
    template_data, 
    is_premium,
    is_active
) VALUES (
    'Skills-Based (Functional)',
    'Skills-first CV template that emphasizes competencies over chronological work history. Perfect for career changers, candidates with employment gaps, or those with strong transferable skills.',
    'functional',
    '{
        "component": "FunctionalTemplate",
        "sections": [
            "header",
            "professional_summary",
            "core_competencies",
            "skills_categories",
            "work_experience_brief",
            "education",
            "certifications"
        ],
        "colors": {
            "primary": "#111827",
            "secondary": "#374151",
            "accent": "#1e40af"
        },
        "fonts": {
            "primary": "system-ui, -apple-system, sans-serif"
        },
        "layout": {
            "type": "single-column",
            "width": "794px",
            "height": "1123px",
            "padding": "48px"
        },
        "features": [
            "Skills-first approach",
            "Core competencies section",
            "Categorized professional skills",
            "Brief work experience summary",
            "Transferable skills focus",
            "ATS-friendly",
            "A4 print-ready"
        ],
        "best_for": [
            "Career changers",
            "Candidates with employment gaps",
            "Entry-level with transferable skills",
            "Industry switchers",
            "Diverse experience backgrounds"
        ]
    }'::jsonb,
    false,
    true
);

-- Add comment for documentation
COMMENT ON TABLE cv_templates IS 'Stores CV template definitions with metadata and configuration. The functional template prioritizes skills over chronological experience.';


-- ----------------------------------------------------------------
-- >>> 20260309_add_graduate_starter_cv_template.sql
-- ----------------------------------------------------------------
-- Add Graduate Starter CV Template for Fresh Graduates
-- This template prioritizes education, projects, and internships

-- First, check if the template already exists and delete it if it does
DELETE FROM cv_templates WHERE name = 'Graduate Starter CV';

-- Insert the Graduate Starter CV template
INSERT INTO cv_templates (
    name, 
    description, 
    category, 
    template_data, 
    is_premium,
    is_active
) VALUES (
    'Graduate Starter CV',
    'Education-focused CV template perfect for fresh graduates and students. Prioritizes academic projects, internships, and extracurricular activities over work experience.',
    'entry_level',
    '{
        "component": "GraduateTemplate",
        "sections": [
            "header",
            "career_objective",
            "education",
            "academic_projects",
            "internships",
            "key_skills",
            "extracurricular_activities",
            "referees"
        ],
        "colors": {
            "primary": "#111827",
            "secondary": "#374151",
            "accent": "#1d4ed8"
        },
        "fonts": {
            "primary": "system-ui, -apple-system, sans-serif"
        },
        "layout": {
            "type": "single-column",
            "width": "794px",
            "height": "1123px",
            "padding": "40px"
        },
        "features": [
            "Education-focused layout",
            "Academic projects section",
            "Internship/attachment experience",
            "Extracurricular activities",
            "Skills showcase",
            "Career objective statement",
            "ATS-friendly",
            "A4 print-ready"
        ],
        "best_for": [
            "Fresh graduates",
            "University students",
            "Internship applicants",
            "Entry-level job seekers",
            "Recent diploma holders"
        ]
    }'::jsonb,
    false,
    true
);

-- Add comment for documentation
COMMENT ON TABLE cv_templates IS 'Stores CV template definitions with metadata and configuration';


-- ----------------------------------------------------------------
-- >>> 20260309_add_internship_cv_template.sql
-- ----------------------------------------------------------------
-- Migration: Add Internship / Industrial Attachment CV Template
-- Template #6: Designed for Kenyan students applying for industrial attachment or internships
-- Focus: Education, technical skills, academic projects, and potential

-- First, check if the template already exists and delete it if it does
DELETE FROM cv_templates WHERE name = 'Internship / Industrial Attachment';

-- Insert the Internship / Industrial Attachment CV template
INSERT INTO cv_templates (
    name, 
    description, 
    category, 
    template_data, 
    is_premium,
    is_active
) VALUES (
    'Internship / Industrial Attachment',
    'Student-focused CV template perfect for industrial attachment and internship applications. Emphasizes education, technical skills, academic projects, and potential over work experience.',
    'student',
    '{
        "component": "InternshipTemplate",
        "sections": [
            "header",
            "career_objective",
            "education",
            "technical_skills",
            "academic_projects",
            "industrial_attachment",
            "extracurricular_activities",
            "referees"
        ],
        "colors": {
            "primary": "#111827",
            "secondary": "#374151",
            "accent": "#1f2937"
        },
        "fonts": {
            "primary": "system-ui, -apple-system, sans-serif"
        },
        "layout": {
            "type": "single-column",
            "width": "794px",
            "height": "1123px",
            "padding": "40px"
        },
        "features": [
            "Education-first layout",
            "Career objective section",
            "Technical skills showcase",
            "Academic projects/labs section",
            "Industrial attachment experience",
            "Extracurricular activities",
            "Referees section",
            "ATS-friendly",
            "A4 print-ready"
        ],
        "best_for": [
            "Students seeking industrial attachment",
            "Internship applicants",
            "Technical college students",
            "Diploma students",
            "TVET graduates",
            "Entry-level candidates with limited work experience"
        ]
    }'::jsonb,
    false,
    true
);

-- Add comment for documentation
COMMENT ON TABLE cv_templates IS 'Stores CV template definitions with metadata and configuration';


-- ----------------------------------------------------------------
-- >>> 20260309_add_modern_professional_cv_template.sql
-- ----------------------------------------------------------------
-- Add Modern Professional CV Template for Kenyan Candidates
-- Two-column layout with color accents

DELETE FROM cv_templates WHERE name = 'Modern Professional';

INSERT INTO cv_templates (
    name, 
    description, 
    category, 
    template_data, 
    is_premium,
    is_active
) VALUES (
    'Modern Professional',
    'Stylized two-column CV with subtle color accents and modern design. Perfect for mid-career professionals in corporate, marketing, and business roles.',
    'modern',
    '{
        "component": "ModernTemplate",
        "sections": [
            "header",
            "professional_profile",
            "professional_experience",
            "education",
            "certifications",
            "key_skills",
            "tools_platforms",
            "languages",
            "referees"
        ],
        "colors": {
            "primary": "#1e40af",
            "secondary": "#3b82f6",
            "accent": "#eff6ff",
            "text": "#111827"
        },
        "fonts": {
            "primary": "system-ui, -apple-system, sans-serif"
        },
        "layout": {
            "type": "two-column",
            "width": "794px",
            "height": "1123px",
            "sidebar_width": "35%",
            "main_width": "65%"
        },
        "features": [
            "Two-column layout",
            "Color accents",
            "Modern design",
            "ATS-friendly",
            "A4 print-ready",
            "Icon-enhanced contact"
        ],
        "best_for": [
            "Mid-career professionals",
            "Corporate roles",
            "Marketing positions",
            "Business jobs",
            "Communications roles"
        ]
    }'::jsonb,
    false,
    true
);


-- ----------------------------------------------------------------
-- >>> 20260309_add_personal_brand_cv_template.sql
-- ----------------------------------------------------------------
-- Migration: Add Personal Brand CV Template
-- Description: Template designed for professionals whose reputation and public presence matter
-- Typical users: Consultants, Marketing professionals, Speakers, Influencers, Coaches, Content creators

-- First, check if the template already exists and delete it if it does
DELETE FROM cv_templates WHERE name = 'Personal Brand CV';

-- Insert the new Personal Brand CV template
INSERT INTO cv_templates (
  name,
  description,
  category,
  template_data,
  is_premium,
  is_active
) VALUES (
  'Personal Brand CV',
  'Designed for professionals whose reputation, voice, and public presence matter as much as their work history. Perfect for consultants, marketing professionals, public speakers, influencers, coaches, and content creators. Highlights personal tagline, online presence, media features, speaking engagements, and publications.',
  'creative_digital',
  jsonb_build_object(
    'component', 'PersonalBrandTemplate',
    'sections', jsonb_build_array(
      'header',
      'contact',
      'social',
      'skills',
      'profile',
      'publications',
      'speaking',
      'experience',
      'education',
      'certifications'
    ),
    'features', jsonb_build_array(
      'Personal tagline and branding',
      'Online presence and social media links',
      'Publications and media features section',
      'Speaking engagements showcase',
      'Professional experience with descriptions',
      'Certifications display',
      'Two-column layout with sidebar',
      'Indigo accent color scheme'
    ),
    'sampleData', jsonb_build_object(
      'name', 'Grace Wanjiku Mwangi',
      'tagline', 'Marketing Strategist | Brand Storyteller | Public Speaker',
      'contact', jsonb_build_object(
        'location', 'Nairobi, Kenya',
        'phone', '+254 712 555 444',
        'email', 'grace.mwangi@email.com'
      ),
      'social', jsonb_build_array(
        'LinkedIn: linkedin.com/in/gracemwangi',
        'Twitter: @gracebrands',
        'Instagram: @gracemwangi',
        'Website: www.gracemwangi.co.ke',
        'Medium: @gracemwangi'
      ),
      'profile', 'Award-winning marketing strategist with over 8 years of experience helping brands build strong customer connections through storytelling, digital marketing, and brand positioning. Recognized thought leader in African brand development with a proven track record of driving growth for SMEs and established corporations.',
      'skills', jsonb_build_array(
        'Brand Strategy & Positioning',
        'Digital Marketing',
        'Public Speaking & Training',
        'Content Marketing',
        'Personal Branding',
        'Social Media Strategy',
        'Influencer Marketing',
        'Marketing Analytics',
        'Campaign Management',
        'Storytelling'
      ),
      'publications', jsonb_build_array(
        jsonb_build_object(
          'title', 'Building Authentic Brands in Africa: A Strategic Guide',
          'platform', 'Marketing Africa Magazine',
          'year', '2024'
        ),
        jsonb_build_object(
          'title', 'How SMEs Can Win With Digital Marketing on Limited Budgets',
          'platform', 'Business Daily Kenya',
          'year', '2023'
        ),
        jsonb_build_object(
          'title', 'The Power of Storytelling in Modern Marketing',
          'platform', 'The Standard Digital',
          'year', '2023'
        ),
        jsonb_build_object(
          'title', 'Personal Branding for African Professionals',
          'platform', 'Medium (Featured Article)',
          'year', '2022'
        ),
        jsonb_build_object(
          'title', 'Social Media Strategies That Actually Work',
          'platform', 'Nation Media Group',
          'year', '2022'
        )
      ),
      'speaking', jsonb_build_array(
        jsonb_build_object(
          'event', 'Nairobi Digital Marketing Summit - Keynote Speaker',
          'location', 'Nairobi, Kenya',
          'year', '2024'
        ),
        jsonb_build_object(
          'event', 'Kenya SME Growth Forum - Panel Discussion',
          'location', 'Nairobi, Kenya',
          'year', '2023'
        ),
        jsonb_build_object(
          'event', 'East Africa Marketing Conference',
          'location', 'Kampala, Uganda',
          'year', '2023'
        ),
        jsonb_build_object(
          'event', 'Women in Business Leadership Summit',
          'location', 'Nairobi, Kenya',
          'year', '2022'
        ),
        jsonb_build_object(
          'event', 'Digital Transformation Workshop Series',
          'location', 'Mombasa, Kenya',
          'year', '2022'
        )
      ),
      'experience', jsonb_build_array(
        jsonb_build_object(
          'role', 'Marketing Consultant & Brand Strategist',
          'company', 'BrandGrow Africa',
          'location', 'Nairobi, Kenya',
          'dates', '2021 – Present',
          'description', 'Lead brand strategy development for 20+ clients across East Africa. Delivered 150% average ROI improvement through integrated marketing campaigns.'
        ),
        jsonb_build_object(
          'role', 'Senior Marketing Manager',
          'company', 'BrightWave Agency',
          'location', 'Nairobi, Kenya',
          'dates', '2018 – 2021',
          'description', 'Managed marketing campaigns for major brands including Safaricom, KCB, and Equity Bank. Led team of 8 marketing professionals.'
        ),
        jsonb_build_object(
          'role', 'Marketing Specialist',
          'company', 'Creative Hub Kenya',
          'location', 'Nairobi, Kenya',
          'dates', '2016 – 2018',
          'description', 'Developed and executed digital marketing strategies for SME clients. Increased client social media engagement by average of 300%.'
        )
      ),
      'education', jsonb_build_array(
        jsonb_build_object(
          'degree', 'Bachelor of Commerce (Marketing) - First Class Honours',
          'institution', 'Kenyatta University',
          'dates', '2013 – 2017'
        )
      ),
      'certifications', jsonb_build_array(
        'Google Digital Marketing Certification',
        'HubSpot Content Marketing',
        'Facebook Blueprint Certified',
        'Professional Speaker Certification'
      )
    )
  ),
  false,
  true
);

-- Add comment for documentation
COMMENT ON TABLE cv_templates IS 'Stores CV template definitions with metadata and configuration';


-- ----------------------------------------------------------------
-- >>> 20260315_add_academic_research_cv_template.sql
-- ----------------------------------------------------------------
-- Migration: Add Academic / Research CV Template
-- Description: Template designed for academics, researchers, PhD applicants, and fellowship seekers
-- Typical users: University lecturers, researchers, PhD candidates, postdocs, grant applicants

DELETE FROM cv_templates WHERE name = 'Academic / Research CV';

INSERT INTO cv_templates (
  name,
  description,
  category,
  template_data,
  is_premium,
  is_active
) VALUES (
  'Academic / Research CV',
  'Designed for academics, researchers, and PhD applicants. Highlights research interests, publications, conference presentations, teaching positions, grants, and academic achievements. Single-column serif layout optimised for credibility and content density.',
  'academic',
  jsonb_build_object(
    'component', 'AcademicTemplate',
    'sections', jsonb_build_array(
      'header',
      'profile',
      'researchInterests',
      'positions',
      'publications',
      'conferences',
      'education',
      'grants',
      'awards'
    ),
    'features', jsonb_build_array(
      'Single-column serif layout',
      'Research interests section',
      'Academic positions with department',
      'Numbered publications list',
      'Conferences and presentations',
      'Grants and funding section',
      'Awards and honours',
      'ORCID and ResearchGate links',
      'Thesis title display'
    ),
    'sampleData', jsonb_build_object(
      'name', 'Dr. Daniel Mwangi Njoroge',
      'title', 'Senior Lecturer – Department of Environmental Science',
      'contact', jsonb_build_object(
        'institution', 'University of Nairobi',
        'location', 'Nairobi, Kenya',
        'email', 'daniel.njoroge@uonbi.ac.ke',
        'phone', '+254 722 100 200',
        'orcid', 'orcid.org/0000-0002-1234-5678'
      ),
      'profile', 'Environmental scientist with over 12 years of research and teaching experience focusing on climate change adaptation and sustainable land management in East Africa. Published author of 15+ peer-reviewed articles and recipient of three national research grants.',
      'researchInterests', jsonb_build_array(
        'Climate Change Adaptation in Sub-Saharan Africa',
        'Sustainable Agriculture and Food Security',
        'Environmental Policy and Governance',
        'Land Degradation and Ecological Restoration'
      ),
      'positions', jsonb_build_array(
        jsonb_build_object(
          'role', 'Senior Lecturer',
          'institution', 'University of Nairobi',
          'department', 'Department of Environmental Science',
          'location', 'Nairobi, Kenya',
          'dates', '2018 – Present'
        ),
        jsonb_build_object(
          'role', 'Lecturer',
          'institution', 'Egerton University',
          'department', 'Department of Natural Resources',
          'location', 'Nakuru, Kenya',
          'dates', '2014 – 2018'
        )
      ),
      'publications', jsonb_build_array(
        'Njoroge, D.M. (2023). Climate Adaptation Strategies for Smallholder Farmers in Kenya. Journal of Environmental Studies, 45(3), 112–128.',
        'Njoroge, D.M. & Kamau, P. (2021). Land Restoration Techniques in Semi-Arid Regions of East Africa. African Environmental Review, 18(2), 45–62.',
        'Njoroge, D.M. (2019). Sustainable Agriculture Practices in Kenya. International Journal of Climate Research, 12(4), 78–95.'
      ),
      'conferences', jsonb_build_array(
        'International Climate Change Conference – Nairobi, Kenya (2024) – Keynote Presenter',
        'African Environmental Research Forum – Kigali, Rwanda (2022) – Paper Presenter',
        'Sustainable Agriculture Summit – Addis Ababa, Ethiopia (2021) – Panel Discussant'
      ),
      'education', jsonb_build_array(
        jsonb_build_object(
          'degree', 'PhD Environmental Science',
          'institution', 'University of Nairobi',
          'thesis', 'Thesis: Climate Variability and Adaptive Strategies Among Pastoral Communities in Northern Kenya',
          'dates', '2010 – 2014'
        ),
        jsonb_build_object(
          'degree', 'MSc Environmental Management',
          'institution', 'Kenyatta University',
          'dates', '2007 – 2009'
        )
      ),
      'grants', jsonb_build_array(
        'Principal Investigator – NEMA Research Grant: "Ecosystem Restoration in Degraded Drylands" (KES 4.5M, 2022–2024)',
        'Co-Investigator – IDRC Climate Adaptation Fund (USD 120,000, 2020–2022)'
      ),
      'awards', jsonb_build_array(
        'Best Research Paper Award – African Environmental Research Forum (2022)',
        'University of Nairobi Excellence in Teaching Award (2021)',
        'Young Scientist Award – Kenya National Academy of Sciences (2018)'
      )
    )
  ),
  false,
  true
);


-- ----------------------------------------------------------------
-- >>> 20260315_add_ats_optimized_cv_template.sql
-- ----------------------------------------------------------------
-- Migration: Add International / ATS Optimized CV Template
-- Description: Single-column, no-graphics template designed to pass ATS systems
-- Typical users: Professionals applying to remote jobs, international NGOs,
--                multinational companies, global tech companies using Workday,
--                Greenhouse, Lever, Taleo, BambooHR

DELETE FROM cv_templates WHERE name = 'International / ATS Optimized CV';

INSERT INTO cv_templates (
  name,
  description,
  category,
  template_data,
  is_premium,
  is_active
) VALUES (
  'International / ATS Optimized CV',
  'Single-column, plain-text-friendly CV designed to pass Applicant Tracking Systems (ATS) used by Workday, Greenhouse, Lever, Taleo, and BambooHR. No graphics, no icons, no text boxes — just clean, scannable content with standard section headings. Ideal for remote jobs, international NGOs, multinational companies, and global tech companies.',
  'international',
  jsonb_build_object(
    'component', 'ATSOptimizedTemplate',
    'sections', jsonb_build_array(
      'header',
      'summary',
      'skills',
      'experience',
      'education',
      'certifications',
      'additional'
    ),
    'features', jsonb_build_array(
      'Single-column ATS-friendly layout',
      'No graphics or icons',
      'Standard section headings',
      'Keyword-optimized skills section',
      'Clean plain-text structure',
      'Professional Summary section',
      'Core Skills with keyword density',
      'Additional Information for languages and volunteering'
    ),
    'sampleData', jsonb_build_object(
      'name', 'David Ochieng Onyango',
      'title', 'Data Analyst',
      'contact', jsonb_build_object(
        'location', 'Nairobi, Kenya',
        'phone', '+254 712 000 111',
        'email', 'david.onyango@email.com',
        'linkedin', 'linkedin.com/in/davidonyango'
      ),
      'summary', 'Data analyst with 5+ years of experience transforming complex datasets into actionable insights. Experienced in SQL, Python, and business intelligence tools to support data-driven decision making.',
      'skills', jsonb_build_array(
        'Data Analysis',
        'SQL',
        'Python',
        'Power BI',
        'Excel',
        'Data Visualization',
        'Statistical Analysis',
        'Business Intelligence'
      ),
      'experience', jsonb_build_array(
        jsonb_build_object(
          'role', 'Data Analyst',
          'company', 'Insight Analytics Ltd',
          'location', 'Nairobi',
          'dates', '2021 – Present',
          'responsibilities', jsonb_build_array(
            'Analyzed large datasets to support business decision-making across 5 departments.',
            'Developed dashboards using Power BI to track KPIs and operational metrics.',
            'Automated reporting processes using Python scripts, saving 8 hours per week.'
          )
        ),
        jsonb_build_object(
          'role', 'Junior Data Analyst',
          'company', 'TechData Solutions',
          'location', 'Nairobi',
          'dates', '2019 – 2021',
          'responsibilities', jsonb_build_array(
            'Prepared reports and visualizations for senior management review.',
            'Maintained company data warehouse and ensured data integrity.',
            'Supported analytics projects across finance, sales, and operations departments.'
          )
        )
      ),
      'education', jsonb_build_array(
        jsonb_build_object(
          'degree', 'BSc Statistics',
          'institution', 'University of Nairobi',
          'dates', '2015 – 2019'
        )
      ),
      'certifications', jsonb_build_array(
        'Google Data Analytics Professional Certificate',
        'Microsoft Power BI Certification'
      ),
      'additional', jsonb_build_array(
        'Languages: English (Fluent), Swahili (Fluent)',
        'Volunteer Data Analyst – DataKind Kenya (2022 – Present)'
      )
    )
  ),
  false,
  true
);


-- ----------------------------------------------------------------
-- >>> 20260315_add_technical_engineering_cv_template.sql
-- ----------------------------------------------------------------
-- Migration: Add Technical / Engineering CV Template
-- Description: Template designed for engineers, technicians, and manufacturing professionals
-- Typical users: Mechanical engineers, electrical engineers, civil engineers, plant operators,
--                production supervisors, process engineers, manufacturing professionals

DELETE FROM cv_templates WHERE name = 'Technical / Engineering CV';

INSERT INTO cv_templates (
  name,
  description,
  category,
  template_data,
  is_premium,
  is_active
) VALUES (
  'Technical / Engineering CV',
  'Designed for engineers, technicians, and manufacturing professionals. Two-column layout with a sidebar for technical skills, tools, and certifications. Main section highlights engineering projects, measurable outcomes, and structured work experience. Ideal for mechanical, electrical, civil, and process engineers.',
  'technical',
  jsonb_build_object(
    'component', 'TechnicalEngineeringTemplate',
    'sections', jsonb_build_array(
      'header',
      'summary',
      'skills',
      'tools',
      'certifications',
      'projects',
      'experience',
      'education'
    ),
    'features', jsonb_build_array(
      'Two-column layout with sidebar',
      'Technical skills sidebar',
      'Tools & systems section',
      'Key engineering projects with outcomes',
      'Measurable achievements',
      'Certifications display',
      'Structured work experience with responsibilities',
      'Clean professional typography'
    ),
    'sampleData', jsonb_build_object(
      'name', 'Samuel Kiprotich Cheruiyot',
      'title', 'Mechanical Engineer | Manufacturing Operations',
      'contact', jsonb_build_object(
        'location', 'Nairobi, Kenya',
        'phone', '+254 712 333 777',
        'email', 'samuel.cheruiyot@email.com',
        'linkedin', 'linkedin.com/in/samuel-cheruiyot'
      ),
      'summary', 'Mechanical engineer with 6 years of experience in manufacturing operations, equipment maintenance, and process optimization within large-scale production facilities.',
      'skills', jsonb_build_array(
        'Mechanical Systems Maintenance',
        'Preventive Maintenance Planning',
        'Production Line Optimization',
        'Root Cause Analysis',
        'Industrial Safety Compliance',
        'Process Improvement (Lean/Kaizen)'
      ),
      'tools', jsonb_build_array(
        'AutoCAD',
        'SolidWorks',
        'SAP PM',
        'PLC Systems',
        'Microsoft Excel'
      ),
      'certifications', jsonb_build_array(
        'Certified Maintenance Professional (CMP)',
        'Occupational Safety & Health Certificate'
      ),
      'projects', jsonb_build_array(
        jsonb_build_object(
          'title', 'Production Line Efficiency Improvement',
          'company', 'East Africa Packaging Ltd',
          'year', '2023',
          'description', 'Led a process improvement initiative that increased production efficiency by 18% through equipment optimization and preventive maintenance scheduling.'
        ),
        jsonb_build_object(
          'title', 'Machine Maintenance Program Overhaul',
          'company', 'Nairobi Steel Manufacturing',
          'year', '2022',
          'description', 'Designed and implemented a preventive maintenance program that reduced equipment downtime by 25%.'
        )
      ),
      'experience', jsonb_build_array(
        jsonb_build_object(
          'role', 'Mechanical Engineer',
          'company', 'East Africa Packaging Ltd',
          'location', 'Nairobi',
          'dates', '2022 – Present',
          'responsibilities', jsonb_build_array(
            'Oversee maintenance of 40+ production machines across 3 manufacturing lines',
            'Develop and execute preventive maintenance schedules using SAP PM',
            'Lead root cause analysis for recurring equipment failures'
          )
        ),
        jsonb_build_object(
          'role', 'Maintenance Engineer',
          'company', 'Nairobi Steel Manufacturing',
          'location', 'Nairobi',
          'dates', '2019 – 2022',
          'responsibilities', jsonb_build_array(
            'Managed mechanical maintenance for steel rolling and cutting equipment',
            'Supervised a team of 6 technicians on daily maintenance activities'
          )
        )
      ),
      'education', jsonb_build_array(
        jsonb_build_object(
          'degree', 'BSc Mechanical Engineering',
          'institution', 'Jomo Kenyatta University of Agriculture & Technology',
          'dates', '2014 – 2018'
        )
      )
    )
  ),
  false,
  true
);


-- ----------------------------------------------------------------
-- >>> 20260324_add_cover_letter_templates.sql
-- ----------------------------------------------------------------
-- Cover Letter Templates: 8 templates across 3 categories
-- Mirrors the CV template structure for consistency

-- Clear existing seeded templates to avoid duplicates
DELETE FROM cover_letter_templates WHERE name IN (
  'Classic Professional Cover Letter',
  'Modern Professional Cover Letter',
  'Short & Direct Cover Letter',
  'Graduate / Entry-Level Cover Letter',
  'Internship / Attachment Cover Letter',
  'Career Change Cover Letter',
  'Personal Brand Cover Letter',
  'International / ATS-Friendly Cover Letter'
);

-- ============================================================================
-- CATEGORY 1: PROFESSIONAL COVER LETTERS
-- ============================================================================

INSERT INTO cover_letter_templates (name, description, category, template_text, placeholders, is_premium, is_active) VALUES
(
  'Classic Professional Cover Letter',
  'A formal, structured cover letter with traditional formatting. The safest option — works for government, NGOs, banking, corporate, and administrative roles.',
  'professional',
  '[Your Name]
[Your Address]
[City, Country]
[Phone] | [Email]
[Date]

The Hiring Manager
{{company_name}}
{{company_address}}

Dear {{hiring_manager}},

RE: APPLICATION FOR THE POSITION OF {{job_title}}

I write to express my interest in the above-mentioned position as advertised. With {{years_experience}} years of experience in {{industry}}, I am confident that my qualifications and professional background make me a strong candidate for this role.

In my current/previous role as {{current_role}} at {{current_company}}, I have {{key_achievement}}. I have developed strong competencies in {{key_skills}}, which I believe align well with the requirements of this position.

{{custom_paragraph}}

I am particularly drawn to {{company_name}} because of {{company_reason}}. I am eager to bring my expertise and dedication to your esteemed organisation and contribute meaningfully to your team.

I have attached my curriculum vitae for your consideration. I would welcome the opportunity to discuss my application further at your convenience.

Yours faithfully,

{{candidate_name}}',
  '{"placeholders": ["company_name", "company_address", "hiring_manager", "job_title", "years_experience", "industry", "current_role", "current_company", "key_achievement", "key_skills", "custom_paragraph", "company_reason", "candidate_name"]}',
  false,
  true
),

(
  'Modern Professional Cover Letter',
  'A cleaner layout with better spacing and a contemporary tone. Ideal for private sector, marketing, business, and mid-level professional roles.',
  'professional',
  '{{candidate_name}}
{{candidate_location}} | {{candidate_phone}} | {{candidate_email}}

{{date}}

{{hiring_manager}}
{{job_title}} Hiring Team
{{company_name}}

Dear {{hiring_manager}},

I am excited to apply for the {{job_title}} role at {{company_name}}. With a background in {{industry}} and {{years_experience}} years of hands-on experience, I bring a results-driven approach and a track record of {{key_achievement}}.

At {{current_company}}, I have honed my skills in {{key_skills}}. I thrive in environments that value {{work_value}}, and I am confident I can deliver similar results at {{company_name}}.

{{custom_paragraph}}

What draws me to {{company_name}} is {{company_reason}}. I am eager to contribute to your team and grow alongside your organisation.

I would love the opportunity to discuss how my experience aligns with your needs. Thank you for your time and consideration.

Best regards,
{{candidate_name}}',
  '{"placeholders": ["candidate_name", "candidate_location", "candidate_phone", "candidate_email", "date", "hiring_manager", "job_title", "company_name", "industry", "years_experience", "key_achievement", "current_company", "key_skills", "work_value", "custom_paragraph", "company_reason"]}',
  false,
  true
),

(
  'Short & Direct Cover Letter',
  'A concise, high-impact letter of 3 short paragraphs. Perfect for startups, tech companies, online applications, and busy recruiters who value brevity.',
  'professional',
  'Hi {{hiring_manager}},

I am applying for the {{job_title}} position at {{company_name}}. I have {{years_experience}} years of experience in {{industry}} and a proven ability to {{key_achievement}}.

My core strengths — {{key_skills}} — match what you are looking for. At {{current_company}}, I {{specific_contribution}}.

I would love to bring this energy to {{company_name}}. Happy to chat at your convenience.

{{candidate_name}}
{{candidate_phone}} | {{candidate_email}}',
  '{"placeholders": ["hiring_manager", "job_title", "company_name", "years_experience", "industry", "key_achievement", "key_skills", "current_company", "specific_contribution", "candidate_name", "candidate_phone", "candidate_email"]}',
  false,
  true
),

-- ============================================================================
-- CATEGORY 2: ENTRY-LEVEL COVER LETTERS
-- ============================================================================

(
  'Graduate / Entry-Level Cover Letter',
  'Focuses on education, projects, and potential rather than experience. Solves the "I don''t have experience" problem for fresh graduates and first-time job seekers.',
  'entry-level',
  '{{candidate_name}}
{{candidate_location}} | {{candidate_phone}} | {{candidate_email}}

{{date}}

The Hiring Manager
{{company_name}}

Dear {{hiring_manager}},

RE: APPLICATION FOR {{job_title}}

I am a recent graduate of {{institution}} with a {{degree}} in {{field_of_study}}, and I am eager to begin my professional career with {{company_name}}.

Although I am at the start of my career, I have built a strong foundation through my academic work and practical experiences. During my studies, I {{academic_achievement}}. I also {{project_or_internship}}, which gave me hands-on exposure to {{relevant_skills}}.

I am a fast learner, highly motivated, and committed to delivering quality work. I am particularly drawn to {{company_name}} because {{company_reason}}, and I believe this role will allow me to grow while contributing meaningfully to your team.

I would be grateful for the opportunity to discuss my application. Please find my CV attached.

Yours sincerely,
{{candidate_name}}',
  '{"placeholders": ["candidate_name", "candidate_location", "candidate_phone", "candidate_email", "date", "hiring_manager", "job_title", "company_name", "institution", "degree", "field_of_study", "academic_achievement", "project_or_internship", "relevant_skills", "company_reason"]}',
  false,
  true
),

(
  'Internship / Attachment Cover Letter',
  'Tailored for students applying for industrial attachment or internships. Highly relevant for university and TVET students in Kenya.',
  'entry-level',
  '{{candidate_name}}
{{candidate_location}} | {{candidate_phone}} | {{candidate_email}}
{{institution}} — {{course}} (Year {{year_of_study}})

{{date}}

The Supervisor / HR Manager
{{company_name}}
{{company_address}}

Dear {{hiring_manager}},

RE: APPLICATION FOR INDUSTRIAL ATTACHMENT / INTERNSHIP — {{department}}

I am a {{year_of_study}}-year student pursuing a {{course}} at {{institution}}. I am writing to apply for an industrial attachment opportunity at {{company_name}} as part of my academic programme requirements.

I am keen to gain practical experience in {{department}} and believe that {{company_name}} offers an ideal environment for this. Through my coursework, I have developed foundational knowledge in {{relevant_skills}}. I am also {{personal_quality}}, which I believe will allow me to contribute positively during my attachment period.

I am available for attachment from {{start_date}} to {{end_date}} and am flexible to work within your team''s schedule.

I would be grateful for the chance to learn from your team. I have attached my CV and a letter of introduction from my institution.

Yours faithfully,
{{candidate_name}}',
  '{"placeholders": ["candidate_name", "candidate_location", "candidate_phone", "candidate_email", "institution", "course", "year_of_study", "date", "hiring_manager", "company_name", "company_address", "department", "relevant_skills", "personal_quality", "start_date", "end_date"]}',
  false,
  true
),

-- ============================================================================
-- CATEGORY 3: SPECIALIZED COVER LETTERS
-- ============================================================================

(
  'Career Change Cover Letter',
  'Helps candidates explain transitions between industries or roles. Ideal for career switchers, self-taught professionals, and people re-entering the workforce.',
  'specialized',
  '{{candidate_name}}
{{candidate_location}} | {{candidate_phone}} | {{candidate_email}}

{{date}}

{{hiring_manager}}
{{company_name}}

Dear {{hiring_manager}},

I am writing to apply for the {{job_title}} position at {{company_name}}. While my background is in {{previous_industry}}, I have been intentionally building skills and experience in {{target_industry}} and am ready to make this transition fully.

Over the past {{transition_period}}, I have {{transition_actions}} — including {{specific_training_or_project}}. These experiences have equipped me with {{transferable_skills}}, which I believe are directly applicable to this role.

My time in {{previous_industry}} also gave me a unique perspective: {{unique_value}}. I see this as a strength that sets me apart from candidates with a more traditional background in {{target_industry}}.

I am genuinely passionate about {{target_industry}} and committed to growing in this field. I would welcome the opportunity to discuss how my background and drive can add value to {{company_name}}.

Thank you for your consideration.

Sincerely,
{{candidate_name}}',
  '{"placeholders": ["candidate_name", "candidate_location", "candidate_phone", "candidate_email", "date", "hiring_manager", "job_title", "company_name", "previous_industry", "target_industry", "transition_period", "transition_actions", "specific_training_or_project", "transferable_skills", "unique_value"]}',
  false,
  true
),

(
  'Personal Brand Cover Letter',
  'Highlights personality, online presence, and unique voice. Pairs perfectly with the Personal Brand CV for creatives, consultants, marketers, and public speakers.',
  'specialized',
  'Hi {{hiring_manager}},

I am {{candidate_name}} — {{personal_tagline}}.

I am reaching out about the {{job_title}} opportunity at {{company_name}}. I have been following your work in {{company_focus}} and I believe there is a strong alignment between what you are building and what I do best.

My work speaks for itself: {{portfolio_or_achievement}}. Whether it is {{skill_1}} or {{skill_2}}, I bring a distinctive approach that blends {{quality_1}} with {{quality_2}}.

You can see more of my work at {{portfolio_link}}. I would love to explore how I can contribute to {{company_name}}''s next chapter.

Let''s connect.

{{candidate_name}}
{{candidate_phone}} | {{candidate_email}} | {{portfolio_link}}',
  '{"placeholders": ["hiring_manager", "candidate_name", "personal_tagline", "job_title", "company_name", "company_focus", "portfolio_or_achievement", "skill_1", "skill_2", "quality_1", "quality_2", "portfolio_link", "candidate_phone", "candidate_email"]}',
  false,
  true
),

(
  'International / ATS-Friendly Cover Letter',
  'Simple, clean, keyword-focused format optimised for global applications, remote jobs, multinational companies, and ATS-based hiring systems.',
  'specialized',
  '{{candidate_name}}
{{candidate_location}} | {{candidate_phone}} | {{candidate_email}}

{{date}}

Hiring Team
{{job_title}} — {{company_name}}

Dear Hiring Team,

I am applying for the {{job_title}} position (Ref: {{job_ref}}) at {{company_name}}. I have {{years_experience}} years of experience in {{industry}}, with demonstrated expertise in {{keyword_skills}}.

In my most recent role as {{current_role}} at {{current_company}}, I {{quantified_achievement}}. I am proficient in {{tools_and_technologies}} and have a strong track record of {{core_competency}}.

I am particularly interested in {{company_name}} because of {{company_reason}}. I am available to work {{availability}} and am open to {{remote_or_relocation}}.

I look forward to the opportunity to contribute to your team.

Sincerely,
{{candidate_name}}',
  '{"placeholders": ["candidate_name", "candidate_location", "candidate_phone", "candidate_email", "date", "job_title", "company_name", "job_ref", "years_experience", "industry", "keyword_skills", "current_role", "current_company", "quantified_achievement", "tools_and_technologies", "core_competency", "company_reason", "availability", "remote_or_relocation"]}',
  false,
  true
);


-- ----------------------------------------------------------------
-- >>> 20260328_add_skills_entry_cover_letter_template.sql
-- ----------------------------------------------------------------
-- Add Skills-Focused Entry-Level Cover Letter Template
-- This template is for candidates with little or no formal experience but real, demonstrable skills.
-- Target audience: Self-taught professionals, freelancers, career starters, digital creatives

-- Remove if exists to avoid duplicates
DELETE FROM cover_letter_templates WHERE name = 'Skills-Focused Entry-Level Cover Letter';

-- Insert the new template
INSERT INTO cover_letter_templates (name, description, category, template_text, placeholders, is_premium, is_active) VALUES
(
  'Skills-Focused Entry-Level Cover Letter',
  'For candidates with little or no formal experience who have real, demonstrable skills. Ideal for self-taught professionals, freelancers, career starters, and digital creatives who can do the work.',
  'entry-level',
  '{{candidate_name}}
{{candidate_location}} | {{candidate_phone}} | {{candidate_email}}

{{date}}

{{hiring_manager}}
{{company_name}}
{{company_address}}

Dear {{hiring_manager}},

RE: APPLICATION FOR {{job_title}}

I am writing to apply for the {{job_title}} position at {{company_name}}. Although I am at the early stage of my career, I have developed strong practical skills in {{field}} through self-learning and hands-on projects.

I have experience {{skill_application_1}} and {{skill_application_2}}. Through {{experience_source}}, I have built skills in {{key_competencies}}.

I am eager to grow in a professional environment where I can apply my skills, learn from experienced professionals, and contribute positively to your team.

KEY SKILLS:
{{key_skills}}

I would be grateful for the opportunity to discuss how my skills can benefit {{company_name}}. Please find my CV attached.

Sincerely,
{{candidate_name}}',
  '{"placeholders": ["candidate_name", "candidate_location", "candidate_phone", "candidate_email", "date", "hiring_manager", "company_name", "company_address", "job_title", "field", "skill_application_1", "skill_application_2", "experience_source", "key_competencies", "key_skills"]}',
  false,
  true
);


-- ----------------------------------------------------------------
-- >>> 20260528_create_job_scraper_tables.sql
-- ----------------------------------------------------------------
-- ============================================================
-- Job Scraper Tables
-- ============================================================

-- 1. scraper_sources: config for each URL to scrape
CREATE TABLE IF NOT EXISTS scraper_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE NOT NULL,         -- e.g. "safaricom-careers"
  name text NOT NULL,                     -- human-readable label
  base_url text NOT NULL,                 -- listing page URL
  is_active boolean DEFAULT true,
  selectors jsonb NOT NULL,               -- CSS selectors for this site
  last_discovered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2. scrape_queue: jobs discovered but not yet fully processed
CREATE TABLE IF NOT EXISTS scrape_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL REFERENCES scraper_sources(source_id) ON DELETE CASCADE,
  job_url text NOT NULL UNIQUE,           -- full URL to the job detail page
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  partial_data jsonb,                     -- title/location captured from listing page
  error_message text,
  attempts int DEFAULT 0,
  queued_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS scrape_queue_status_idx ON scrape_queue(status);
CREATE INDEX IF NOT EXISTS scrape_queue_queued_at_idx ON scrape_queue(queued_at);

-- 3. scraped_job_sources: deduplication log of all published jobs
CREATE TABLE IF NOT EXISTS scraped_job_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL,
  job_url text NOT NULL UNIQUE,           -- original URL on source site
  content_hash text NOT NULL UNIQUE,     -- hash of title+company+location
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  status text DEFAULT 'published'
    CHECK (status IN ('published', 'duplicate', 'failed', 'skipped')),
  scraped_at timestamptz DEFAULT now(),
  raw_data jsonb                          -- full raw scraped payload for debugging
);

CREATE INDEX IF NOT EXISTS scraped_job_sources_source_id_idx ON scraped_job_sources(source_id);

-- ============================================================
-- RLS Policies (service role bypasses these, but good practice)
-- ============================================================

ALTER TABLE scraper_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_job_sources ENABLE ROW LEVEL SECURITY;

-- Only service role / admin can read/write these tables
-- No public access needed
CREATE POLICY "Service role only" ON scraper_sources
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON scrape_queue
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON scraped_job_sources
  FOR ALL USING (auth.role() = 'service_role');


-- ----------------------------------------------------------------
-- >>> 20260611_seed_workable_scraper_source.sql
-- ----------------------------------------------------------------
-- Seed Inkomoko as a Workable ATS scraper source (Kenya jobs only)
INSERT INTO public.scraper_sources (source_id, name, base_url, is_active, selectors)
VALUES (
  'inkomoko-careers',
  'Inkomoko',
  'https://apply.workable.com/inkomoko/',
  true,
  '{"type": "workable", "slug": "inkomoko", "filterCountry": "Kenya"}'::jsonb
)
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  selectors = EXCLUDED.selectors;


-- ----------------------------------------------------------------
-- >>> 20260614_add_candidate_profile_fields.sql
-- ----------------------------------------------------------------
-- Migration: Add additional candidate profile fields
-- Description: Enriches candidate_profiles with demographics, preferences, and admin visibility fields

-- ============================================================================
-- ADD NEW FIELDS TO candidate_profiles
-- ============================================================================

ALTER TABLE candidate_profiles
    -- Demographics
    ADD COLUMN IF NOT EXISTS date_of_birth DATE,
    ADD COLUMN IF NOT EXISTS nationality VARCHAR(100),
    ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IS NULL OR gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say')),
    ADD COLUMN IF NOT EXISTS marital_status VARCHAR(30) CHECK (marital_status IS NULL OR marital_status IN ('single', 'married', 'divorced', 'widowed', 'prefer_not_to_say')),

    -- Languages spoken (array of language names or objects)
    ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]'::jsonb,

    -- Quick-filter fields (avoid joins for common filters)
    ADD COLUMN IF NOT EXISTS highest_education_level VARCHAR(100),
    -- e.g. 'PhD', 'Master''s', 'Bachelor''s', 'Diploma', 'High School', 'None'
    ADD COLUMN IF NOT EXISTS industry VARCHAR(150),
    -- Primary industry/domain of expertise

    -- Job preferences (structured JSON)
    ADD COLUMN IF NOT EXISTS job_preferences JSONB DEFAULT '{}'::jsonb,
    -- e.g. { "desired_job_types": ["full_time","contract"], "remote_ok": true, "onsite_ok": true,
    --        "hybrid_ok": true, "willing_to_relocate": false, "preferred_locations": ["Nairobi","Lagos"] }

    -- Notice period & work authorization
    ADD COLUMN IF NOT EXISTS notice_period VARCHAR(50),
    -- e.g. 'immediate', '2_weeks', '1_month', '3_months'
    ADD COLUMN IF NOT EXISTS work_authorization VARCHAR(100),
    -- e.g. 'citizen', 'permanent_resident', 'work_permit_required', 'visa_sponsored'
    ADD COLUMN IF NOT EXISTS disability_status VARCHAR(30) DEFAULT 'prefer_not_to_say'
        CHECK (disability_status IS NULL OR disability_status IN ('yes', 'no', 'prefer_not_to_say')),

    -- Profile completeness score (0-100), updated by application logic or trigger
    ADD COLUMN IF NOT EXISTS profile_completeness_score INTEGER DEFAULT 0
        CHECK (profile_completeness_score >= 0 AND profile_completeness_score <= 100);

-- ============================================================================
-- CREATE INDEXES for new filterable columns
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_gender ON candidate_profiles(gender);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_nationality ON candidate_profiles(nationality);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_industry ON candidate_profiles(industry);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_highest_edu ON candidate_profiles(highest_education_level);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_notice_period ON candidate_profiles(notice_period);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_completeness ON candidate_profiles(profile_completeness_score DESC);

-- ============================================================================
-- FOREIGN KEY: enable Supabase PostgREST embedding of candidate_profiles
-- inside user_profiles queries (admin dashboard joins)
-- ============================================================================

-- Backfill: ensure every candidate_profiles.user_id has a matching user_profiles row
-- before we add the FK constraint.
INSERT INTO user_profiles (id, full_name, role)
SELECT
    cp.user_id,
    cp.full_name,
    'candidate'
FROM candidate_profiles cp
WHERE NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.id = cp.user_id
)
ON CONFLICT (id) DO NOTHING;

-- Add a direct FK from candidate_profiles.user_id → user_profiles.id
-- (both reference auth.users(id), so this is safe; user_profiles.id IS auth.users.id)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'candidate_profiles_user_profiles_fkey'
          AND table_name = 'candidate_profiles'
    ) THEN
        ALTER TABLE candidate_profiles
            ADD CONSTRAINT candidate_profiles_user_profiles_fkey
            FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- ADMIN RLS POLICY — allow admins to view ALL candidate profiles
-- (Previously admins could only see public profiles; now they see everything)
-- ============================================================================

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'candidate_profiles'
          AND policyname = 'Admins can view all candidate profiles'
    ) THEN
        CREATE POLICY "Admins can view all candidate profiles"
            ON candidate_profiles FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM user_profiles
                    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'candidate_work_experience'
          AND policyname = 'Admins can view all work experience'
    ) THEN
        CREATE POLICY "Admins can view all work experience"
            ON candidate_work_experience FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM user_profiles
                    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'candidate_education'
          AND policyname = 'Admins can view all education'
    ) THEN
        CREATE POLICY "Admins can view all education"
            ON candidate_education FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM user_profiles
                    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'candidate_skills'
          AND policyname = 'Admins can view all skills'
    ) THEN
        CREATE POLICY "Admins can view all skills"
            ON candidate_skills FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM user_profiles
                    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'candidate_documents'
          AND policyname = 'Admins can view all documents'
    ) THEN
        CREATE POLICY "Admins can view all documents"
            ON candidate_documents FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM user_profiles
                    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
                )
            );
    END IF;
END $$;

-- ============================================================================
-- TRIGGER: auto-update profile_completeness_score on INSERT/UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_candidate_completeness()
RETURNS TRIGGER AS $$
DECLARE
    score INTEGER := 0;
    has_work_exp BOOLEAN;
    has_education BOOLEAN;
    has_skills BOOLEAN;
    has_cv BOOLEAN;
BEGIN
    -- Basic info (30 pts max)
    IF NEW.full_name IS NOT NULL AND length(trim(NEW.full_name)) > 0 THEN score := score + 5; END IF;
    IF NEW.phone IS NOT NULL AND length(trim(NEW.phone)) > 0 THEN score := score + 5; END IF;
    IF NEW.location IS NOT NULL AND length(trim(NEW.location)) > 0 THEN score := score + 5; END IF;
    IF NEW.bio IS NOT NULL AND length(trim(NEW.bio)) > 50 THEN score := score + 10; END IF;
    IF NEW.linkedin_url IS NOT NULL OR NEW.portfolio_url IS NOT NULL OR NEW.github_url IS NOT NULL THEN score := score + 5; END IF;

    -- Professional (20 pts max)
    IF NEW.current_title IS NOT NULL AND length(trim(NEW.current_title)) > 0 THEN score := score + 10; END IF;
    IF NEW.years_experience IS NOT NULL THEN score := score + 5; END IF;
    IF NEW.expected_salary_min IS NOT NULL THEN score := score + 5; END IF;

    -- New demographic/preference fields (20 pts max)
    IF NEW.date_of_birth IS NOT NULL THEN score := score + 3; END IF;
    IF NEW.nationality IS NOT NULL AND length(trim(NEW.nationality)) > 0 THEN score := score + 3; END IF;
    IF NEW.languages IS NOT NULL AND jsonb_array_length(COALESCE(NEW.languages, '[]'::jsonb)) > 0 THEN score := score + 4; END IF;
    IF NEW.highest_education_level IS NOT NULL THEN score := score + 4; END IF;
    IF NEW.industry IS NOT NULL THEN score := score + 3; END IF;
    IF NEW.notice_period IS NOT NULL THEN score := score + 3; END IF;

    -- Work experience, education, skills, CV (30 pts max — checked via sub-queries)
    SELECT EXISTS (SELECT 1 FROM candidate_work_experience WHERE candidate_id = NEW.id) INTO has_work_exp;
    SELECT EXISTS (SELECT 1 FROM candidate_education WHERE candidate_id = NEW.id) INTO has_education;
    SELECT EXISTS (SELECT 1 FROM candidate_skills WHERE candidate_id = NEW.id) INTO has_skills;
    SELECT EXISTS (SELECT 1 FROM candidate_documents WHERE candidate_id = NEW.id AND is_active = true AND document_type IN ('cv','resume')) INTO has_cv;

    IF has_work_exp THEN score := score + 8; END IF;
    IF has_education THEN score := score + 7; END IF;
    IF has_skills THEN score := score + 8; END IF;
    IF has_cv THEN score := score + 7; END IF;

    NEW.profile_completeness_score := LEAST(score, 100);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_candidate_completeness ON candidate_profiles;
CREATE TRIGGER trg_calculate_candidate_completeness
    BEFORE INSERT OR UPDATE ON candidate_profiles
    FOR EACH ROW
    EXECUTE FUNCTION calculate_candidate_completeness();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN candidate_profiles.date_of_birth IS 'Candidate date of birth';
COMMENT ON COLUMN candidate_profiles.nationality IS 'Candidate nationality / citizenship';
COMMENT ON COLUMN candidate_profiles.gender IS 'Gender identity';
COMMENT ON COLUMN candidate_profiles.marital_status IS 'Marital status';
COMMENT ON COLUMN candidate_profiles.languages IS 'Languages spoken (JSON array)';
COMMENT ON COLUMN candidate_profiles.highest_education_level IS 'Highest qualification level';
COMMENT ON COLUMN candidate_profiles.industry IS 'Primary industry / domain';
COMMENT ON COLUMN candidate_profiles.job_preferences IS 'Structured job preferences (JSONB)';
COMMENT ON COLUMN candidate_profiles.notice_period IS 'Notice period before available to start';
COMMENT ON COLUMN candidate_profiles.work_authorization IS 'Work authorization / visa status';
COMMENT ON COLUMN candidate_profiles.disability_status IS 'Disability disclosure for inclusive hiring';
COMMENT ON COLUMN candidate_profiles.profile_completeness_score IS 'Auto-calculated profile completeness (0-100)';


-- ----------------------------------------------------------------
-- >>> 20260616_enhance_blog_system.sql
-- ----------------------------------------------------------------
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


-- ----------------------------------------------------------------
-- >>> 20260616_update_cms_sell_like_crazy_copy.sql
-- ----------------------------------------------------------------
-- Update CMS content to match the new "Sell Like Crazy" copy
-- This prevents flickering where old CMS content overrides new fallback text

-- ============================================================
-- HOMEPAGE (page_slug = 'home')
-- ============================================================
UPDATE page_content SET content_value = 'Stop Searching. Start Getting Hired.'
WHERE page_slug = 'home' AND section_key = 'hero_title';

UPDATE page_content SET content_value = 'You''ve sent dozens of applications with zero callbacks. StemBird changes that. We match your skills directly to employers who are hiring right now, so you skip the black hole and land your next interview faster.'
WHERE page_slug = 'home' AND section_key = 'hero_subtitle';

UPDATE page_content SET content_value = 'Featured Opportunities'
WHERE page_slug = 'home' AND section_key = 'featured_section_title';

UPDATE page_content SET content_value = 'Hand-picked roles from top Kenyan employers, with new jobs added daily'
WHERE page_slug = 'home' AND section_key = 'featured_section_subtitle';

UPDATE page_content SET content_value = 'Why 95% of Our Users Land Interviews Within 3 Months'
WHERE page_slug = 'home' AND section_key = 'why_choose_title';

UPDATE page_content SET content_value = 'Your Next Interview Is 60 Seconds Away'
WHERE page_slug = 'home' AND section_key = 'cta_title';

UPDATE page_content SET content_value = 'StemBird matches your skills directly to employer requirements, not just keywords. That''s why our users get 3x more interview callbacks than on other job boards. Join free today.'
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

UPDATE page_content SET content_value = 'Why StemBird CVs Get 3x More Interview Callbacks'
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


-- ----------------------------------------------------------------
-- >>> 20260618_add_multi_industry_function.sql
-- ----------------------------------------------------------------
-- Migration: Add multi-value industry and job function support
-- Adds: industry_ids UUID[], industries TEXT[], job_function_ids UUID[], job_functions TEXT[]

-- ============================================================================
-- 1. ADD NEW ARRAY COLUMNS
-- ============================================================================

-- Integer arrays for filtering/lookups
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS industry_ids INTEGER[] DEFAULT '{}';

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS job_function_ids INTEGER[] DEFAULT '{}';

-- Text arrays for display (mirrors employment_types / job_location_types pattern)
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS industries TEXT[] DEFAULT '{}';

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS job_functions TEXT[] DEFAULT '{}';

-- ============================================================================
-- 2. BACKFILL FROM EXISTING SINGLE-VALUE COLUMNS
-- ============================================================================

-- Copy industry_id → industry_ids
UPDATE public.jobs
SET industry_ids = ARRAY[industry_id]
WHERE industry_id IS NOT NULL
  AND (industry_ids IS NULL OR array_length(industry_ids, 1) IS NULL);

-- Copy job_function_id → job_function_ids
UPDATE public.jobs
SET job_function_ids = ARRAY[job_function_id]
WHERE job_function_id IS NOT NULL
  AND (job_function_ids IS NULL OR array_length(job_function_ids, 1) IS NULL);

-- Copy industry (text) → industries
UPDATE public.jobs
SET industries = ARRAY[industry]
WHERE industry IS NOT NULL
  AND (industries IS NULL OR array_length(industries, 1) IS NULL);

-- Copy job_function (text) → job_functions
UPDATE public.jobs
SET job_functions = ARRAY[job_function]
WHERE job_function IS NOT NULL
  AND (job_functions IS NULL OR array_length(job_functions, 1) IS NULL);

-- ============================================================================
-- 3. GIN INDEXES FOR ARRAY CONTAINMENT QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_jobs_industry_ids
  ON public.jobs USING GIN (industry_ids);

CREATE INDEX IF NOT EXISTS idx_jobs_job_function_ids
  ON public.jobs USING GIN (job_function_ids);

CREATE INDEX IF NOT EXISTS idx_jobs_industries
  ON public.jobs USING GIN (industries);

CREATE INDEX IF NOT EXISTS idx_jobs_job_functions
  ON public.jobs USING GIN (job_functions);

-- ============================================================================
-- 4. UPDATE duplicate_job FUNCTION TO INCLUDE NEW COLUMNS
-- ============================================================================

CREATE OR REPLACE FUNCTION duplicate_job(source_job_id UUID, new_title TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  new_job_id UUID;
  source_job jobs%ROWTYPE;
BEGIN
  SELECT * INTO source_job FROM jobs WHERE id = source_job_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job not found'; END IF;
  IF source_job.user_id != auth.uid() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  INSERT INTO jobs (
    user_id, title, company, company_id, location, description, salary,
    apply_link, apply_email, additional_info, application_deadline, application_url,
    direct_apply, education_level_id, education_requirements, employment_type,
    employment_types, job_location_types,
    experience_level, experience_level_ref_id, industry, industry_id,
    industry_ids, industries, job_function_ids, job_functions,
    job_function, job_function_id, job_location_city, job_location_country,
    job_location_county, job_location_type, location_town, minimum_experience,
    qualifications, required_qualifications, responsibilities,
    salary_currency, salary_max, salary_min, salary_period, salary_type,
    salary_visibility, specialization, tags, work_schedule, language_requirements,
    county_id, hiring_organization_logo, hiring_organization_name, hiring_organization_url,
    area_of_study, field_of_study, additional_locations
  ) VALUES (
    source_job.user_id, COALESCE(new_title, source_job.title || ' (Copy)'),
    source_job.company, source_job.company_id, source_job.location, source_job.description,
    source_job.salary, source_job.apply_link, source_job.apply_email, source_job.additional_info,
    source_job.application_deadline, source_job.application_url, source_job.direct_apply,
    source_job.education_level_id, source_job.education_requirements, source_job.employment_type,
    source_job.employment_types, source_job.job_location_types,
    source_job.experience_level, source_job.experience_level_ref_id, source_job.industry,
    source_job.industry_id, source_job.industry_ids, source_job.industries,
    source_job.job_function_ids, source_job.job_functions,
    source_job.job_function, source_job.job_function_id,
    source_job.job_location_city, source_job.job_location_country, source_job.job_location_county,
    source_job.job_location_type, source_job.location_town, source_job.minimum_experience,
    source_job.qualifications, source_job.required_qualifications, source_job.responsibilities,
    source_job.salary_currency, source_job.salary_max, source_job.salary_min, source_job.salary_period,
    source_job.salary_type, source_job.salary_visibility, source_job.specialization, source_job.tags,
    source_job.work_schedule, source_job.language_requirements, source_job.county_id,
    source_job.hiring_organization_logo, source_job.hiring_organization_name,
    source_job.hiring_organization_url, source_job.area_of_study, source_job.field_of_study,
    source_job.additional_locations
  ) RETURNING id INTO new_job_id;
  INSERT INTO job_history (job_id, action, changed_by, changes)
  VALUES (new_job_id, 'duplicated', auth.uid(), jsonb_build_object('source_job_id', source_job_id));
  RETURN new_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Migration: Add multi-value industry and job function support
-- Adds: industry_ids UUID[] and job_function_ids UUID[]

-- ============================================================================
-- 1. ADD NEW ARRAY COLUMNS
-- ============================================================================

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS industry_ids UUID[] DEFAULT '{}';

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS job_function_ids UUID[] DEFAULT '{}';

-- ============================================================================
-- 2. BACKFILL FROM EXISTING SINGLE-VALUE COLUMNS
-- ============================================================================

-- Copy industry_id → industry_ids
UPDATE public.jobs
SET industry_ids = ARRAY[industry_id]
WHERE industry_id IS NOT NULL
  AND (industry_ids IS NULL OR array_length(industry_ids, 1) IS NULL);

-- Copy job_function_id → job_function_ids
UPDATE public.jobs
SET job_function_ids = ARRAY[job_function_id]
WHERE job_function_id IS NOT NULL
  AND (job_function_ids IS NULL OR array_length(job_function_ids, 1) IS NULL);

-- ============================================================================
-- 3. GIN INDEXES FOR ARRAY CONTAINMENT QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_jobs_industry_ids
  ON public.jobs USING GIN (industry_ids);

CREATE INDEX IF NOT EXISTS idx_jobs_job_function_ids
  ON public.jobs USING GIN (job_function_ids);

-- ============================================================================
-- 4. UPDATE duplicate_job FUNCTION TO INCLUDE NEW COLUMNS
-- ============================================================================

CREATE OR REPLACE FUNCTION duplicate_job(source_job_id UUID, new_title TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  new_job_id UUID;
  source_job jobs%ROWTYPE;
BEGIN
  SELECT * INTO source_job FROM jobs WHERE id = source_job_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job not found'; END IF;
  IF source_job.user_id != auth.uid() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  INSERT INTO jobs (
    user_id, title, company, company_id, location, description, salary,
    apply_link, apply_email, additional_info, application_deadline, application_url,
    direct_apply, education_level_id, education_requirements, employment_type,
    employment_types, job_location_types,
    experience_level, experience_level_ref_id, industry, industry_id,
    industry_ids, job_function_ids,
    job_function, job_function_id, job_location_city, job_location_country,
    job_location_county, job_location_type, location_town, minimum_experience,
    qualifications, required_qualifications, responsibilities,
    salary_currency, salary_max, salary_min, salary_period, salary_type,
    salary_visibility, specialization, tags, work_schedule, language_requirements,
    county_id, hiring_organization_logo, hiring_organization_name, hiring_organization_url,
    area_of_study, field_of_study, additional_locations
  ) VALUES (
    source_job.user_id, COALESCE(new_title, source_job.title || ' (Copy)'),
    source_job.company, source_job.company_id, source_job.location, source_job.description,
    source_job.salary, source_job.apply_link, source_job.apply_email, source_job.additional_info,
    source_job.application_deadline, source_job.application_url, source_job.direct_apply,
    source_job.education_level_id, source_job.education_requirements, source_job.employment_type,
    source_job.employment_types, source_job.job_location_types,
    source_job.experience_level, source_job.experience_level_ref_id, source_job.industry,
    source_job.industry_id, source_job.industry_ids, source_job.job_function_ids,
    source_job.job_function, source_job.job_function_id,
    source_job.job_location_city, source_job.job_location_country, source_job.job_location_county,
    source_job.job_location_type, source_job.location_town, source_job.minimum_experience,
    source_job.qualifications, source_job.required_qualifications, source_job.responsibilities,
    source_job.salary_currency, source_job.salary_max, source_job.salary_min, source_job.salary_period,
    source_job.salary_type, source_job.salary_visibility, source_job.specialization, source_job.tags,
    source_job.work_schedule, source_job.language_requirements, source_job.county_id,
    source_job.hiring_organization_logo, source_job.hiring_organization_name,
    source_job.hiring_organization_url, source_job.area_of_study, source_job.field_of_study,
    source_job.additional_locations
  ) RETURNING id INTO new_job_id;
  INSERT INTO job_history (job_id, action, changed_by, changes)
  VALUES (new_job_id, 'duplicated', auth.uid(), jsonb_build_object('source_job_id', source_job_id));
  RETURN new_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------
-- >>> 20260618_enrich_job_schema_multi_values.sql
-- ----------------------------------------------------------------
-- Migration: Enrich job schema with multi-value fields and structured education
-- Adds: employment_types (array), job_location_types (array), area_of_study,
--        field_of_study, additional_locations (JSONB)

-- ============================================================================
-- 1. ADD NEW COLUMNS
-- ============================================================================

-- Multi-value employment types (e.g., FULL_TIME + PART_TIME)
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS employment_types employment_type[] DEFAULT '{}';

-- Multi-value location types (e.g., ON_SITE + REMOTE = HYBRID scenario)
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS job_location_types job_location_type[] DEFAULT '{}';

-- Structured education fields
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS area_of_study TEXT,
  ADD COLUMN IF NOT EXISTS field_of_study TEXT;

-- Additional locations (secondary offices/branches)
-- Format: [{"county": "Mombasa", "city": "Mombasa"}, {"county": "Nakuru", "city": "Nakuru"}]
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS additional_locations JSONB DEFAULT '[]'::jsonb;

-- ============================================================================
-- 2. BACKFILL FROM EXISTING SINGLE-VALUE COLUMNS
-- ============================================================================

-- Copy employment_type → employment_types
UPDATE public.jobs
SET employment_types = ARRAY[employment_type]
WHERE employment_type IS NOT NULL
  AND (employment_types IS NULL OR array_length(employment_types, 1) IS NULL);

-- Copy job_location_type → job_location_types
UPDATE public.jobs
SET job_location_types = ARRAY[job_location_type]
WHERE job_location_type IS NOT NULL
  AND (job_location_types IS NULL OR array_length(job_location_types, 1) IS NULL);

-- ============================================================================
-- 3. INDEXES FOR ARRAY COLUMNS (GIN for array containment queries)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_jobs_employment_types
  ON public.jobs USING GIN (employment_types);

CREATE INDEX IF NOT EXISTS idx_jobs_job_location_types
  ON public.jobs USING GIN (job_location_types);

CREATE INDEX IF NOT EXISTS idx_jobs_additional_locations
  ON public.jobs USING GIN (additional_locations);

CREATE INDEX IF NOT EXISTS idx_jobs_area_of_study
  ON public.jobs (area_of_study) WHERE area_of_study IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_field_of_study
  ON public.jobs (field_of_study) WHERE field_of_study IS NOT NULL;

-- ============================================================================
-- 4. UPDATE duplicate_job FUNCTION TO INCLUDE NEW COLUMNS
-- ============================================================================

CREATE OR REPLACE FUNCTION duplicate_job(source_job_id UUID, new_title TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  new_job_id UUID;
  source_job jobs%ROWTYPE;
BEGIN
  SELECT * INTO source_job FROM jobs WHERE id = source_job_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found';
  END IF;
  
  IF source_job.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  INSERT INTO jobs (
    user_id, title, company, company_id, location, description, salary, 
    apply_link, apply_email, additional_info, application_deadline, application_url,
    direct_apply, education_level_id, education_requirements, employment_type,
    employment_types, job_location_types,
    experience_level, experience_level_ref_id, industry, industry_id,
    job_function, job_function_id, job_location_city, job_location_country,
    job_location_county, job_location_type, location_town, minimum_experience,
    qualifications, required_qualifications, responsibilities,
    salary_currency, salary_max, salary_min, salary_period, salary_type,
    salary_visibility, specialization, tags, work_schedule, language_requirements,
    county_id, hiring_organization_logo, hiring_organization_name, hiring_organization_url,
    area_of_study, field_of_study, additional_locations
  ) VALUES (
    source_job.user_id,
    COALESCE(new_title, source_job.title || ' (Copy)'),
    source_job.company,
    source_job.company_id,
    source_job.location,
    source_job.description,
    source_job.salary,
    source_job.apply_link,
    source_job.apply_email,
    source_job.additional_info,
    source_job.application_deadline,
    source_job.application_url,
    source_job.direct_apply,
    source_job.education_level_id,
    source_job.education_requirements,
    source_job.employment_type,
    source_job.employment_types,
    source_job.job_location_types,
    source_job.experience_level,
    source_job.experience_level_ref_id,
    source_job.industry,
    source_job.industry_id,
    source_job.job_function,
    source_job.job_function_id,
    source_job.job_location_city,
    source_job.job_location_country,
    source_job.job_location_county,
    source_job.job_location_type,
    source_job.location_town,
    source_job.minimum_experience,
    source_job.qualifications,
    source_job.required_qualifications,
    source_job.responsibilities,
    source_job.salary_currency,
    source_job.salary_max,
    source_job.salary_min,
    source_job.salary_period,
    source_job.salary_type,
    source_job.salary_visibility,
    source_job.specialization,
    source_job.tags,
    source_job.work_schedule,
    source_job.language_requirements,
    source_job.county_id,
    source_job.hiring_organization_logo,
    source_job.hiring_organization_name,
    source_job.hiring_organization_url,
    source_job.area_of_study,
    source_job.field_of_study,
    source_job.additional_locations
  ) RETURNING id INTO new_job_id;
  
  -- Log the duplication
  INSERT INTO job_history (job_id, action, changed_by, changes)
  VALUES (
    new_job_id,
    'duplicated',
    auth.uid(),
    jsonb_build_object('source_job_id', source_job_id)
  );
  
  RETURN new_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------
-- >>> 20260618_fix_suggest_career_paths.sql
-- ----------------------------------------------------------------
-- Migration: Fix suggest_career_paths RPC function
-- Description: The original function referenced non-existent columns `skills` and
-- `current_job_title` on candidate_profiles. Skills are stored in the separate
-- `candidate_skills` table and the correct column name is `current_title`.
-- Also ensures get_salary_insights and supporting tables exist.

-- ============================================================================
-- FIX: suggest_career_paths function
-- ============================================================================

DROP FUNCTION IF EXISTS suggest_career_paths(UUID);

CREATE OR REPLACE FUNCTION suggest_career_paths(p_user_id UUID)
RETURNS TABLE (
    path_id UUID,
    from_role TEXT,
    to_role TEXT,
    difficulty TEXT,
    duration_months INTEGER,
    salary_increase_percentage INTEGER,
    match_score INTEGER
) AS $$
DECLARE
    v_current_title TEXT;
    v_profile_id UUID;
BEGIN
    -- Get the candidate profile id and current title
    SELECT cp.id, cp.current_title
    INTO v_profile_id, v_current_title
    FROM candidate_profiles cp
    WHERE cp.user_id = p_user_id;

    -- If no profile or no current title, return empty set
    IF v_profile_id IS NULL OR v_current_title IS NULL OR v_current_title = '' THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        cp.id,
        cp.from_role,
        cp.to_role,
        cp.difficulty,
        cp.typical_duration_months,
        cp.salary_increase_percentage,
        COALESCE(
            (
                SELECT COUNT(*)::INTEGER * 20
                FROM candidate_skills cs
                WHERE cs.candidate_id = v_profile_id
                  AND cs.skill_name = ANY(
                      SELECT jsonb_array_elements_text(cp.required_skills)
                  )
            ),
            0
        ) AS match_score
    FROM career_paths cp
    WHERE cp.from_role ILIKE '%' || v_current_title || '%'
    ORDER BY match_score DESC, cp.salary_increase_percentage DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ENSURE: get_salary_insights function exists (idempotent re-creation)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_salary_insights(
    p_job_title TEXT,
    p_location TEXT DEFAULT NULL,
    p_experience_level TEXT DEFAULT NULL
)
RETURNS TABLE (
    min_salary INTEGER,
    max_salary INTEGER,
    median_salary INTEGER,
    percentile_25 INTEGER,
    percentile_75 INTEGER,
    sample_size BIGINT,
    currency TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        MIN(sd.min_salary)::INTEGER,
        MAX(sd.max_salary)::INTEGER,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sd.median_salary)::INTEGER,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY sd.median_salary)::INTEGER,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY sd.median_salary)::INTEGER,
        COUNT(*)::BIGINT,
        sd.currency
    FROM salary_data sd
    WHERE sd.job_title ILIKE '%' || p_job_title || '%'
        AND (p_location IS NULL OR sd.location ILIKE '%' || p_location || '%')
        AND (p_experience_level IS NULL OR sd.experience_level = p_experience_level)
    GROUP BY sd.currency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------
-- >>> 20260618_seed_kenyan_salary_data.sql
-- ----------------------------------------------------------------
-- Migration: Seed salary_data with Kenyan market salary data
-- Description: The salary_data table only had 6 US rows. This adds realistic
-- Kenyan salary data across common job families so the Salary Insights tool
-- returns useful results for StemBird users.

-- ============================================================================
-- KENYAN SALARY DATA (monthly, in KES)
-- ============================================================================

INSERT INTO salary_data (job_title, location, country, experience_level, min_salary, max_salary, median_salary, currency, industry, company_size, remote_type) VALUES
-- Technology
('Software Engineer', 'Nairobi', 'Kenya', 'entry', 60000, 120000, 80000, 'KES', 'Technology', 'medium', 'hybrid'),
('Software Engineer', 'Nairobi', 'Kenya', 'mid', 120000, 250000, 180000, 'KES', 'Technology', 'large', 'hybrid'),
('Software Engineer', 'Nairobi', 'Kenya', 'senior', 250000, 500000, 350000, 'KES', 'Technology', 'large', 'hybrid'),
('Software Developer', 'Nairobi', 'Kenya', 'entry', 50000, 100000, 70000, 'KES', 'Technology', 'medium', 'onsite'),
('Software Developer', 'Nairobi', 'Kenya', 'mid', 100000, 200000, 150000, 'KES', 'Technology', 'medium', 'hybrid'),
('Software Developer', 'Nairobi', 'Kenya', 'senior', 200000, 450000, 300000, 'KES', 'Technology', 'large', 'hybrid'),
('Frontend Developer', 'Nairobi', 'Kenya', 'entry', 50000, 100000, 70000, 'KES', 'Technology', 'medium', 'hybrid'),
('Frontend Developer', 'Nairobi', 'Kenya', 'mid', 100000, 220000, 150000, 'KES', 'Technology', 'large', 'hybrid'),
('Backend Developer', 'Nairobi', 'Kenya', 'mid', 120000, 250000, 180000, 'KES', 'Technology', 'large', 'hybrid'),
('Full Stack Developer', 'Nairobi', 'Kenya', 'mid', 130000, 280000, 200000, 'KES', 'Technology', 'large', 'hybrid'),
('DevOps Engineer', 'Nairobi', 'Kenya', 'mid', 150000, 300000, 220000, 'KES', 'Technology', 'large', 'remote'),
('Data Analyst', 'Nairobi', 'Kenya', 'entry', 50000, 90000, 65000, 'KES', 'Technology', 'medium', 'onsite'),
('Data Analyst', 'Nairobi', 'Kenya', 'mid', 90000, 180000, 130000, 'KES', 'Technology', 'large', 'hybrid'),
('Data Scientist', 'Nairobi', 'Kenya', 'mid', 150000, 350000, 250000, 'KES', 'Technology', 'large', 'hybrid'),
('Product Manager', 'Nairobi', 'Kenya', 'mid', 180000, 350000, 250000, 'KES', 'Technology', 'large', 'hybrid'),
('Product Manager', 'Nairobi', 'Kenya', 'senior', 350000, 600000, 450000, 'KES', 'Technology', 'large', 'hybrid'),
('UI/UX Designer', 'Nairobi', 'Kenya', 'entry', 45000, 80000, 60000, 'KES', 'Technology', 'medium', 'onsite'),
('UI/UX Designer', 'Nairobi', 'Kenya', 'mid', 80000, 180000, 120000, 'KES', 'Technology', 'large', 'hybrid'),
('IT Support', 'Nairobi', 'Kenya', 'entry', 35000, 60000, 45000, 'KES', 'Technology', 'medium', 'onsite'),
('IT Support', 'Nairobi', 'Kenya', 'mid', 60000, 120000, 85000, 'KES', 'Technology', 'large', 'onsite'),
('System Administrator', 'Nairobi', 'Kenya', 'mid', 80000, 180000, 120000, 'KES', 'Technology', 'large', 'onsite'),
('Cybersecurity Analyst', 'Nairobi', 'Kenya', 'mid', 120000, 280000, 200000, 'KES', 'Technology', 'large', 'hybrid'),
('QA Engineer', 'Nairobi', 'Kenya', 'mid', 80000, 180000, 120000, 'KES', 'Technology', 'large', 'hybrid'),

-- Marketing & Communications
('Marketing Manager', 'Nairobi', 'Kenya', 'mid', 120000, 250000, 180000, 'KES', 'Marketing', 'large', 'onsite'),
('Marketing Manager', 'Nairobi', 'Kenya', 'senior', 250000, 450000, 350000, 'KES', 'Marketing', 'large', 'hybrid'),
('Digital Marketing', 'Nairobi', 'Kenya', 'entry', 40000, 80000, 55000, 'KES', 'Marketing', 'medium', 'onsite'),
('Digital Marketing', 'Nairobi', 'Kenya', 'mid', 80000, 180000, 120000, 'KES', 'Marketing', 'large', 'hybrid'),
('Content Writer', 'Nairobi', 'Kenya', 'entry', 35000, 60000, 45000, 'KES', 'Marketing', 'medium', 'remote'),
('Content Writer', 'Nairobi', 'Kenya', 'mid', 60000, 120000, 85000, 'KES', 'Marketing', 'large', 'remote'),
('Social Media Manager', 'Nairobi', 'Kenya', 'entry', 40000, 70000, 50000, 'KES', 'Marketing', 'medium', 'hybrid'),
('Social Media Manager', 'Nairobi', 'Kenya', 'mid', 70000, 150000, 100000, 'KES', 'Marketing', 'large', 'hybrid'),
('Communications Officer', 'Nairobi', 'Kenya', 'mid', 80000, 180000, 120000, 'KES', 'Marketing', 'large', 'onsite'),
('Brand Manager', 'Nairobi', 'Kenya', 'mid', 150000, 300000, 220000, 'KES', 'Marketing', 'large', 'onsite'),

-- Finance & Accounting
('Accountant', 'Nairobi', 'Kenya', 'entry', 45000, 80000, 60000, 'KES', 'Finance', 'medium', 'onsite'),
('Accountant', 'Nairobi', 'Kenya', 'mid', 80000, 180000, 120000, 'KES', 'Finance', 'large', 'onsite'),
('Accountant', 'Nairobi', 'Kenya', 'senior', 180000, 350000, 250000, 'KES', 'Finance', 'large', 'onsite'),
('Financial Analyst', 'Nairobi', 'Kenya', 'entry', 60000, 100000, 75000, 'KES', 'Finance', 'large', 'onsite'),
('Financial Analyst', 'Nairobi', 'Kenya', 'mid', 100000, 220000, 150000, 'KES', 'Finance', 'large', 'hybrid'),
('Finance Manager', 'Nairobi', 'Kenya', 'senior', 250000, 500000, 350000, 'KES', 'Finance', 'large', 'onsite'),
('Auditor', 'Nairobi', 'Kenya', 'mid', 80000, 180000, 120000, 'KES', 'Finance', 'large', 'onsite'),

-- Human Resources
('HR Officer', 'Nairobi', 'Kenya', 'entry', 40000, 70000, 50000, 'KES', 'Human Resources', 'medium', 'onsite'),
('HR Officer', 'Nairobi', 'Kenya', 'mid', 70000, 150000, 100000, 'KES', 'Human Resources', 'large', 'onsite'),
('HR Manager', 'Nairobi', 'Kenya', 'senior', 180000, 380000, 280000, 'KES', 'Human Resources', 'large', 'onsite'),
('Recruiter', 'Nairobi', 'Kenya', 'entry', 35000, 60000, 45000, 'KES', 'Human Resources', 'medium', 'onsite'),
('Recruiter', 'Nairobi', 'Kenya', 'mid', 60000, 130000, 90000, 'KES', 'Human Resources', 'large', 'hybrid'),

-- Sales & Business Development
('Sales Representative', 'Nairobi', 'Kenya', 'entry', 35000, 70000, 50000, 'KES', 'Sales', 'medium', 'onsite'),
('Sales Representative', 'Nairobi', 'Kenya', 'mid', 70000, 150000, 100000, 'KES', 'Sales', 'large', 'onsite'),
('Sales Manager', 'Nairobi', 'Kenya', 'senior', 180000, 400000, 280000, 'KES', 'Sales', 'large', 'onsite'),
('Business Development', 'Nairobi', 'Kenya', 'mid', 100000, 220000, 150000, 'KES', 'Sales', 'large', 'hybrid'),
('Business Development', 'Nairobi', 'Kenya', 'senior', 220000, 450000, 320000, 'KES', 'Sales', 'large', 'hybrid'),

-- Operations & Administration
('Operations Manager', 'Nairobi', 'Kenya', 'mid', 120000, 250000, 180000, 'KES', 'Operations', 'large', 'onsite'),
('Operations Manager', 'Nairobi', 'Kenya', 'senior', 250000, 500000, 350000, 'KES', 'Operations', 'large', 'onsite'),
('Administrative Assistant', 'Nairobi', 'Kenya', 'entry', 30000, 55000, 40000, 'KES', 'Administration', 'medium', 'onsite'),
('Administrative Assistant', 'Nairobi', 'Kenya', 'mid', 55000, 100000, 75000, 'KES', 'Administration', 'large', 'onsite'),
('Project Manager', 'Nairobi', 'Kenya', 'mid', 150000, 300000, 220000, 'KES', 'Operations', 'large', 'hybrid'),
('Project Manager', 'Nairobi', 'Kenya', 'senior', 300000, 550000, 400000, 'KES', 'Operations', 'large', 'hybrid'),
('Supply Chain Manager', 'Nairobi', 'Kenya', 'mid', 120000, 250000, 180000, 'KES', 'Operations', 'large', 'onsite'),

-- Engineering (non-IT)
('Civil Engineer', 'Nairobi', 'Kenya', 'entry', 50000, 90000, 65000, 'KES', 'Engineering', 'medium', 'onsite'),
('Civil Engineer', 'Nairobi', 'Kenya', 'mid', 90000, 200000, 140000, 'KES', 'Engineering', 'large', 'onsite'),
('Electrical Engineer', 'Nairobi', 'Kenya', 'mid', 100000, 220000, 150000, 'KES', 'Engineering', 'large', 'onsite'),
('Mechanical Engineer', 'Nairobi', 'Kenya', 'mid', 90000, 200000, 140000, 'KES', 'Engineering', 'large', 'onsite'),

-- Healthcare
('Nurse', 'Nairobi', 'Kenya', 'entry', 35000, 60000, 45000, 'KES', 'Healthcare', 'medium', 'onsite'),
('Nurse', 'Nairobi', 'Kenya', 'mid', 60000, 120000, 85000, 'KES', 'Healthcare', 'large', 'onsite'),
('Doctor', 'Nairobi', 'Kenya', 'entry', 100000, 200000, 150000, 'KES', 'Healthcare', 'large', 'onsite'),
('Doctor', 'Nairobi', 'Kenya', 'senior', 250000, 600000, 400000, 'KES', 'Healthcare', 'large', 'onsite'),
('Pharmacist', 'Nairobi', 'Kenya', 'mid', 80000, 180000, 120000, 'KES', 'Healthcare', 'large', 'onsite'),

-- Education
('Teacher', 'Nairobi', 'Kenya', 'entry', 30000, 55000, 40000, 'KES', 'Education', 'medium', 'onsite'),
('Teacher', 'Nairobi', 'Kenya', 'mid', 55000, 100000, 75000, 'KES', 'Education', 'large', 'onsite'),
('Lecturer', 'Nairobi', 'Kenya', 'mid', 100000, 220000, 150000, 'KES', 'Education', 'large', 'onsite'),
('Lecturer', 'Nairobi', 'Kenya', 'senior', 220000, 400000, 300000, 'KES', 'Education', 'large', 'onsite'),

-- Legal
('Legal Officer', 'Nairobi', 'Kenya', 'entry', 60000, 100000, 75000, 'KES', 'Legal', 'medium', 'onsite'),
('Legal Officer', 'Nairobi', 'Kenya', 'mid', 100000, 250000, 170000, 'KES', 'Legal', 'large', 'onsite'),
('Lawyer', 'Nairobi', 'Kenya', 'mid', 150000, 350000, 250000, 'KES', 'Legal', 'large', 'onsite'),
('Lawyer', 'Nairobi', 'Kenya', 'senior', 350000, 700000, 500000, 'KES', 'Legal', 'large', 'onsite'),

-- Customer Service
('Customer Service', 'Nairobi', 'Kenya', 'entry', 25000, 50000, 35000, 'KES', 'Customer Service', 'medium', 'onsite'),
('Customer Service', 'Nairobi', 'Kenya', 'mid', 50000, 100000, 70000, 'KES', 'Customer Service', 'large', 'onsite'),
('Customer Service Manager', 'Nairobi', 'Kenya', 'senior', 120000, 250000, 180000, 'KES', 'Customer Service', 'large', 'onsite'),

-- Mombasa (second largest city, slightly lower salaries)
('Software Engineer', 'Mombasa', 'Kenya', 'mid', 80000, 180000, 130000, 'KES', 'Technology', 'medium', 'onsite'),
('Accountant', 'Mombasa', 'Kenya', 'mid', 60000, 130000, 90000, 'KES', 'Finance', 'medium', 'onsite'),
('Marketing Manager', 'Mombasa', 'Kenya', 'mid', 80000, 180000, 120000, 'KES', 'Marketing', 'medium', 'onsite'),
('Sales Representative', 'Mombasa', 'Kenya', 'entry', 25000, 55000, 40000, 'KES', 'Sales', 'medium', 'onsite'),
('Teacher', 'Mombasa', 'Kenya', 'entry', 25000, 45000, 35000, 'KES', 'Education', 'medium', 'onsite'),

-- Remote / general Kenya
('Virtual Assistant', 'Nairobi', 'Kenya', 'entry', 25000, 50000, 35000, 'KES', 'Administration', 'small', 'remote'),
('Virtual Assistant', 'Nairobi', 'Kenya', 'mid', 50000, 100000, 70000, 'KES', 'Administration', 'medium', 'remote'),
('Graphic Designer', 'Nairobi', 'Kenya', 'entry', 35000, 65000, 45000, 'KES', 'Marketing', 'medium', 'remote'),
('Graphic Designer', 'Nairobi', 'Kenya', 'mid', 65000, 150000, 100000, 'KES', 'Marketing', 'large', 'hybrid'),
('Customer Support', 'Nairobi', 'Kenya', 'entry', 25000, 50000, 35000, 'KES', 'Customer Service', 'medium', 'onsite')
ON CONFLICT DO NOTHING;


-- ----------------------------------------------------------------
-- >>> 20260618_seed_more_kenyan_salary_data.sql
-- ----------------------------------------------------------------
-- Migration: Expand salary_data with more Kenyan towns/counties
-- Covers: Kisumu, Nakuru, Eldoret, Thika, Machakos, Nyeri, Meru, Kisii,
-- Garissa, Kitale, Malindi, Nanyuki, Naivasha, and more roles.

INSERT INTO salary_data (job_title, location, country, experience_level, min_salary, max_salary, median_salary, currency, industry, company_size, remote_type) VALUES

-- Kisumu (3rd largest city, Western Kenya)
('Software Engineer', 'Kisumu', 'Kenya', 'mid', 70000, 160000, 110000, 'KES', 'Technology', 'medium', 'onsite'),
('Accountant', 'Kisumu', 'Kenya', 'mid', 55000, 120000, 80000, 'KES', 'Finance', 'medium', 'onsite'),
('Teacher', 'Kisumu', 'Kenya', 'entry', 28000, 50000, 38000, 'KES', 'Education', 'medium', 'onsite'),
('Nurse', 'Kisumu', 'Kenya', 'mid', 50000, 100000, 70000, 'KES', 'Healthcare', 'medium', 'onsite'),
('Sales Representative', 'Kisumu', 'Kenya', 'entry', 28000, 55000, 40000, 'KES', 'Sales', 'medium', 'onsite'),
('Marketing Manager', 'Kisumu', 'Kenya', 'mid', 80000, 170000, 120000, 'KES', 'Marketing', 'medium', 'onsite'),

-- Nakuru
('Software Developer', 'Nakuru', 'Kenya', 'mid', 65000, 150000, 100000, 'KES', 'Technology', 'medium', 'onsite'),
('Accountant', 'Nakuru', 'Kenya', 'entry', 40000, 70000, 52000, 'KES', 'Finance', 'medium', 'onsite'),
('Civil Engineer', 'Nakuru', 'Kenya', 'mid', 70000, 160000, 110000, 'KES', 'Engineering', 'medium', 'onsite'),
('HR Officer', 'Nakuru', 'Kenya', 'mid', 55000, 120000, 80000, 'KES', 'Human Resources', 'medium', 'onsite'),
('Teacher', 'Nakuru', 'Kenya', 'entry', 28000, 48000, 36000, 'KES', 'Education', 'medium', 'onsite'),

-- Eldoret
('Software Engineer', 'Eldoret', 'Kenya', 'mid', 60000, 140000, 95000, 'KES', 'Technology', 'medium', 'onsite'),
('Accountant', 'Eldoret', 'Kenya', 'mid', 50000, 110000, 75000, 'KES', 'Finance', 'medium', 'onsite'),
('Doctor', 'Eldoret', 'Kenya', 'entry', 90000, 180000, 130000, 'KES', 'Healthcare', 'large', 'onsite'),
('Agricultural Officer', 'Eldoret', 'Kenya', 'mid', 60000, 130000, 90000, 'KES', 'Agriculture', 'medium', 'onsite'),
('Sales Representative', 'Eldoret', 'Kenya', 'entry', 25000, 50000, 36000, 'KES', 'Sales', 'medium', 'onsite'),

-- Thika
('Software Developer', 'Thika', 'Kenya', 'mid', 60000, 130000, 90000, 'KES', 'Technology', 'medium', 'onsite'),
('Accountant', 'Thika', 'Kenya', 'entry', 38000, 68000, 50000, 'KES', 'Finance', 'medium', 'onsite'),
('Operations Manager', 'Thika', 'Kenya', 'mid', 100000, 200000, 145000, 'KES', 'Operations', 'large', 'onsite'),
('Mechanical Engineer', 'Thika', 'Kenya', 'mid', 80000, 170000, 120000, 'KES', 'Engineering', 'large', 'onsite'),

-- Machakos
('IT Support', 'Machakos', 'Kenya', 'entry', 30000, 55000, 40000, 'KES', 'Technology', 'medium', 'onsite'),
('Accountant', 'Machakos', 'Kenya', 'entry', 35000, 65000, 48000, 'KES', 'Finance', 'medium', 'onsite'),
('Teacher', 'Machakos', 'Kenya', 'entry', 27000, 48000, 35000, 'KES', 'Education', 'medium', 'onsite'),

-- Nyeri
('Teacher', 'Nyeri', 'Kenya', 'entry', 28000, 50000, 37000, 'KES', 'Education', 'medium', 'onsite'),
('Nurse', 'Nyeri', 'Kenya', 'entry', 32000, 55000, 42000, 'KES', 'Healthcare', 'medium', 'onsite'),
('Accountant', 'Nyeri', 'Kenya', 'entry', 35000, 65000, 48000, 'KES', 'Finance', 'medium', 'onsite'),

-- Meru
('Teacher', 'Meru', 'Kenya', 'entry', 27000, 48000, 36000, 'KES', 'Education', 'medium', 'onsite'),
('Nurse', 'Meru', 'Kenya', 'entry', 30000, 55000, 40000, 'KES', 'Healthcare', 'medium', 'onsite'),
('Agricultural Officer', 'Meru', 'Kenya', 'entry', 40000, 75000, 55000, 'KES', 'Agriculture', 'medium', 'onsite'),

-- Kisii
('Teacher', 'Kisii', 'Kenya', 'entry', 27000, 48000, 35000, 'KES', 'Education', 'medium', 'onsite'),
('Nurse', 'Kisii', 'Kenya', 'entry', 30000, 55000, 40000, 'KES', 'Healthcare', 'medium', 'onsite'),
('Sales Representative', 'Kisii', 'Kenya', 'entry', 22000, 45000, 32000, 'KES', 'Sales', 'small', 'onsite'),

-- Garissa
('Teacher', 'Garissa', 'Kenya', 'entry', 30000, 55000, 40000, 'KES', 'Education', 'medium', 'onsite'),
('Nurse', 'Garissa', 'Kenya', 'entry', 35000, 60000, 45000, 'KES', 'Healthcare', 'medium', 'onsite'),

-- Kitale
('Teacher', 'Kitale', 'Kenya', 'entry', 26000, 46000, 34000, 'KES', 'Education', 'medium', 'onsite'),
('Agricultural Officer', 'Kitale', 'Kenya', 'entry', 38000, 70000, 52000, 'KES', 'Agriculture', 'medium', 'onsite'),

-- Naivasha
('Software Developer', 'Naivasha', 'Kenya', 'mid', 55000, 120000, 85000, 'KES', 'Technology', 'medium', 'remote'),
('Operations Manager', 'Naivasha', 'Kenya', 'mid', 90000, 180000, 130000, 'KES', 'Operations', 'large', 'onsite'),
('HR Officer', 'Naivasha', 'Kenya', 'mid', 50000, 110000, 75000, 'KES', 'Human Resources', 'medium', 'onsite'),

-- Nanyuki
('Teacher', 'Nanyuki', 'Kenya', 'entry', 28000, 50000, 37000, 'KES', 'Education', 'medium', 'onsite'),
('Software Developer', 'Nanyuki', 'Kenya', 'mid', 55000, 120000, 85000, 'KES', 'Technology', 'small', 'remote'),

-- Malindi
('Teacher', 'Malindi', 'Kenya', 'entry', 28000, 50000, 37000, 'KES', 'Education', 'medium', 'onsite'),
('Nurse', 'Malindi', 'Kenya', 'entry', 32000, 55000, 42000, 'KES', 'Healthcare', 'medium', 'onsite'),

-- More Nairobi roles (broader coverage)
('Pharmacist', 'Nairobi', 'Kenya', 'entry', 60000, 110000, 80000, 'KES', 'Healthcare', 'medium', 'onsite'),
('Pharmacist', 'Nairobi', 'Kenya', 'senior', 130000, 280000, 200000, 'KES', 'Healthcare', 'large', 'onsite'),
('Dentist', 'Nairobi', 'Kenya', 'mid', 120000, 280000, 200000, 'KES', 'Healthcare', 'large', 'onsite'),
('Architect', 'Nairobi', 'Kenya', 'mid', 100000, 220000, 150000, 'KES', 'Engineering', 'large', 'hybrid'),
('Quantity Surveyor', 'Nairobi', 'Kenya', 'mid', 90000, 200000, 140000, 'KES', 'Engineering', 'large', 'onsite'),
('Procurement Officer', 'Nairobi', 'Kenya', 'mid', 70000, 150000, 105000, 'KES', 'Operations', 'large', 'onsite'),
('Logistics Coordinator', 'Nairobi', 'Kenya', 'mid', 65000, 140000, 95000, 'KES', 'Operations', 'large', 'onsite'),
('Bank Teller', 'Nairobi', 'Kenya', 'entry', 35000, 60000, 45000, 'KES', 'Finance', 'large', 'onsite'),
('Insurance Agent', 'Nairobi', 'Kenya', 'entry', 30000, 60000, 42000, 'KES', 'Finance', 'medium', 'onsite'),
('Real Estate Agent', 'Nairobi', 'Kenya', 'entry', 35000, 80000, 55000, 'KES', 'Sales', 'medium', 'onsite'),
('Real Estate Agent', 'Nairobi', 'Kenya', 'mid', 80000, 200000, 130000, 'KES', 'Sales', 'large', 'onsite'),
('Journalist', 'Nairobi', 'Kenya', 'entry', 40000, 70000, 52000, 'KES', 'Media', 'medium', 'onsite'),
('Journalist', 'Nairobi', 'Kenya', 'mid', 70000, 150000, 105000, 'KES', 'Media', 'large', 'onsite'),
('Photographer', 'Nairobi', 'Kenya', 'entry', 30000, 60000, 42000, 'KES', 'Media', 'small', 'remote'),
('Videographer', 'Nairobi', 'Kenya', 'mid', 50000, 120000, 80000, 'KES', 'Media', 'medium', 'hybrid'),
('Chef', 'Nairobi', 'Kenya', 'entry', 30000, 55000, 40000, 'KES', 'Hospitality', 'medium', 'onsite'),
('Chef', 'Nairobi', 'Kenya', 'mid', 55000, 120000, 85000, 'KES', 'Hospitality', 'large', 'onsite'),
('Hotel Manager', 'Nairobi', 'Kenya', 'senior', 150000, 350000, 240000, 'KES', 'Hospitality', 'large', 'onsite'),
('Plumber', 'Nairobi', 'Kenya', 'entry', 25000, 50000, 35000, 'KES', 'Construction', 'small', 'onsite'),
('Plumber', 'Nairobi', 'Kenya', 'mid', 50000, 100000, 70000, 'KES', 'Construction', 'medium', 'onsite'),
('Electrician', 'Nairobi', 'Kenya', 'entry', 28000, 55000, 38000, 'KES', 'Construction', 'small', 'onsite'),
('Electrician', 'Nairobi', 'Kenya', 'mid', 55000, 110000, 78000, 'KES', 'Construction', 'medium', 'onsite'),
('Driver', 'Nairobi', 'Kenya', 'entry', 25000, 45000, 33000, 'KES', 'Transport', 'medium', 'onsite'),
('Driver', 'Nairobi', 'Kenya', 'mid', 45000, 80000, 60000, 'KES', 'Transport', 'large', 'onsite'),
('Security Guard', 'Nairobi', 'Kenya', 'entry', 18000, 35000, 25000, 'KES', 'Security', 'large', 'onsite'),
('Security Manager', 'Nairobi', 'Kenya', 'senior', 100000, 220000, 150000, 'KES', 'Security', 'large', 'onsite'),
('Warehouse Manager', 'Nairobi', 'Kenya', 'mid', 70000, 150000, 105000, 'KES', 'Operations', 'large', 'onsite'),
('Receptionist', 'Nairobi', 'Kenya', 'entry', 22000, 40000, 30000, 'KES', 'Administration', 'medium', 'onsite'),
('Secretary', 'Nairobi', 'Kenya', 'entry', 25000, 45000, 33000, 'KES', 'Administration', 'medium', 'onsite'),
('Office Manager', 'Nairobi', 'Kenya', 'mid', 60000, 130000, 90000, 'KES', 'Administration', 'large', 'onsite'),
('Nutritionist', 'Nairobi', 'Kenya', 'mid', 70000, 150000, 105000, 'KES', 'Healthcare', 'medium', 'onsite'),
('Physiotherapist', 'Nairobi', 'Kenya', 'mid', 80000, 170000, 120000, 'KES', 'Healthcare', 'medium', 'onsite'),
('Lab Technician', 'Nairobi', 'Kenya', 'entry', 35000, 65000, 48000, 'KES', 'Healthcare', 'medium', 'onsite'),
('Lab Technician', 'Nairobi', 'Kenya', 'mid', 65000, 130000, 92000, 'KES', 'Healthcare', 'large', 'onsite'),
('Veterinarian', 'Nairobi', 'Kenya', 'mid', 80000, 180000, 125000, 'KES', 'Agriculture', 'medium', 'onsite'),
('Surveyor', 'Nairobi', 'Kenya', 'mid', 80000, 180000, 125000, 'KES', 'Engineering', 'medium', 'onsite'),
('Town Planner', 'Nairobi', 'Kenya', 'mid', 90000, 200000, 140000, 'KES', 'Government', 'large', 'onsite'),
('Economist', 'Nairobi', 'Kenya', 'mid', 120000, 260000, 180000, 'KES', 'Finance', 'large', 'hybrid'),
('Statistician', 'Nairobi', 'Kenya', 'mid', 90000, 200000, 140000, 'KES', 'Government', 'large', 'onsite'),
('Research Officer', 'Nairobi', 'Kenya', 'mid', 80000, 180000, 125000, 'KES', 'Research', 'large', 'hybrid'),
('Monitoring and Evaluation', 'Nairobi', 'Kenya', 'mid', 100000, 220000, 155000, 'KES', 'NGO', 'large', 'hybrid'),
('Program Manager', 'Nairobi', 'Kenya', 'senior', 250000, 500000, 360000, 'KES', 'NGO', 'large', 'hybrid'),
('Program Officer', 'Nairobi', 'Kenya', 'mid', 120000, 250000, 180000, 'KES', 'NGO', 'large', 'hybrid'),
('Community Health Worker', 'Nairobi', 'Kenya', 'entry', 25000, 45000, 33000, 'KES', 'NGO', 'medium', 'onsite')
ON CONFLICT DO NOTHING;


-- ----------------------------------------------------------------
-- >>> 20260715_combined_kenyan_scraper_sources.sql
-- ----------------------------------------------------------------
-- ============================================================
-- COMBINED: Kenyan scraper sources (StemBird — 2026-07-15)
-- ============================================================
-- Run this once in Supabase SQL Editor to apply all scraper source
-- changes from today's session. Safe to re-run (uses ON CONFLICT).
--
-- Prerequisites:
--   - scraper_sources table exists (20260528_create_job_scraper_tables.sql)
--
-- What this sets up:
--   • Workable: Inkomoko (+ paused pipeline: Tala, Branch, KCB, etc.)
--   • SmartRecruiters: Amref, SALIX, DDD, PowerGen, iHub
--   • Government: PSC PDF adverts (full detail from publicservice.go.ke)
--   • Backup: PSC portal table source (paused — listing-only)
-- ============================================================

BEGIN;

-- ── 1. Inkomoko (Workable) ───────────────────────────────────────────────────
INSERT INTO public.scraper_sources (source_id, name, base_url, is_active, selectors)
VALUES (
  'inkomoko-careers',
  'Inkomoko',
  'https://apply.workable.com/inkomoko/',
  true,
  '{
    "type": "workable",
    "slug": "inkomoko",
    "filterCountry": "Kenya",
    "category": "employer"
  }'::jsonb
)
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  selectors = EXCLUDED.selectors;

-- Ensure category on existing Inkomoko row if already seeded without it
UPDATE public.scraper_sources
SET selectors = selectors || '{"category": "employer"}'::jsonb
WHERE source_id = 'inkomoko-careers'
  AND NOT (selectors ? 'category');

-- ── 2. SmartRecruiters employers & NGO ─────────────────────────────────────
INSERT INTO public.scraper_sources (source_id, name, base_url, is_active, selectors)
VALUES
  (
    'amref-health-africa',
    'Amref Health Africa',
    'https://careers.smartrecruiters.com/AmrefHealthAfrica4',
    true,
    '{
      "type": "smartrecruiters",
      "slug": "AmrefHealthAfrica4",
      "filterCountry": "ke",
      "category": "ngo"
    }'::jsonb
  ),
  (
    'salix-data-africa',
    'SALIX Data Africa',
    'https://careers.smartrecruiters.com/SALIXDataAfricaLimited',
    true,
    '{
      "type": "smartrecruiters",
      "slug": "SALIXDataAfricaLimited",
      "filterCountry": "ke",
      "category": "employer"
    }'::jsonb
  ),
  (
    'digital-divide-data',
    'Digital Divide Data',
    'https://careers.smartrecruiters.com/DigitalDivideData',
    true,
    '{
      "type": "smartrecruiters",
      "slug": "DigitalDivideData",
      "filterCountry": "ke",
      "category": "employer"
    }'::jsonb
  ),
  (
    'powergen-renewable-energy',
    'PowerGen Renewable Energy',
    'https://careers.smartrecruiters.com/PowerGenRenewableEnergy',
    true,
    '{
      "type": "smartrecruiters",
      "slug": "PowerGenRenewableEnergy",
      "filterCountry": "ke",
      "category": "employer"
    }'::jsonb
  ),
  (
    'ihub-nairobi',
    'iHub Nairobi',
    'https://careers.smartrecruiters.com/iHub',
    true,
    '{
      "type": "smartrecruiters",
      "slug": "iHub",
      "filterCountry": "ke",
      "category": "employer"
    }'::jsonb
  )
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  selectors = EXCLUDED.selectors;

-- ── 3. Government: PSC PDF (primary) + portal table (backup, paused) ───────
INSERT INTO public.scraper_sources (source_id, name, base_url, is_active, selectors)
VALUES
  (
    'psc-pdf-adverts',
    'Public Service Commission — PDF Adverts',
    'https://www.publicservice.go.ke/jobs/',
    true,
    '{
      "type": "psc_pdf",
      "category": "government",
      "maxListingPages": 3
    }'::jsonb
  ),
  (
    'psc-ministries-adverts',
    'Public Service Commission — Ministries & State Departments',
    'https://www.psckjobs.go.ke/ActiveJobsAdverts.aspx',
    false,
    '{
      "type": "psc",
      "category": "government"
    }'::jsonb
  )
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  selectors = EXCLUDED.selectors;

-- ── 4. Workable pipeline (valid accounts; paused until Kenya roles appear) ───
INSERT INTO public.scraper_sources (source_id, name, base_url, is_active, selectors)
VALUES
  (
    'tala-finance',
    'Tala',
    'https://apply.workable.com/tala/',
    false,
    '{
      "type": "workable",
      "slug": "tala",
      "filterCountry": "Kenya",
      "category": "employer"
    }'::jsonb
  ),
  (
    'branch-international',
    'Branch International',
    'https://apply.workable.com/branch/',
    false,
    '{
      "type": "workable",
      "slug": "branch",
      "filterCountry": "Kenya",
      "category": "employer"
    }'::jsonb
  ),
  (
    'kcb-group',
    'KCB Group',
    'https://apply.workable.com/kcb/',
    false,
    '{
      "type": "workable",
      "slug": "kcb",
      "filterCountry": "Kenya",
      "category": "employer"
    }'::jsonb
  ),
  (
    'komaza',
    'Komaza',
    'https://apply.workable.com/komaza/',
    false,
    '{
      "type": "workable",
      "slug": "komaza",
      "filterCountry": "Kenya",
      "category": "employer"
    }'::jsonb
  ),
  (
    'sanergy',
    'Sanergy',
    'https://apply.workable.com/sanergy/',
    false,
    '{
      "type": "workable",
      "slug": "sanergy",
      "filterCountry": "Kenya",
      "category": "employer"
    }'::jsonb
  ),
  (
    'copia-global',
    'Copia Global',
    'https://apply.workable.com/copia/',
    false,
    '{
      "type": "workable",
      "slug": "copia",
      "filterCountry": "Kenya",
      "category": "employer"
    }'::jsonb
  ),
  (
    'apollo-agriculture',
    'Apollo Agriculture',
    'https://apply.workable.com/apollo/',
    false,
    '{
      "type": "workable",
      "slug": "apollo",
      "filterCountry": "Kenya",
      "category": "employer"
    }'::jsonb
  )
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  selectors = EXCLUDED.selectors;

COMMIT;

-- ── Summary (expect 15 rows) ───────────────────────────────────────────────
-- Active (7):  inkomoko, amref, salix, ddd, powergen, ihub, psc-pdf-adverts
-- Paused (8):  psc-ministries, tala, branch, kcb, komaza, sanergy, copia, apollo
SELECT source_id, name, is_active, selectors->>'type' AS adapter, selectors->>'category' AS category
FROM public.scraper_sources
WHERE source_id IN (
  'inkomoko-careers',
  'amref-health-africa',
  'salix-data-africa',
  'digital-divide-data',
  'powergen-renewable-energy',
  'ihub-nairobi',
  'psc-pdf-adverts',
  'psc-ministries-adverts',
  'tala-finance',
  'branch-international',
  'kcb-group',
  'komaza',
  'sanergy',
  'copia-global',
  'apollo-agriculture'
)
ORDER BY is_active DESC, name;


-- ----------------------------------------------------------------
-- >>> 20260718_pause_duplicate_inkomoko_scraper_source.sql
-- ----------------------------------------------------------------
-- Pause legacy Inkomoko source_id so discover only runs the canonical
-- inkomoko-careers row (same Workable board; avoids double-queuing).

UPDATE public.scraper_sources
SET is_active = false
WHERE source_id = 'inkomoko-workable'
  AND EXISTS (
    SELECT 1 FROM public.scraper_sources
    WHERE source_id = 'inkomoko-careers'
  );

-- Ensure Tatu City has category metadata (already active from earlier seed)
UPDATE public.scraper_sources
SET selectors = selectors || '{"category": "employer"}'::jsonb
WHERE source_id = 'tatucity-workable'
  AND NOT (selectors ? 'category');


-- ----------------------------------------------------------------
-- >>> 20260718_seed_popup_newsletter_welcome_template.sql
-- ----------------------------------------------------------------
-- Store the homepage popup newsletter welcome email template in page_content
-- (email management Templates tab). Safe to re-run.

INSERT INTO public.page_content (
  page_slug,
  section_key,
  content_type,
  content_value,
  metadata
) VALUES (
  'email_templates',
  'popup_newsletter_welcome',
  'html',
  $html$<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
    <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
      <img src="{{site_url}}/logo.png" alt="StemBird" style="width:60px;height:60px;margin-bottom:10px;" />
      <h1 style="margin:0;font-size:24px;">Welcome to StemBird!</h1>
      <p style="margin:8px 0 0;opacity:0.9;font-size:16px;">Your free toolkit is ready — no strings attached</p>
    </td></tr>
    <tr><td style="padding:30px;">
      <p>Hi {{name}},</p>
      <p>Thanks for subscribing! You're now part of a growing community of Kenyan professionals who get:</p>
      <ul style="line-height:2;">
        <li><strong>Weekly featured jobs</strong> — handpicked before they appear on the site</li>
        <li><strong>Salary insights</strong> — know what you're worth in the Kenyan market</li>
        <li><strong>Career tips from hiring managers</strong> — the advice that actually gets you shortlisted</li>
      </ul>

      <div style="background:linear-gradient(135deg,#f0f7ff,#e8f4ff);border:2px solid #0A66C2;border-radius:12px;padding:24px;margin:24px 0;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#0A66C2;">🎁 Your Free Job Seeker's Toolkit</p>
        <p style="margin:0 0 14px;color:#555;">Everything you need to land more interviews, in one place:</p>
        <table cellspacing="0" cellpadding="4" style="width:100%;">
          <tr><td style="color:#0A66C2;font-weight:bold;">✓</td><td>Professional CV template (ATS-friendly)</td></tr>
          <tr><td style="color:#0A66C2;font-weight:bold;">✓</td><td>Cover letter template that gets read</td></tr>
          <tr><td style="color:#0A66C2;font-weight:bold;">✓</td><td>Interview prep checklist</td></tr>
          <tr><td style="color:#0A66C2;font-weight:bold;">✓</td><td>Salary negotiation script</td></tr>
        </table>
        <p style="text-align:center;margin:20px 0 0;">
          <a href="{{toolkit_url}}" style="display:inline-block;padding:14px 36px;background:#0A66C2;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">Access My Free Toolkit →</a>
        </p>
      </div>

      <p style="color:#666;font-size:14px;">If the button above doesn't work, copy this link into your browser:<br>
      <a href="{{toolkit_url}}" style="color:#0A66C2;">{{toolkit_url}}</a></p>
    </td></tr>
    <tr><td style="padding:20px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
      <p>&copy; {{year}} StemBird. All rights reserved.</p>
      <p><a href="{{unsubscribe_url}}" style="color:#666;">Unsubscribe</a> | <a href="{{site_url}}/privacy" style="color:#666;">Privacy Policy</a></p>
    </td></tr>
  </table>
</body>
</html>$html$,
  jsonb_build_object(
    'name', 'Popup Newsletter Welcome',
    'description', 'Sent automatically when a visitor submits the homepage email subscription popup. Includes the free toolkit download link.',
    'subject', '🎁 Welcome to StemBird — Your Free Toolkit Is Inside',
    'placeholders', jsonb_build_array('name', 'email', 'site_url', 'toolkit_url', 'unsubscribe_url', 'year'),
    'extra', jsonb_build_object(
      'trigger', 'lead_magnet_popup',
      'popup', jsonb_build_object(
        'title', 'Land Your Next Role Faster',
        'description', 'Get our free Kenyan Job Search Toolkit — CV templates, cover letter frameworks, interview prep, and salary negotiation scripts. Plus weekly curated jobs.',
        'cta_label', 'Send Me the Toolkit',
        'disclaimer', 'No spam. Unsubscribe anytime. Built for Kenyan job seekers.'
      )
    ),
    'is_active', true
  )
)
ON CONFLICT (page_slug, section_key) DO UPDATE SET
  content_type = EXCLUDED.content_type,
  content_value = EXCLUDED.content_value,
  metadata = EXCLUDED.metadata,
  updated_at = NOW()
WHERE
  page_content.content_value IS NULL
  OR length(trim(page_content.content_value)) < 80
  OR page_content.content_value = '<p>test</p>';


-- ----------------------------------------------------------------
-- >>> 20260719_seed_kcb_oracle_cloud_scraper_source.sql
-- ----------------------------------------------------------------
-- ============================================================
-- Seed: KCB Group Oracle Cloud HCM career site
-- ============================================================
-- Live-verified:
--   https://eoin.fa.em3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_3001/jobs
--   Public REST recruitingCEJobRequisitions / Details (filterCountry KE)
--
-- Replaces the empty paused Workable board (kcb-group) for Kenya intake.
-- Safe to re-run (ON CONFLICT upserts).
-- ============================================================

BEGIN;

INSERT INTO public.scraper_sources (source_id, name, base_url, is_active, selectors)
VALUES (
  'kcb-group-oracle-cloud',
  'KCB Group',
  'https://eoin.fa.em3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_3001/jobs',
  true,
  '{
    "type": "oracle_cloud",
    "host": "eoin.fa.em3.oraclecloud.com",
    "siteNumber": "CX_3001",
    "filterCountry": "KE",
    "category": "employer"
  }'::jsonb
)
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  selectors = EXCLUDED.selectors;

-- Keep legacy Workable KCB source paused (board currently empty)
UPDATE public.scraper_sources
SET is_active = false
WHERE source_id = 'kcb-group';

COMMIT;


-- ----------------------------------------------------------------
-- >>> 20260719_seed_taleo_be_kenyan_scraper_sources.sql
-- ----------------------------------------------------------------
-- ============================================================
-- Seed: Kenyan Oracle Taleo Business Edition (TBE) sources
-- ============================================================
-- Live-verified public TBE boards with Kenya location filters:
--   • CARE                          — phg.tbe.taleo.net/phg02 / CAREUSA / cws=63
--   • Conservation International    — phh.tbe.taleo.net/phh04 / CONSERVATION / cws=39
--
-- Note: Kenya openings fluctuate; filterCountry keeps only KE rows when present.
-- Requires taleo_be adapter wired in scrapeDiscover / scrapeProcess.
-- Safe to re-run (ON CONFLICT upserts).
-- ============================================================

BEGIN;

INSERT INTO public.scraper_sources (source_id, name, base_url, is_active, selectors)
VALUES
  (
    'care-taleo-be',
    'CARE',
    'https://phg.tbe.taleo.net/phg02/ats/careers/v2/jobSearch?org=CAREUSA&cws=63',
    true,
    '{
      "type": "taleo_be",
      "org": "CAREUSA",
      "cws": "63",
      "hostPath": "phg.tbe.taleo.net/phg02",
      "filterCountry": "Kenya",
      "category": "ngo"
    }'::jsonb
  ),
  (
    'conservation-international-taleo-be',
    'Conservation International',
    'https://phh.tbe.taleo.net/phh04/ats/careers/v2/jobSearch?org=CONSERVATION&cws=39',
    true,
    '{
      "type": "taleo_be",
      "org": "CONSERVATION",
      "cws": "39",
      "hostPath": "phh.tbe.taleo.net/phh04",
      "filterCountry": "Kenya",
      "category": "ngo"
    }'::jsonb
  )
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  selectors = EXCLUDED.selectors;

COMMIT;


-- ----------------------------------------------------------------
-- >>> 20260719_seed_taleo_kenyan_scraper_sources.sql
-- ----------------------------------------------------------------
-- ============================================================
-- Seed: Kenyan Oracle Taleo Enterprise scraper sources
-- ============================================================
-- Live-verified Kenyan Taleo Enterprise boards:
--   • Equity Bank          — equitybank.taleo.net / ext_new  (REST searchjobs)
--   • Britam               — britam.taleo.net / ke           (REST; filterCountry)
--   • Aga Khan University  — aku.taleo.net / ex              (legacy joblist.ftl)
--
-- Requires taleo adapter wired in scrapeDiscover / scrapeProcess.
-- Safe to re-run (ON CONFLICT upserts).
-- ============================================================

BEGIN;

INSERT INTO public.scraper_sources (source_id, name, base_url, is_active, selectors)
VALUES
  (
    'equity-bank-taleo',
    'Equity Bank',
    'https://equitybank.taleo.net/careersection/ext_new/jobsearch.ftl',
    true,
    '{
      "type": "taleo",
      "host": "equitybank.taleo.net",
      "section": "ext_new",
      "filterCountry": "Kenya",
      "category": "employer"
    }'::jsonb
  ),
  (
    'britam-taleo',
    'Britam',
    'https://britam.taleo.net/careersection/ke/jobsearch.ftl',
    true,
    '{
      "type": "taleo",
      "host": "britam.taleo.net",
      "section": "ke",
      "filterCountry": "Kenya",
      "category": "employer"
    }'::jsonb
  ),
  (
    'aga-khan-university-taleo',
    'Aga Khan University',
    'https://aku.taleo.net/careersection/ex/joblist.ftl',
    true,
    '{
      "type": "taleo",
      "host": "aku.taleo.net",
      "section": "ex",
      "filterCountry": "Kenya",
      "category": "employer"
    }'::jsonb
  )
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  selectors = EXCLUDED.selectors;

COMMIT;


-- ----------------------------------------------------------------
-- >>> 20260720_create_payments_table.sql
-- ----------------------------------------------------------------
-- Generic payments table for M-Pesa (Daraja) and future providers
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'mpesa',
  transaction_reference TEXT NOT NULL,
  merchant_request_id TEXT,
  checkout_request_id TEXT,
  mpesa_receipt_number TEXT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED')),
  description TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  result_code INTEGER,
  result_desc TEXT,
  raw_callback JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_transaction_reference_uidx
  ON public.payments (transaction_reference);

CREATE UNIQUE INDEX IF NOT EXISTS payments_checkout_request_id_uidx
  ON public.payments (checkout_request_id)
  WHERE checkout_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments (status);
CREATE INDEX IF NOT EXISTS payments_provider_idx ON public.payments (provider);
CREATE INDEX IF NOT EXISTS payments_created_at_idx ON public.payments (created_at DESC);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can read their own payments
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments"
  ON public.payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- No direct client inserts/updates; API uses service role
DROP POLICY IF EXISTS "Service role manages payments" ON public.payments;

-- Reuse shared updated_at trigger function when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'update_updated_at_column' AND n.nspname = 'public'
  ) THEN
    DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
    CREATE TRIGGER update_payments_updated_at
      BEFORE UPDATE ON public.payments
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE public.payments IS 'Payment transactions (M-Pesa Daraja STK Push and future providers)';
COMMENT ON COLUMN public.payments.transaction_reference IS 'App-generated unique reference sent as AccountReference';
COMMENT ON COLUMN public.payments.raw_callback IS 'Full Safaricom callback payload for debugging/audit';


-- ----------------------------------------------------------------
-- >>> 20260720_seed_brightermonday_scraper_source.sql
-- ----------------------------------------------------------------
-- ============================================================
-- Seed BrighterMonday Kenya as an in-app scraper source
-- ============================================================
-- BrighterMonday has no public API. Discover reads /jobs listing
-- pages; process parses JobPosting JSON-LD on /listings/{slug}.
-- Safe to re-run (ON CONFLICT).
-- ============================================================

BEGIN;

INSERT INTO public.scraper_sources (source_id, name, base_url, is_active, selectors)
VALUES (
  'brightermonday-kenya',
  'BrighterMonday Kenya',
  'https://www.brightermonday.co.ke/jobs',
  true,
  '{
    "type": "brightermonday",
    "category": "other",
    "sourceKind": "job_board",
    "maxPages": 5
  }'::jsonb
)
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  selectors = EXCLUDED.selectors;

COMMIT;


-- ----------------------------------------------------------------
-- >>> 20260721_mark_brightermonday_job_board.sql
-- ----------------------------------------------------------------
-- Ensure BrighterMonday is marked as a job board (not an employer ATS).
-- Prefer employer apply links/emails from listing detail; board URL is fallback only.
UPDATE public.scraper_sources
SET selectors = selectors || '{"sourceKind": "job_board"}'::jsonb
WHERE source_id = 'brightermonday-kenya'
  AND COALESCE(selectors->>'sourceKind', '') IS DISTINCT FROM 'job_board';


-- ----------------------------------------------------------------
-- >>> 20260722_seed_fuzu_scraper_source.sql
-- ----------------------------------------------------------------
-- ============================================================
-- Seed Fuzu Kenya as an in-app scraper source
-- ============================================================
-- Fuzu has no public API. Discover reads /kenya/job listing
-- pages (ItemList JSON-LD); process parses JobPosting JSON-LD
-- on /kenya/jobs/{slug}. Safe to re-run (ON CONFLICT).
-- ============================================================

BEGIN;

INSERT INTO public.scraper_sources (source_id, name, base_url, is_active, selectors)
VALUES (
  'fuzu-kenya',
  'Fuzu Kenya',
  'https://www.fuzu.com/kenya/job',
  true,
  '{
    "type": "fuzu",
    "category": "other",
    "sourceKind": "job_board",
    "maxPages": 5
  }'::jsonb
)
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  selectors = EXCLUDED.selectors;

COMMIT;


-- ----------------------------------------------------------------
-- >>> 20260722_seed_myjobmag_scraper_source.sql
-- ----------------------------------------------------------------
-- ============================================================
-- Seed MyJobMag Kenya as an in-app scraper source
-- ============================================================
-- MyJobMag has no public API. Discover reads /jobs listing pages
-- (href="/job/{slug}"); process parses JobPosting JSON-LD (with
-- HTML fallback for .job-details / .job-key-info). Safe to re-run
-- (ON CONFLICT).
-- ============================================================

BEGIN;

INSERT INTO public.scraper_sources (source_id, name, base_url, is_active, selectors)
VALUES (
  'myjobmag-kenya',
  'MyJobMag Kenya',
  'https://www.myjobmag.co.ke/jobs',
  true,
  '{
    "type": "myjobmag",
    "category": "other",
    "sourceKind": "job_board",
    "maxPages": 15
  }'::jsonb
)
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  selectors = EXCLUDED.selectors;

COMMIT;


-- ----------------------------------------------------------------
-- >>> 20260728_bump_myjobmag_max_pages.sql
-- ----------------------------------------------------------------
-- ============================================================
-- MyJobMag: deepen discover window for large posting days
-- ============================================================
-- First-run backlog needed ~10 pages (~400+ jobs). Incremental
-- discover still stops early once consecutive pages are already
-- known; maxPages is the ceiling for big new-job waves.
-- ============================================================

BEGIN;

UPDATE public.scraper_sources
SET selectors = jsonb_set(
  COALESCE(selectors, '{}'::jsonb),
  '{maxPages}',
  '15'::jsonb,
  true
)
WHERE source_id = 'myjobmag-kenya';

COMMIT;


-- ----------------------------------------------------------------
-- >>> 20260728_fix_user_profiles_role_auth.sql
-- ----------------------------------------------------------------
-- Align user_profiles.role with canonical user_roles, and stop clients from
-- self-escalating via profile role updates or user_roles inserts.

BEGIN;

-- 1) Sync denormalized profile role from user_roles (admin > employer > candidate)
UPDATE public.user_profiles up
SET role = sub.primary_role,
    updated_at = NOW()
FROM (
  SELECT
    ur.user_id,
    CASE
      WHEN bool_or(ur.role = 'admin') THEN 'admin'
      WHEN bool_or(ur.role = 'employer') THEN 'employer'
      ELSE 'candidate'
    END AS primary_role
  FROM public.user_roles ur
  GROUP BY ur.user_id
) sub
WHERE up.id = sub.user_id
  AND COALESCE(up.role, '') IS DISTINCT FROM sub.primary_role;

-- 2) Prefer admin when get_user_role is used (was LIMIT 1 with no priority)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'admin' THEN 1
    WHEN 'employer' THEN 2
    ELSE 3
  END
  LIMIT 1;
$$;

-- 3) Block non-admin clients from changing user_profiles.role
CREATE OR REPLACE FUNCTION public.prevent_user_profiles_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.role() = 'authenticated' AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Updating user_profiles.role is not allowed';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.role = 'admin' THEN
    IF auth.role() = 'authenticated' AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Creating an admin user_profiles row is not allowed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_user_profiles_role_escalation ON public.user_profiles;
CREATE TRIGGER trg_prevent_user_profiles_role_escalation
  BEFORE INSERT OR UPDATE OF role ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_profiles_role_escalation();

-- 4) Block authenticated clients from inserting an admin row into user_roles.
-- Signup trigger is SECURITY DEFINER so it still works.
CREATE OR REPLACE FUNCTION public.prevent_user_roles_admin_self_grant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin'
     AND auth.role() = 'authenticated'
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Granting admin role is not allowed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_user_roles_admin_self_grant ON public.user_roles;
CREATE TRIGGER trg_prevent_user_roles_admin_self_grant
  BEFORE INSERT OR UPDATE OF role ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_roles_admin_self_grant();

-- 5) Signup metadata must never self-assign admin
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested text;
  assigned public.app_role;
BEGIN
  requested := lower(COALESCE(NEW.raw_user_meta_data->>'role', 'candidate'));
  IF requested IN ('employer', 'candidate') THEN
    assigned := requested::public.app_role;
  ELSE
    assigned := 'candidate'::public.app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 6) Optional: ensure known StemBird admin accounts stay admins.
-- Safe to re-run. Uses auth.users emails (service-role / SQL editor only).
INSERT INTO public.user_roles (user_id, role)
SELECT au.id, 'admin'::public.app_role
FROM auth.users au
WHERE lower(au.email) IN (
  'ejuma90@gmail.com',
  'comfonex@gmail.com'
)
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.user_profiles up
SET role = 'admin',
    updated_at = NOW()
FROM auth.users au
WHERE up.id = au.id
  AND lower(au.email) IN (
    'ejuma90@gmail.com',
    'comfonex@gmail.com'
  )
  AND COALESCE(up.role, '') IS DISTINCT FROM 'admin';

COMMIT;


-- ----------------------------------------------------------------
-- >>> 20260731_add_salary_is_estimated.sql
-- ----------------------------------------------------------------
-- Add flag distinguishing stated source salaries from Kenyan market estimates
-- used when scrapers find no salary/range on the job posting.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS salary_is_estimated BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN jobs.salary_is_estimated IS
  'True when salary_min/salary_max were filled from Kenyan market estimates because the source listing omitted pay.';

CREATE INDEX IF NOT EXISTS idx_jobs_salary_is_estimated
  ON jobs (salary_is_estimated)
  WHERE salary_is_estimated = true;


-- ----------------------------------------------------------------
-- >>> 20260801_backfill_board_date_posted.sql
-- ----------------------------------------------------------------
-- ============================================================
-- Backfill jobs.date_posted from board JSON-LD datePosted
-- ============================================================
-- Scraped MyJobMag / BrighterMonday / Fuzu jobs previously defaulted
-- date_posted to insert time (now()), so day buckets on StemBird
-- did not match the source board. raw_data on scraped_job_sources
-- still holds the original datePosted for published rows.
-- ============================================================

BEGIN;

UPDATE public.jobs AS j
SET date_posted = (s.raw_data->>'datePosted')::timestamptz
FROM public.scraped_job_sources AS s
WHERE s.job_id = j.id
  AND s.status = 'published'
  AND s.source_id IN ('myjobmag-kenya', 'brightermonday-kenya', 'fuzu-kenya')
  AND s.raw_data ? 'datePosted'
  AND NULLIF(TRIM(s.raw_data->>'datePosted'), '') IS NOT NULL
  AND (s.raw_data->>'datePosted') ~ '^[0-9]{4}-'
  AND (
    j.date_posted IS NULL
    OR j.date_posted IS NOT DISTINCT FROM j.created_at
    OR ABS(EXTRACT(EPOCH FROM (j.date_posted - j.created_at))) < 120
  );

COMMIT;


-- ----------------------------------------------------------------
-- >>> 20260807_add_user_profile_name_phone.sql
-- ----------------------------------------------------------------
-- Add signup name/phone fields to user_profiles and restore accurate signup dates.
-- The admin "Joined" column reads user_profiles.created_at, but the 20260614
-- candidate-profile backfill stamped every existing row with the migration
-- timestamp. Restore the real signup date from auth.users.

ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Restore real signup dates from auth.users (safe to re-run)
UPDATE public.user_profiles up
SET created_at = au.created_at
FROM auth.users au
WHERE up.id = au.id
  AND up.created_at IS DISTINCT FROM au.created_at;

-- Backfill first/last name from full_name where it looks like a real name
UPDATE public.user_profiles
SET first_name = split_part(full_name, ' ', 1),
    last_name = NULLIF(substr(full_name, strpos(full_name, ' ') + 1), '')
WHERE full_name IS NOT NULL
  AND strpos(full_name, ' ') > 0
  AND (first_name IS NULL OR first_name = '');

-- Backfill phone from candidate_profiles where available
UPDATE public.user_profiles up
SET phone = cp.phone
FROM public.candidate_profiles cp
WHERE cp.user_id = up.id
  AND up.phone IS NULL
  AND cp.phone IS NOT NULL
  AND cp.phone <> '';


-- ----------------------------------------------------------------
-- >>> 20260813_reset_scraped_jobs_date_posted.sql
-- ----------------------------------------------------------------
-- ============================================================
-- Reset scraped jobs.date_posted to when StemBird added them
-- ============================================================
-- 20260801_backfill_board_date_posted.sql copied the source board's
-- datePosted into jobs.date_posted, which made Google see stale
-- freshness on recrawl and shifted the day buckets. StemBird's
-- date_posted should be the time the job was added/published here
-- (DB default now() == created_at), not the source's publication date.
-- ============================================================

BEGIN;

UPDATE public.jobs AS j
SET date_posted = j.created_at
FROM public.scraped_job_sources AS s
WHERE s.job_id = j.id
  AND s.status = 'published'
  AND j.date_posted IS DISTINCT FROM j.created_at;

COMMIT;


-- ----------------------------------------------------------------
-- >>> 20260815_expire_jobs_on_valid_through.sql
-- ----------------------------------------------------------------
-- Expire jobs whose source deadline (valid_through) has passed.
--
-- expire_old_jobs() previously only expired rows where expires_at <= now() (the
-- promoted/featured lifecycle), so scraped jobs whose application deadline passed
-- stayed status='active' with a past valid_through. Google drops those from the
-- JobPosting experience on recrawl, which was a steady source of "valid item"
-- attrition. Now the function also expires on valid_through.

CREATE OR REPLACE FUNCTION expire_old_jobs()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE jobs
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active'
    AND auto_renew = FALSE
    AND (
      (expires_at IS NOT NULL AND expires_at <= NOW())
      OR (valid_through IS NOT NULL AND valid_through <= NOW())
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM expired;

  -- Log expired jobs
  INSERT INTO job_history (job_id, action)
  SELECT id, 'expired' FROM jobs
  WHERE status = 'expired'
  AND (
    (expires_at IS NOT NULL AND expires_at <= NOW())
    OR (valid_through IS NOT NULL AND valid_through <= NOW())
  )
  AND NOT EXISTS (
    SELECT 1 FROM job_history
    WHERE job_history.job_id = jobs.id
    AND action = 'expired'
    AND created_at > NOW() - INTERVAL '1 hour'
  );

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill: mark the existing "active but deadline passed" jobs as expired so
-- they stop being served with JobPosting markup that Google drops on recrawl.
UPDATE jobs
SET status = 'expired', updated_at = NOW()
WHERE status = 'active'
AND auto_renew = FALSE
AND valid_through IS NOT NULL
AND valid_through <= NOW();


-- ----------------------------------------------------------------
-- >>> 20260816_expire_stale_employer_jobs.sql
-- ----------------------------------------------------------------
-- ============================================================
-- One-off cleanup: expire stale employer-posted jobs
-- ============================================================
-- Google flags 39+ active jobs as "Missing field validThrough"
-- (non-critical warning; items remain valid). All of them are
-- employer-posted jobs (source = 'Employer') with no deadline and
-- no auto-renew, many months old. They should not remain "active".
--
-- This is a ONE-OFF cleanup (no policy change): it targets only
-- active, non-auto-renew employer jobs older than 6 months with no
-- valid_through and no expires_at.
--
-- For each match it sets:
--   * status        = 'expired'         (drops the job from the sitemap)
--   * valid_through = NOW()             (past deadline => the page shows the
--                                        "expired" banner, ApplySection closes,
--                                        and JSON-LD emits a past validThrough,
--                                        which is Google's accepted signal to
--                                        stop showing the posting)
--   * application_deadline syncs automatically via the trg_sync_application_deadline
--     trigger.
-- ============================================================

BEGIN;

-- Dry-run count (sanity check before the UPDATE):
-- SELECT COUNT(*) FROM jobs
-- WHERE status = 'active'
--   AND auto_renew = FALSE
--   AND valid_through IS NULL
--   AND expires_at IS NULL
--   AND source = 'Employer'
--   AND COALESCE(date_posted, created_at) < NOW() - INTERVAL '180 days';

UPDATE public.jobs
SET status        = 'expired',
    updated_at    = NOW(),
    valid_through = NOW()
WHERE status = 'active'
  AND auto_renew = FALSE
  AND valid_through IS NULL
  AND expires_at IS NULL
  AND source = 'Employer'
  AND COALESCE(date_posted, created_at) < NOW() - INTERVAL '180 days';

COMMIT;


-- ----------------------------------------------------------------
-- >>> 20260816_restore_scraped_jobs_board_date_posted.sql
-- ----------------------------------------------------------------
-- ============================================================
-- Restore scraped jobs.date_posted to the source board's
-- original employer posting date where that date is available
-- ============================================================
-- 20260813_reset_scraped_jobs_date_posted.sql set date_posted = created_at
-- for all published scraped jobs, so Google's datePosted no longer reflects
-- the employer's original posting date. Google requires datePosted to be
-- "the original date that employer posted the job."
--
-- This migration reverses that for jobs where scraped_job_sources.raw_data
-- still holds the source board's datePosted (the same signal used by the
-- 20260801 backfill). Jobs without a recoverable board date keep their
-- current value (created_at fallback).
-- ============================================================

BEGIN;

UPDATE public.jobs AS j
SET date_posted = (s.raw_data->>'datePosted')::timestamptz
FROM public.scraped_job_sources AS s
WHERE s.job_id = j.id
  AND s.status = 'published'
  AND s.source_id IN ('myjobmag-kenya', 'brightermonday-kenya', 'fuzu-kenya')
  AND s.raw_data ? 'datePosted'
  AND NULLIF(TRIM(s.raw_data->>'datePosted'), '') IS NOT NULL
  AND (s.raw_data->>'datePosted') ~ '^[0-9]{4}-'
  -- Only rewrite jobs that still carry the publish-time fallback, so we never
  -- clobber a manually corrected date_posted.
  AND (
    j.date_posted IS NULL
    OR j.date_posted IS NOT DISTINCT FROM j.created_at
    OR ABS(EXTRACT(EPOCH FROM (j.date_posted - j.created_at))) < 120
  );

COMMIT;


-- ----------------------------------------------------------------
-- >>> 20260817_create_active_jobs_by_county_view.sql
-- ----------------------------------------------------------------
-- ============================================================
-- Active jobs grouped by county — efficient feed for the
-- "Live Jobs Across Kenya" homepage map.
-- ============================================================
-- The map must count active/live jobs per county without shipping every
-- job record to the client. This view pre-aggregates the county column in
-- Postgres using the same active-status rule the rest of the application
-- uses (status = 'active'), so the homepage can read one small result set.
--
-- The application layer (src/lib/jobsByCounty.ts) prefers this view and
-- falls back to a server-side column scan if it has not been applied yet.
--
-- APPLYING: run this file in the Supabase dashboard SQL editor (or `supabase
-- db push` once the local/remote migration history is in sync). Until then
-- the homepage still works via the built-in fallback scan.
-- ============================================================

CREATE OR REPLACE VIEW public.active_jobs_by_county
WITH (security_invoker = true) AS
SELECT
  job_location_county AS county,
  COUNT(*)::bigint AS job_count
FROM public.jobs
WHERE status = 'active'
GROUP BY job_location_county;

-- Expose to the anon + authenticated roles (the same public-read audience
-- that can already read the jobs table).
GRANT SELECT ON public.active_jobs_by_county TO anon, authenticated;

-- Index used by the grouped scan (status + county).
CREATE INDEX IF NOT EXISTS idx_jobs_status_county
  ON public.jobs (status, job_location_county);


-- ----------------------------------------------------------------
-- >>> 20260818_create_active_jobs_by_function_view.sql
-- ----------------------------------------------------------------
-- ============================================================
-- Active jobs grouped by function — efficient feed for the
-- "Explore Jobs by Function" homepage visualization.
-- ============================================================
-- The bars/donut must count active/live jobs per function without shipping
-- every job record to the client. This view pre-aggregates the job_function
-- column in Postgres using the same active-status rule the rest of the
-- application uses (status = 'active'), so the homepage reads one small
-- result set.
--
-- Jobs without a function are bucketed under "Other / Miscellaneous" (a real
-- canonical function) so the sum of the view always equals the total active
-- job count shown elsewhere on the homepage.
--
-- The application layer (src/lib/jobsByFunction.ts) prefers this view and
-- falls back to a server-side column scan if it has not been applied yet.
--
-- APPLYING: run this file in the Supabase dashboard SQL editor (or `supabase
-- db push` once the local/remote migration history is in sync). Until then
-- the homepage still works via the built-in fallback scan.
-- ============================================================

CREATE OR REPLACE VIEW public.active_jobs_by_function
WITH (security_invoker = true) AS
SELECT
  COALESCE(NULLIF(TRIM(job_function), ''), 'Other / Miscellaneous') AS function_name,
  COUNT(*)::bigint AS job_count
FROM public.jobs
WHERE status = 'active'
GROUP BY COALESCE(NULLIF(TRIM(job_function), ''), 'Other / Miscellaneous');

-- Expose to the anon + authenticated roles (the same public-read audience
-- that can already read the jobs table).
GRANT SELECT ON public.active_jobs_by_function TO anon, authenticated;

-- Index used by the grouped scan (status + function).
CREATE INDEX IF NOT EXISTS idx_jobs_status_function
  ON public.jobs (status, job_function);


-- ----------------------------------------------------------------
-- >>> 20260818_create_social_publishing.sql
-- ----------------------------------------------------------------
-- ============================================================================
-- Social Publishing module (Phase 1: Buffer integration)
--
-- Central place for social posts so StemBird can later replace Buffer with
-- a native publishing engine without redesigning the data model.
--
-- Design notes:
--   * social_posts.job_id is nullable because future posts may not relate to
--     a single job (e.g. roundups, brand content).
--   * Duplicate protection is enforced at the application layer (job_id +
--     platform + status) so evergreen jobs can still be reposted explicitly
--     via is_repost = true.
--   * Both tables are service-role only (RLS enabled, no policies). Buffer
--     credentials are never readable by the browser.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. social_posts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  platform TEXT NOT NULL
    CHECK (platform IN ('linkedin', 'facebook', 'instagram')),
  channel_id TEXT,          -- Buffer channel id the post was sent to
  channel_service TEXT,     -- Buffer channel service (linkedin/facebook/instagram/...)
  post_text TEXT NOT NULL,
  media_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN
      ('draft', 'ready', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  buffer_post_id TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message TEXT,
  is_repost BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS enabled with no policies: only the service-role admin API routes
-- (which run requireAdmin) can touch social posts.
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_social_posts_status
  ON public.social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_job_id
  ON public.social_posts(job_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform
  ON public.social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_at
  ON public.social_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_social_posts_buffer_post_id
  ON public.social_posts(buffer_post_id);

-- Fast duplicate check: job + platform for anything that counts as "already
-- published or queued" (drafts / failures / cancellations are excluded).
CREATE INDEX IF NOT EXISTS idx_social_posts_job_platform_active
  ON public.social_posts(job_id, platform)
  WHERE status IN ('ready', 'scheduled', 'publishing', 'published');

-- ---------------------------------------------------------------------------
-- 2. buffer_config (single row; service-role only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.buffer_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  api_key TEXT,                     -- never returned to the browser
  account_name TEXT,
  account_email TEXT,
  organization_id TEXT,
  channels_json JSONB DEFAULT '[]'::jsonb,
  connected_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.buffer_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.buffer_config (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------
-- >>> 20260818_add_channel_name_to_social_posts.sql
-- ----------------------------------------------------------------
-- ============================================================================
-- Add channel_name to social_posts
--
-- publishToBuffer stores the Buffer channel display name on the post record
-- (channel_name), but the original social publishing migration omitted the
-- column. Without it, updating a post after sending to Buffer fails with
-- "column channel_name does not exist".
-- ============================================================================

ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS channel_name TEXT;


-- ----------------------------------------------------------------
-- >>> 20260819_create_active_jobs_by_industry_view.sql
-- ----------------------------------------------------------------
-- ============================================================
-- Active jobs grouped by industry — efficient feed for the
-- "Jobs by Industry" hub and homepage teaser.
-- ============================================================
-- Counts active/live jobs per industry without shipping every job
-- record to the client. Uses the same active-status rule as the rest of
-- the application (status = 'active').
--
-- Jobs without an industry are bucketed under
-- "Non-classified / Miscellaneous" (a real canonical industry) so the
-- sum of the view always equals the total active job count.
--
-- The application layer (src/lib/jobsByIndustry.ts) prefers this view and
-- falls back to a server-side column scan if it has not been applied yet.
-- ============================================================

CREATE OR REPLACE VIEW public.active_jobs_by_industry
WITH (security_invoker = true) AS
SELECT
  COALESCE(NULLIF(TRIM(industry), ''), 'Non-classified / Miscellaneous') AS industry_name,
  COUNT(*)::bigint AS job_count
FROM public.jobs
WHERE status = 'active'
GROUP BY COALESCE(NULLIF(TRIM(industry), ''), 'Non-classified / Miscellaneous');

GRANT SELECT ON public.active_jobs_by_industry TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_jobs_status_industry
  ON public.jobs (status, industry);


-- ----------------------------------------------------------------
-- >>> 20260821_seed_navigation_and_jobs_cms.sql
-- ----------------------------------------------------------------
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
    'Browse every job function on StemBird. See live counts, compare fields, and open roles in the area you work.',
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


-- ----------------------------------------------------------------
-- >>> 20260822_seed_about_contact_companies_cms.sql
-- ----------------------------------------------------------------
-- Seed About Us, Contact Us, and Companies CMS rows so the admin editors are never empty.
-- Existing keys are left unchanged.

INSERT INTO page_content (page_slug, section_key, content_type, content_value, metadata, seo_title, seo_meta_description, seo_url_slug, seo_canonical_url, seo_h1_title, seo_index, seo_follow) VALUES
  ('about', 'hero_title', 'text', 'About StemBird', '{}'::jsonb, 'About StemBird - Kenya''s Fastest Path from Job Search to Job Offer', 'Learn how StemBird uses AI-powered matching, free career tools, and verified job listings to help Kenyan professionals land interviews 3x faster than any other job board.', '/about', 'https://www.careersasa.co.ke/about', 'About StemBird', true, true),
  ('about', 'hero_subtitle', 'text', 'Kenya''s AI-Powered Job Platform. Where Skills Meet Opportunity', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'story_title', 'text', 'Why We Built StemBird', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'story_p1', 'text', 'We watched thousands of talented Kenyans send 50, 100, even 200 applications and hear nothing back. Not for lack of qualifications. The system was broken. Generic job boards match keywords, not skills. Resumes disappear into black holes. And employers waste weeks sifting through unqualified applicants.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'story_p2', 'text', 'StemBird was built to fix that. We use AI-powered matching that connects candidates to jobs they''ll actually get, not just jobs that exist. We give every user free career tools worth KES 10,000+: CV builder, cover letter generator, LinkedIn optimizer. We believe the barrier to getting hired should never be money. And we give employers pre-screened, qualified candidates so they can hire in days, not months.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'story_p3', 'text', 'The result? Our users report 3x more interview callbacks than on other platforms, and employers fill positions faster with candidates who actually fit the role.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'values_title', 'text', 'Our Core Values', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'value_speed_title', 'text', 'Speed', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'value_speed_body', 'text', 'Getting hired shouldn''t take months. Our AI matching and real-time alerts cut job search time in half. Every day without work is a day too long.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'value_transparency_title', 'text', 'Transparency', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'value_transparency_body', 'text', 'No hidden fees. No ghost listings. Every job is verified, every salary shown where possible, and every application tracked. You deserve honesty in your job search.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'value_fairness_title', 'text', 'Fairness', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'value_fairness_body', 'text', 'Your background shouldn''t determine your future. StemBird is free for every job seeker. The best candidate might be someone who can''t afford a KES 5,000 CV service.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'value_innovation_title', 'text', 'Kenyan-First Innovation', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'value_innovation_body', 'text', 'We build for Kenya''s job market, from county-specific job filters to M-Pesa-friendly pricing to Swahili-friendly support. International tools don''t understand our market. We do.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'stats_title', 'text', 'StemBird by the Numbers', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'stats_subtitle', 'text', 'Real results, not empty promises', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'stats_jobs_value', 'text', '1,070+', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'stats_jobs_label', 'text', 'Verified Active Jobs', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'stats_companies_value', 'text', '103+', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'stats_companies_label', 'text', 'Hiring Companies', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'stats_callbacks_value', 'text', '3x', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'stats_callbacks_label', 'text', 'More Interview Callbacks', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'commitment_title', 'text', 'What This Means for You', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'commitment_seeker', 'text', 'If you''re a job seeker: You get AI-matched to jobs that fit your actual skills, alerted in real time, and supported with free career tools, so you stop spraying applications and start landing interviews.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('about', 'commitment_employer', 'text', 'If you''re an employer: You get pre-screened, qualified candidates delivered to your inbox, not 500 unqualified applicants you have to sift through. Post your first 3 jobs free and see the difference yourself.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true)
ON CONFLICT (page_slug, section_key) DO NOTHING;

INSERT INTO page_content (page_slug, section_key, content_type, content_value, metadata, seo_title, seo_meta_description, seo_url_slug, seo_canonical_url, seo_h1_title, seo_index, seo_follow) VALUES
  ('contact', 'hero_title', 'text', 'Contact Us', '{}'::jsonb, 'Contact StemBird | Support for Job Seekers and Employers', 'Get in touch with StemBird. Email support@careersasa.co.ke or send a message — we typically respond within 24 hours on business days.', '/contact', 'https://www.careersasa.co.ke/contact', 'Contact Us', true, true),
  ('contact', 'hero_subtitle', 'text', 'We''re here to help. Reach out with any questions or concerns.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'form_title', 'text', 'Send Us a Message', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'form_subtitle', 'text', 'Fill out the form below and we''ll get back to you soon.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'form_button', 'text', 'Send Message', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'info_title', 'text', 'Contact Information', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'email_label', 'text', 'Email', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'email_value', 'text', 'support@careersasa.co.ke', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'hours_label', 'text', 'Business Hours', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'hours_weekday', 'text', 'Monday - Friday: 8:00 AM - 6:00 PM', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'hours_saturday', 'text', 'Saturday: 9:00 AM - 2:00 PM', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'hours_sunday', 'text', 'Sunday: Closed', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'support_title', 'text', 'Quick Support', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'support_body', 'text', 'Email us anytime — we typically respond within 24 hours during business days.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'faq_title', 'text', 'FAQ', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('contact', 'faq_body', 'text', 'Before reaching out, check our FAQ section for quick answers to common questions about job postings, applications, and account management.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true)
ON CONFLICT (page_slug, section_key) DO NOTHING;

INSERT INTO page_content (page_slug, section_key, content_type, content_value, metadata, seo_title, seo_meta_description, seo_url_slug, seo_canonical_url, seo_h1_title, seo_index, seo_follow) VALUES
  ('companies', 'eyebrow', 'text', 'Employers on StemBird', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true),
  ('companies', 'hero_title', 'text', 'Companies', '{}'::jsonb, 'Companies by Industry | StemBird', 'Browse Kenyan employers by industry on StemBird. Pick a sector to see company profiles and open jobs.', '/companies', 'https://www.careersasa.co.ke/companies', 'Companies', true, true),
  ('companies', 'hero_subtitle', 'text', 'Choose an industry to explore employers hiring in Kenya — or browse all companies at once.', '{}'::jsonb, NULL, NULL, NULL, NULL, NULL, true, true)
ON CONFLICT (page_slug, section_key) DO NOTHING;


-- ----------------------------------------------------------------
-- >>> 20260829_candidate_cvs_job_targeting.sql
-- ----------------------------------------------------------------
-- Attach a listing (or pasted JD) to a Career Tools CV so keyword gaps can be shown.
-- parent_cv_id records a tailored copy of another saved CV.

ALTER TABLE candidate_cvs
  ADD COLUMN IF NOT EXISTS parent_cv_id UUID REFERENCES candidate_cvs(id) ON DELETE SET NULL;

ALTER TABLE candidate_cvs
  ADD COLUMN IF NOT EXISTS target_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;

ALTER TABLE candidate_cvs
  ADD COLUMN IF NOT EXISTS target_jd_text TEXT;

CREATE INDEX IF NOT EXISTS idx_candidate_cvs_parent
  ON candidate_cvs(parent_cv_id);

CREATE INDEX IF NOT EXISTS idx_candidate_cvs_target_job
  ON candidate_cvs(target_job_id);

COMMENT ON COLUMN candidate_cvs.parent_cv_id IS
  'Source CV when this row is a tailored copy for a specific job.';
COMMENT ON COLUMN candidate_cvs.target_job_id IS
  'StemBird job this CV is targeted at, when attached from a listing.';
COMMENT ON COLUMN candidate_cvs.target_jd_text IS
  'Plain-text job description used for keyword comparison (from the listing or a paste).';


-- ----------------------------------------------------------------
-- >>> 20260829_career_tools_ai_usage.sql
-- ----------------------------------------------------------------
-- Daily meter for Career Tools AI suggestions (rewrite summary, bullets, skills, letter paragraphs).

CREATE TABLE IF NOT EXISTS career_tools_ai_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_career_tools_ai_usage_date
  ON career_tools_ai_usage(usage_date);

ALTER TABLE career_tools_ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS career_tools_ai_usage_select_own ON career_tools_ai_usage;
CREATE POLICY career_tools_ai_usage_select_own
  ON career_tools_ai_usage FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS career_tools_ai_usage_upsert_own ON career_tools_ai_usage;
CREATE POLICY career_tools_ai_usage_upsert_own
  ON career_tools_ai_usage FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE career_tools_ai_usage IS
  'Counts Career Tools /api/career-tools/suggest calls per user per UTC day.';


-- ----------------------------------------------------------------
-- >>> 20260829_cover_letter_content_json.sql
-- ----------------------------------------------------------------
-- Structured cover letter fields so saved letters can reopen in the visual editor
-- and download as the designed template (not a concatenated text blob).

ALTER TABLE candidate_cover_letters
  ADD COLUMN IF NOT EXISTS content_json JSONB;

COMMENT ON COLUMN candidate_cover_letters.content_json IS
  'Structured cover letter editor state: { templateName, fields }. content remains derived plaintext for clipboard/ATS.';


-- ----------------------------------------------------------------
-- >>> 20260829_job_application_career_docs.sql
-- ----------------------------------------------------------------
-- Link portal applications back to Career Tools documents.
-- cv_file_url remains the employer-facing PDF; these FKs record which builder docs were used.

ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS candidate_cv_id UUID REFERENCES candidate_cvs(id) ON DELETE SET NULL;

ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS candidate_cover_letter_id UUID REFERENCES candidate_cover_letters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_job_applications_candidate_cv
  ON job_applications(candidate_cv_id);

CREATE INDEX IF NOT EXISTS idx_job_applications_candidate_cover_letter
  ON job_applications(candidate_cover_letter_id);

COMMENT ON COLUMN job_applications.candidate_cv_id IS
  'Career Tools CV used for this application, when the candidate applied with a builder document.';
COMMENT ON COLUMN job_applications.candidate_cover_letter_id IS
  'Career Tools cover letter used for this application, when one was selected.';


-- ----------------------------------------------------------------
-- >>> 20260830_candidate_cvs_public_share.sql
-- ----------------------------------------------------------------
-- Public share URL for a Career Tools CV. Token is the capability; is_public is the switch.

ALTER TABLE candidate_cvs
  ADD COLUMN IF NOT EXISTS share_token TEXT;

ALTER TABLE candidate_cvs
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE candidate_cvs
  ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_cvs_share_token
  ON candidate_cvs(share_token)
  WHERE share_token IS NOT NULL;

DROP POLICY IF EXISTS "Public can view shared CVs" ON candidate_cvs;
CREATE POLICY "Public can view shared CVs"
  ON candidate_cvs FOR SELECT
  USING (is_public = true AND share_token IS NOT NULL);

COMMENT ON COLUMN candidate_cvs.share_token IS
  'Unguessable token for /cv/{token}. Kept when sharing is turned off so the same URL can be reused.';
COMMENT ON COLUMN candidate_cvs.is_public IS
  'When true, anyone with the share token can view this CV.';
COMMENT ON COLUMN candidate_cvs.shared_at IS
  'Last time sharing was turned on.';


-- ----------------------------------------------------------------
-- >>> 20260831_reduce_supabase_egress.sql
-- ----------------------------------------------------------------
-- Card teasers without shipping full job HTML on list/related queries.
-- Catalog open-role counts without scanning every active job row.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobs'
      AND column_name = 'description_excerpt'
  ) THEN
    ALTER TABLE public.jobs
    ADD COLUMN description_excerpt text
    GENERATED ALWAYS AS (
      left(
        btrim(
          regexp_replace(
            regexp_replace(COALESCE(description, ''), '<[^>]+>', ' ', 'g'),
            '\s+',
            ' ',
            'g'
          )
        ),
        400
      )
    ) STORED;
  END IF;
END $$;

CREATE OR REPLACE VIEW public.active_jobs_by_company
WITH (security_invoker = true) AS
SELECT
  company_id,
  COUNT(*)::bigint AS job_count
FROM public.jobs
WHERE status = 'active'
  AND company_id IS NOT NULL
GROUP BY company_id;

GRANT SELECT ON public.active_jobs_by_company TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_jobs_status_company_id
  ON public.jobs (status, company_id)
  WHERE company_id IS NOT NULL;


-- ----------------------------------------------------------------
-- >>> 20260903_job_applications_career_tools_method.sql
-- ----------------------------------------------------------------
-- Allow Career Tools as an application method.
-- The original CHECK only permitted profile / cv / external, which rejects
-- job_applications rows created from Apply with Career Tools CV.

ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_application_method_check;

ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_application_method_check
  CHECK (
    application_method IS NULL
    OR application_method IN ('profile', 'cv', 'external', 'career_tools')
  );

COMMENT ON COLUMN public.job_applications.application_method IS
  'How the candidate applied: profile, uploaded cv, career_tools builder PDF, or external.';


-- ----------------------------------------------------------------
-- >>> 20260911_backfill_null_date_posted.sql
-- ----------------------------------------------------------------
-- ============================================================
-- Backfill jobs.date_posted when NULL
-- ============================================================
-- Scraped adapters (MyJobMag / BrighterMonday / Fuzu) set
-- date_posted: null when the source JSON-LD omitted datePosted.
-- Spreading that onto the insert payload wrote an explicit NULL,
-- which skipped the column DEFAULT now() and left Google JobPosting
-- markup without the required datePosted field (GSC: Regenerative
-- Market Garden Lead, crawled 2026-09-09).
--
-- Fill remaining NULLs from created_at (StemBird publish time).
-- ============================================================

BEGIN;

UPDATE public.jobs
SET date_posted = COALESCE(created_at, now())
WHERE date_posted IS NULL;

COMMIT;


-- ----------------------------------------------------------------
-- >>> 20260914_guarantee_job_date_posted.sql
-- ----------------------------------------------------------------
-- ============================================================
-- Guarantee jobs.date_posted is always set
-- ============================================================
-- Google JobPosting requires datePosted. Scraped adapters that spread
-- `date_posted: null` skip the column DEFAULT and leave JSON-LD without
-- the field (GSC: Operation Agent, Medical Representative — crawled
-- 2026-09-10). The 2026-09-11 backfill was one-shot; this trigger and
-- NOT NULL constraint prevent the same gap on every future insert/update.
-- ============================================================

BEGIN;

UPDATE public.jobs
SET date_posted = COALESCE(created_at, now())
WHERE date_posted IS NULL;

CREATE OR REPLACE FUNCTION public.sync_posted_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date_posted IS NULL THEN
    NEW.date_posted := COALESCE(NEW.created_at, now());
  END IF;
  NEW.posted_date := CAST(NEW.date_posted AT TIME ZONE 'UTC' AS DATE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_posted_date ON public.jobs;
CREATE TRIGGER trg_sync_posted_date
BEFORE INSERT OR UPDATE OF date_posted ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.sync_posted_date();

ALTER TABLE public.jobs
  ALTER COLUMN date_posted SET DEFAULT now();

ALTER TABLE public.jobs
  ALTER COLUMN date_posted SET NOT NULL;

COMMIT;


-- ----------------------------------------------------------------
-- >>> 20260914_guarantee_jobposting_gsc_fields.sql
-- ----------------------------------------------------------------
-- ============================================================
-- Guarantee JobPosting fields Google Search Console flags
-- ============================================================
-- GSC Job Postings (2026-09-13):
--   error  Missing datePosted          (4 leftover; already NOT NULL)
--   failed Missing validThrough        (8)
--   warn   Missing employmentType      (4)
--
-- StemBird listings always expire 30 days after posting when the employer
-- did not supply a deadline (scraper + JobPostingForm already do this).
-- Fill remaining NULLs and keep future inserts complete so JSON-LD and the
-- visible page stay in sync.
-- ============================================================

BEGIN;

-- Deadlines: date_posted + 30 days (same default as getDefaultValidThrough)
UPDATE public.jobs
SET valid_through = COALESCE(date_posted, created_at) + INTERVAL '30 days'
WHERE valid_through IS NULL;

UPDATE public.jobs
SET expires_at = (
  CAST(valid_through AT TIME ZONE 'UTC' AS date) + TIME '23:59:59'
) AT TIME ZONE 'UTC'
WHERE expires_at IS NULL
  AND valid_through IS NOT NULL;

UPDATE public.jobs
SET application_deadline = CAST(valid_through AT TIME ZONE 'UTC' AS date)
WHERE application_deadline IS NULL
  AND valid_through IS NOT NULL;

-- Employment type: product default used by the post-job form and scrapers
UPDATE public.jobs
SET employment_type = 'FULL_TIME'
WHERE employment_type IS NULL;

UPDATE public.jobs
SET employment_types = ARRAY[employment_type]::public.employment_type[]
WHERE employment_types IS NULL
  AND employment_type IS NOT NULL;

CREATE OR REPLACE FUNCTION public.guarantee_jobposting_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date_posted IS NULL THEN
    NEW.date_posted := COALESCE(NEW.created_at, now());
  END IF;
  NEW.posted_date := CAST(NEW.date_posted AT TIME ZONE 'UTC' AS date);

  IF NEW.valid_through IS NULL THEN
    NEW.valid_through := NEW.date_posted + INTERVAL '30 days';
  END IF;

  IF NEW.expires_at IS NULL AND NEW.valid_through IS NOT NULL THEN
    NEW.expires_at := (
      CAST(NEW.valid_through AT TIME ZONE 'UTC' AS date) + TIME '23:59:59'
    ) AT TIME ZONE 'UTC';
  END IF;

  IF NEW.application_deadline IS NULL AND NEW.valid_through IS NOT NULL THEN
    NEW.application_deadline := CAST(NEW.valid_through AT TIME ZONE 'UTC' AS date);
  END IF;

  IF NEW.employment_type IS NULL THEN
    NEW.employment_type := 'FULL_TIME';
  END IF;

  IF NEW.employment_types IS NULL AND NEW.employment_type IS NOT NULL THEN
    NEW.employment_types := ARRAY[NEW.employment_type]::public.employment_type[];
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_00_guarantee_jobposting_fields ON public.jobs;
CREATE TRIGGER trg_00_guarantee_jobposting_fields
BEFORE INSERT OR UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.guarantee_jobposting_fields();

COMMIT;


-- ----------------------------------------------------------------
-- >>> 20260916_scholarships_listing_kind.sql
-- ----------------------------------------------------------------
-- Scholarships as a listing kind on jobs, plus labelled fact columns.
-- Public /jobs queries must filter listing_kind = 'job'. Scholarships use
-- /scholarships and /scholarships/{slug}.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS listing_kind TEXT NOT NULL DEFAULT 'job';

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_listing_kind_check;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_listing_kind_check
  CHECK (listing_kind IN ('job', 'scholarship'));

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS scholarship_level TEXT,
  ADD COLUMN IF NOT EXISTS scholarship_coverage TEXT,
  ADD COLUMN IF NOT EXISTS scholarship_duration TEXT,
  ADD COLUMN IF NOT EXISTS scholarship_nationality TEXT,
  ADD COLUMN IF NOT EXISTS scholarship_age_limit TEXT,
  ADD COLUMN IF NOT EXISTS scholarship_bonding TEXT,
  ADD COLUMN IF NOT EXISTS scholarship_host_institution TEXT,
  ADD COLUMN IF NOT EXISTS scholarship_awards_count INTEGER,
  ADD COLUMN IF NOT EXISTS scholarship_programme_start DATE;

CREATE INDEX IF NOT EXISTS idx_jobs_listing_kind_status
  ON public.jobs (listing_kind, status);

CREATE INDEX IF NOT EXISTS idx_jobs_scholarships_active
  ON public.jobs (status, created_at DESC)
  WHERE listing_kind = 'scholarship';

-- Backfill awards. Admin / employment titles stay jobs.
UPDATE public.jobs
SET listing_kind = 'scholarship'
WHERE listing_kind = 'job'
  AND (
    title ~* '\y(scholarship|bursar(y|ies)|scholars? programme|scholars? program)\y'
    OR COALESCE(tags::text, '') ~* 'bursary and scholarships'
  )
  AND title !~* '\y(coordinator|officer|manager|administrator|clerk|director|specialist|analyst)\y';

CREATE OR REPLACE VIEW public.active_jobs_by_industry
WITH (security_invoker = true) AS
SELECT
  COALESCE(NULLIF(TRIM(industry), ''), 'Non-classified / Miscellaneous') AS industry_name,
  COUNT(*)::bigint AS job_count
FROM public.jobs
WHERE status = 'active'
  AND COALESCE(listing_kind, 'job') = 'job'
GROUP BY COALESCE(NULLIF(TRIM(industry), ''), 'Non-classified / Miscellaneous');

GRANT SELECT ON public.active_jobs_by_industry TO anon, authenticated;

CREATE OR REPLACE VIEW public.active_jobs_by_function
WITH (security_invoker = true) AS
SELECT
  COALESCE(NULLIF(TRIM(job_function), ''), 'Other / Miscellaneous') AS function_name,
  COUNT(*)::bigint AS job_count
FROM public.jobs
WHERE status = 'active'
  AND COALESCE(listing_kind, 'job') = 'job'
GROUP BY COALESCE(NULLIF(TRIM(job_function), ''), 'Other / Miscellaneous');

GRANT SELECT ON public.active_jobs_by_function TO anon, authenticated;

CREATE OR REPLACE VIEW public.active_jobs_by_county
WITH (security_invoker = true) AS
SELECT
  job_location_county AS county,
  COUNT(*)::bigint AS job_count
FROM public.jobs
WHERE status = 'active'
  AND COALESCE(listing_kind, 'job') = 'job'
GROUP BY job_location_county;

GRANT SELECT ON public.active_jobs_by_county TO anon, authenticated;

CREATE OR REPLACE VIEW public.active_jobs_by_company
WITH (security_invoker = true) AS
SELECT
  company_id,
  COUNT(*)::bigint AS job_count
FROM public.jobs
WHERE status = 'active'
  AND COALESCE(listing_kind, 'job') = 'job'
  AND company_id IS NOT NULL
GROUP BY company_id;

GRANT SELECT ON public.active_jobs_by_company TO anon, authenticated;


-- ----------------------------------------------------------------
-- >>> fix_and_seed.sql
-- ----------------------------------------------------------------
-- Fix existing table or create new one
-- Run this in Supabase SQL Editor

-- Drop the incorrect unique constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'page_content_page_slug_key'
    ) THEN
        ALTER TABLE page_content DROP CONSTRAINT page_content_page_slug_key;
    END IF;
END $$;

-- Create table if not exists
CREATE TABLE IF NOT EXISTS page_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug TEXT NOT NULL,
  section_key TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text',
  content_value TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_slug, section_key)
);

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_page_content_slug ON page_content(page_slug);

-- Enable RLS
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access" ON page_content;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON page_content;

-- Create policies
CREATE POLICY "Allow public read access" ON page_content
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to update" ON page_content
  FOR ALL USING (auth.role() = 'authenticated');

-- Insert default content (will skip if already exists due to UNIQUE constraint)
INSERT INTO page_content (page_slug, section_key, content_type, content_value, metadata) VALUES
  ('home', 'hero_title', 'text', 'Your Dream Career Starts Here', '{}'),
  ('home', 'hero_subtitle', 'text', 'Join thousands of Kenyan professionals who''ve found their perfect role. Connect with top employers and unlock your potential.', '{}'),
  ('home', 'stats_jobs', 'number', '1070', '{"label": "Active Jobs"}'),
  ('home', 'stats_companies', 'number', '103', '{"label": "Companies"}'),
  ('home', 'stats_success_rate', 'number', '90', '{"label": "Success Rate", "suffix": "%"}'),
  ('home', 'featured_section_title', 'text', 'Featured Opportunities', '{}'),
  ('home', 'featured_section_subtitle', 'text', 'Hand-picked roles from top employers', '{}'),
  ('home', 'why_choose_title', 'text', 'Why Kenyan Professionals Choose StemBird', '{}'),
  ('home', 'cta_title', 'text', 'Ready to Transform Your Career?', '{}'),
  ('home', 'cta_subtitle', 'text', 'Join thousands of Kenyan professionals who''ve found their dream jobs through StemBird', '{}'),
  ('services-cv', 'hero_title', 'text', 'CV & Resume Services by StemBird', '{}'),
  ('services-cv', 'hero_subtitle', 'text', 'Professional CVs That Open Doors 🚪📄', '{}'),
  ('services-cv', 'hero_description', 'html', '<p>Your CV is often the <strong>first decision-maker</strong> in your job search. Before interviews. Before LinkedIn. Before explanations.</p><p>At StemBird, we don''t just rewrite CVs — we <strong>position you to be shortlisted</strong>.</p>', '{}'),
  ('services-cv', 'why_cv_matters_title', 'text', 'Why Your CV Matters More Than You Think', '{}'),
  ('services-cv', 'what_we_do_title', 'text', 'What We Do Differently at StemBird', '{}'),
  ('services-linkedin', 'hero_title', 'text', 'LinkedIn Career Services by StemBird', '{}'),
  ('services-linkedin', 'hero_subtitle', 'text', 'Turn Your LinkedIn Profile Into Opportunities 🚀', '{}'),
  ('services-linkedin', 'hero_description', 'html', '<p>Your LinkedIn profile is no longer optional. It''s your <strong>digital CV</strong>, your <strong>personal brand</strong>, and often the <strong>first interview filter</strong>.</p>', '{}'),
  ('services-linkedin', 'why_linkedin_matters_title', 'text', 'Why LinkedIn Matters More Than Ever', '{}'),
  ('services-cover-letter', 'hero_title', 'text', 'Outstanding Cover Letters by StemBird', '{}'),
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

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_page_content_timestamp ON page_content;

-- Create trigger
CREATE TRIGGER update_page_content_timestamp
  BEFORE UPDATE ON page_content
  FOR EACH ROW
  EXECUTE FUNCTION update_page_content_updated_at();


-- ----------------------------------------------------------------
-- >>> 20260306_advanced_application_management.sql
-- ----------------------------------------------------------------
-- Migration: Advanced Application Management
-- Description: Add application scoring, ratings, bulk actions, and team collaboration

-- ============================================================================
-- 1. APPLICATION RATINGS/SCORING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS application_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    rated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Rating Details
    overall_score INTEGER CHECK (overall_score >= 1 AND overall_score <= 5),
    technical_score INTEGER CHECK (technical_score >= 1 AND technical_score <= 5),
    experience_score INTEGER CHECK (experience_score >= 1 AND experience_score <= 5),
    culture_fit_score INTEGER CHECK (culture_fit_score >= 1 AND culture_fit_score <= 5),
    communication_score INTEGER CHECK (communication_score >= 1 AND communication_score <= 5),
    
    -- Comments
    rating_notes TEXT,
    
    -- Recommendation
    recommendation VARCHAR(20) CHECK (recommendation IN ('strong_yes', 'yes', 'maybe', 'no', 'strong_no')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one rating per user per application
    UNIQUE(application_id, rated_by)
);

-- ============================================================================
-- 2. EMPLOYER NOTES TABLE (Enhanced from application_notes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS employer_application_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Note Content
    note_text TEXT NOT NULL,
    note_type VARCHAR(30) DEFAULT 'general' CHECK (note_type IN (
        'general', 'screening', 'interview', 'reference_check', 
        'background_check', 'offer', 'rejection_reason', 'follow_up'
    )),
    
    -- Visibility
    is_private BOOLEAN DEFAULT false, -- Only visible to creator
    is_pinned BOOLEAN DEFAULT false,
    
    -- Mentions/Tags
    mentioned_users UUID[], -- Array of user IDs mentioned in note
    tags TEXT[], -- Custom tags for organization
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. INTERVIEW SCHEDULING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS interview_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    
    -- Interview Details
    interview_type VARCHAR(30) CHECK (interview_type IN (
        'phone_screen', 'video_call', 'in_person', 'technical', 
        'panel', 'final', 'other'
    )),
    interview_title VARCHAR(255) NOT NULL,
    interview_description TEXT,
    
    -- Scheduling
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
    
    -- Location/Link
    location TEXT, -- Physical address or meeting link
    meeting_link TEXT,
    meeting_password TEXT,
    
    -- Participants
    interviewer_ids UUID[], -- Array of interviewer user IDs
    scheduled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'confirmed', 'rescheduled', 'completed', 'cancelled', 'no_show'
    )),
    
    -- Reminders
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMPTZ,
    
    -- Feedback
    feedback_submitted BOOLEAN DEFAULT false,
    interview_feedback TEXT,
    interview_rating INTEGER CHECK (interview_rating >= 1 AND interview_rating <= 5),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. TEAM COLLABORATION - COMPANY TEAM MEMBERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, -- References company profile
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Role & Permissions
    role VARCHAR(30) DEFAULT 'member' CHECK (role IN (
        'owner', 'admin', 'hiring_manager', 'recruiter', 'interviewer', 'member'
    )),
    
    -- Permissions
    can_post_jobs BOOLEAN DEFAULT false,
    can_manage_applications BOOLEAN DEFAULT false,
    can_schedule_interviews BOOLEAN DEFAULT false,
    can_make_offers BOOLEAN DEFAULT false,
    can_manage_team BOOLEAN DEFAULT false,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invitation_accepted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(company_id, user_id)
);

-- ============================================================================
-- 5. BULK ACTION LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS bulk_action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Action Details
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'bulk_status_change', 'bulk_reject', 'bulk_shortlist', 
        'bulk_archive', 'bulk_delete', 'bulk_tag'
    )),
    
    -- Affected Items
    application_ids UUID[] NOT NULL,
    affected_count INTEGER NOT NULL,
    
    -- Action Data
    action_data JSONB, -- Stores action-specific data (e.g., new status, rejection reason)
    
    -- Result
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    error_details JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_application_ratings_application_id ON application_ratings(application_id);
CREATE INDEX idx_application_ratings_rated_by ON application_ratings(rated_by);
CREATE INDEX idx_employer_notes_application_id ON employer_application_notes(application_id);
CREATE INDEX idx_employer_notes_created_by ON employer_application_notes(created_by);
CREATE INDEX idx_employer_notes_pinned ON employer_application_notes(is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_interview_schedules_application_id ON interview_schedules(application_id);
CREATE INDEX idx_interview_schedules_scheduled_at ON interview_schedules(scheduled_at);
CREATE INDEX idx_interview_schedules_status ON interview_schedules(status);
CREATE INDEX idx_company_team_members_company_id ON company_team_members(company_id);
CREATE INDEX idx_company_team_members_user_id ON company_team_members(user_id);
CREATE INDEX idx_bulk_action_logs_performed_by ON bulk_action_logs(performed_by);
CREATE INDEX idx_bulk_action_logs_created_at ON bulk_action_logs(created_at DESC);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE TRIGGER update_application_ratings_updated_at
    BEFORE UPDATE ON application_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employer_notes_updated_at
    BEFORE UPDATE ON employer_application_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interview_schedules_updated_at
    BEFORE UPDATE ON interview_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_team_members_updated_at
    BEFORE UPDATE ON company_team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE application_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_application_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_action_logs ENABLE ROW LEVEL SECURITY;

-- Application Ratings Policies
CREATE POLICY "Employers can manage ratings for their job applications"
    ON application_ratings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM job_applications ja
            JOIN jobs j ON j.id = ja.job_id
            WHERE ja.id = application_ratings.application_id
            AND j.user_id = auth.uid()
        )
    );

-- Employer Notes Policies
CREATE POLICY "Employers can manage notes for their applications"
    ON employer_application_notes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM job_applications ja
            JOIN jobs j ON j.id = ja.job_id
            WHERE ja.id = employer_application_notes.application_id
            AND j.user_id = auth.uid()
        )
    );

-- Interview Schedules Policies
CREATE POLICY "Employers and candidates can view interview schedules"
    ON interview_schedules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM job_applications ja
            JOIN jobs j ON j.id = ja.job_id
            WHERE ja.id = interview_schedules.application_id
            AND (j.user_id = auth.uid() OR ja.user_id = auth.uid())
        )
    );

CREATE POLICY "Employers can manage interview schedules"
    ON interview_schedules FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM job_applications ja
            JOIN jobs j ON j.id = ja.job_id
            WHERE ja.id = interview_schedules.application_id
            AND j.user_id = auth.uid()
        )
    );

CREATE POLICY "Employers can update interview schedules"
    ON interview_schedules FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM job_applications ja
            JOIN jobs j ON j.id = ja.job_id
            WHERE ja.id = interview_schedules.application_id
            AND j.user_id = auth.uid()
        )
    );

-- Company Team Members Policies
CREATE POLICY "Team members can view their company team"
    ON company_team_members FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM company_team_members ctm
            WHERE ctm.company_id = company_team_members.company_id
            AND ctm.user_id = auth.uid()
            AND ctm.status = 'active'
        )
    );

CREATE POLICY "Admins can manage team members"
    ON company_team_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM company_team_members ctm
            WHERE ctm.company_id = company_team_members.company_id
            AND ctm.user_id = auth.uid()
            AND ctm.role IN ('owner', 'admin')
            AND ctm.status = 'active'
        )
    );

-- Bulk Action Logs Policies
CREATE POLICY "Users can view their own bulk action logs"
    ON bulk_action_logs FOR SELECT
    USING (performed_by = auth.uid());

CREATE POLICY "Users can create bulk action logs"
    ON bulk_action_logs FOR INSERT
    WITH CHECK (performed_by = auth.uid());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate average rating for an application
CREATE OR REPLACE FUNCTION get_application_average_rating(p_application_id UUID)
RETURNS TABLE (
    avg_overall NUMERIC,
    avg_technical NUMERIC,
    avg_experience NUMERIC,
    avg_culture_fit NUMERIC,
    avg_communication NUMERIC,
    total_ratings INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROUND(AVG(overall_score), 2) as avg_overall,
        ROUND(AVG(technical_score), 2) as avg_technical,
        ROUND(AVG(experience_score), 2) as avg_experience,
        ROUND(AVG(culture_fit_score), 2) as avg_culture_fit,
        ROUND(AVG(communication_score), 2) as avg_communication,
        COUNT(*)::INTEGER as total_ratings
    FROM application_ratings
    WHERE application_id = p_application_id;
END;
$$ LANGUAGE plpgsql;

-- Function to perform bulk status update
CREATE OR REPLACE FUNCTION bulk_update_application_status(
    p_application_ids UUID[],
    p_new_status VARCHAR,
    p_performed_by UUID
)
RETURNS TABLE (
    success_count INTEGER,
    failure_count INTEGER
) AS $$
DECLARE
    v_success_count INTEGER := 0;
    v_failure_count INTEGER := 0;
    v_app_id UUID;
BEGIN
    -- Update each application
    FOREACH v_app_id IN ARRAY p_application_ids
    LOOP
        BEGIN
            UPDATE job_applications
            SET status = p_new_status::application_status,
                updated_at = NOW()
            WHERE id = v_app_id
            AND EXISTS (
                SELECT 1 FROM jobs
                WHERE jobs.id = job_applications.job_id
                AND jobs.user_id = p_performed_by
            );
            
            IF FOUND THEN
                v_success_count := v_success_count + 1;
            ELSE
                v_failure_count := v_failure_count + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_failure_count := v_failure_count + 1;
        END;
    END LOOP;
    
    -- Log the bulk action
    INSERT INTO bulk_action_logs (
        performed_by,
        action_type,
        application_ids,
        affected_count,
        action_data,
        success_count,
        failure_count
    ) VALUES (
        p_performed_by,
        'bulk_status_change',
        p_application_ids,
        array_length(p_application_ids, 1),
        jsonb_build_object('new_status', p_new_status),
        v_success_count,
        v_failure_count
    );
    
    RETURN QUERY SELECT v_success_count, v_failure_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE application_ratings IS 'Ratings and scores for job applications';
COMMENT ON TABLE employer_application_notes IS 'Employer notes and comments on applications';
COMMENT ON TABLE interview_schedules IS 'Interview scheduling and management';
COMMENT ON TABLE company_team_members IS 'Team collaboration for companies';
COMMENT ON TABLE bulk_action_logs IS 'Audit log for bulk actions on applications';
COMMENT ON FUNCTION get_application_average_rating IS 'Calculate average rating scores for an application';
COMMENT ON FUNCTION bulk_update_application_status IS 'Perform bulk status updates on applications';


-- ----------------------------------------------------------------
-- >>> 20260415_create_app_settings.sql
-- ----------------------------------------------------------------
-- App-wide feature flag settings table
CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default: WhatsApp enabled
INSERT INTO app_settings (key, value)
VALUES ('whatsapp_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Public read (so the floating button can check without auth)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read app_settings"
  ON app_settings FOR SELECT
  USING (true);

-- Only admins can update
CREATE POLICY "Admins can update app_settings"
  ON app_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );


-- ----------------------------------------------------------------
-- >>> 20260415_fix_app_settings_rls.sql
-- ----------------------------------------------------------------
-- Fix RLS policies for app_settings
-- upsert needs both INSERT and UPDATE policies with WITH CHECK

DROP POLICY IF EXISTS "Admins can update app_settings" ON app_settings;

CREATE POLICY "Admins can update app_settings"
  ON app_settings FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert app_settings"
  ON app_settings FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );


-- ----------------------------------------------------------------
-- >>> 20260614_create_email_infrastructure.sql
-- ----------------------------------------------------------------
-- Migration: Email Infrastructure
-- Creates tables for email subscribers, campaigns, logs, and user email preferences

-- =====================================================
-- 1. EMAIL SUBSCRIBERS (newsletter/marketing opt-in)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  source TEXT DEFAULT 'website', -- website, import, referral, signup
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'unsubscribed', 'bounced')),
  confirmation_token TEXT,
  unsubscribe_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint on email (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_subscribers_email_lower
  ON public.email_subscribers (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_email_subscribers_status
  ON public.email_subscribers (status);

-- =====================================================
-- 2. EMAIL CAMPAIGNS (marketing/newsletter campaigns)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  bounce_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_status
  ON public.email_campaigns (status);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at
  ON public.email_campaigns (created_at DESC);

-- =====================================================
-- 3. EMAIL LOGS (audit trail for all sent emails)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL CHECK (email_type IN (
    'transactional', 'marketing', 'job_alert', 'weekly_digest',
    'welcome', 'password_reset', 'application_status', 'new_message',
    'newsletter', 'confirmation', 'campaign'
  )),
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked')),
  provider TEXT DEFAULT 'resend',
  provider_id TEXT, -- Resend message ID for tracking
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient
  ON public.email_logs (recipient_email);

CREATE INDEX IF NOT EXISTS idx_email_logs_type
  ON public.email_logs (email_type);

CREATE INDEX IF NOT EXISTS idx_email_logs_status
  ON public.email_logs (status);

CREATE INDEX IF NOT EXISTS idx_email_logs_created_at
  ON public.email_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_id
  ON public.email_logs (campaign_id);

CREATE INDEX IF NOT EXISTS idx_email_logs_user_id
  ON public.email_logs (user_id);

-- =====================================================
-- 4. EMAIL PREFERENCES on user_profiles
-- =====================================================
DO $$
BEGIN
  -- Add email preference columns to user_profiles if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'transactional_emails') THEN
    ALTER TABLE public.user_profiles ADD COLUMN transactional_emails BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'marketing_emails') THEN
    ALTER TABLE public.user_profiles ADD COLUMN marketing_emails BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'job_alert_emails') THEN
    ALTER TABLE public.user_profiles ADD COLUMN job_alert_emails BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'weekly_digest') THEN
    ALTER TABLE public.user_profiles ADD COLUMN weekly_digest BOOLEAN DEFAULT true;
  END IF;
END $$;

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Email Subscribers: anyone can insert (public subscribe form)
CREATE POLICY "Anyone can subscribe" ON public.email_subscribers
  FOR INSERT WITH CHECK (true);

-- Email Subscribers: anyone can update (unsubscribe via token)
CREATE POLICY "Anyone can update subscription" ON public.email_subscribers
  FOR UPDATE USING (true);

-- Email Subscribers: admins can read all
CREATE POLICY "Admins can read subscribers" ON public.email_subscribers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
  );

-- Email Campaigns: admins can do everything
CREATE POLICY "Admins can manage campaigns" ON public.email_campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
  );

-- Email Logs: admins can read
CREATE POLICY "Admins can read email logs" ON public.email_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
  );

-- Email Logs: service can insert (for logging from API routes)
CREATE POLICY "Service can insert email logs" ON public.email_logs
  FOR INSERT WITH CHECK (true);

-- Email Logs: users can read their own logs
CREATE POLICY "Users can read own email logs" ON public.email_logs
  FOR SELECT USING (user_id = auth.uid());

-- User profiles: users can update their own email preferences
CREATE POLICY "Users can update own email preferences" ON public.user_profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to get confirmed subscriber count
CREATE OR REPLACE FUNCTION public.get_subscriber_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM public.email_subscribers WHERE status = 'confirmed';
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get email stats summary
CREATE OR REPLACE FUNCTION public.get_email_stats()
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'total_sent', COALESCE((SELECT COUNT(*) FROM public.email_logs WHERE status = 'sent'), 0),
    'total_failed', COALESCE((SELECT COUNT(*) FROM public.email_logs WHERE status = 'failed'), 0),
    'total_bounced', COALESCE((SELECT COUNT(*) FROM public.email_logs WHERE status = 'bounced'), 0),
    'subscribers_confirmed', COALESCE((SELECT COUNT(*) FROM public.email_subscribers WHERE status = 'confirmed'), 0),
    'subscribers_pending', COALESCE((SELECT COUNT(*) FROM public.email_subscribers WHERE status = 'pending'), 0),
    'campaigns_total', COALESCE((SELECT COUNT(*) FROM public.email_campaigns), 0),
    'campaigns_sent', COALESCE((SELECT COUNT(*) FROM public.email_campaigns WHERE status = 'sent'), 0)
  );
$$ LANGUAGE sql SECURITY DEFINER;


-- ----------------------------------------------------------------
-- >>> 20260615_advanced_email_features.sql
-- ----------------------------------------------------------------
-- Migration: Advanced Email Features
-- Broadcast targeting, automation rules, A/B testing, bounce handling

-- =====================================================
-- 1. EXTEND email_campaigns table
-- =====================================================
ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS campaign_type TEXT NOT NULL DEFAULT 'newsletter'
    CHECK (campaign_type IN ('newsletter', 'broadcast', 'automated')),
  ADD COLUMN IF NOT EXISTS target_audience JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS subject_b TEXT,
  ADD COLUMN IF NOT EXISTS ab_winner_subject TEXT,
  ADD COLUMN IF NOT EXISTS ab_test_sample_size INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS ab_opens_a INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ab_opens_b INTEGER DEFAULT 0;

-- =====================================================
-- 2. EXTEND email_logs email_type constraint
-- =====================================================
ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS email_logs_email_type_check;
ALTER TABLE public.email_logs ADD CONSTRAINT email_logs_email_type_check
  CHECK (email_type IN (
    'transactional', 'marketing', 'job_alert', 'weekly_digest',
    'welcome', 'password_reset', 'application_status', 'new_message',
    'newsletter', 'confirmation', 'campaign',
    'broadcast', 'reengagement', 'reminder', 'employer_welcome',
    'profile_nudge', 'job_expiry'
  ));

-- =====================================================
-- 3. EMAIL AUTOMATION RULES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.email_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL UNIQUE CHECK (type IN (
    'inactive_reengagement', 'incomplete_application', 'job_expiry_warning',
    'employer_welcome', 'profile_completion_nudge'
  )),
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default rules
INSERT INTO public.email_automation_rules (type, enabled, config) VALUES
  ('inactive_reengagement', true, '{"days_inactive": 30}'),
  ('incomplete_application', true, '{"hours_old": 24}'),
  ('job_expiry_warning', true, '{"days_before": 7}'),
  ('employer_welcome', true, '{"hours_since_signup": 24}'),
  ('profile_completion_nudge', true, '{"min_days": 3, "threshold": 60}')
ON CONFLICT (type) DO NOTHING;

-- =====================================================
-- 4. EMAIL AUTOMATION LOG (prevents duplicate sends)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.email_automation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.email_automation_rules(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_email_automation_log_rule
  ON public.email_automation_log (rule_id);

CREATE INDEX IF NOT EXISTS idx_email_automation_log_user
  ON public.email_automation_log (user_id);

CREATE INDEX IF NOT EXISTS idx_email_automation_log_sent
  ON public.email_automation_log (sent_at DESC);

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================

-- Automation rules: admin read/write, service can update
ALTER TABLE public.email_automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage automation rules"
  ON public.email_automation_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND role = 'admin'
    )
  );

-- Automation log: admin read, service insert
ALTER TABLE public.email_automation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view automation log"
  ON public.email_automation_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Service can insert automation log"
  ON public.email_automation_log FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 6. HELPER: Count broadcast recipients
-- =====================================================
CREATE OR REPLACE FUNCTION count_broadcast_recipients(
  p_role TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_applied_to_job_id UUID DEFAULT NULL,
  p_company_id UUID DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count users matching filters (using service role context)
  WITH filtered_users AS (
    SELECT DISTINCT u.id
    FROM auth.users u
    JOIN user_profiles up ON up.id = u.id
    LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
    WHERE 1=1
      AND (p_role IS NULL OR up.role = p_role)
      AND (p_location IS NULL OR cp.location ILIKE '%' || p_location || '%')
      AND (p_applied_to_job_id IS NULL OR EXISTS (
        SELECT 1 FROM job_applications ja
        WHERE ja.job_id = p_applied_to_job_id
        AND (ja.candidate_profile_id = cp.id OR ja.email = u.email)
      ))
      AND (p_company_id IS NULL OR EXISTS (
        SELECT 1 FROM jobs j
        WHERE j.company_id = p_company_id
        AND j.posted_by::text = u.id::text
      ))
  )
  SELECT COUNT(*) INTO v_count FROM filtered_users;

  RETURN v_count;
END;
$$;


-- ----------------------------------------------------------------
-- >>> 20260907_pricing_catalog_and_mpesa_settings.sql
-- ----------------------------------------------------------------
-- Pricing catalog, coupons, offers, template prices, and M-Pesa dashboard settings.

ALTER TABLE public.cv_templates
  ADD COLUMN IF NOT EXISTS price_kes NUMERIC(12, 2);

ALTER TABLE public.cover_letter_templates
  ADD COLUMN IF NOT EXISTS price_kes NUMERIC(12, 2);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('service', 'cv_template', 'cover_letter_template', 'job_action')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_kes NUMERIC(12, 2) NOT NULL CHECK (price_kes >= 0),
  compare_at_price_kes NUMERIC(12, 2) CHECK (compare_at_price_kes IS NULL OR compare_at_price_kes >= 0),
  duration_days INTEGER,
  billing_interval TEXT DEFAULT 'one_time' CHECK (billing_interval IN ('one_time', 'month')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_kind_idx ON public.products (kind);
CREATE INDEX IF NOT EXISTS products_active_idx ON public.products (is_active);

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(12, 2) NOT NULL CHECK (discount_value > 0),
  min_amount_kes NUMERIC(12, 2),
  max_discount_kes NUMERIC(12, 2),
  applies_to TEXT NOT NULL DEFAULT 'all'
    CHECK (applies_to IN ('all', 'service', 'cv_template', 'cover_letter_template', 'job_action', 'sku')),
  applicable_skus TEXT[] NOT NULL DEFAULT '{}',
  usage_limit INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  badge_text TEXT,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(12, 2) NOT NULL CHECK (discount_value > 0),
  applies_to TEXT NOT NULL DEFAULT 'all'
    CHECK (applies_to IN ('all', 'service', 'cv_template', 'cover_letter_template', 'job_action', 'sku')),
  applicable_skus TEXT[] NOT NULL DEFAULT '{}',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  product_sku TEXT,
  amount_kes NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coupon_redemptions_coupon_idx ON public.coupon_redemptions (coupon_id);
CREATE INDEX IF NOT EXISTS coupon_redemptions_user_idx ON public.coupon_redemptions (user_id);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read products" ON public.products;
CREATE POLICY "Public can read products"
  ON public.products FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons"
  ON public.coupons FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Public can read active offers" ON public.offers;
CREATE POLICY "Public can read active offers"
  ON public.offers FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage offers" ON public.offers;
CREATE POLICY "Admins can manage offers"
  ON public.offers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can view own coupon redemptions" ON public.coupon_redemptions;
CREATE POLICY "Users can view own coupon redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view coupon redemptions" ON public.coupon_redemptions;
CREATE POLICY "Admins can view coupon redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'update_updated_at_column' AND n.nspname = 'public'
  ) THEN
    DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
    CREATE TRIGGER update_products_updated_at
      BEFORE UPDATE ON public.products
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS update_coupons_updated_at ON public.coupons;
    CREATE TRIGGER update_coupons_updated_at
      BEFORE UPDATE ON public.coupons
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS update_offers_updated_at ON public.offers;
    CREATE TRIGGER update_offers_updated_at
      BEFORE UPDATE ON public.offers
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Default M-Pesa checkout: send money to the business mobile number.
-- Buy Goods (till) and STK Push can be enabled from the admin dashboard.
INSERT INTO public.app_settings (key, value)
VALUES (
  'mpesa_settings',
  '{"environment":"sandbox","phoneEnabled":true,"tillEnabled":true,"stkEnabled":false,"defaultMethod":"phone","stkMode":"paybill","phoneNumber":"254795564135","tillNumber":"","paybillNumber":"","accountReference":"CareerSasa"}'
)
ON CONFLICT (key) DO NOTHING;

-- If an earlier revision of this migration seeded the previous number, move it.
UPDATE public.app_settings
SET value = replace(value, '254795565135', '254795564135'),
    updated_at = now()
WHERE key = 'mpesa_settings'
  AND value LIKE '%254795565135%';

-- Seed catalog. Application also upserts these on first load if the table is empty.
INSERT INTO public.products (
  sku, kind, name, description, price_kes, compare_at_price_kes, duration_days,
  billing_interval, is_active, sort_order, metadata
) VALUES
  ('service.cv.writing', 'service', 'CV / Resume Writing', 'Professionally written CV from scratch or rewrite.', 4000, 5000, NULL, 'one_time', true, 10, '{"service":"cv","packageId":"writing"}'),
  ('service.cv.graduate', 'service', 'Graduate & Entry-Level CVs', 'Skills-based CV for students and fresh graduates.', 2500, 3500, NULL, 'one_time', true, 11, '{"service":"cv","packageId":"graduate"}'),
  ('service.cv.transition', 'service', 'Career Transition CVs', 'Reposition experience for a new career direction.', 5000, 6000, NULL, 'one_time', true, 12, '{"service":"cv","packageId":"transition"}'),
  ('service.cv.executive', 'service', 'Executive & Senior-Level CVs', 'Strategic, results-driven CV for leaders.', 10000, 12000, NULL, 'one_time', true, 13, '{"service":"cv","packageId":"executive"}'),
  ('service.cv.alignment', 'service', 'CV + LinkedIn Alignment', 'Align CV language and positioning with LinkedIn.', 3000, 4000, NULL, 'one_time', true, 14, '{"service":"cv","packageId":"alignment"}'),
  ('service.cover-letter.professional', 'service', 'Professional Cover Letter Writing', '', 3000, 4000, NULL, 'one_time', true, 20, '{"service":"cover-letter","packageId":"professional"}'),
  ('service.cover-letter.graduate', 'service', 'Graduate & Entry-Level Cover Letters', '', 2000, 2500, NULL, 'one_time', true, 21, '{"service":"cover-letter","packageId":"graduate"}'),
  ('service.cover-letter.transition', 'service', 'Career Transition Cover Letters', '', 4000, 5000, NULL, 'one_time', true, 22, '{"service":"cover-letter","packageId":"transition"}'),
  ('service.cover-letter.executive', 'service', 'Executive & Senior-Level Cover Letters', '', 6500, 8000, NULL, 'one_time', true, 23, '{"service":"cover-letter","packageId":"executive"}'),
  ('service.cover-letter.alignment', 'service', 'CV + Cover Letter Alignment', '', 3000, 4000, NULL, 'one_time', true, 24, '{"service":"cover-letter","packageId":"alignment"}'),
  ('service.linkedin.audit', 'service', 'LinkedIn Profile Audit', '', 3000, 4000, NULL, 'one_time', true, 30, '{"service":"linkedin","packageId":"audit"}'),
  ('service.linkedin.optimization', 'service', 'LinkedIn Profile Optimization', '', 6500, 8000, NULL, 'one_time', true, 31, '{"service":"linkedin","packageId":"optimization"}'),
  ('service.linkedin.alignment', 'service', 'LinkedIn + CV Alignment', '', 5000, 6000, NULL, 'one_time', true, 32, '{"service":"linkedin","packageId":"alignment"}'),
  ('service.linkedin.branding', 'service', 'LinkedIn Personal Branding', '', 10000, 12000, NULL, 'one_time', true, 33, '{"service":"linkedin","packageId":"branding"}'),
  ('service.linkedin.management', 'service', 'LinkedIn Social Media Management', '', 12000, 15000, NULL, 'month', true, 34, '{"service":"linkedin","packageId":"management"}'),
  ('job.promote.basic', 'job_action', 'Promote job (7 days)', 'Boosts the job above organic results for 7 days.', 1000, NULL, 7, 'one_time', true, 40, '{"action":"promote","tier":"basic"}'),
  ('job.promote.premium', 'job_action', 'Promote job (14 days)', 'Boosts the job above organic results for 14 days.', 2500, NULL, 14, 'one_time', true, 41, '{"action":"promote","tier":"premium"}'),
  ('job.feature', 'job_action', 'Feature job (7 days)', 'Places the job in the featured section for 7 days.', 2000, NULL, 7, 'one_time', true, 42, '{"action":"feature"}'),
  ('template.cv.classic-professional', 'cv_template', 'Classic Professional', '', 350, NULL, NULL, 'one_time', true, 50, '{"templateName":"Classic Professional"}'),
  ('template.cv.modern-professional', 'cv_template', 'Modern Professional', '', 350, NULL, NULL, 'one_time', true, 51, '{"templateName":"Modern Professional"}'),
  ('template.cv.graduate-starter-cv', 'cv_template', 'Graduate Starter CV', '', 350, NULL, NULL, 'one_time', true, 52, '{"templateName":"Graduate Starter CV"}'),
  ('template.cv.internship-industrial-attachment', 'cv_template', 'Internship / Industrial Attachment', '', 350, NULL, NULL, 'one_time', true, 53, '{"templateName":"Internship / Industrial Attachment"}'),
  ('template.cv.skills-based-functional', 'cv_template', 'Skills-Based (Functional)', '', 350, NULL, NULL, 'one_time', true, 54, '{"templateName":"Skills-Based (Functional)"}'),
  ('template.cv.creative-portfolio', 'cv_template', 'Creative Portfolio', '', 750, NULL, NULL, 'one_time', true, 55, '{"templateName":"Creative Portfolio","premium":true}'),
  ('template.cv.digital-professional', 'cv_template', 'Digital Professional', '', 750, NULL, NULL, 'one_time', true, 56, '{"templateName":"Digital Professional","premium":true}'),
  ('template.cv.executive-leadership', 'cv_template', 'Executive Leadership', '', 750, NULL, NULL, 'one_time', true, 57, '{"templateName":"Executive Leadership","premium":true}'),
  ('template.cv.personal-brand-cv', 'cv_template', 'Personal Brand CV', '', 750, NULL, NULL, 'one_time', true, 58, '{"templateName":"Personal Brand CV","premium":true}'),
  ('template.cv.technical-engineering-cv', 'cv_template', 'Technical / Engineering CV', '', 750, NULL, NULL, 'one_time', true, 59, '{"templateName":"Technical / Engineering CV","premium":true}'),
  ('template.cv.international-ats-optimized-cv', 'cv_template', 'International / ATS Optimized CV', '', 750, NULL, NULL, 'one_time', true, 60, '{"templateName":"International / ATS Optimized CV","premium":true}'),
  ('template.cv.academic-research-cv', 'cv_template', 'Academic / Research CV', '', 750, NULL, NULL, 'one_time', true, 61, '{"templateName":"Academic / Research CV","premium":true}'),
  ('template.cover-letter.classic-professional', 'cover_letter_template', 'Classic Professional Cover Letter', '', 250, NULL, NULL, 'one_time', true, 70, '{"templateName":"Classic Professional Cover Letter","registryId":"classic-professional"}'),
  ('template.cover-letter.modern-professional', 'cover_letter_template', 'Modern Professional Cover Letter', '', 250, NULL, NULL, 'one_time', true, 71, '{"templateName":"Modern Professional Cover Letter","registryId":"modern-professional"}'),
  ('template.cover-letter.short-direct', 'cover_letter_template', 'Short & Direct Cover Letter', '', 250, NULL, NULL, 'one_time', true, 72, '{"templateName":"Short & Direct Cover Letter","registryId":"short-direct"}'),
  ('template.cover-letter.graduate-entry-level', 'cover_letter_template', 'Graduate / Entry-Level Cover Letter', '', 250, NULL, NULL, 'one_time', true, 73, '{"templateName":"Graduate / Entry-Level Cover Letter","registryId":"graduate-entry-level"}'),
  ('template.cover-letter.internship-attachment', 'cover_letter_template', 'Internship / Attachment Cover Letter', '', 250, NULL, NULL, 'one_time', true, 74, '{"templateName":"Internship / Attachment Cover Letter","registryId":"internship-attachment"}'),
  ('template.cover-letter.skills-entry-level', 'cover_letter_template', 'Skills-Focused Entry-Level Cover Letter', '', 250, NULL, NULL, 'one_time', true, 75, '{"templateName":"Skills-Focused Entry-Level Cover Letter","registryId":"skills-entry-level"}'),
  ('template.cover-letter.career-change', 'cover_letter_template', 'Career Change Cover Letter', '', 450, NULL, NULL, 'one_time', true, 76, '{"templateName":"Career Change Cover Letter"}'),
  ('template.cover-letter.personal-brand', 'cover_letter_template', 'Personal Brand Cover Letter', '', 450, NULL, NULL, 'one_time', true, 77, '{"templateName":"Personal Brand Cover Letter"}'),
  ('template.cover-letter.international-ats', 'cover_letter_template', 'International / ATS-Friendly Cover Letter', '', 450, NULL, NULL, 'one_time', true, 78, '{"templateName":"International / ATS-Friendly Cover Letter"}')
ON CONFLICT (sku) DO NOTHING;

UPDATE public.cv_templates t
SET price_kes = p.price_kes
FROM public.products p
WHERE p.kind = 'cv_template'
  AND p.name = t.name
  AND t.price_kes IS NULL;

UPDATE public.cover_letter_templates t
SET price_kes = p.price_kes
FROM public.products p
WHERE p.kind = 'cover_letter_template'
  AND p.name = t.name
  AND t.price_kes IS NULL;

COMMENT ON TABLE public.products IS 'Sellable catalog: career services, CV/cover-letter templates, and paid job actions';
COMMENT ON TABLE public.coupons IS 'Admin-managed coupon codes applied at checkout';
COMMENT ON TABLE public.offers IS 'Time-boxed discounts automatically applied to matching products';


-- ----------------------------------------------------------------
-- >>> 20260907_update_mpesa_phone_number.sql
-- ----------------------------------------------------------------
-- Correct the default Send Money number to +254795564135.
UPDATE public.app_settings
SET value = replace(value, '254795565135', '254795564135'),
    updated_at = now()
WHERE key = 'mpesa_settings'
  AND value LIKE '%254795565135%';


-- ----------------------------------------------------------------
-- >>> 20261018_replace_stem_taxonomy.sql
-- ----------------------------------------------------------------
-- Migration: Replace the Kenya-wide job taxonomy with the StemBird STEM taxonomy
-- New sets: 40 industries, 47 job functions (full replacement).
-- Idempotent: safe to re-run. Apply via Supabase Dashboard SQL Editor.
-- (On a fresh install the seeds above already use the new taxonomy, so the
-- inserts/updates/remaps below are no-ops and the DELETEs match nothing.)

BEGIN;

-- ============================================================================
-- 1. ADD NEW LOOKUP ROWS (existing exact-name rows are kept as-is)
-- ============================================================================

-- Industries are seeded by the lookup-table seed block above; re-insert here
-- so databases created before the seed change converge on the new taxonomy.
INSERT INTO public.industries (name, slug)
VALUES
  ('Agriculture, Agribusiness & Agricultural Technology', 'agriculture-agribusiness-agricultural-technology'),
  ('Food & Beverage Manufacturing', 'food-beverage-manufacturing'),
  ('Chemicals, Paints, Polymers & Industrial Materials', 'chemicals-paints-polymers-industrial-materials'),
  ('Pharmaceuticals & Biotechnology', 'pharmaceuticals-biotechnology'),
  ('Healthcare, Hospitals & Medical Laboratories', 'healthcare-hospitals-medical-laboratories'),
  ('Manufacturing & Industrial Production', 'manufacturing-industrial-production'),
  ('Paper, Pulp & Packaging', 'paper-pulp-packaging'),
  ('Plastics, Rubber & Composites', 'plastics-rubber-composites'),
  ('Oil, Gas & Petrochemicals', 'oil-gas-petrochemicals'),
  ('Energy, Power & Renewable Energy', 'energy-power-renewable-energy'),
  ('Water, Wastewater & Water Treatment', 'water-wastewater-water-treatment'),
  ('Environmental Services & Conservation', 'environmental-services-conservation'),
  ('Mining, Geology & Mineral Processing', 'mining-geology-mineral-processing'),
  ('Construction, Infrastructure & Built Environment', 'construction-infrastructure-built-environment'),
  ('Electrical & Electronics Manufacturing', 'electrical-electronics-manufacturing'),
  ('Automotive & Transport Equipment', 'automotive-transport-equipment'),
  ('Aerospace & Defence', 'aerospace-defence'),
  ('Information Technology & Software', 'information-technology-software'),
  ('Telecommunications & Networking', 'telecommunications-networking'),
  ('Data, Artificial Intelligence & Analytics', 'data-artificial-intelligence-analytics'),
  ('Banking, Finance & Insurance', 'banking-finance-insurance'),
  ('Consulting & Professional Services', 'consulting-professional-services'),
  ('Scientific Research & Development', 'scientific-research-development'),
  ('Testing, Inspection, Certification & Calibration', 'testing-inspection-certification-calibration'),
  ('Schools & Secondary Education', 'schools-secondary-education'),
  ('Universities & Higher Education', 'universities-higher-education'),
  ('Technical & Vocational Education and Training (TVET)', 'technical-vocational-education-and-training-tvet'),
  ('STEM Training & Professional Development', 'stem-training-professional-development'),
  ('Educational Technology (EdTech)', 'educational-technology-edtech'),
  ('Government & Public Sector', 'government-public-sector'),
  ('NGOs, Development & International Organisations', 'ngos-development-international-organisations'),
  ('Logistics, Supply Chain & Distribution', 'logistics-supply-chain-distribution'),
  ('Consumer Goods & Retail', 'consumer-goods-retail'),
  ('Textiles, Apparel & Leather Manufacturing', 'textiles-apparel-leather-manufacturing'),
  ('Life Sciences & Biomedical Research', 'life-sciences-biomedical-research'),
  ('Laboratories & Scientific Services', 'laboratories-scientific-services'),
  ('Aviation & Aerospace Services', 'aviation-aerospace-services'),
  ('Real Estate & Facilities Management', 'real-estate-facilities-management'),
  ('Telecommunications Infrastructure', 'telecommunications-infrastructure'),
  ('Waste Management & Recycling', 'waste-management-recycling')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.job_functions (name, slug)
VALUES
  ('Research & Development (R&D)', 'research-and-development-rd'),
  ('Analytical Chemistry', 'analytical-chemistry'),
  ('Laboratory Operations & Testing', 'laboratory-operations-testing'),
  ('Quality Control (QC)', 'quality-control-qc'),
  ('Quality Assurance & Quality Management', 'quality-assurance-quality-management'),
  ('Regulatory Affairs & Compliance', 'regulatory-affairs-compliance'),
  ('Product Development & Formulation', 'product-development-formulation'),
  ('Microbiology & Biotechnology', 'microbiology-biotechnology'),
  ('Clinical Research & Trials', 'clinical-research-trials'),
  ('Materials Science & Engineering', 'materials-science-engineering'),
  ('Food Science & Technology', 'food-science-technology'),
  ('Environmental Science & Management', 'environmental-science-management'),
  ('Geology, Geoscience & Mineral Exploration', 'geology-geoscience-mineral-exploration'),
  ('Agricultural Science & Technology', 'agricultural-science-technology'),
  ('Public Health Science & Epidemiology', 'public-health-science-epidemiology'),
  ('Biostatistics & Bioinformatics', 'biostatistics-bioinformatics'),
  ('Scientific Data Management', 'scientific-data-management'),
  ('Chemical & Process Engineering', 'chemical-process-engineering'),
  ('Industrial & Manufacturing Engineering', 'industrial-manufacturing-engineering'),
  ('Mechanical Engineering', 'mechanical-engineering'),
  ('Electrical & Electronics Engineering', 'electrical-electronics-engineering'),
  ('Civil & Structural Engineering', 'civil-structural-engineering'),
  ('Biomedical Engineering', 'biomedical-engineering'),
  ('Robotics, Mechatronics & Automation', 'robotics-mechatronics-automation'),
  ('Instrumentation, Control & Metrology', 'instrumentation-control-metrology'),
  ('Maintenance & Reliability Engineering', 'maintenance-reliability-engineering'),
  ('Production & Manufacturing Operations', 'production-manufacturing-operations'),
  ('Process Optimisation & Production Planning', 'process-optimisation-production-planning'),
  ('Health, Safety & Process Risk Management', 'health-safety-process-risk-management'),
  ('Energy Systems & Renewable Energy', 'energy-systems-renewable-energy'),
  ('Water & Wastewater Engineering', 'water-wastewater-engineering'),
  ('Mining & Mineral Processing', 'mining-mineral-processing'),
  ('Surveying & Geospatial Science', 'surveying-geospatial-science'),
  ('Software Development & Engineering', 'software-development-engineering'),
  ('IT Infrastructure, Systems & Support', 'it-infrastructure-systems-support'),
  ('Cybersecurity', 'cybersecurity'),
  ('Cloud Computing & DevOps', 'cloud-computing-devops'),
  ('Data Science, Analytics & Artificial Intelligence', 'data-science-analytics-artificial-intelligence'),
  ('Networking & Telecommunications', 'networking-telecommunications'),
  ('Mathematics, Statistics & Actuarial Science', 'mathematics-statistics-actuarial-science'),
  ('Operations Research & Optimisation', 'operations-research-optimisation'),
  ('Technical Support & Field Service', 'technical-support-field-service'),
  ('Technical Sales & Business Development', 'technical-sales-business-development'),
  ('Technical Procurement & Supply Chain', 'technical-procurement-supply-chain'),
  ('Technical Project Management & Operations', 'technical-project-management-operations'),
  ('STEM Education, Teaching & Curriculum Development', 'stem-education-teaching-curriculum-development'),
  ('Technical Training, Academic Research & Science Communication', 'technical-training-academic-research-science-communication')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. REMAP LEGACY CATEGORY TEXT ONTO THE NEW TAXONOMY (conservative mapping;
--    legacy values with no clear STEM equivalent are left untouched)
-- ============================================================================

CREATE TEMP TABLE industry_remap ON COMMIT DROP AS
SELECT * FROM (VALUES
  ('Agriculture, Fishing & Forestry',            'Agriculture, Agribusiness & Agricultural Technology'),
  ('Agriculture & Agribusiness',                 'Agriculture, Agribusiness & Agricultural Technology'),
  ('Food Services, Hospitality & Catering',      'Food & Beverage Manufacturing'),
  ('Chemical & Process Industry',                'Chemicals, Paints, Polymers & Industrial Materials'),
  ('Healthcare, Medical & Pharmaceutical',       'Healthcare, Hospitals & Medical Laboratories'),
  ('Health Tech & Biotechnology',                'Pharmaceuticals & Biotechnology'),
  ('Manufacturing & Warehousing',                'Manufacturing & Industrial Production'),
  ('Printing, Publishing & Packaging',           'Paper, Pulp & Packaging'),
  ('Mining, Oil & Gas',                          'Oil, Gas & Petrochemicals'),
  ('Energy, Utilities & Waste Management',       'Energy, Power & Renewable Energy'),
  ('Renewable Energy & Climate',                 'Energy, Power & Renewable Energy'),
  ('Environment & Natural Resources',            'Environmental Services & Conservation'),
  ('Building, Construction & Real Estate',       'Construction, Infrastructure & Built Environment'),
  ('Transport & Infrastructure',                 'Construction, Infrastructure & Built Environment'),
  ('Real Estate & Property Management',          'Real Estate & Facilities Management'),
  ('Automotive & Aviation',                      'Automotive & Transport Equipment'),
  ('Maritime & Shipping',                        'Logistics, Supply Chain & Distribution'),
  ('Logistics & Transportation',                 'Logistics, Supply Chain & Distribution'),
  ('Import & Export',                            'Logistics, Supply Chain & Distribution'),
  ('ICT & Telecommunications',                   'Information Technology & Software'),
  ('Education Technology (EdTech)',              'Educational Technology (EdTech)'),
  ('Research, Science & Technology',             'Scientific Research & Development'),
  ('Banking, Insurance & Financial Services',    'Banking, Finance & Insurance'),
  ('Accounting, Auditing & Finance',             'Banking, Finance & Insurance'),
  ('Financial Technology (FinTech)',             'Banking, Finance & Insurance'),
  ('Charity, NGO & Non-Profit',                  'NGOs, Development & International Organisations'),
  ('NGO, NPO & Charity',                         'NGOs, Development & International Organisations'),
  ('Community & Social Services',                'NGOs, Development & International Organisations'),
  ('Government & Public Administration',         'Government & Public Sector'),
  ('Retail, Wholesale, E-commerce & FMCG',       'Consumer Goods & Retail'),
  ('Fashion & Beauty',                           'Consumer Goods & Retail'),
  ('Security & Defence',                         'Aerospace & Defence'),
  ('Legal Services',                             'Consulting & Professional Services'),
  ('Business Process Outsourcing (BPO)',         'Consulting & Professional Services'),
  ('Human Resources & Recruitment',              'Consulting & Professional Services')
) AS m(old_name, new_name);

CREATE TEMP TABLE function_remap ON COMMIT DROP AS
SELECT * FROM (VALUES
  ('IT & Software',                              'Software Development & Engineering'),
  ('Data, Analytics & AI',                       'Data Science, Analytics & Artificial Intelligence'),
  ('Telecommunications',                         'Networking & Telecommunications'),
  ('Quality Control & Assurance',                'Quality Assurance & Quality Management'),
  ('Science & Laboratory',                       'Laboratory Operations & Testing'),
  ('Health & Safety',                            'Health, Safety & Process Risk Management'),
  ('Environment, Energy & Natural Resources',    'Environmental Science & Management'),
  ('Agriculture, Food & Natural Resources',      'Agricultural Science & Technology'),
  ('Research, Teaching & Training',              'Technical Training, Academic Research & Science Communication'),
  ('Education & Training',                       'STEM Education, Teaching & Curriculum Development'),
  ('Product & Project Management',               'Technical Project Management & Operations'),
  ('Manufacturing & Warehousing',                'Production & Manufacturing Operations'),
  ('Maintenance, Repair & Installation',         'Maintenance & Reliability Engineering'),
  ('Supply Chain & Procurement',                 'Technical Procurement & Supply Chain'),
  ('Customer Service & Support',                 'Technical Support & Field Service'),
  ('Sales',                                      'Technical Sales & Business Development'),
  ('Engineering & Technology',                   'Industrial & Manufacturing Engineering')
) AS m(old_name, new_name);

-- jobs.industry (single text, used by the listing filter)
UPDATE public.jobs j
SET industry = r.new_name
FROM industry_remap r
WHERE j.industry = r.old_name;

-- jobs.industries (text array) — replace mapped elements and de-dupe
UPDATE public.jobs j
SET industries = (
  SELECT array_agg(DISTINCT COALESCE(r.new_name, elem))
  FROM unnest(j.industries) AS elem
  LEFT JOIN industry_remap r ON r.old_name = elem
)
WHERE j.industries IS NOT NULL AND array_length(j.industries, 1) > 0;

-- companies.industry
UPDATE public.companies c
SET industry = r.new_name
FROM industry_remap r
WHERE c.industry = r.old_name;

-- jobs.job_function (single text, used by the listing filter)
UPDATE public.jobs j
SET job_function = r.new_name
FROM function_remap r
WHERE j.job_function = r.old_name;

-- jobs.job_functions (text array)
UPDATE public.jobs j
SET job_functions = (
  SELECT array_agg(DISTINCT COALESCE(r.new_name, elem))
  FROM unnest(j.job_functions) AS elem
  LEFT JOIN function_remap r ON r.old_name = elem
)
WHERE j.job_functions IS NOT NULL AND array_length(j.job_functions, 1) > 0;

-- Keep text arrays in sync with the single-text columns
UPDATE public.jobs
SET industries = ARRAY[industry]
WHERE industry IS NOT NULL
  AND (industries IS NULL OR array_length(industries, 1) IS NULL);

UPDATE public.jobs
SET job_functions = ARRAY[job_function]
WHERE job_function IS NOT NULL
  AND (job_functions IS NULL OR array_length(job_functions, 1) IS NULL);

-- ============================================================================
-- 3. DROP OLD LOOKUP ROWS NOT IN THE NEW TAXONOMY
--    (jobs.industry_id / jobs.job_function_id FKs are ON DELETE SET NULL)
-- ============================================================================

DELETE FROM public.industries
WHERE name NOT IN (
  'Agriculture, Agribusiness & Agricultural Technology',
  'Food & Beverage Manufacturing',
  'Chemicals, Paints, Polymers & Industrial Materials',
  'Pharmaceuticals & Biotechnology',
  'Healthcare, Hospitals & Medical Laboratories',
  'Manufacturing & Industrial Production',
  'Paper, Pulp & Packaging',
  'Plastics, Rubber & Composites',
  'Oil, Gas & Petrochemicals',
  'Energy, Power & Renewable Energy',
  'Water, Wastewater & Water Treatment',
  'Environmental Services & Conservation',
  'Mining, Geology & Mineral Processing',
  'Construction, Infrastructure & Built Environment',
  'Electrical & Electronics Manufacturing',
  'Automotive & Transport Equipment',
  'Aerospace & Defence',
  'Information Technology & Software',
  'Telecommunications & Networking',
  'Data, Artificial Intelligence & Analytics',
  'Banking, Finance & Insurance',
  'Consulting & Professional Services',
  'Scientific Research & Development',
  'Testing, Inspection, Certification & Calibration',
  'Schools & Secondary Education',
  'Universities & Higher Education',
  'Technical & Vocational Education and Training (TVET)',
  'STEM Training & Professional Development',
  'Educational Technology (EdTech)',
  'Government & Public Sector',
  'NGOs, Development & International Organisations',
  'Logistics, Supply Chain & Distribution',
  'Consumer Goods & Retail',
  'Textiles, Apparel & Leather Manufacturing',
  'Life Sciences & Biomedical Research',
  'Laboratories & Scientific Services',
  'Aviation & Aerospace Services',
  'Real Estate & Facilities Management',
  'Telecommunications Infrastructure',
  'Waste Management & Recycling'
);

DELETE FROM public.job_functions
WHERE name NOT IN (
  'Research & Development (R&D)',
  'Analytical Chemistry',
  'Laboratory Operations & Testing',
  'Quality Control (QC)',
  'Quality Assurance & Quality Management',
  'Regulatory Affairs & Compliance',
  'Product Development & Formulation',
  'Microbiology & Biotechnology',
  'Clinical Research & Trials',
  'Materials Science & Engineering',
  'Food Science & Technology',
  'Environmental Science & Management',
  'Geology, Geoscience & Mineral Exploration',
  'Agricultural Science & Technology',
  'Public Health Science & Epidemiology',
  'Biostatistics & Bioinformatics',
  'Scientific Data Management',
  'Chemical & Process Engineering',
  'Industrial & Manufacturing Engineering',
  'Mechanical Engineering',
  'Electrical & Electronics Engineering',
  'Civil & Structural Engineering',
  'Biomedical Engineering',
  'Robotics, Mechatronics & Automation',
  'Instrumentation, Control & Metrology',
  'Maintenance & Reliability Engineering',
  'Production & Manufacturing Operations',
  'Process Optimisation & Production Planning',
  'Health, Safety & Process Risk Management',
  'Energy Systems & Renewable Energy',
  'Water & Wastewater Engineering',
  'Mining & Mineral Processing',
  'Surveying & Geospatial Science',
  'Software Development & Engineering',
  'IT Infrastructure, Systems & Support',
  'Cybersecurity',
  'Cloud Computing & DevOps',
  'Data Science, Analytics & Artificial Intelligence',
  'Networking & Telecommunications',
  'Mathematics, Statistics & Actuarial Science',
  'Operations Research & Optimisation',
  'Technical Support & Field Service',
  'Technical Sales & Business Development',
  'Technical Procurement & Supply Chain',
  'Technical Project Management & Operations',
  'STEM Education, Teaching & Curriculum Development',
  'Technical Training, Academic Research & Science Communication'
);

-- ============================================================================
-- 4. REBUILD ID COLUMNS FROM CANONICAL NAMES (after the DELETE above)
-- ============================================================================

UPDATE public.jobs j
SET industry_ids = COALESCE(
  (SELECT array_agg(i.id ORDER BY i.id) FROM public.industries i WHERE i.name = ANY (j.industries)),
  '{}'
);

UPDATE public.jobs j
SET job_function_ids = COALESCE(
  (SELECT array_agg(f.id ORDER BY f.id) FROM public.job_functions f WHERE f.name = ANY (j.job_functions)),
  '{}'
);

UPDATE public.jobs j
SET industry_id = (SELECT i.id FROM public.industries i WHERE i.name = j.industry LIMIT 1);

UPDATE public.jobs j
SET job_function_id = (SELECT f.id FROM public.job_functions f WHERE f.name = j.job_function LIMIT 1);

COMMIT;

