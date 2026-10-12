-- ============================================================
-- Guarantee JobPosting fields Google Search Console flags
-- ============================================================
-- GSC Job Postings (2026-09-13):
--   error  Missing datePosted          (4 leftover; already NOT NULL)
--   failed Missing validThrough        (8)
--   warn   Missing employmentType      (4)
--
-- CareerSasa listings always expire 30 days after posting when the employer
-- did not supply a deadline (scraper + JobPostingForm already do this).
-- Fill remaining NULLs and keep future inserts complete so JSON-LD and the
-- visible page stay in sync.
-- ============================================================

BEGIN;

-- Deadlines: date_posted + 30 days (same default as getDefaultValidThrough)
UPDATE public.jobs
SET valid_through = COALESCE(date_posted, created_at) + INTERVAL '30 days'
WHERE valid_through IS NULL;

UPDATE public.jobs
SET expires_at = (
  CAST(valid_through AT TIME ZONE 'UTC' AS date) + TIME '23:59:59'
) AT TIME ZONE 'UTC'
WHERE expires_at IS NULL
  AND valid_through IS NOT NULL;

UPDATE public.jobs
SET application_deadline = CAST(valid_through AT TIME ZONE 'UTC' AS date)
WHERE application_deadline IS NULL
  AND valid_through IS NOT NULL;

-- Employment type: product default used by the post-job form and scrapers
UPDATE public.jobs
SET employment_type = 'FULL_TIME'
WHERE employment_type IS NULL;

UPDATE public.jobs
SET employment_types = ARRAY[employment_type]::public.employment_type[]
WHERE employment_types IS NULL
  AND employment_type IS NOT NULL;

CREATE OR REPLACE FUNCTION public.guarantee_jobposting_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date_posted IS NULL THEN
    NEW.date_posted := COALESCE(NEW.created_at, now());
  END IF;
  NEW.posted_date := CAST(NEW.date_posted AT TIME ZONE 'UTC' AS date);

  IF NEW.valid_through IS NULL THEN
    NEW.valid_through := NEW.date_posted + INTERVAL '30 days';
  END IF;

  IF NEW.expires_at IS NULL AND NEW.valid_through IS NOT NULL THEN
    NEW.expires_at := (
      CAST(NEW.valid_through AT TIME ZONE 'UTC' AS date) + TIME '23:59:59'
    ) AT TIME ZONE 'UTC';
  END IF;

  IF NEW.application_deadline IS NULL AND NEW.valid_through IS NOT NULL THEN
    NEW.application_deadline := CAST(NEW.valid_through AT TIME ZONE 'UTC' AS date);
  END IF;

  IF NEW.employment_type IS NULL THEN
    NEW.employment_type := 'FULL_TIME';
  END IF;

  IF NEW.employment_types IS NULL AND NEW.employment_type IS NOT NULL THEN
    NEW.employment_types := ARRAY[NEW.employment_type]::public.employment_type[];
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_00_guarantee_jobposting_fields ON public.jobs;
CREATE TRIGGER trg_00_guarantee_jobposting_fields
BEFORE INSERT OR UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.guarantee_jobposting_fields();

COMMIT;
