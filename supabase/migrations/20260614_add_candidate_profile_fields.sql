-- Migration: Add additional candidate profile fields
-- Description: Enriches candidate_profiles with demographics, preferences, and admin visibility fields

-- ============================================================================
-- ADD NEW FIELDS TO candidate_profiles
-- ============================================================================

ALTER TABLE candidate_profiles
    -- Demographics
    ADD COLUMN IF NOT EXISTS date_of_birth DATE,
    ADD COLUMN IF NOT EXISTS nationality VARCHAR(100),
    ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IS NULL OR gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say')),
    ADD COLUMN IF NOT EXISTS marital_status VARCHAR(30) CHECK (marital_status IS NULL OR marital_status IN ('single', 'married', 'divorced', 'widowed', 'prefer_not_to_say')),

    -- Languages spoken (array of language names or objects)
    ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]'::jsonb,

    -- Quick-filter fields (avoid joins for common filters)
    ADD COLUMN IF NOT EXISTS highest_education_level VARCHAR(100),
    -- e.g. 'PhD', 'Master''s', 'Bachelor''s', 'Diploma', 'High School', 'None'
    ADD COLUMN IF NOT EXISTS industry VARCHAR(150),
    -- Primary industry/domain of expertise

    -- Job preferences (structured JSON)
    ADD COLUMN IF NOT EXISTS job_preferences JSONB DEFAULT '{}'::jsonb,
    -- e.g. { "desired_job_types": ["full_time","contract"], "remote_ok": true, "onsite_ok": true,
    --        "hybrid_ok": true, "willing_to_relocate": false, "preferred_locations": ["Nairobi","Lagos"] }

    -- Notice period & work authorization
    ADD COLUMN IF NOT EXISTS notice_period VARCHAR(50),
    -- e.g. 'immediate', '2_weeks', '1_month', '3_months'
    ADD COLUMN IF NOT EXISTS work_authorization VARCHAR(100),
    -- e.g. 'citizen', 'permanent_resident', 'work_permit_required', 'visa_sponsored'
    ADD COLUMN IF NOT EXISTS disability_status VARCHAR(30) DEFAULT 'prefer_not_to_say'
        CHECK (disability_status IS NULL OR disability_status IN ('yes', 'no', 'prefer_not_to_say')),

    -- Profile completeness score (0-100), updated by application logic or trigger
    ADD COLUMN IF NOT EXISTS profile_completeness_score INTEGER DEFAULT 0
        CHECK (profile_completeness_score >= 0 AND profile_completeness_score <= 100);

-- ============================================================================
-- CREATE INDEXES for new filterable columns
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_gender ON candidate_profiles(gender);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_nationality ON candidate_profiles(nationality);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_industry ON candidate_profiles(industry);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_highest_edu ON candidate_profiles(highest_education_level);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_notice_period ON candidate_profiles(notice_period);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_completeness ON candidate_profiles(profile_completeness_score DESC);

-- ============================================================================
-- FOREIGN KEY: enable Supabase PostgREST embedding of candidate_profiles
-- inside user_profiles queries (admin dashboard joins)
-- ============================================================================

-- Backfill: ensure every candidate_profiles.user_id has a matching user_profiles row
-- before we add the FK constraint.
INSERT INTO user_profiles (id, full_name, role)
SELECT
    cp.user_id,
    cp.full_name,
    'candidate'
FROM candidate_profiles cp
WHERE NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.id = cp.user_id
)
ON CONFLICT (id) DO NOTHING;

-- Add a direct FK from candidate_profiles.user_id → user_profiles.id
-- (both reference auth.users(id), so this is safe; user_profiles.id IS auth.users.id)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'candidate_profiles_user_profiles_fkey'
          AND table_name = 'candidate_profiles'
    ) THEN
        ALTER TABLE candidate_profiles
            ADD CONSTRAINT candidate_profiles_user_profiles_fkey
            FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- ADMIN RLS POLICY — allow admins to view ALL candidate profiles
-- (Previously admins could only see public profiles; now they see everything)
-- ============================================================================

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'candidate_profiles'
          AND policyname = 'Admins can view all candidate profiles'
    ) THEN
        CREATE POLICY "Admins can view all candidate profiles"
            ON candidate_profiles FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM user_profiles
                    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'candidate_work_experience'
          AND policyname = 'Admins can view all work experience'
    ) THEN
        CREATE POLICY "Admins can view all work experience"
            ON candidate_work_experience FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM user_profiles
                    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'candidate_education'
          AND policyname = 'Admins can view all education'
    ) THEN
        CREATE POLICY "Admins can view all education"
            ON candidate_education FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM user_profiles
                    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'candidate_skills'
          AND policyname = 'Admins can view all skills'
    ) THEN
        CREATE POLICY "Admins can view all skills"
            ON candidate_skills FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM user_profiles
                    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'candidate_documents'
          AND policyname = 'Admins can view all documents'
    ) THEN
        CREATE POLICY "Admins can view all documents"
            ON candidate_documents FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM user_profiles
                    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
                )
            );
    END IF;
