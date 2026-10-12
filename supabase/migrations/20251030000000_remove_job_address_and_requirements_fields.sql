-- Remove Full Address and Requirements fields from jobs table
ALTER TABLE public.jobs
DROP COLUMN IF EXISTS job_location_address,
DROP COLUMN IF EXISTS preferred_qualifications,
DROP COLUMN IF EXISTS applicant_location_requirements;