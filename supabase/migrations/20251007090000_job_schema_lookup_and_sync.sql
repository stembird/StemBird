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


