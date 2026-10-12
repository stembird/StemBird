-- Migration: Advanced Email Features
-- Broadcast targeting, automation rules, A/B testing, bounce handling

-- =====================================================
-- 1. EXTEND email_campaigns table
-- =====================================================
ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS campaign_type TEXT NOT NULL DEFAULT 'newsletter'
    CHECK (campaign_type IN ('newsletter', 'broadcast', 'automated')),
  ADD COLUMN IF NOT EXISTS target_audience JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS subject_b TEXT,
  ADD COLUMN IF NOT EXISTS ab_winner_subject TEXT,
  ADD COLUMN IF NOT EXISTS ab_test_sample_size INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS ab_opens_a INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ab_opens_b INTEGER DEFAULT 0;

-- =====================================================
-- 2. EXTEND email_logs email_type constraint
-- =====================================================
ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS email_logs_email_type_check;
ALTER TABLE public.email_logs ADD CONSTRAINT email_logs_email_type_check
  CHECK (email_type IN (
    'transactional', 'marketing', 'job_alert', 'weekly_digest',
    'welcome', 'password_reset', 'application_status', 'new_message',
    'newsletter', 'confirmation', 'campaign',
    'broadcast', 'reengagement', 'reminder', 'employer_welcome',
    'profile_nudge', 'job_expiry'
  ));

-- =====================================================
-- 3. EMAIL AUTOMATION RULES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.email_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL UNIQUE CHECK (type IN (
    'inactive_reengagement', 'incomplete_application', 'job_expiry_warning',
    'employer_welcome', 'profile_completion_nudge'
  )),
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default rules
INSERT INTO public.email_automation_rules (type, enabled, config) VALUES
  ('inactive_reengagement', true, '{"days_inactive": 30}'),
  ('incomplete_application', true, '{"hours_old": 24}'),
  ('job_expiry_warning', true, '{"days_before": 7}'),
  ('employer_welcome', true, '{"hours_since_signup": 24}'),
  ('profile_completion_nudge', true, '{"min_days": 3, "threshold": 60}')
ON CONFLICT (type) DO NOTHING;

-- =====================================================
-- 4. EMAIL AUTOMATION LOG (prevents duplicate sends)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.email_automation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.email_automation_rules(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_email_automation_log_rule
  ON public.email_automation_log (rule_id);

CREATE INDEX IF NOT EXISTS idx_email_automation_log_user
  ON public.email_automation_log (user_id);

CREATE INDEX IF NOT EXISTS idx_email_automation_log_sent
  ON public.email_automation_log (sent_at DESC);

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================

-- Automation rules: admin read/write, service can update
ALTER TABLE public.email_automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage automation rules"
  ON public.email_automation_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND role = 'admin'
    )
  );

-- Automation log: admin read, service insert
ALTER TABLE public.email_automation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view automation log"
  ON public.email_automation_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Service can insert automation log"
  ON public.email_automation_log FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 6. HELPER: Count broadcast recipients
-- =====================================================
CREATE OR REPLACE FUNCTION count_broadcast_recipients(
  p_role TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_applied_to_job_id UUID DEFAULT NULL,
  p_company_id UUID DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count users matching filters (using service role context)
  WITH filtered_users AS (
    SELECT DISTINCT u.id
    FROM auth.users u
    JOIN user_profiles up ON up.id = u.id
    LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
    WHERE 1=1
      AND (p_role IS NULL OR up.role = p_role)
      AND (p_location IS NULL OR cp.location ILIKE '%' || p_location || '%')
      AND (p_applied_to_job_id IS NULL OR EXISTS (
        SELECT 1 FROM job_applications ja
        WHERE ja.job_id = p_applied_to_job_id
        AND (ja.candidate_profile_id = cp.id OR ja.email = u.email)
      ))
      AND (p_company_id IS NULL OR EXISTS (
        SELECT 1 FROM jobs j
        WHERE j.company_id = p_company_id
        AND j.posted_by::text = u.id::text
      ))
  )
  SELECT COUNT(*) INTO v_count FROM filtered_users;

  RETURN v_count;
END;
$$;
