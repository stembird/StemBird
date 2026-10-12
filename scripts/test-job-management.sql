-- Test Script for Job Management Enhancements
-- Run this to verify all features are working correctly

-- 1. Test job template creation
INSERT INTO job_templates (
  employer_id,
  template_name,
  title,
  description,
  job_type,
  experience_level,
  location
) VALUES (
  auth.uid(),
  'Test Template',
  'Senior Software Engineer',
  'Test description',
  'Full-time',
  'Senior',
  'Remote'
) RETURNING id;

-- 2. Test job duplication
-- Replace <job_id> with an actual job ID
-- SELECT duplicate_job('<job_id>', 'Duplicated Job Title');

-- 3. Test job promotion
-- Replace <job_id> with an actual job ID
-- SELECT promote_job('<job_id>', 'premium', 14);

-- 4. Test job featuring
-- Replace <job_id> with an actual job ID
-- SELECT feature_job('<job_id>', 7);

-- 5. Test job renewal
-- First, create a job with expiration
INSERT INTO jobs (
  employer_id,
  title,
  description,
  location,
  job_type,
  status,
  expires_at,
  auto_renew,
  renewal_duration_days
) VALUES (
  auth.uid(),
  'Test Job for Renewal',
  'Test description',
  'Remote',
  'Full-time',
  'active',
  NOW() - INTERVAL '1 day', -- Already expired
  true,
  30
) RETURNING id;

-- 6. Test auto-renewal function
SELECT auto_renew_expired_jobs();

-- 7. Test expiration function
-- First, create an expired job without auto-renew
INSERT INTO jobs (
  employer_id,
  title,
  description,
  location,
  job_type,
  status,
  expires_at,
  auto_renew
) VALUES (
  auth.uid(),
  'Test Job for Expiration',
  'Test description',
  'Remote',
  'Full-time',
  'active',
  NOW() - INTERVAL '1 day',
  false
) RETURNING id;

-- Run expiration
SELECT expire_old_jobs();

-- 8. Test bulk job action
-- Replace <job_id_1>, <job_id_2> with actual job IDs
/*
INSERT INTO bulk_job_actions (
  employer_id,
  action_type,
  job_ids,
  parameters
) VALUES (
  auth.uid(),
  'promote',
  ARRAY['<job_id_1>', '<job_id_2>']::UUID[],
  '{"tier": "basic", "duration_days": 7}'::JSONB
) RETURNING id;

-- Execute the bulk action (replace <action_id>)
SELECT execute_bulk_job_action('<action_id>');
*/

-- 9. Verify job history is being created
SELECT 
  jh.*,
  j.title as job_title
FROM job_history jh
JOIN jobs j ON j.id = jh.job_id
WHERE jh.created_at > NOW() - INTERVAL '1 hour'
ORDER BY jh.created_at DESC;

-- 10. Check featured jobs
SELECT 
  id,
  title,
  is_featured,
  featured_until,
  is_promoted,
  promotion_tier,
  promotion_end_date
FROM jobs
WHERE is_featured = true OR is_promoted = true;

-- 11. Check expiring jobs
SELECT 
  id,
  title,
  expires_at,
  auto_renew,
  renewal_count,
  status
FROM jobs
WHERE expires_at IS NOT NULL
AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY expires_at;

-- 12. Check templates
SELECT * FROM job_templates
WHERE employer_id = auth.uid()
ORDER BY created_at DESC;

-- 13. Check bulk actions
SELECT * FROM bulk_job_actions
WHERE employer_id = auth.uid()
ORDER BY created_at DESC;

-- 14. Test RLS policies
-- These should only return your own data
SELECT COUNT(*) as my_templates FROM job_templates;
SELECT COUNT(*) as my_bulk_actions FROM bulk_job_actions;
SELECT COUNT(*) as my_job_history FROM job_history jh
JOIN jobs j ON j.id = jh.job_id
WHERE j.employer_id = auth.uid();

-- 15. Performance check - verify indexes exist
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('job_templates', 'job_history', 'bulk_job_actions', 'jobs')
AND indexname LIKE '%job%'
ORDER BY tablename, indexname;

-- Cleanup test data (optional)
/*
DELETE FROM job_templates WHERE template_name = 'Test Template';
DELETE FROM jobs WHERE title LIKE 'Test Job%';
*/

-- Summary report
SELECT 
  'Templates' as feature,
  COUNT(*) as count
FROM job_templates
WHERE employer_id = auth.uid()
UNION ALL
SELECT 
  'Featured Jobs',
  COUNT(*)
FROM jobs
WHERE employer_id = auth.uid()
AND is_featured = true
UNION ALL
SELECT 
  'Promoted Jobs',
  COUNT(*)
FROM jobs
WHERE employer_id = auth.uid()
AND is_promoted = true
UNION ALL
SELECT 
  'Auto-Renew Jobs',
  COUNT(*)
FROM jobs
WHERE employer_id = auth.uid()
AND auto_renew = true
UNION ALL
SELECT 
  'Expiring Soon',
  COUNT(*)
FROM jobs
WHERE employer_id = auth.uid()
AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
UNION ALL
SELECT 
  'Job History Records',
  COUNT(*)
FROM job_history jh
JOIN jobs j ON j.id = jh.job_id
WHERE j.employer_id = auth.uid()
UNION ALL
SELECT 
  'Bulk Actions',
  COUNT(*)
FROM bulk_job_actions
WHERE employer_id = auth.uid();
