-- Card teasers without shipping full job HTML on list/related queries.
-- Catalog open-role counts without scanning every active job row.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobs'
      AND column_name = 'description_excerpt'
  ) THEN
    ALTER TABLE public.jobs
    ADD COLUMN description_excerpt text
    GENERATED ALWAYS AS (
      left(
        btrim(
          regexp_replace(
            regexp_replace(COALESCE(description, ''), '<[^>]+>', ' ', 'g'),
            '\s+',
            ' ',
            'g'
          )
        ),
        400
      )
    ) STORED;
  END IF;
END $$;

CREATE OR REPLACE VIEW public.active_jobs_by_company
WITH (security_invoker = true) AS
SELECT
  company_id,
  COUNT(*)::bigint AS job_count
FROM public.jobs
WHERE status = 'active'
  AND company_id IS NOT NULL
GROUP BY company_id;

GRANT SELECT ON public.active_jobs_by_company TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_jobs_status_company_id
  ON public.jobs (status, company_id)
  WHERE company_id IS NOT NULL;
