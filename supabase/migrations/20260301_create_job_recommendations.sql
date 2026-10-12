-- Migration: Job Recommendations and Alerts System
-- Description: Tables for saved searches, job alerts, and recommendation tracking

-- ============================================================================
-- 1. SAVED SEARCHES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Search Criteria
    search_name VARCHAR(255) NOT NULL,
    keywords TEXT,
    location VARCHAR(255),
    employment_type VARCHAR(50),
    experience_level VARCHAR(50),
    salary_min DECIMAL(12, 2),
    salary_max DECIMAL(12, 2),
    job_function VARCHAR(255),
    industry VARCHAR(255),
    
    -- Alert Settings
    alert_enabled BOOLEAN DEFAULT true,
    alert_frequency VARCHAR(20) DEFAULT 'daily' CHECK (alert_frequency IN ('instant', 'daily', 'weekly')),
    last_alert_sent_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. JOB RECOMMENDATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS job_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    
    -- Recommendation Score
    match_score DECIMAL(5, 2) NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
    
    -- Match Breakdown
    skills_match_score DECIMAL(5, 2) DEFAULT 0,
    experience_match_score DECIMAL(5, 2) DEFAULT 0,
    location_match_score DECIMAL(5, 2) DEFAULT 0,
    salary_match_score DECIMAL(5, 2) DEFAULT 0,
    
    -- Match Details (JSON for flexibility)
    match_details JSONB,
    
    -- User Interaction
    viewed BOOLEAN DEFAULT false,
    viewed_at TIMESTAMPTZ,
    dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    applied BOOLEAN DEFAULT false,
    applied_at TIMESTAMPTZ,
    
    -- Metadata
    recommended_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- Constraints
    UNIQUE(user_id, job_id)
);

-- ============================================================================
-- 3. JOB ALERTS LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS job_alerts_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    saved_search_id UUID REFERENCES saved_searches(id) ON DELETE SET NULL,
    
    -- Alert Details
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('saved_search', 'recommendation', 'application_update')),
    jobs_count INTEGER DEFAULT 0,
    jobs_data JSONB,
    
    -- Delivery
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivery_status VARCHAR(20) DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'failed', 'bounced')),
    email_opened BOOLEAN DEFAULT false,
    email_opened_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. CANDIDATE PREFERENCES TABLE (for better recommendations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS candidate_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Job Preferences
    preferred_job_functions TEXT[],
    preferred_industries TEXT[],
    preferred_locations TEXT[],
    preferred_employment_types TEXT[],
    preferred_work_schedule TEXT[], -- remote, hybrid, onsite
    
    -- Salary Preferences
    min_salary DECIMAL(12, 2),
    max_salary DECIMAL(12, 2),
    salary_currency VARCHAR(3) DEFAULT 'NGN',
    salary_negotiable BOOLEAN DEFAULT true,
    
    -- Work Preferences
    willing_to_relocate BOOLEAN DEFAULT false,
    available_to_start VARCHAR(50), -- immediate, 2_weeks, 1_month, 3_months
    
    -- Notification Preferences
    job_alert_frequency VARCHAR(20) DEFAULT 'daily' CHECK (job_alert_frequency IN ('instant', 'daily', 'weekly', 'never')),
    recommendation_emails BOOLEAN DEFAULT true,
    application_updates BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_alert_enabled ON saved_searches(alert_enabled);
CREATE INDEX idx_job_recommendations_user_id ON job_recommendations(user_id);
CREATE INDEX idx_job_recommendations_job_id ON job_recommendations(job_id);
CREATE INDEX idx_job_recommendations_match_score ON job_recommendations(match_score DESC);
CREATE INDEX idx_job_recommendations_viewed ON job_recommendations(viewed);
CREATE INDEX idx_job_recommendations_dismissed ON job_recommendations(dismissed);
CREATE INDEX idx_job_recommendations_expires_at ON job_recommendations(expires_at);
CREATE INDEX idx_job_alerts_log_user_id ON job_alerts_log(user_id);
CREATE INDEX idx_job_alerts_log_sent_at ON job_alerts_log(sent_at);
CREATE INDEX idx_candidate_preferences_user_id ON candidate_preferences(user_id);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE TRIGGER update_saved_searches_updated_at
    BEFORE UPDATE ON saved_searches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidate_preferences_updated_at
    BEFORE UPDATE ON candidate_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_alerts_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_preferences ENABLE ROW LEVEL SECURITY;

-- Saved Searches Policies
CREATE POLICY "Users can manage their own saved searches"
    ON saved_searches FOR ALL
    USING (auth.uid() = user_id);

-- Job Recommendations Policies
CREATE POLICY "Users can view their own recommendations"
    ON job_recommendations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations"
    ON job_recommendations FOR UPDATE
    USING (auth.uid() = user_id);

-- Job Alerts Log Policies
CREATE POLICY "Users can view their own alerts log"
    ON job_alerts_log FOR SELECT
    USING (auth.uid() = user_id);

-- Candidate Preferences Policies
CREATE POLICY "Users can manage their own preferences"
    ON candidate_preferences FOR ALL
    USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to clean up expired recommendations
CREATE OR REPLACE FUNCTION cleanup_expired_recommendations()
RETURNS void AS $$
BEGIN
    DELETE FROM job_recommendations
    WHERE expires_at < NOW()
    AND viewed = false
    AND dismissed = false;
END;
$$ LANGUAGE plpgsql;

-- Function to mark recommendation as viewed
CREATE OR REPLACE FUNCTION mark_recommendation_viewed(
    p_user_id UUID,
    p_job_id UUID
)
RETURNS void AS $$
BEGIN
    UPDATE job_recommendations
    SET viewed = true,
        viewed_at = NOW()
    WHERE user_id = p_user_id
    AND job_id = p_job_id
    AND viewed = false;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE saved_searches IS 'User saved job searches with alert settings';
COMMENT ON TABLE job_recommendations IS 'AI-powered job recommendations for candidates';
COMMENT ON TABLE job_alerts_log IS 'Log of all job alerts sent to users';
COMMENT ON TABLE candidate_preferences IS 'Candidate job preferences for better matching';
