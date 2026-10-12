-- Link portal applications back to Career Tools documents.
-- cv_file_url remains the employer-facing PDF; these FKs record which builder docs were used.

ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS candidate_cv_id UUID REFERENCES candidate_cvs(id) ON DELETE SET NULL;

ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS candidate_cover_letter_id UUID REFERENCES candidate_cover_letters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_job_applications_candidate_cv
  ON job_applications(candidate_cv_id);

CREATE INDEX IF NOT EXISTS idx_job_applications_candidate_cover_letter
  ON job_applications(candidate_cover_letter_id);

COMMENT ON COLUMN job_applications.candidate_cv_id IS
  'Career Tools CV used for this application, when the candidate applied with a builder document.';
COMMENT ON COLUMN job_applications.candidate_cover_letter_id IS
  'Career Tools cover letter used for this application, when one was selected.';
