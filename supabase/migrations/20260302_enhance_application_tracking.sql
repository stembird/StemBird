-- Migration: Enhanced Application Tracking
-- Description: Add application timeline, notes, and withdrawal functionality

-- ============================================================================
-- 1. APPLICATION TIMELINE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS application_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    
    -- Event Details
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'submitted', 'viewed', 'screening', 'interview_scheduled', 
        'interview_completed', 'offer', 'rejected', 'withdrawn', 
        'status_changed', 'note_added', 'document_updated'
    )),
    event_title VARCHAR(255) NOT NULL,
    event_description TEXT,
    
    -- Event Metadata
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    metadata JSONB, -- For additional event-specific data
    
    -- Actor
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_role VARCHAR(20), -- 'candidate', 'employer', 'system'
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. APPLICATION NOTES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS application_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Note Content
    note_text TEXT NOT NULL,
    note_type VARCHAR(20) DEFAULT 'general' CHECK (note_type IN ('general', 'reminder', 'follow_up', 'interview_prep')),
    
    -- Reminder
    is_reminder BOOLEAN DEFAULT false,
    reminder_date TIMESTAMPTZ,
    reminder_sent BOOLEAN DEFAULT false,
    
    -- Status
    is_pinned BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. ADD WITHDRAWAL FIELDS TO JOB_APPLICATIONS
-- ============================================================================
ALTER TABLE job_applications 
ADD COLUMN IF NOT EXISTS withdrawn BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS withdrawal_reason TEXT;

-- ============================================================================
-- 4. ADD APPLICATION METADATA FIELDS
-- ============================================================================
ALTER TABLE job_applications
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS viewed_by_employer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS employer_viewed_at TIMESTAMPTZ;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_application_timeline_application_id ON application_timeline(application_id);
CREATE INDEX idx_application_timeline_event_type ON application_timeline(event_type);
CREATE INDEX idx_application_timeline_created_at ON application_timeline(created_at DESC);
CREATE INDEX idx_application_notes_application_id ON application_notes(application_id);
CREATE INDEX idx_application_notes_user_id ON application_notes(user_id);
CREATE INDEX idx_application_notes_reminder_date ON application_notes(reminder_date) WHERE is_reminder = true;
CREATE INDEX idx_application_notes_is_pinned ON application_notes(is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_job_applications_withdrawn ON job_applications(withdrawn);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE TRIGGER update_application_notes_updated_at
    BEFORE UPDATE ON application_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE application_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_notes ENABLE ROW LEVEL SECURITY;

-- Application Timeline Policies
CREATE POLICY "Users can view timeline for their applications"
    ON application_timeline FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM job_applications
            WHERE job_applications.id = application_timeline.application_id
            AND job_applications.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert timeline events"
    ON application_timeline FOR INSERT
    WITH CHECK (true); -- Will be controlled by application logic

-- Application Notes Policies
CREATE POLICY "Users can manage their own application notes"
    ON application_notes FOR ALL
    USING (user_id = auth.uid());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to add timeline event
CREATE OR REPLACE FUNCTION add_application_timeline_event(
    p_application_id UUID,
    p_event_type VARCHAR,
    p_event_title VARCHAR,
    p_event_description TEXT DEFAULT NULL,
    p_old_status VARCHAR DEFAULT NULL,
    p_new_status VARCHAR DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_created_by_role VARCHAR DEFAULT 'system'
)
RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO application_timeline (
        application_id,
        event_type,
        event_title,
        event_description,
        old_status,
        new_status,
        metadata,
        created_by,
        created_by_role
    ) VALUES (
        p_application_id,
        p_event_type,
        p_event_title,
        p_event_description,
        p_old_status,
        p_new_status,
        p_metadata,
        p_created_by,
        p_created_by_role
    ) RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to withdraw application
CREATE OR REPLACE FUNCTION withdraw_application(
    p_application_id UUID,
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old_status VARCHAR;
BEGIN
    -- Get current status
    SELECT status INTO v_old_status
    FROM job_applications
    WHERE id = p_application_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found or unauthorized';
    END IF;
    
    -- Update application
    UPDATE job_applications
    SET 
        withdrawn = true,
        withdrawn_at = NOW(),
        withdrawal_reason = p_reason,
        status = 'withdrawn'
    WHERE id = p_application_id AND user_id = p_user_id;
    
    -- Add timeline event
    PERFORM add_application_timeline_event(
        p_application_id,
        'withdrawn',
        'Application Withdrawn',
        COALESCE(p_reason, 'Candidate withdrew application'),
        v_old_status,
        'withdrawn',
        jsonb_build_object('reason', p_reason),
        p_user_id,
        'candidate'
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create initial timeline event on application submission
CREATE OR REPLACE FUNCTION create_application_submitted_event()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM add_application_timeline_event(
        NEW.id,
        'submitted',
        'Application Submitted',
        'Your application has been submitted successfully',
        NULL,
        NEW.status,
        jsonb_build_object(
            'cv_submitted', NEW.cv_file_url IS NOT NULL,
            'cover_letter_submitted', NEW.cover_letter IS NOT NULL
        ),
        NEW.user_id,
        'candidate'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER application_submitted_timeline
    AFTER INSERT ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION create_application_submitted_event();

-- Trigger to track status changes
CREATE OR REPLACE FUNCTION track_application_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM add_application_timeline_event(
            NEW.id,
            'status_changed',
            'Status Updated',
            'Application status changed from ' || OLD.status || ' to ' || NEW.status,
            OLD.status,
            NEW.status,
            NULL,
            NULL,
            'system'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER application_status_change_timeline
    AFTER UPDATE ON job_applications
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION track_application_status_change();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE application_timeline IS 'Timeline of events for job applications';
COMMENT ON TABLE application_notes IS 'Candidate notes and reminders for applications';
COMMENT ON FUNCTION add_application_timeline_event IS 'Helper function to add timeline events';
COMMENT ON FUNCTION withdraw_application IS 'Withdraw a job application with reason';
