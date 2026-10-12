-- Remove unused job fields that are no longer needed in the UI
ALTER TABLE public.jobs
DROP COLUMN IF EXISTS license_requirements,
DROP COLUMN IF EXISTS software_skills,
DROP COLUMN IF EXISTS practice_area,
DROP COLUMN IF EXISTS project_type,
DROP COLUMN IF EXISTS visa_sponsorship;