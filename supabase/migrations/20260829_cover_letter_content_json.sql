-- Structured cover letter fields so saved letters can reopen in the visual editor
-- and download as the designed template (not a concatenated text blob).

ALTER TABLE candidate_cover_letters
  ADD COLUMN IF NOT EXISTS content_json JSONB;

COMMENT ON COLUMN candidate_cover_letters.content_json IS
  'Structured cover letter editor state: { templateName, fields }. content remains derived plaintext for clipboard/ATS.';
