-- Attach a listing (or pasted JD) to a Career Tools CV so keyword gaps can be shown.
-- parent_cv_id records a tailored copy of another saved CV.

ALTER TABLE candidate_cvs
  ADD COLUMN IF NOT EXISTS parent_cv_id UUID REFERENCES candidate_cvs(id) ON DELETE SET NULL;

ALTER TABLE candidate_cvs
  ADD COLUMN IF NOT EXISTS target_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;

ALTER TABLE candidate_cvs
  ADD COLUMN IF NOT EXISTS target_jd_text TEXT;

CREATE INDEX IF NOT EXISTS idx_candidate_cvs_parent
  ON candidate_cvs(parent_cv_id);

CREATE INDEX IF NOT EXISTS idx_candidate_cvs_target_job
  ON candidate_cvs(target_job_id);

COMMENT ON COLUMN candidate_cvs.parent_cv_id IS
  'Source CV when this row is a tailored copy for a specific job.';
COMMENT ON COLUMN candidate_cvs.target_job_id IS
  'CareerSasa job this CV is targeted at, when attached from a listing.';
COMMENT ON COLUMN candidate_cvs.target_jd_text IS
  'Plain-text job description used for keyword comparison (from the listing or a paste).';
