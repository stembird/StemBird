-- Migration: Create Candidate Profile Tables
-- Description: Complete schema for candidate profiles, work experience, education, skills, and documents

-- ============================================================================
-- 1. CANDIDATE PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS candidate_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Information
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    location VARCHAR(255),
    bio TEXT,
    
    -- Professional Information
    current_title VARCHAR(255),
    years_experience INTEGER CHECK (years_experience >= 0),
    expected_salary_min DECIMAL(12, 2),
    expected_salary_max DECIMAL(12, 2),
    expected_salary_currency VARCHAR(3) DEFAULT 'NGN',
    
    -- Links
    linkedin_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    github_url VARCHAR(500),
    
    -- Settings
    profile_visibility VARCHAR(20) DEFAULT 'private' CHECK (profile_visibility IN ('private', 'public', 'recruiters_only')),
    job_alerts_enabled BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id)
);

-- ============================================================================
-- 2. CANDIDATE WORK EXPERIENCE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS candidate_work_experience (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    
    -- Job Details
    company_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    employment_type VARCHAR(50) CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'freelance', 'internship')),
    location VARCHAR(255),
    
    -- Duration
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT false,
    
    -- Description
    description TEXT,
    achievements TEXT[],
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CHECK (end_date IS NULL OR end_date >= start_date)
);

-- ============================================================================
-- 3. CANDIDATE EDUCATION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS candidate_education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    
    -- Institution Details
    institution_name VARCHAR(255) NOT NULL,
    degree_type VARCHAR(100) NOT NULL, -- e.g., Bachelor's, Master's, PhD, Diploma
    field_of_study VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    
    -- Duration
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT false,
    
    -- Additional Info
    grade VARCHAR(50), -- e.g., First Class, 3.8 GPA
    description TEXT,
    achievements TEXT[],
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CHECK (end_date IS NULL OR end_date >= start_date)
);

-- ============================================================================
-- 4. CANDIDATE SKILLS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS candidate_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    
    -- Skill Details
    skill_name VARCHAR(100) NOT NULL,
    skill_category VARCHAR(50), -- e.g., technical, soft, language, tool
    proficiency_level VARCHAR(20) CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    years_of_experience INTEGER CHECK (years_of_experience >= 0),
    
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    endorsed_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(candidate_id, skill_name)
);

-- ============================================================================
-- 5. CANDIDATE DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS candidate_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    
    -- Document Details
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('cv', 'resume', 'cover_letter', 'certificate', 'portfolio', 'other')),
    document_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(1000) NOT NULL,
    file_size INTEGER, -- in bytes
    file_type VARCHAR(50), -- e.g., application/pdf
    
    -- Status
    is_primary BOOLEAN DEFAULT false, -- Primary CV/Resume
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_candidate_profiles_user_id ON candidate_profiles(user_id);
CREATE INDEX idx_candidate_profiles_visibility ON candidate_profiles(profile_visibility);
CREATE INDEX idx_work_experience_candidate_id ON candidate_work_experience(candidate_id);
CREATE INDEX idx_work_experience_current ON candidate_work_experience(is_current);
CREATE INDEX idx_education_candidate_id ON candidate_education(candidate_id);
CREATE INDEX idx_education_current ON candidate_education(is_current);
CREATE INDEX idx_skills_candidate_id ON candidate_skills(candidate_id);
CREATE INDEX idx_skills_category ON candidate_skills(skill_category);
CREATE INDEX idx_documents_candidate_id ON candidate_documents(candidate_id);
CREATE INDEX idx_documents_type ON candidate_documents(document_type);
CREATE INDEX idx_documents_primary ON candidate_documents(is_primary);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_candidate_profiles_updated_at
    BEFORE UPDATE ON candidate_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_experience_updated_at
    BEFORE UPDATE ON candidate_work_experience
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_education_updated_at
    BEFORE UPDATE ON candidate_education
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skills_updated_at
    BEFORE UPDATE ON candidate_skills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON candidate_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_work_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_documents ENABLE ROW LEVEL SECURITY;

-- Candidate Profiles Policies
CREATE POLICY "Users can view their own profile"
    ON candidate_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
    ON candidate_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON candidate_profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
    ON candidate_profiles FOR DELETE
    USING (auth.uid() = user_id);

-- Public profiles viewable by recruiters/admins
CREATE POLICY "Public profiles viewable by authenticated users"
    ON candidate_profiles FOR SELECT
    USING (profile_visibility = 'public' AND auth.role() = 'authenticated');

-- Work Experience Policies
CREATE POLICY "Users can manage their own work experience"
    ON candidate_work_experience FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM candidate_profiles
            WHERE candidate_profiles.id = candidate_work_experience.candidate_id
            AND candidate_profiles.user_id = auth.uid()
        )
    );

-- Education Policies
CREATE POLICY "Users can manage their own education"
    ON candidate_education FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM candidate_profiles
            WHERE candidate_profiles.id = candidate_education.candidate_id
            AND candidate_profiles.user_id = auth.uid()
        )
    );

-- Skills Policies
CREATE POLICY "Users can manage their own skills"
    ON candidate_skills FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM candidate_profiles
            WHERE candidate_profiles.id = candidate_skills.candidate_id
            AND candidate_profiles.user_id = auth.uid()
        )
    );

-- Documents Policies
CREATE POLICY "Users can manage their own documents"
    ON candidate_documents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM candidate_profiles
            WHERE candidate_profiles.id = candidate_documents.candidate_id
            AND candidate_profiles.user_id = auth.uid()
        )
    );

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE candidate_profiles IS 'Main candidate profile information';
COMMENT ON TABLE candidate_work_experience IS 'Candidate work history and experience';
COMMENT ON TABLE candidate_education IS 'Candidate educational background';
COMMENT ON TABLE candidate_skills IS 'Candidate skills and proficiencies';
COMMENT ON TABLE candidate_documents IS 'Candidate uploaded documents (CVs, certificates, etc.)';
