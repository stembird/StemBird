-- ============================================================================
-- Social Publishing module (Phase 1: Buffer integration)
--
-- Central place for social posts so Careersasa can later replace Buffer with
-- a native publishing engine without redesigning the data model.
--
-- Design notes:
--   * social_posts.job_id is nullable because future posts may not relate to
--     a single job (e.g. roundups, brand content).
--   * Duplicate protection is enforced at the application layer (job_id +
--     platform + status) so evergreen jobs can still be reposted explicitly
--     via is_repost = true.
--   * Both tables are service-role only (RLS enabled, no policies). Buffer
--     credentials are never readable by the browser.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. social_posts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  platform TEXT NOT NULL
    CHECK (platform IN ('linkedin', 'facebook', 'instagram')),
  channel_id TEXT,          -- Buffer channel id the post was sent to
  channel_service TEXT,     -- Buffer channel service (linkedin/facebook/instagram/...)
  post_text TEXT NOT NULL,
  media_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN
      ('draft', 'ready', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  buffer_post_id TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message TEXT,
  is_repost BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS enabled with no policies: only the service-role admin API routes
-- (which run requireAdmin) can touch social posts.
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_social_posts_status
  ON public.social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_job_id
  ON public.social_posts(job_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform
  ON public.social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_at
  ON public.social_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_social_posts_buffer_post_id
  ON public.social_posts(buffer_post_id);

-- Fast duplicate check: job + platform for anything that counts as "already
-- published or queued" (drafts / failures / cancellations are excluded).
CREATE INDEX IF NOT EXISTS idx_social_posts_job_platform_active
  ON public.social_posts(job_id, platform)
  WHERE status IN ('ready', 'scheduled', 'publishing', 'published');

-- ---------------------------------------------------------------------------
-- 2. buffer_config (single row; service-role only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.buffer_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  api_key TEXT,                     -- never returned to the browser
  account_name TEXT,
  account_email TEXT,
  organization_id TEXT,
  channels_json JSONB DEFAULT '[]'::jsonb,
  connected_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.buffer_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.buffer_config (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;
