-- Migration: Advanced Application Management
-- Description: Add application scoring, ratings, bulk actions, and team collaboration

-- ============================================================================
-- 1. APPLICATION RATINGS/SCORING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS application_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    rated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Rating Details
    overall_score INTEGER CHECK (overall_score >= 1 AND overall_score <= 5),
    technical_score INTEGER CHECK (technical_score >= 1 AND technical_score <= 5),
    experience_score INTEGER CHECK (experience_score >= 1 AND experience_score <= 5),
    culture_fit_score INTEGER CHECK (culture_fit_score >= 1 AND culture_fit_score <= 5),
    communication_score INTEGER CHECK (communication_score >= 1 AND communication_score <= 5),
    
    -- Comments
    rating_notes TEXT,
    
    -- Recommendation
    recommendation VARCHAR(20) CHECK (recommendation IN ('strong_yes', 'yes', 'maybe', 'no', 'strong_no')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one rating per user per application
    UNIQUE(application_id, rated_by)
);

-- ============================================================================
-- 2. EMPLOYER NOTES TABLE (Enhanced from application_notes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS employer_application_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Note Content
    note_text TEXT NOT NULL,
    note_type VARCHAR(30) DEFAULT 'general' CHECK (note_type IN (
        'general', 'screening', 'interview', 'reference_check', 
        'background_check', 'offer', 'rejection_reason', 'follow_up'
    )),
    
    -- Visibility
    is_private BOOLEAN DEFAULT false, -- Only visible to creator
    is_pinned BOOLEAN DEFAULT false,
    
    -- Mentions/Tags
    mentioned_users UUID[], -- Array of user IDs mentioned in note
    tags TEXT[], -- Custom tags for organization
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. INTERVIEW SCHEDULING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS interview_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    
    -- Interview Details
    interview_type VARCHAR(30) CHECK (interview_type IN (
        'phone_screen', 'video_call', 'in_person', 'technical', 
        'panel', 'final', 'other'
    )),
    interview_title VARCHAR(255) NOT NULL,
    interview_description TEXT,
    
    -- Scheduling
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
    
    -- Location/Link
    location TEXT, -- Physical address or meeting link
    meeting_link TEXT,
    meeting_password TEXT,
    
    -- Participants
    interviewer_ids UUID[], -- Array of interviewer user IDs
    scheduled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'confirmed', 'rescheduled', 'completed', 'cancelled', 'no_show'
    )),
    
    -- Reminders
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMPTZ,
    
    -- Feedback
    feedback_submitted BOOLEAN DEFAULT false,
    interview_feedback TEXT,
    interview_rating INTEGER CHECK (interview_rating >= 1 AND interview_rating <= 5),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. TEAM COLLABORATION - COMPANY TEAM MEMBERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL, -- References company profile
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Role & Permissions
    role VARCHAR(30) DEFAULT 'member' CHECK (role IN (
        'owner', 'admin', 'hiring_manager', 'recruiter', 'interviewer', 'member'
    )),
    
    -- Permissions
    can_post_jobs BOOLEAN DEFAULT false,
    can_manage_applications BOOLEAN DEFAULT false,
    can_schedule_interviews BOOLEAN DEFAULT false,
    can_make_offers BOOLEAN DEFAULT false,
    can_manage_team BOOLEAN DEFAULT false,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invitation_accepted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(company_id, user_id)
);

-- ============================================================================
-- 5. BULK ACTION LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS bulk_action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Action Details
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'bulk_status_change', 'bulk_reject', 'bulk_shortlist', 
        'bulk_archive', 'bulk_delete', 'bulk_tag'
    )),
    
    -- Affected Items
    application_ids UUID[] NOT NULL,
    affected_count INTEGER NOT NULL,
    
    -- Action Data
    action_data JSONB, -- Stores action-specific data (e.g., new status, rejection reason)
    
    -- Result
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    error_details JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_application_ratings_application_id ON application_ratings(application_id);
CREATE INDEX idx_application_ratings_rated_by ON application_ratings(rated_by);
CREATE INDEX idx_employer_notes_application_id ON employer_application_notes(application_id);
CREATE INDEX idx_employer_notes_created_by ON employer_application_notes(created_by);
CREATE INDEX idx_employer_notes_pinned ON employer_application_notes(is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_interview_schedules_application_id ON interview_schedules(application_id);
CREATE INDEX idx_interview_schedules_scheduled_at ON interview_schedules(scheduled_at);
CREATE INDEX idx_interview_schedules_status ON interview_schedules(status);
CREATE INDEX idx_company_team_members_company_id ON company_team_members(company_id);
CREATE INDEX idx_company_team_members_user_id ON company_team_members(user_id);
CREATE INDEX idx_bulk_action_logs_performed_by ON bulk_action_logs(performed_by);
CREATE INDEX idx_bulk_action_logs_created_at ON bulk_action_logs(created_at DESC);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE TRIGGER update_application_ratings_updated_at
    BEFORE UPDATE ON application_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employer_notes_updated_at
    BEFORE UPDATE ON employer_application_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interview_schedules_updated_at
    BEFORE UPDATE ON interview_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_team_members_updated_at
    BEFORE UPDATE ON company_team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE application_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_application_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_action_logs ENABLE ROW LEVEL SECURITY;

-- Application Ratings Policies
CREATE POLICY "Employers can manage ratings for their job applications"
    ON application_ratings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM job_applications ja
            JOIN jobs j ON j.id = ja.job_id
            WHERE ja.id = application_ratings.application_id
            AND j.user_id = auth.uid()
        )
    );

