-- Migration: Create Notifications System
-- Description: Create notifications table and related infrastructure for employer-candidate communication

-- ============================================================================
-- 1. CREATE NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'new_application',      -- Employer receives new job application
        'application_status',  -- Candidate receives application status update
        'new_message',         -- New message in conversation
        'job_alert',          -- Job matching user's alerts
        'system'              -- System announcements
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,               -- Additional structured data (job_id, application_id, etc.)
    read BOOLEAN DEFAULT FALSE,
    emailed BOOLEAN DEFAULT FALSE,  -- Track if email notification was sent
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);

-- ============================================================================
-- 3. CREATE UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Authenticated users can insert their own notifications
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    AND auth.role() = 'authenticated'
);

-- Admins can manage all notifications
CREATE POLICY "Admins can manage all notifications"
ON public.notifications FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to get unread notifications count for a user
CREATE OR REPLACE FUNCTION get_unread_notifications_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.notifications
    WHERE user_id = user_uuid AND read = false;
$$;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    user_uuid UUID,
    notification_type VARCHAR(50),
    notification_title VARCHAR(255),
    notification_message TEXT,
    notification_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (user_uuid, notification_type, notification_title, notification_message, notification_data)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notifications
    SET read = true, updated_at = NOW()
    WHERE id = notification_uuid AND user_id = auth.uid();
END;
$$;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notifications
    SET read = true, updated_at = NOW()
    WHERE user_id = user_uuid;
END;
$$;

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON TABLE public.notifications IS 'User notifications for job applications, messages, and system alerts';
COMMENT ON COLUMN public.notifications.type IS 'Type of notification: new_application, application_status, new_message, job_alert, system';
COMMENT ON COLUMN public.notifications.data IS 'JSON data containing related IDs (job_id, application_id, message_id, etc.)';
COMMENT ON COLUMN public.notifications.emailed IS 'Whether email notification was sent for this notification';
COMMENT ON FUNCTION public.get_unread_notifications_count IS 'Get count of unread notifications for a user';
COMMENT ON FUNCTION public.create_notification IS 'Create a new notification for a user';
COMMENT ON FUNCTION public.mark_notification_as_read IS 'Mark a specific notification as read';
COMMENT ON FUNCTION public.mark_all_notifications_as_read IS 'Mark all notifications as read for a user';

-- ============================================================================
-- 7. ENABLE REALTIME
-- ============================================================================

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;