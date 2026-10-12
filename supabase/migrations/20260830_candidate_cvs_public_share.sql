-- Public share URL for a Career Tools CV. Token is the capability; is_public is the switch.

ALTER TABLE candidate_cvs
  ADD COLUMN IF NOT EXISTS share_token TEXT;

ALTER TABLE candidate_cvs
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE candidate_cvs
  ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_cvs_share_token
  ON candidate_cvs(share_token)
  WHERE share_token IS NOT NULL;

DROP POLICY IF EXISTS "Public can view shared CVs" ON candidate_cvs;
CREATE POLICY "Public can view shared CVs"
  ON candidate_cvs FOR SELECT
  USING (is_public = true AND share_token IS NOT NULL);

COMMENT ON COLUMN candidate_cvs.share_token IS
  'Unguessable token for /cv/{token}. Kept when sharing is turned off so the same URL can be reused.';
COMMENT ON COLUMN candidate_cvs.is_public IS
  'When true, anyone with the share token can view this CV.';
COMMENT ON COLUMN candidate_cvs.shared_at IS
  'Last time sharing was turned on.';
