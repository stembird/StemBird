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
