-- Expire jobs whose source deadline (valid_through) has passed.
--
-- expire_old_jobs() previously only expired rows where expires_at <= now() (the
-- promoted/featured lifecycle), so scraped jobs whose application deadline passed
-- stayed status='active' with a past valid_through. Google drops those from the
-- JobPosting experience on recrawl, which was a steady source of "valid item"
-- attrition. Now the function also expires on valid_through.

CREATE OR REPLACE FUNCTION expire_old_jobs()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE jobs
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active'
    AND auto_renew = FALSE
    AND (
      (expires_at IS NOT NULL AND expires_at <= NOW())
      OR (valid_through IS NOT NULL AND valid_through <= NOW())
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM expired;

  -- Log expired jobs
  INSERT INTO job_history (job_id, action)
  SELECT id, 'expired' FROM jobs
  WHERE status = 'expired'
  AND (
    (expires_at IS NOT NULL AND expires_at <= NOW())
    OR (valid_through IS NOT NULL AND valid_through <= NOW())
  )
  AND NOT EXISTS (
    SELECT 1 FROM job_history
    WHERE job_history.job_id = jobs.id
    AND action = 'expired'
    AND created_at > NOW() - INTERVAL '1 hour'
  );

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill: mark the existing "active but deadline passed" jobs as expired so
-- they stop being served with JobPosting markup that Google drops on recrawl.
UPDATE jobs
SET status = 'expired', updated_at = NOW()
WHERE status = 'active'
AND auto_renew = FALSE
AND valid_through IS NOT NULL
AND valid_through <= NOW();
