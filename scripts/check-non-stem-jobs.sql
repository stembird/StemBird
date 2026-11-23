-- Query to find potentially non-STEM jobs that got through the filter
-- Run this in Supabase SQL Editor to audit published jobs

-- Check jobs with non-STEM job functions
SELECT
  id,
  title,
  company,
  job_function,
  job_functions,
  industry,
  industries,
  date_posted,
  status
FROM jobs
WHERE status = 'active'
  AND (
    -- Non-STEM job functions (business, admin, HR, sales, marketing, etc.)
    job_function ILIKE ANY(ARRAY[
      '%admin%',
      '%human resource%',
      '%HR %',
      '%marketing%',
      '%sales%',
      '%business%',
      '%accounting%',
      '%finance%',
      '%procurement%',
      '%logistics%',
      '%customer service%',
      '%receptionist%',
      '%secretary%',
      '%assistant%',
      '%manager%',
      '%coordinator%',
      '%officer%',
      '%legal%',
      '%compliance%',
      '%audit%',
      '%driver%',
      '%security%',
      '%cleaner%'
    ])
    -- Exclude if they have STEM keywords in title
    AND NOT (title ILIKE ANY(ARRAY[
      '%engineer%',
      '%technical%',
      '%laboratory%',
      '%lab %',
      '%scientist%',
      '%research%',
      '%data%',
      '%software%',
      '%IT %',
      '%developer%',
      '%programmer%',
      '%analyst%',
      '%architect%',
      '%chemistry%',
      '%biology%',
      '%physics%',
      '%mathematics%',
      '%medical%',
      '%clinical%',
      '%pharmaceutical%',
      '%biotech%',
      '%quality%',
      '%QA%',
      '%QC%'
    ]))
  )
ORDER BY date_posted DESC
LIMIT 50;

-- Also check by industry
SELECT
  id,
  title,
  company,
  job_function,
  industry,
  date_posted,
  status
FROM jobs
WHERE status = 'active'
  AND industry IS NOT NULL
  AND NOT (industry ILIKE ANY(ARRAY[
    '%science%',
    '%healthcare%',
    '%medical%',
    '%pharmaceutical%',
    '%biotechnology%',
    '%technology%',
    '%software%',
    '%IT%',
    '%engineering%',
    '%architecture%',
    '%mathematics%',
    '%chemical%',
    '%manufacturing%',
    '%research%',
    '%laboratory%',
    '%environmental%',
    '%agriculture%',
    '%food science%',
    '%energy%',
    '%mining%',
    '%water%',
    '%data science%',
    '%telecommunications%',
    '%electronics%',
    '%automotive%',
    '%aerospace%'
  ]))
ORDER BY date_posted DESC
LIMIT 50;
