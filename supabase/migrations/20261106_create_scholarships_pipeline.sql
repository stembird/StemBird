-- ============================================================
-- Scholarships Pipeline (Phase 1) — dedicated scraping/parsing
-- ============================================================
-- Parallel to the jobs pipeline, mirroring 20260528_create_job_scraper_tables.sql:
--   * scraper_sources gains content_type so job Discover ignores scholarship
--     sources (the single touch-point into the jobs pipeline).
--   * scholarships               — final published table (deadline-driven)
--   * scholarship_queue          — mirror of scrape_queue
--   * scraped_scholarship_sources — mirror of scraped_job_sources (tombstones)
-- Supabase-compatible, idempotent DDL only (IF NOT EXISTS, no DO blocks).

-- 0. scraper_sources: job | scholarship routing column
ALTER TABLE scraper_sources
  ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'job'
    CHECK (content_type IN ('job', 'scholarship'));

-- 1. scholarships: final published table
CREATE TABLE IF NOT EXISTS scholarships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  provider text,                          -- funding organization
  description text,
  level text[],                           -- e.g. '{Masters,PhD}'
  field_of_study text[],
  study_destination text,                 -- country of study
  open_to_kenyans boolean DEFAULT true,
  eligibility text,
  coverage text[],                        -- 'Tuition','Stipend','Travel'…
  is_partial_award boolean DEFAULT false,
  award_value text,
  application_deadline date NOT NULL,     -- life-or-death field; expiry cron archives past-due
  academic_year int,
  duration_text text,
  application_url text,
  source_url text,
  status text DEFAULT 'live'
    CHECK (status IN ('live', 'expired', 'archived')),
  date_posted timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scholarships_deadline_idx ON scholarships(application_deadline);
CREATE INDEX IF NOT EXISTS scholarships_status_idx ON scholarships(status);
CREATE INDEX IF NOT EXISTS scholarships_level_idx ON scholarships USING gin(level);
CREATE INDEX IF NOT EXISTS scholarships_field_of_study_idx ON scholarships USING gin(field_of_study);

-- 2. scholarship_queue: discovered but not yet processed (mirror of scrape_queue)
CREATE TABLE IF NOT EXISTS scholarship_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL REFERENCES scraper_sources(source_id) ON DELETE CASCADE,
  scholarship_url text NOT NULL UNIQUE,   -- full URL to the scholarship detail page
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  partial_data jsonb,                     -- title captured from listing page
  error_message text,
  attempts int DEFAULT 0,
  queued_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS scholarship_queue_status_idx ON scholarship_queue(status);
CREATE INDEX IF NOT EXISTS scholarship_queue_queued_at_idx ON scholarship_queue(queued_at);

-- 3. scraped_scholarship_sources: dedup tombstones (mirror of scraped_job_sources).
-- content_hash = sha256(program-slug-normalized-title + academic_year) so
-- cohort re-runs ("Chevening 2026" vs "Chevening 2027") stay distinct records.
CREATE TABLE IF NOT EXISTS scraped_scholarship_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL,
  scholarship_url text NOT NULL UNIQUE,
  content_hash text NOT NULL UNIQUE,
  scholarship_id uuid REFERENCES scholarships(id) ON DELETE SET NULL,
  status text DEFAULT 'published'
    CHECK (status IN ('published', 'duplicate', 'failed', 'skipped')),
  scraped_at timestamptz DEFAULT now(),
  raw_data jsonb
);

CREATE INDEX IF NOT EXISTS scraped_scholarship_sources_source_id_idx ON scraped_scholarship_sources(source_id);

-- ============================================================
-- RLS (service role bypasses; policies are defense in depth)
-- ============================================================

ALTER TABLE scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE scholarship_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_scholarship_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only" ON scholarship_queue;
CREATE POLICY "Service role only" ON scholarship_queue
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role only" ON scraped_scholarship_sources;
CREATE POLICY "Service role only" ON scraped_scholarship_sources
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role only" ON scholarships;
CREATE POLICY "Service role only" ON scholarships
  FOR ALL USING (auth.role() = 'service_role');

-- Public read on live scholarships — needed in Phase 2, harmless now.
DROP POLICY IF EXISTS "Public read live scholarships" ON scholarships;
CREATE POLICY "Public read live scholarships" ON scholarships
  FOR SELECT USING (status = 'live');

-- ============================================================
-- Seed scholarship sources (inactive until a manual discover run verifies them)
-- ============================================================

INSERT INTO scraper_sources (source_id, name, base_url, is_active, content_type, selectors)
VALUES
  (
    'myjobmag-scholarships',
    'MyJobMag Scholarships',
    'https://www.myjobmag.co.ke/scholarships',
    false,
    'scholarship',
    '{"type": "html", "jobCard": "views-row, article", "jobLink": "a", "title": "h1, .field-content a", "description": ".node-content, .field--name-body", "applyLink": "", "deadline": ""}'::jsonb
  ),
  (
    'scholarshipportal-ke',
    'Scholarship Portal Kenya',
    'https://www.scholarshipportal-ke.com/',
    false,
    'scholarship',
    '{"type": "html", "jobCard": ".post, article", "jobLink": "h2 a, h3 a, .entry-title a", "title": "h1, .entry-title", "description": ".entry-content, .post-content"}'::jsonb
  ),
  (
    'helb',
    'HELB (Higher Education Loans Board)',
    'https://www.helb.co.ke/our-services/scholarship-and-loans-opportunities/',
    false,
    'scholarship',
    '{"type": "html", "jobCard": ".row a, article a", "jobLink": "a", "title": "h1", "description": ".entry-content"}'::jsonb
  ),
  (
    'chevening-program',
    'Chevening Programme (listing)',
    'https://www.chevening.org/scholarship/',
    false,
    'scholarship',
    '{"type": "html", "jobCard": ".entry-title a, h2 a", "jobLink": "a", "title": "h1", "description": ".entry-content"}'::jsonb
  )
ON CONFLICT (source_id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  content_type = EXCLUDED.content_type,
  selectors = EXCLUDED.selectors;
