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
