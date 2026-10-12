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


