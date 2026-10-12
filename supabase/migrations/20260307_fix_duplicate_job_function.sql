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
