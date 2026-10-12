-- Phase 5.1: Candidate Career Tools
-- CV Builder, Cover Letter Templates, Skill Assessments, Career Path, Salary Insights

-- ============================================================================
-- CV BUILDER & VERSIONS
-- ============================================================================

-- CV Templates
CREATE TABLE IF NOT EXISTS cv_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'professional', 'creative', 'modern', 'classic'
    thumbnail_url TEXT,
    template_data JSONB NOT NULL, -- Structure/layout definition
    is_premium BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User CVs (Multiple versions)
CREATE TABLE IF NOT EXISTS candidate_cvs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES cv_templates(id),
    title TEXT NOT NULL, -- e.g., "Software Engineer CV", "Marketing Manager CV"
    content JSONB NOT NULL, -- Structured CV data
    is_primary BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    file_url TEXT, -- Generated PDF/DOCX URL
    last_generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, title)
);

CREATE INDEX idx_candidate_cvs_user ON candidate_cvs(user_id);
CREATE INDEX idx_candidate_cvs_primary ON candidate_cvs(user_id, is_primary) WHERE is_primary = true;

-- ============================================================================
-- COVER LETTER TEMPLATES & GENERATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS cover_letter_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'formal', 'creative', 'technical', 'entry-level'
    template_text TEXT NOT NULL, -- Template with placeholders
    placeholders JSONB, -- List of available placeholders
    is_premium BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidate_cover_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES cover_letter_templates(id),
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    generated_content TEXT, -- AI-enhanced version
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cover_letters_user ON candidate_cover_letters(user_id);
CREATE INDEX idx_cover_letters_job ON candidate_cover_letters(job_id);

-- ============================================================================
-- SKILL ASSESSMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS skill_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'technical', 'soft', 'language', 'tool'
    difficulty_level TEXT NOT NULL, -- 'beginner', 'intermediate', 'advanced', 'expert'
    description TEXT,
    duration_minutes INTEGER DEFAULT 15,
    passing_score INTEGER DEFAULT 70,
    questions JSONB NOT NULL, -- Array of questions with answers
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_skill_assessments_skill ON skill_assessments(skill_name);
CREATE INDEX idx_skill_assessments_category ON skill_assessments(category);

CREATE TABLE IF NOT EXISTS candidate_assessment_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES skill_assessments(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    time_taken_minutes INTEGER,
    answers JSONB, -- User's answers
    certificate_url TEXT,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Some certifications expire
    is_public BOOLEAN DEFAULT false, -- Show on profile
    UNIQUE(user_id, assessment_id, completed_at)
);

CREATE INDEX idx_assessment_results_user ON candidate_assessment_results(user_id);
CREATE INDEX idx_assessment_results_passed ON candidate_assessment_results(user_id, passed) WHERE passed = true;

-- ============================================================================
-- CAREER PATH SUGGESTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS career_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_role TEXT NOT NULL,
    to_role TEXT NOT NULL,
    difficulty TEXT NOT NULL, -- 'easy', 'moderate', 'challenging'
    typical_duration_months INTEGER,
    required_skills JSONB, -- Array of skills needed
    recommended_certifications JSONB,
    salary_increase_percentage INTEGER,
    description TEXT,
    steps JSONB, -- Detailed progression steps
    success_rate INTEGER, -- Percentage of successful transitions
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_career_paths_from ON career_paths(from_role);
CREATE INDEX idx_career_paths_to ON career_paths(to_role);

CREATE TABLE IF NOT EXISTS candidate_career_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    current_role TEXT NOT NULL,
    target_role TEXT NOT NULL,
    target_timeline_months INTEGER,
    career_path_id UUID REFERENCES career_paths(id),
    progress_percentage INTEGER DEFAULT 0,
    completed_steps JSONB DEFAULT '[]',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_career_goals_user ON candidate_career_goals(user_id);
CREATE INDEX idx_career_goals_active ON candidate_career_goals(user_id, is_active) WHERE is_active = true;

