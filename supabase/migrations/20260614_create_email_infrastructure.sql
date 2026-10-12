-- Migration: Email Infrastructure
-- Creates tables for email subscribers, campaigns, logs, and user email preferences

-- =====================================================
-- 1. EMAIL SUBSCRIBERS (newsletter/marketing opt-in)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  source TEXT DEFAULT 'website', -- website, import, referral, signup
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'unsubscribed', 'bounced')),
  confirmation_token TEXT,
  unsubscribe_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint on email (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_subscribers_email_lower
  ON public.email_subscribers (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_email_subscribers_status
  ON public.email_subscribers (status);

-- =====================================================
-- 2. EMAIL CAMPAIGNS (marketing/newsletter campaigns)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  bounce_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_status
  ON public.email_campaigns (status);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at
  ON public.email_campaigns (created_at DESC);

-- =====================================================
-- 3. EMAIL LOGS (audit trail for all sent emails)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL CHECK (email_type IN (
    'transactional', 'marketing', 'job_alert', 'weekly_digest',
    'welcome', 'password_reset', 'application_status', 'new_message',
    'newsletter', 'confirmation', 'campaign'
  )),
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked')),
  provider TEXT DEFAULT 'resend',
  provider_id TEXT, -- Resend message ID for tracking
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient
  ON public.email_logs (recipient_email);

CREATE INDEX IF NOT EXISTS idx_email_logs_type
  ON public.email_logs (email_type);

CREATE INDEX IF NOT EXISTS idx_email_logs_status
  ON public.email_logs (status);

CREATE INDEX IF NOT EXISTS idx_email_logs_created_at
  ON public.email_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_logs_campaign_id
  ON public.email_logs (campaign_id);

CREATE INDEX IF NOT EXISTS idx_email_logs_user_id
  ON public.email_logs (user_id);

-- =====================================================
-- 4. EMAIL PREFERENCES on user_profiles
-- =====================================================
DO $$
BEGIN
  -- Add email preference columns to user_profiles if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'transactional_emails') THEN
    ALTER TABLE public.user_profiles ADD COLUMN transactional_emails BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'marketing_emails') THEN
    ALTER TABLE public.user_profiles ADD COLUMN marketing_emails BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'job_alert_emails') THEN
    ALTER TABLE public.user_profiles ADD COLUMN job_alert_emails BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'weekly_digest') THEN
    ALTER TABLE public.user_profiles ADD COLUMN weekly_digest BOOLEAN DEFAULT true;
  END IF;
END $$;

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Email Subscribers: anyone can insert (public subscribe form)
CREATE POLICY "Anyone can subscribe" ON public.email_subscribers
  FOR INSERT WITH CHECK (true);

-- Email Subscribers: anyone can update (unsubscribe via token)
CREATE POLICY "Anyone can update subscription" ON public.email_subscribers
  FOR UPDATE USING (true);

-- Email Subscribers: admins can read all
CREATE POLICY "Admins can read subscribers" ON public.email_subscribers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
  );

-- Email Campaigns: admins can do everything
CREATE POLICY "Admins can manage campaigns" ON public.email_campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
  );

-- Email Logs: admins can read
CREATE POLICY "Admins can read email logs" ON public.email_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
  );

-- Email Logs: service can insert (for logging from API routes)
CREATE POLICY "Service can insert email logs" ON public.email_logs
  FOR INSERT WITH CHECK (true);

-- Email Logs: users can read their own logs
CREATE POLICY "Users can read own email logs" ON public.email_logs
  FOR SELECT USING (user_id = auth.uid());

-- User profiles: users can update their own email preferences
CREATE POLICY "Users can update own email preferences" ON public.user_profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to get confirmed subscriber count
CREATE OR REPLACE FUNCTION public.get_subscriber_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM public.email_subscribers WHERE status = 'confirmed';
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get email stats summary
CREATE OR REPLACE FUNCTION public.get_email_stats()
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'total_sent', COALESCE((SELECT COUNT(*) FROM public.email_logs WHERE status = 'sent'), 0),
    'total_failed', COALESCE((SELECT COUNT(*) FROM public.email_logs WHERE status = 'failed'), 0),
    'total_bounced', COALESCE((SELECT COUNT(*) FROM public.email_logs WHERE status = 'bounced'), 0),
    'subscribers_confirmed', COALESCE((SELECT COUNT(*) FROM public.email_subscribers WHERE status = 'confirmed'), 0),
    'subscribers_pending', COALESCE((SELECT COUNT(*) FROM public.email_subscribers WHERE status = 'pending'), 0),
    'campaigns_total', COALESCE((SELECT COUNT(*) FROM public.email_campaigns), 0),
    'campaigns_sent', COALESCE((SELECT COUNT(*) FROM public.email_campaigns WHERE status = 'sent'), 0)
  );
$$ LANGUAGE sql SECURITY DEFINER;
