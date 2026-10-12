-- Setup Cron Jobs for Job Management
-- This script sets up pg_cron jobs for automatic job expiration and renewal
-- Requires pg_cron extension to be enabled

-- Enable pg_cron extension (requires superuser)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule job expiration check (runs daily at 2 AM)
SELECT cron.schedule(
  'expire-old-jobs',
  '0 2 * * *',
  $$SELECT expire_old_jobs();$$
);

-- Schedule auto-renewal check (runs daily at 3 AM)
SELECT cron.schedule(
  'auto-renew-jobs',
  '0 3 * * *',
  $$SELECT auto_renew_expired_jobs();$$
);

-- Schedule promotion expiration check (runs every hour)
SELECT cron.schedule(
  'expire-promotions',
  '0 * * * *',
  $$
  UPDATE jobs
  SET is_promoted = FALSE,
      promotion_tier = NULL,
      promotion_start_date = NULL,
      promotion_end_date = NULL
  WHERE is_promoted = TRUE
  AND promotion_end_date <= NOW();
  $$
);

-- Schedule featured expiration check (runs every hour)
SELECT cron.schedule(
  'expire-featured',
  '0 * * * *',
  $$
  UPDATE jobs
  SET is_featured = FALSE,
      featured_until = NULL
  WHERE is_featured = TRUE
  AND featured_until <= NOW();
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job;

-- To unschedule a job (if needed):
-- SELECT cron.unschedule('expire-old-jobs');
-- SELECT cron.unschedule('auto-renew-jobs');
-- SELECT cron.unschedule('expire-promotions');
-- SELECT cron.unschedule('expire-featured');