-- ============================================================================
-- SALARY INSIGHTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS salary_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_title TEXT NOT NULL,
    location TEXT NOT NULL,
    country TEXT NOT NULL,
    experience_level TEXT NOT NULL, -- 'entry', 'mid', 'senior', 'lead', 'executive'
    min_salary INTEGER NOT NULL,
    max_salary INTEGER NOT NULL,
    median_salary INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    sample_size INTEGER DEFAULT 1,
    industry TEXT,
    company_size TEXT, -- 'startup', 'small', 'medium', 'large', 'enterprise'
    remote_type TEXT, -- 'onsite', 'hybrid', 'remote'
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    data_source TEXT, -- 'user_reported', 'job_posting', 'external_api'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_salary_data_title ON salary_data(job_title);
CREATE INDEX idx_salary_data_location ON salary_data(location);
CREATE INDEX idx_salary_data_level ON salary_data(experience_level);
CREATE INDEX idx_salary_data_composite ON salary_data(job_title, location, experience_level);

CREATE TABLE IF NOT EXISTS candidate_salary_expectations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_title TEXT NOT NULL,
    min_salary INTEGER NOT NULL,
    max_salary INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    is_negotiable BOOLEAN DEFAULT true,
    preferred_benefits JSONB, -- Array of benefits
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, job_title)
);

CREATE INDEX idx_salary_expectations_user ON candidate_salary_expectations(user_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- CV Templates (Public read, admin write)
ALTER TABLE cv_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active templates" ON cv_templates FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage templates" ON cv_templates FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Candidate CVs (User owns their CVs)
ALTER TABLE candidate_cvs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own CVs" ON candidate_cvs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own CVs" ON candidate_cvs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own CVs" ON candidate_cvs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own CVs" ON candidate_cvs FOR DELETE USING (user_id = auth.uid());

-- Cover Letter Templates (Public read, admin write)
ALTER TABLE cover_letter_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active cover letter templates" ON cover_letter_templates FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage cover letter templates" ON cover_letter_templates FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Candidate Cover Letters (User owns their letters)
ALTER TABLE candidate_cover_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own cover letters" ON candidate_cover_letters FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own cover letters" ON candidate_cover_letters FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own cover letters" ON candidate_cover_letters FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own cover letters" ON candidate_cover_letters FOR DELETE USING (user_id = auth.uid());

-- Skill Assessments (Public read)
ALTER TABLE skill_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active assessments" ON skill_assessments FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage assessments" ON skill_assessments FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Assessment Results (User owns their results, public if marked)
ALTER TABLE candidate_assessment_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own results" ON candidate_assessment_results FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Public results are viewable" ON candidate_assessment_results FOR SELECT USING (is_public = true);
CREATE POLICY "Users can create own results" ON candidate_assessment_results FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own results" ON candidate_assessment_results FOR UPDATE USING (user_id = auth.uid());

-- Career Paths (Public read)
ALTER TABLE career_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view career paths" ON career_paths FOR SELECT USING (true);
CREATE POLICY "Admins can manage career paths" ON career_paths FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Career Goals (User owns their goals)
ALTER TABLE candidate_career_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own goals" ON candidate_career_goals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own goals" ON candidate_career_goals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own goals" ON candidate_career_goals FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own goals" ON candidate_career_goals FOR DELETE USING (user_id = auth.uid());

-- Salary Data (Public read)
ALTER TABLE salary_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view salary data" ON salary_data FOR SELECT USING (true);
CREATE POLICY "Authenticated users can contribute" ON salary_data FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Salary Expectations (User owns their expectations)
ALTER TABLE candidate_salary_expectations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own expectations" ON candidate_salary_expectations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own expectations" ON candidate_salary_expectations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own expectations" ON candidate_salary_expectations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own expectations" ON candidate_salary_expectations FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get salary insights for a role
CREATE OR REPLACE FUNCTION get_salary_insights(
    p_job_title TEXT,
    p_location TEXT DEFAULT NULL,
    p_experience_level TEXT DEFAULT NULL
)
RETURNS TABLE (
    min_salary INTEGER,
    max_salary INTEGER,
    median_salary INTEGER,
    percentile_25 INTEGER,
    percentile_75 INTEGER,
    sample_size BIGINT,
    currency TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        MIN(sd.min_salary)::INTEGER,
        MAX(sd.max_salary)::INTEGER,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sd.median_salary)::INTEGER,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY sd.median_salary)::INTEGER,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY sd.median_salary)::INTEGER,
        COUNT(*)::BIGINT,
        sd.currency
    FROM salary_data sd
    WHERE sd.job_title ILIKE '%' || p_job_title || '%'
        AND (p_location IS NULL OR sd.location ILIKE '%' || p_location || '%')
        AND (p_experience_level IS NULL OR sd.experience_level = p_experience_level)
    GROUP BY sd.currency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to suggest career paths based on current profile
