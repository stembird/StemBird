-- Create job_views table for tracking individual job views
CREATE TABLE IF NOT EXISTS job_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  session_id TEXT,
  CONSTRAINT fk_job_views_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_views_job_id ON job_views(job_id);
CREATE INDEX IF NOT EXISTS idx_job_views_viewed_at ON job_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_job_views_user_id ON job_views(user_id);

-- Create application_sources table for tracking where applications come from
CREATE TABLE IF NOT EXISTS application_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  source_type TEXT, -- 'direct', 'job_board', 'social_media', 'referral', 'email', 'other'
  source_name TEXT, -- specific platform name
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_application_sources_application FOREIGN KEY (application_id) REFERENCES job_applications(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_application_sources_application_id ON application_sources(application_id);
CREATE INDEX IF NOT EXISTS idx_application_sources_source_type ON application_sources(source_type);

-- Add RLS policies
ALTER TABLE job_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_sources ENABLE ROW LEVEL SECURITY;

-- Job views policies
CREATE POLICY "Users can view their own job views" ON job_views
  FOR SELECT USING (
    job_id IN (SELECT id FROM jobs WHERE user_id = auth.uid())
  );

CREATE POLICY "Anyone can insert job views" ON job_views
  FOR INSERT WITH CHECK (true);

-- Application sources policies
CREATE POLICY "Employers can view application sources for their jobs" ON application_sources
  FOR SELECT USING (
    application_id IN (
      SELECT ja.id FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      WHERE j.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert application sources" ON application_sources
  FOR INSERT WITH CHECK (true);

-- Create function to update views_count on jobs table
CREATE OR REPLACE FUNCTION update_job_views_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE jobs
  SET views_count = (
    SELECT COUNT(*) FROM job_views WHERE job_id = NEW.job_id
  )
  WHERE id = NEW.job_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating views_count
DROP TRIGGER IF EXISTS trigger_update_job_views_count ON job_views;
CREATE TRIGGER trigger_update_job_views_count
  AFTER INSERT ON job_views
  FOR EACH ROW
  EXECUTE FUNCTION update_job_views_count();

-- Create materialized view for analytics aggregation (for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS job_analytics_summary AS
SELECT 
  j.id as job_id,
  j.user_id as employer_id,
  j.title,
  j.status,
  j.created_at as posted_at,
  COUNT(DISTINCT jv.id) as total_views,
  COUNT(DISTINCT ja.id) as total_applications,
  COUNT(DISTINCT CASE WHEN ja.status = 'shortlisted' THEN ja.id END) as shortlisted_count,
  COUNT(DISTINCT CASE WHEN ja.status = 'interviewed' THEN ja.id END) as interview_count,
  COUNT(DISTINCT CASE WHEN ja.status = 'offered' THEN ja.id END) as offered_count,
  COUNT(DISTINCT CASE WHEN ja.status = 'accepted' THEN ja.id END) as hired_count,
  COUNT(DISTINCT CASE WHEN ja.status = 'rejected' THEN ja.id END) as rejected_count,
  CASE 
    WHEN COUNT(DISTINCT jv.id) > 0 
    THEN (COUNT(DISTINCT ja.id)::FLOAT / COUNT(DISTINCT jv.id)::FLOAT * 100)
    ELSE 0 
  END as conversion_rate,
  MIN(ja.created_at) as first_application_at,
  MAX(ja.created_at) as last_application_at
FROM jobs j
LEFT JOIN job_views jv ON j.id = jv.job_id
LEFT JOIN job_applications ja ON j.id = ja.job_id
WHERE j.status = 'active'
GROUP BY j.id, j.user_id, j.title, j.status, j.created_at;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_analytics_summary_job_id ON job_analytics_summary(job_id);
CREATE INDEX IF NOT EXISTS idx_job_analytics_summary_employer_id ON job_analytics_summary(employer_id);

-- Create function to refresh analytics
CREATE OR REPLACE FUNCTION refresh_job_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY job_analytics_summary;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON job_analytics_summary TO authenticated;
GRANT SELECT ON job_views TO authenticated;
GRANT INSERT ON job_views TO authenticated, anon;
GRANT SELECT ON application_sources TO authenticated;
GRANT INSERT ON application_sources TO authenticated, anon;
