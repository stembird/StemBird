-- Add flag distinguishing stated source salaries from Kenyan market estimates
-- used when scrapers find no salary/range on the job posting.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS salary_is_estimated BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN jobs.salary_is_estimated IS
  'True when salary_min/salary_max were filled from Kenyan market estimates because the source listing omitted pay.';

CREATE INDEX IF NOT EXISTS idx_jobs_salary_is_estimated
  ON jobs (salary_is_estimated)
  WHERE salary_is_estimated = true;