CREATE OR REPLACE FUNCTION suggest_career_paths(p_user_id UUID)
RETURNS TABLE (
    path_id UUID,
    from_role TEXT,
    to_role TEXT,
    difficulty TEXT,
    duration_months INTEGER,
    salary_increase_percentage INTEGER,
    match_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH user_skills AS (
        SELECT UNNEST(skills) as skill
        FROM candidate_profiles
        WHERE id = p_user_id
    ),
    user_current_role AS (
        SELECT current_job_title
        FROM candidate_profiles
        WHERE id = p_user_id
    )
    SELECT 
        cp.id,
        cp.from_role,
        cp.to_role,
        cp.difficulty,
        cp.typical_duration_months,
        cp.salary_increase_percentage,
        (
            -- Calculate match score based on existing skills
            SELECT COUNT(*)::INTEGER * 20
            FROM user_skills us
            WHERE us.skill = ANY(
                SELECT jsonb_array_elements_text(cp.required_skills)
            )
        ) as match_score
    FROM career_paths cp
    CROSS JOIN user_current_role ucr
    WHERE cp.from_role ILIKE '%' || ucr.current_job_title || '%'
    ORDER BY match_score DESC, cp.salary_increase_percentage DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert sample CV templates
INSERT INTO cv_templates (name, description, category, template_data, is_premium) VALUES
('Modern Professional', 'Clean and modern design perfect for tech roles', 'modern', '{"sections": ["header", "summary", "experience", "education", "skills"], "colors": {"primary": "#2563eb", "secondary": "#64748b"}}', false),
('Classic Executive', 'Traditional format for senior positions', 'classic', '{"sections": ["header", "summary", "experience", "education", "certifications"], "colors": {"primary": "#1e293b", "secondary": "#475569"}}', false),
('Creative Designer', 'Eye-catching layout for creative professionals', 'creative', '{"sections": ["header", "portfolio", "experience", "skills", "education"], "colors": {"primary": "#8b5cf6", "secondary": "#a78bfa"}}', true);

-- Insert sample cover letter templates
INSERT INTO cover_letter_templates (name, description, category, template_text, placeholders) VALUES
('Professional Standard', 'Formal cover letter for corporate positions', 'formal', 
'Dear {{hiring_manager}},

I am writing to express my strong interest in the {{job_title}} position at {{company_name}}. With {{years_experience}} years of experience in {{industry}}, I am confident in my ability to contribute to your team.

{{custom_paragraph}}

I am particularly drawn to {{company_name}} because {{company_reason}}. My background in {{key_skills}} aligns perfectly with the requirements outlined in your job posting.

Thank you for considering my application. I look forward to discussing how my experience and skills can benefit your organization.

Sincerely,
{{candidate_name}}',
'{"placeholders": ["hiring_manager", "job_title", "company_name", "years_experience", "industry", "custom_paragraph", "company_reason", "key_skills", "candidate_name"]}', false),

('Tech Enthusiast', 'Engaging letter for technology roles', 'technical',
'Hi {{hiring_manager}},

I''m excited to apply for the {{job_title}} role at {{company_name}}. As a passionate {{profession}} with expertise in {{tech_stack}}, I''ve been following your company''s work in {{company_focus}} and would love to contribute.

{{achievement_paragraph}}

What excites me most about this opportunity is {{excitement_reason}}. I believe my experience with {{relevant_experience}} would make me a valuable addition to your team.

Looking forward to connecting!

Best regards,
{{candidate_name}}',
'{"placeholders": ["hiring_manager", "job_title", "company_name", "profession", "tech_stack", "company_focus", "achievement_paragraph", "excitement_reason", "relevant_experience", "candidate_name"]}', false);

-- Insert sample skill assessments
INSERT INTO skill_assessments (skill_name, category, difficulty_level, description, duration_minutes, questions) VALUES
('JavaScript Fundamentals', 'technical', 'intermediate', 'Test your knowledge of core JavaScript concepts', 20, 
'{"questions": [
    {"id": 1, "question": "What is closure in JavaScript?", "type": "multiple_choice", "options": ["A function with access to outer scope", "A loop structure", "A data type", "An operator"], "correct": 0, "points": 10},
    {"id": 2, "question": "Explain the difference between let and var", "type": "text", "points": 15},
    {"id": 3, "question": "What does ''use strict'' do?", "type": "multiple_choice", "options": ["Enables strict mode", "Imports a module", "Declares a constant", "Creates a class"], "correct": 0, "points": 10}
]}'),