END $$;

-- ============================================================================
-- TRIGGER: auto-update profile_completeness_score on INSERT/UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_candidate_completeness()
RETURNS TRIGGER AS $$
DECLARE
    score INTEGER := 0;
    has_work_exp BOOLEAN;
    has_education BOOLEAN;
    has_skills BOOLEAN;
    has_cv BOOLEAN;
BEGIN
    -- Basic info (30 pts max)
    IF NEW.full_name IS NOT NULL AND length(trim(NEW.full_name)) > 0 THEN score := score + 5; END IF;
    IF NEW.phone IS NOT NULL AND length(trim(NEW.phone)) > 0 THEN score := score + 5; END IF;
    IF NEW.location IS NOT NULL AND length(trim(NEW.location)) > 0 THEN score := score + 5; END IF;
    IF NEW.bio IS NOT NULL AND length(trim(NEW.bio)) > 50 THEN score := score + 10; END IF;
    IF NEW.linkedin_url IS NOT NULL OR NEW.portfolio_url IS NOT NULL OR NEW.github_url IS NOT NULL THEN score := score + 5; END IF;

    -- Professional (20 pts max)
    IF NEW.current_title IS NOT NULL AND length(trim(NEW.current_title)) > 0 THEN score := score + 10; END IF;
    IF NEW.years_experience IS NOT NULL THEN score := score + 5; END IF;
    IF NEW.expected_salary_min IS NOT NULL THEN score := score + 5; END IF;

    -- New demographic/preference fields (20 pts max)
    IF NEW.date_of_birth IS NOT NULL THEN score := score + 3; END IF;
    IF NEW.nationality IS NOT NULL AND length(trim(NEW.nationality)) > 0 THEN score := score + 3; END IF;
    IF NEW.languages IS NOT NULL AND jsonb_array_length(COALESCE(NEW.languages, '[]'::jsonb)) > 0 THEN score := score + 4; END IF;
    IF NEW.highest_education_level IS NOT NULL THEN score := score + 4; END IF;
    IF NEW.industry IS NOT NULL THEN score := score + 3; END IF;
    IF NEW.notice_period IS NOT NULL THEN score := score + 3; END IF;

    -- Work experience, education, skills, CV (30 pts max — checked via sub-queries)
    SELECT EXISTS (SELECT 1 FROM candidate_work_experience WHERE candidate_id = NEW.id) INTO has_work_exp;
    SELECT EXISTS (SELECT 1 FROM candidate_education WHERE candidate_id = NEW.id) INTO has_education;
    SELECT EXISTS (SELECT 1 FROM candidate_skills WHERE candidate_id = NEW.id) INTO has_skills;
    SELECT EXISTS (SELECT 1 FROM candidate_documents WHERE candidate_id = NEW.id AND is_active = true AND document_type IN ('cv','resume')) INTO has_cv;

    IF has_work_exp THEN score := score + 8; END IF;
    IF has_education THEN score := score + 7; END IF;
    IF has_skills THEN score := score + 8; END IF;
    IF has_cv THEN score := score + 7; END IF;

    NEW.profile_completeness_score := LEAST(score, 100);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_candidate_completeness ON candidate_profiles;
CREATE TRIGGER trg_calculate_candidate_completeness
    BEFORE INSERT OR UPDATE ON candidate_profiles
    FOR EACH ROW
    EXECUTE FUNCTION calculate_candidate_completeness();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN candidate_profiles.date_of_birth IS 'Candidate date of birth';
COMMENT ON COLUMN candidate_profiles.nationality IS 'Candidate nationality / citizenship';
COMMENT ON COLUMN candidate_profiles.gender IS 'Gender identity';
COMMENT ON COLUMN candidate_profiles.marital_status IS 'Marital status';
COMMENT ON COLUMN candidate_profiles.languages IS 'Languages spoken (JSON array)';
COMMENT ON COLUMN candidate_profiles.highest_education_level IS 'Highest qualification level';
COMMENT ON COLUMN candidate_profiles.industry IS 'Primary industry / domain';
COMMENT ON COLUMN candidate_profiles.job_preferences IS 'Structured job preferences (JSONB)';
COMMENT ON COLUMN candidate_profiles.notice_period IS 'Notice period before available to start';
COMMENT ON COLUMN candidate_profiles.work_authorization IS 'Work authorization / visa status';
COMMENT ON COLUMN candidate_profiles.disability_status IS 'Disability disclosure for inclusive hiring';
COMMENT ON COLUMN candidate_profiles.profile_completeness_score IS 'Auto-calculated profile completeness (0-100)';
