-- Create saved_searches table
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  search_params JSONB NOT NULL,
  email_alerts_enabled BOOLEAN DEFAULT false,
  alert_frequency VARCHAR(50) DEFAULT 'daily' CHECK (alert_frequency IN ('instant', 'daily', 'weekly')),
  last_alert_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create saved_jobs table
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- Create job_comparisons table
CREATE TABLE IF NOT EXISTS public.job_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  job_ids UUID[] NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (schema-qualified). Create partial index only if column exists.
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'saved_searches'
      AND column_name = 'email_alerts_enabled'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_saved_searches_email_alerts ON public.saved_searches(user_id, email_alerts_enabled) WHERE email_alerts_enabled = true';
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON public.saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id ON public.saved_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_comparisons_user_id ON public.job_comparisons(user_id);

-- Enable RLS
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_comparisons ENABLE ROW LEVEL SECURITY;

-- RLS Policies: create only if not already present (check pg_policy)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    JOIN pg_namespace n ON c.relnamespace = n.oid 
    WHERE c.relname = 'saved_searches' AND p.polname = 'users_can_view_their_own_saved_searches'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_view_their_own_saved_searches
      ON public.saved_searches FOR SELECT
      USING (auth.uid() = user_id);
    $q$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    WHERE c.relname = 'saved_searches' AND p.polname = 'users_can_create_their_own_saved_searches'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_create_their_own_saved_searches
      ON public.saved_searches FOR INSERT
      WITH CHECK (auth.uid() = user_id);
    $q$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    WHERE c.relname = 'saved_searches' AND p.polname = 'users_can_update_their_own_saved_searches'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_update_their_own_saved_searches
      ON public.saved_searches FOR UPDATE
      USING (auth.uid() = user_id);
    $q$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    WHERE c.relname = 'saved_searches' AND p.polname = 'users_can_delete_their_own_saved_searches'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_delete_their_own_saved_searches
      ON public.saved_searches FOR DELETE
      USING (auth.uid() = user_id);
    $q$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    WHERE c.relname = 'saved_jobs' AND p.polname = 'users_can_view_their_own_saved_jobs'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_view_their_own_saved_jobs
      ON public.saved_jobs FOR SELECT
      USING (auth.uid() = user_id);
    $q$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    WHERE c.relname = 'saved_jobs' AND p.polname = 'users_can_save_jobs'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_save_jobs
      ON public.saved_jobs FOR INSERT
      WITH CHECK (auth.uid() = user_id);
    $q$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    WHERE c.relname = 'saved_jobs' AND p.polname = 'users_can_update_their_saved_jobs'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_update_their_saved_jobs
      ON public.saved_jobs FOR UPDATE
      USING (auth.uid() = user_id);
    $q$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    WHERE c.relname = 'saved_jobs' AND p.polname = 'users_can_delete_their_saved_jobs'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_delete_their_saved_jobs
      ON public.saved_jobs FOR DELETE
      USING (auth.uid() = user_id);
    $q$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    WHERE c.relname = 'job_comparisons' AND p.polname = 'users_can_view_their_own_job_comparisons'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_view_their_own_job_comparisons
      ON public.job_comparisons FOR SELECT
      USING (auth.uid() = user_id);
    $q$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    WHERE c.relname = 'job_comparisons' AND p.polname = 'users_can_create_job_comparisons'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_create_job_comparisons
      ON public.job_comparisons FOR INSERT
      WITH CHECK (auth.uid() = user_id);
    $q$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    WHERE c.relname = 'job_comparisons' AND p.polname = 'users_can_update_their_own_job_comparisons'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_update_their_own_job_comparisons
      ON public.job_comparisons FOR UPDATE
      USING (auth.uid() = user_id);
    $q$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p 
    JOIN pg_class c ON p.polrelid = c.oid 
    WHERE c.relname = 'job_comparisons' AND p.polname = 'users_can_delete_their_own_job_comparisons'
  ) THEN
    EXECUTE $q$
      CREATE POLICY users_can_delete_their_own_job_comparisons
      ON public.job_comparisons FOR DELETE
      USING (auth.uid() = user_id);
    $q$;
  END IF;
END$$;

-- Create function to update updated_at timestamp (schema-qualified)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;

-- Create triggers for updated_at if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'update_saved_searches_updated_at'
      AND c.relname = 'saved_searches'
  ) THEN
    EXECUTE 'CREATE TRIGGER update_saved_searches_updated_at
      BEFORE UPDATE ON public.saved_searches
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'update_job_comparisons_updated_at'
      AND c.relname = 'job_comparisons'
  ) THEN
    EXECUTE 'CREATE TRIGGER update_job_comparisons_updated_at
      BEFORE UPDATE ON public.job_comparisons
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();';
  END IF;
END$$;
