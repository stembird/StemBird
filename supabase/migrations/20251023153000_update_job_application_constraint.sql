-- Update constraint to allow any of the three application methods
ALTER TABLE public.jobs
DROP CONSTRAINT IF EXISTS chk_jobs_apply_path;

-- CHECK: enforce either direct apply OR at least one application method is provided
ALTER TABLE public.jobs
ADD CONSTRAINT chk_jobs_apply_path
CHECK (
  direct_apply = true OR application_url IS NOT NULL OR apply_email IS NOT NULL OR apply_link IS NOT NULL
);