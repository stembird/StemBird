-- Migration: Fix suggest_career_paths RPC function
-- Description: The original function referenced non-existent columns `skills` and
-- `current_job_title` on candidate_profiles. Skills are stored in the separate
-- `candidate_skills` table and the correct column name is `current_title`.
-- Also ensures get_salary_insights and supporting tables exist.

-- ============================================================================
-- FIX: suggest_career_paths function
-- ============================================================================

DROP FUNCTION IF EXISTS suggest_career_paths(UUID);

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
DECLARE
    v_current_title TEXT;
    v_profile_id UUID;
BEGIN
    -- Get the candidate profile id and current title
    SELECT cp.id, cp.current_title
    INTO v_profile_id, v_current_title
    FROM candidate_profiles cp
    WHERE cp.user_id = p_user_id;

    -- If no profile or no current title, return empty set
    IF v_profile_id IS NULL OR v_current_title IS NULL OR v_current_title = '' THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        cp.id,
        cp.from_role,
        cp.to_role,
        cp.difficulty,
        cp.typical_duration_months,
        cp.salary_increase_percentage,
        COALESCE(
            (
                SELECT COUNT(*)::INTEGER * 20
                FROM candidate_skills cs
                WHERE cs.candidate_id = v_profile_id
                  AND cs.skill_name = ANY(
                      SELECT jsonb_array_elements_text(cp.required_skills)
                  )
            ),
            0
        ) AS match_score
    FROM career_paths cp
    WHERE cp.from_role ILIKE '%' || v_current_title || '%'
    ORDER BY match_score DESC, cp.salary_increase_percentage DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ENSURE: get_salary_insights function exists (idempotent re-creation)
-- ============================================================================

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
