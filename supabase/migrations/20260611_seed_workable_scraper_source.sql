-- Seed Inkomoko as a Workable ATS scraper source (Kenya jobs only)
INSERT INTO public.scraper_sources (source_id, name, base_url, is_active, selectors)
VALUES (
  'inkomoko-careers',
  'Inkomoko',
  'https://apply.workable.com/inkomoko/',
  true,
  '{"type": "workable", "slug": "inkomoko", "filterCountry": "Kenya"}'::jsonb
)
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active,
  selectors = EXCLUDED.selectors;
