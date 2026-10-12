-- Pause legacy Inkomoko source_id so discover only runs the canonical
-- inkomoko-careers row (same Workable board; avoids double-queuing).

UPDATE public.scraper_sources
SET is_active = false
WHERE source_id = 'inkomoko-workable'
  AND EXISTS (
    SELECT 1 FROM public.scraper_sources
    WHERE source_id = 'inkomoko-careers'
  );

-- Ensure Tatu City has category metadata (already active from earlier seed)
UPDATE public.scraper_sources
SET selectors = selectors || '{"category": "employer"}'::jsonb
WHERE source_id = 'tatucity-workable'
  AND NOT (selectors ? 'category');
