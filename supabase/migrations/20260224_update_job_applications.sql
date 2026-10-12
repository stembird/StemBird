-- Migration: Update Job Applications System
-- Description: Add full application data storage, CV upload support, and proper RLS policies

-- ============================================================================
-- 1. UPDATE JOB_APPLICATIONS TABLE
-- ============================================================================

-- Add new columns to store full application data
ALTER TABLE public.job_applications
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS years_experience INTEGER CHECK (years_experience >= 0),
ADD COLUMN IF NOT EXISTS cover_letter TEXT,
ADD COLUMN IF NOT EXISTS expected_salary_min DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS expected_salary_max DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS salary_negotiable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS application_method VARCHAR(20) CHECK (application_method IN ('profile', 'cv', 'external')),
ADD COLUMN IF NOT EXISTS cv_file_url VARCHAR(1000),
ADD COLUMN IF NOT EXISTS cv_file_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS cv_file_size INTEGER,
ADD COLUMN IF NOT EXISTS candidate_profile_id UUID REFERENCES candidate_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update status column to use proper enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
        CREATE TYPE application_status AS ENUM ('pending', 'reviewing', 'shortlisted', 'interviewed', 'offered', 'rejected', 'withdrawn', 'accepted');
    END IF;
END $$;

-- Alter status column to use enum (if not already)
-- First drop the default, then change type, then add new default
ALTER TABLE public.job_applications 
ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.job_applications 
ALTER COLUMN status TYPE application_status USING status::application_status;

ALTER TABLE public.job_applications 
ALTER COLUMN status SET DEFAULT 'pending'::application_status;

-- ============================================================================
-- 2. CREATE STORAGE BUCKET FOR CVS
-- ============================================================================

-- Create storage bucket for application CVs
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-cvs', 'application-cvs', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. STORAGE POLICIES FOR CV UPLOADS
-- ============================================================================

-- Allow authenticated users to upload their own CVs
CREATE POLICY "Users can upload their own CVs"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'application-cvs' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own CVs
CREATE POLICY "Users can view their own CVs"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'application-cvs' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow employers to view CVs for applications to their jobs
CREATE POLICY "Employers can view CVs for their job applications"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'application-cvs'
    AND EXISTS (
        SELECT 1 
        FROM public.job_applications ja
        JOIN public.jobs j ON j.id = ja.job_id
        WHERE ja.cv_file_url LIKE '%' || name || '%'
        AND j.user_id = auth.uid()
    )
);

-- Allow users to delete their own CVs
CREATE POLICY "Users can delete their own CVs"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'application-cvs' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON public.job_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_candidate_profile ON public.job_applications(candidate_profile_id);

-- ============================================================================
-- 5. UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER update_job_applications_updated_at
    BEFORE UPDATE ON public.job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. UPDATE RLS POLICIES
-- ============================================================================

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own applications" ON public.job_applications;
DROP POLICY IF EXISTS "Employers can view applications for their jobs" ON public.job_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.job_applications;
DROP POLICY IF EXISTS "Candidates can create applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can delete their own applications" ON public.job_applications;

-- Recreate with updated logic

-- SELECT policies
CREATE POLICY "Users can view their own applications"
ON public.job_applications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Employers can view applications for their jobs"
ON public.job_applications FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.jobs
        WHERE jobs.id = job_applications.job_id
        AND jobs.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all applications"
ON public.job_applications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- INSERT policy
CREATE POLICY "Authenticated users can create applications"
ON public.job_applications FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    AND auth.role() = 'authenticated'
);

-- UPDATE policies
CREATE POLICY "Users can update their own applications"
ON public.job_applications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employers can update application status for their jobs"
ON public.job_applications FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.jobs
        WHERE jobs.id = job_applications.job_id
        AND jobs.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can update all applications"
ON public.job_applications FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- DELETE policy
CREATE POLICY "Users can delete their own applications"
ON public.job_applications FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to get application count for a job
CREATE OR REPLACE FUNCTION get_job_application_count(job_uuid UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.job_applications
    WHERE job_id = job_uuid;
$$;

-- Function to check if user has applied to a job
CREATE OR REPLACE FUNCTION has_user_applied(job_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.job_applications
        WHERE job_id = job_uuid AND user_id = user_uuid
    );
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.job_applications IS 'Job applications with full candidate data and CV storage';
COMMENT ON COLUMN public.job_applications.application_method IS 'How the candidate applied: profile (using their profile), cv (uploaded CV), or external';
COMMENT ON COLUMN public.job_applications.cv_file_url IS 'URL to the uploaded CV in Supabase Storage';
COMMENT ON COLUMN public.job_applications.candidate_profile_id IS 'Reference to candidate profile if they applied using their profile';
