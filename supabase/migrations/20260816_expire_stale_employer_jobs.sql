-- ============================================================
-- One-off cleanup: expire stale employer-posted jobs
-- ============================================================
-- Google flags 39+ active jobs as "Missing field validThrough"
-- (non-critical warning; items remain valid). All of them are
-- employer-posted jobs (source = 'Employer') with no deadline and
-- no auto-renew, many months old. They should not remain "active".
--
-- This is a ONE-OFF cleanup (no policy change): it targets only
-- active, non-auto-renew employer jobs older than 6 months with no
-- valid_through and no expires_at.
--
-- For each match it sets:
--   * status        = 'expired'         (drops the job from the sitemap)
--   * valid_through = NOW()             (past deadline => the page shows the
--                                        "expired" banner, ApplySection closes,
--                                        and JSON-LD emits a past validThrough,
--                                        which is Google's accepted signal to
--                                        stop showing the posting)
--   * application_deadline syncs automatically via the trg_sync_application_deadline
--     trigger.
-- ============================================================

BEGIN;

-- Dry-run count (sanity check before the UPDATE):
-- SELECT COUNT(*) FROM jobs
-- WHERE status = 'active'
--   AND auto_renew = FALSE
--   AND valid_through IS NULL
--   AND expires_at IS NULL
--   AND source = 'Employer'
--   AND COALESCE(date_posted, created_at) < NOW() - INTERVAL '180 days';

UPDATE public.jobs
SET status        = 'expired',
    updated_at    = NOW(),
    valid_through = NOW()
WHERE status = 'active'
  AND auto_renew = FALSE
  AND valid_through IS NULL
  AND expires_at IS NULL
  AND source = 'Employer'
  AND COALESCE(date_posted, created_at) < NOW() - INTERVAL '180 days';

COMMIT;
