-- ============================================================
-- Job Scraper Tables
-- ============================================================

-- 1. scraper_sources: config for each URL to scrape
CREATE TABLE IF NOT EXISTS scraper_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text UNIQUE NOT NULL,         -- e.g. "safaricom-careers"
  name text NOT NULL,                     -- human-readable label
  base_url text NOT NULL,                 -- listing page URL
  is_active boolean DEFAULT true,
  selectors jsonb NOT NULL,               -- CSS selectors for this site
  last_discovered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2. scrape_queue: jobs discovered but not yet fully processed
CREATE TABLE IF NOT EXISTS scrape_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL REFERENCES scraper_sources(source_id) ON DELETE CASCADE,
  job_url text NOT NULL UNIQUE,           -- full URL to the job detail page
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  partial_data jsonb,                     -- title/location captured from listing page
  error_message text,
  attempts int DEFAULT 0,
  queued_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS scrape_queue_status_idx ON scrape_queue(status);
CREATE INDEX IF NOT EXISTS scrape_queue_queued_at_idx ON scrape_queue(queued_at);

-- 3. scraped_job_sources: deduplication log of all published jobs
CREATE TABLE IF NOT EXISTS scraped_job_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL,
  job_url text NOT NULL UNIQUE,           -- original URL on source site
  content_hash text NOT NULL UNIQUE,     -- hash of title+company+location
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  status text DEFAULT 'published'
    CHECK (status IN ('published', 'duplicate', 'failed', 'skipped')),
  scraped_at timestamptz DEFAULT now(),
  raw_data jsonb                          -- full raw scraped payload for debugging
);

CREATE INDEX IF NOT EXISTS scraped_job_sources_source_id_idx ON scraped_job_sources(source_id);

-- ============================================================
-- RLS Policies (service role bypasses these, but good practice)
-- ============================================================

ALTER TABLE scraper_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_job_sources ENABLE ROW LEVEL SECURITY;

-- Only service role / admin can read/write these tables
-- No public access needed
CREATE POLICY "Service role only" ON scraper_sources
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON scrape_queue
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON scraped_job_sources
  FOR ALL USING (auth.role() = 'service_role');