-- Employer Notes Policies
CREATE POLICY "Employers can manage notes for their applications"
    ON employer_application_notes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM job_applications ja
            JOIN jobs j ON j.id = ja.job_id
            WHERE ja.id = employer_application_notes.application_id
            AND j.user_id = auth.uid()
        )
    );

-- Interview Schedules Policies
CREATE POLICY "Employers and candidates can view interview schedules"
    ON interview_schedules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM job_applications ja
            JOIN jobs j ON j.id = ja.job_id
            WHERE ja.id = interview_schedules.application_id
            AND (j.user_id = auth.uid() OR ja.user_id = auth.uid())
        )
    );

CREATE POLICY "Employers can manage interview schedules"
    ON interview_schedules FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM job_applications ja
            JOIN jobs j ON j.id = ja.job_id
            WHERE ja.id = interview_schedules.application_id
            AND j.user_id = auth.uid()
        )
    );

CREATE POLICY "Employers can update interview schedules"
    ON interview_schedules FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM job_applications ja
            JOIN jobs j ON j.id = ja.job_id
            WHERE ja.id = interview_schedules.application_id
            AND j.user_id = auth.uid()
        )
    );

-- Company Team Members Policies
CREATE POLICY "Team members can view their company team"
    ON company_team_members FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM company_team_members ctm
            WHERE ctm.company_id = company_team_members.company_id
            AND ctm.user_id = auth.uid()
            AND ctm.status = 'active'
        )
    );

CREATE POLICY "Admins can manage team members"
    ON company_team_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM company_team_members ctm
            WHERE ctm.company_id = company_team_members.company_id
            AND ctm.user_id = auth.uid()
            AND ctm.role IN ('owner', 'admin')
            AND ctm.status = 'active'
        )
    );

-- Bulk Action Logs Policies
CREATE POLICY "Users can view their own bulk action logs"
    ON bulk_action_logs FOR SELECT
    USING (performed_by = auth.uid());

CREATE POLICY "Users can create bulk action logs"
    ON bulk_action_logs FOR INSERT
    WITH CHECK (performed_by = auth.uid());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate average rating for an application
CREATE OR REPLACE FUNCTION get_application_average_rating(p_application_id UUID)
RETURNS TABLE (
    avg_overall NUMERIC,
    avg_technical NUMERIC,
    avg_experience NUMERIC,
    avg_culture_fit NUMERIC,
    avg_communication NUMERIC,
    total_ratings INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROUND(AVG(overall_score), 2) as avg_overall,
        ROUND(AVG(technical_score), 2) as avg_technical,
        ROUND(AVG(experience_score), 2) as avg_experience,
        ROUND(AVG(culture_fit_score), 2) as avg_culture_fit,
        ROUND(AVG(communication_score), 2) as avg_communication,
        COUNT(*)::INTEGER as total_ratings
    FROM application_ratings
    WHERE application_id = p_application_id;
END;
$$ LANGUAGE plpgsql;

-- Function to perform bulk status update
CREATE OR REPLACE FUNCTION bulk_update_application_status(
    p_application_ids UUID[],
    p_new_status VARCHAR,
    p_performed_by UUID
)
RETURNS TABLE (
    success_count INTEGER,
    failure_count INTEGER
) AS $$
DECLARE
    v_success_count INTEGER := 0;
    v_failure_count INTEGER := 0;
    v_app_id UUID;
BEGIN
    -- Update each application
    FOREACH v_app_id IN ARRAY p_application_ids
    LOOP
        BEGIN
            UPDATE job_applications
            SET status = p_new_status::application_status,
                updated_at = NOW()
            WHERE id = v_app_id
            AND EXISTS (
                SELECT 1 FROM jobs
                WHERE jobs.id = job_applications.job_id
                AND jobs.user_id = p_performed_by
            );
            
            IF FOUND THEN
                v_success_count := v_success_count + 1;
            ELSE
                v_failure_count := v_failure_count + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_failure_count := v_failure_count + 1;
        END;
    END LOOP;
    
    -- Log the bulk action
    INSERT INTO bulk_action_logs (
        performed_by,
        action_type,
        application_ids,
        affected_count,
        action_data,
        success_count,
        failure_count
    ) VALUES (
        p_performed_by,
        'bulk_status_change',
        p_application_ids,
        array_length(p_application_ids, 1),
        jsonb_build_object('new_status', p_new_status),
        v_success_count,
        v_failure_count
    );
    
    RETURN QUERY SELECT v_success_count, v_failure_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE application_ratings IS 'Ratings and scores for job applications';
COMMENT ON TABLE employer_application_notes IS 'Employer notes and comments on applications';
COMMENT ON TABLE interview_schedules IS 'Interview scheduling and management';
COMMENT ON TABLE company_team_members IS 'Team collaboration for companies';
COMMENT ON TABLE bulk_action_logs IS 'Audit log for bulk actions on applications';
COMMENT ON FUNCTION get_application_average_rating IS 'Calculate average rating scores for an application';
COMMENT ON FUNCTION bulk_update_application_status IS 'Perform bulk status updates on applications';
