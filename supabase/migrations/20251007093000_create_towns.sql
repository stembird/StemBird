-- Create towns table with FK to counties and indexes
BEGIN;

CREATE TABLE IF NOT EXISTS public.towns (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  county_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_towns_name_per_county UNIQUE (name, county_id),
  CONSTRAINT uq_towns_slug UNIQUE (slug),
  CONSTRAINT fk_towns_county
    FOREIGN KEY (county_id)
    REFERENCES public.counties(id)
    ON DELETE CASCADE
);

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_towns_county_id ON public.towns(county_id);
CREATE INDEX IF NOT EXISTS idx_towns_name ON public.towns(name);

-- trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_towns_updated_at ON public.towns;
CREATE TRIGGER update_towns_updated_at
  BEFORE UPDATE ON public.towns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;


