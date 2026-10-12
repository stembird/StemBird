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