('Communication Skills', 'soft', 'beginner', 'Assess your professional communication abilities', 15,
'{"questions": [
    {"id": 1, "question": "How do you handle difficult conversations with colleagues?", "type": "text", "points": 20},
    {"id": 2, "question": "What is active listening?", "type": "multiple_choice", "options": ["Fully concentrating and responding", "Hearing words", "Taking notes", "Interrupting"], "correct": 0, "points": 15}
]}');

-- Insert sample career paths
INSERT INTO career_paths (from_role, to_role, difficulty, typical_duration_months, required_skills, salary_increase_percentage, description, steps, success_rate) VALUES
('Junior Developer', 'Senior Developer', 'moderate', 36, 
'["Advanced programming", "System design", "Mentoring", "Code review", "Architecture"]',
40,
'Progress from junior to senior developer through technical mastery and leadership',
'{"steps": [
    {"title": "Master core technologies", "duration_months": 12, "description": "Deep dive into your primary tech stack"},
    {"title": "Lead small projects", "duration_months": 12, "description": "Take ownership of features and modules"},
    {"title": "Mentor juniors", "duration_months": 6, "description": "Help onboard and guide new team members"},
    {"title": "System design", "duration_months": 6, "description": "Learn to architect scalable solutions"}
]}',
75),

('Marketing Coordinator', 'Marketing Manager', 'moderate', 24,
'["Team leadership", "Budget management", "Strategy", "Analytics", "Campaign management"]',
35,
'Transition from coordinator to manager with leadership and strategic skills',
'{"steps": [
    {"title": "Lead campaigns", "duration_months": 8, "description": "Own end-to-end campaign execution"},
    {"title": "Develop strategy skills", "duration_months": 8, "description": "Learn market analysis and planning"},
    {"title": "Build team skills", "duration_months": 8, "description": "Mentor team members and manage projects"}
]}',
70);

-- Insert sample salary data
INSERT INTO salary_data (job_title, location, country, experience_level, min_salary, max_salary, median_salary, industry, company_size, remote_type) VALUES
('Software Engineer', 'San Francisco, CA', 'USA', 'mid', 120000, 180000, 150000, 'Technology', 'large', 'hybrid'),
('Software Engineer', 'New York, NY', 'USA', 'mid', 110000, 170000, 140000, 'Technology', 'large', 'hybrid'),
('Software Engineer', 'Austin, TX', 'USA', 'mid', 95000, 145000, 120000, 'Technology', 'medium', 'hybrid'),
('Senior Software Engineer', 'San Francisco, CA', 'USA', 'senior', 160000, 250000, 200000, 'Technology', 'large', 'hybrid'),
('Marketing Manager', 'New York, NY', 'USA', 'mid', 80000, 120000, 100000, 'Marketing', 'medium', 'onsite'),
('Product Manager', 'Seattle, WA', 'USA', 'mid', 130000, 180000, 155000, 'Technology', 'large', 'hybrid');

COMMENT ON TABLE candidate_cvs IS 'Stores multiple CV versions for each candidate';
COMMENT ON TABLE cover_letter_templates IS 'Reusable cover letter templates with placeholders';
COMMENT ON TABLE skill_assessments IS 'Skill tests and quizzes for candidates';
COMMENT ON TABLE career_paths IS 'Career progression paths and requirements';
COMMENT ON TABLE salary_data IS 'Aggregated salary information by role and location';
