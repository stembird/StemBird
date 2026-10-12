-- Step 4.3: Job Management Enhancements
-- Job templates, duplicate functionality, promotion, auto-expire, bulk actions

-- Job Templates Table
CREATE TABLE IF NOT EXISTS job_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  responsibilities TEXT,
  benefits TEXT,
  job_type TEXT,
  experience_level TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  location TEXT,
  remote_type TEXT,
  category TEXT,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Promotion/Featured Options
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_promoted BOOLEAN DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS promotion_start_date TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS promotion_end_date TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS promotion_tier TEXT CHECK (promotion_tier IN ('basic', 'premium', 'enterprise'));

-- Auto-expire and Renewal
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS renewal_duration_days INTEGER DEFAULT 30;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_renewed_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS renewal_count INTEGER DEFAULT 0;

-- Job History for tracking changes
CREATE TABLE IF NOT EXISTS job_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'duplicated', 'expired', 'renewed', 'promoted', 'unpromoted', 'featured', 'unfeatured')),
  changed_by UUID REFERENCES auth.users(id),
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bulk Job Actions Log
CREATE TABLE IF NOT EXISTS bulk_job_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('delete', 'expire', 'renew', 'promote', 'unpromote', 'feature', 'unfeature', 'update_status')),
  job_ids UUID[] NOT NULL,
  parameters JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_templates_user ON job_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_featured ON jobs(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_jobs_promoted ON jobs(is_promoted) WHERE is_promoted = TRUE;
CREATE INDEX IF NOT EXISTS idx_jobs_expires_at ON jobs(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_auto_renew ON jobs(auto_renew) WHERE auto_renew = TRUE;
CREATE INDEX IF NOT EXISTS idx_job_history_job_id ON job_history(job_id);
CREATE INDEX IF NOT EXISTS idx_bulk_job_actions_user ON bulk_job_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_job_actions_status ON bulk_job_actions(status);

-- RLS Policies for Job Templates
ALTER TABLE job_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates"
  ON job_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create templates"
  ON job_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON job_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON job_templates FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for Job History
ALTER TABLE job_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history of their jobs"
  ON job_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_history.job_id
      AND jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert job history"
  ON job_history FOR INSERT
  WITH CHECK (true);

-- RLS Policies for Bulk Job Actions
ALTER TABLE bulk_job_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bulk actions"
  ON bulk_job_actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create bulk actions"
  ON bulk_job_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bulk actions"
  ON bulk_job_actions FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to duplicate a job
CREATE OR REPLACE FUNCTION duplicate_job(source_job_id UUID, new_title TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  new_job_id UUID;
  source_job jobs%ROWTYPE;
BEGIN
  -- Get source job
  SELECT * INTO source_job FROM jobs WHERE id = source_job_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found';
  END IF;
  
  -- Check permission
  IF source_job.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Create duplicate
  INSERT INTO jobs (
    user_id, title, description, requirements, responsibilities, benefits,
    job_type, experience_level, salary_min, salary_max, salary_currency,
    location, remote_type, category, tags, custom_fields, status
  ) VALUES (
    source_job.user_id,
    COALESCE(new_title, source_job.title || ' (Copy)'),
    source_job.description,
    source_job.requirements,
    source_job.responsibilities,
    source_job.benefits,
    source_job.job_type,
    source_job.experience_level,
    source_job.salary_min,
    source_job.salary_max,
    source_job.salary_currency,
    source_job.location,
    source_job.remote_type,
    source_job.category,
    source_job.tags,
    source_job.custom_fields,
    'draft'
  ) RETURNING id INTO new_job_id;
  
  -- Log the duplication
  INSERT INTO job_history (job_id, action, changed_by, changes)
  VALUES (
    new_job_id,
    'duplicated',
    auth.uid(),
    jsonb_build_object('source_job_id', source_job_id)
  );
  
  RETURN new_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to renew a job
CREATE OR REPLACE FUNCTION renew_job(job_id_param UUID)
RETURNS VOID AS $$
DECLARE
  job_record jobs%ROWTYPE;
BEGIN
  SELECT * INTO job_record FROM jobs WHERE id = job_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found';
  END IF;
  
  -- Update job
  UPDATE jobs
  SET
    expires_at = NOW() + INTERVAL '1 day' * COALESCE(renewal_duration_days, 30),
    last_renewed_at = NOW(),
    renewal_count = renewal_count + 1,
    status = 'active',
    updated_at = NOW()
  WHERE id = job_id_param;
  
  -- Log the renewal
  INSERT INTO job_history (job_id, action, changed_by)
  VALUES (job_id_param, 'renewed', auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-renew expired jobs
CREATE OR REPLACE FUNCTION auto_renew_expired_jobs()
RETURNS INTEGER AS $$
DECLARE
  renewed_count INTEGER := 0;
  job_record RECORD;
BEGIN
  FOR job_record IN
    SELECT id FROM jobs
    WHERE auto_renew = TRUE
    AND expires_at <= NOW()
    AND status = 'active'
  LOOP
    PERFORM renew_job(job_record.id);
    renewed_count := renewed_count + 1;
  END LOOP;
  
  RETURN renewed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to expire jobs
CREATE OR REPLACE FUNCTION expire_old_jobs()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE jobs
    SET status = 'expired', updated_at = NOW()
    WHERE expires_at <= NOW()
    AND status = 'active'
    AND auto_renew = FALSE
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM expired;
  
  -- Log expired jobs
  INSERT INTO job_history (job_id, action)
  SELECT id, 'expired' FROM jobs
  WHERE expires_at <= NOW()
  AND status = 'expired'
  AND NOT EXISTS (
    SELECT 1 FROM job_history
    WHERE job_history.job_id = jobs.id
    AND action = 'expired'
    AND created_at > NOW() - INTERVAL '1 hour'
  );
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to promote a job
CREATE OR REPLACE FUNCTION promote_job(
  job_id_param UUID,
  tier TEXT DEFAULT 'basic',
  duration_days INTEGER DEFAULT 7
)
RETURNS VOID AS $$
BEGIN
  UPDATE jobs
  SET
    is_promoted = TRUE,
    promotion_tier = tier,
    promotion_start_date = NOW(),
    promotion_end_date = NOW() + INTERVAL '1 day' * duration_days,
    updated_at = NOW()
  WHERE id = job_id_param
  AND user_id = auth.uid();
  
  INSERT INTO job_history (job_id, action, changed_by, changes)
  VALUES (
    job_id_param,
    'promoted',
    auth.uid(),
    jsonb_build_object('tier', tier, 'duration_days', duration_days)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to feature a job
CREATE OR REPLACE FUNCTION feature_job(
  job_id_param UUID,
  duration_days INTEGER DEFAULT 7
)
RETURNS VOID AS $$
BEGIN
  UPDATE jobs
  SET
    is_featured = TRUE,
    featured_until = NOW() + INTERVAL '1 day' * duration_days,
    updated_at = NOW()
  WHERE id = job_id_param
  AND user_id = auth.uid();
  
  INSERT INTO job_history (job_id, action, changed_by, changes)
  VALUES (
    job_id_param,
    'featured',
    auth.uid(),
    jsonb_build_object('duration_days', duration_days)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute bulk job actions
CREATE OR REPLACE FUNCTION execute_bulk_job_action(
  action_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  action_record bulk_job_actions%ROWTYPE;
  job_id UUID;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
  results JSONB := '[]'::JSONB;
BEGIN
  SELECT * INTO action_record FROM bulk_job_actions WHERE id = action_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bulk action not found';
  END IF;
  
  -- Update status to processing
  UPDATE bulk_job_actions SET status = 'processing' WHERE id = action_id_param;
  
  -- Process each job
  FOREACH job_id IN ARRAY action_record.job_ids
  LOOP
    BEGIN
      CASE action_record.action_type
        WHEN 'delete' THEN
          DELETE FROM jobs WHERE id = job_id AND user_id = action_record.user_id;
        WHEN 'expire' THEN
          UPDATE jobs SET status = 'expired', updated_at = NOW()
          WHERE id = job_id AND user_id = action_record.user_id;
        WHEN 'renew' THEN
          PERFORM renew_job(job_id);
        WHEN 'promote' THEN
          PERFORM promote_job(
            job_id,
            COALESCE(action_record.parameters->>'tier', 'basic'),
            COALESCE((action_record.parameters->>'duration_days')::INTEGER, 7)
          );
        WHEN 'feature' THEN
          PERFORM feature_job(
            job_id,
            COALESCE((action_record.parameters->>'duration_days')::INTEGER, 7)
          );
        WHEN 'update_status' THEN
          UPDATE jobs SET status = action_record.parameters->>'status', updated_at = NOW()
          WHERE id = job_id AND user_id = action_record.user_id;
      END CASE;
      
      success_count := success_count + 1;
      results := results || jsonb_build_object('job_id', job_id, 'status', 'success');
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      results := results || jsonb_build_object('job_id', job_id, 'status', 'error', 'message', SQLERRM);
    END;
  END LOOP;
  
  -- Update bulk action with results
  UPDATE bulk_job_actions
  SET
    status = CASE WHEN error_count = 0 THEN 'completed' ELSE 'failed' END,
    results = jsonb_build_object(
      'success_count', success_count,
      'error_count', error_count,
      'details', results
    ),
    completed_at = NOW()
  WHERE id = action_id_param;
  
  RETURN results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated trigger for job_templates
CREATE OR REPLACE FUNCTION update_job_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_job_template_timestamp
  BEFORE UPDATE ON job_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_job_template_timestamp();

-- Comments
COMMENT ON TABLE job_templates IS 'Reusable job posting templates for employers';
COMMENT ON TABLE job_history IS 'Audit log of all job changes and actions';
COMMENT ON TABLE bulk_job_actions IS 'Bulk operations on multiple jobs';
COMMENT ON FUNCTION duplicate_job IS 'Creates a copy of an existing job posting';
COMMENT ON FUNCTION renew_job IS 'Extends the expiration date of a job posting';
COMMENT ON FUNCTION auto_renew_expired_jobs IS 'Automatically renews jobs with auto_renew enabled';
COMMENT ON FUNCTION expire_old_jobs IS 'Marks expired jobs as expired';
COMMENT ON FUNCTION promote_job IS 'Promotes a job with specified tier and duration';
COMMENT ON FUNCTION feature_job IS 'Features a job for specified duration';
COMMENT ON FUNCTION execute_bulk_job_action IS 'Executes a bulk action on multiple jobs';
