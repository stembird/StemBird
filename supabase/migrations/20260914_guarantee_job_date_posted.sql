-- ============================================================
-- Guarantee jobs.date_posted is always set
-- ============================================================
-- Google JobPosting requires datePosted. Scraped adapters that spread
-- `date_posted: null` skip the column DEFAULT and leave JSON-LD without
-- the field (GSC: Operation Agent, Medical Representative — crawled
-- 2026-09-10). The 2026-09-11 backfill was one-shot; this trigger and
-- NOT NULL constraint prevent the same gap on every future insert/update.
-- ============================================================

BEGIN;

UPDATE public.jobs
SET date_posted = COALESCE(created_at, now())
WHERE date_posted IS NULL;

CREATE OR REPLACE FUNCTION public.sync_posted_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date_posted IS NULL THEN
    NEW.date_posted := COALESCE(NEW.created_at, now());
  END IF;
  NEW.posted_date := CAST(NEW.date_posted AT TIME ZONE 'UTC' AS DATE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_posted_date ON public.jobs;
CREATE TRIGGER trg_sync_posted_date
BEFORE INSERT OR UPDATE OF date_posted ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.sync_posted_date();

ALTER TABLE public.jobs
  ALTER COLUMN date_posted SET DEFAULT now();

ALTER TABLE public.jobs
  ALTER COLUMN date_posted SET NOT NULL;

COMMIT;
