-- Add Graduate Starter CV Template for Fresh Graduates
-- This template prioritizes education, projects, and internships

-- First, check if the template already exists and delete it if it does
DELETE FROM cv_templates WHERE name = 'Graduate Starter CV';

-- Insert the Graduate Starter CV template
INSERT INTO cv_templates (
    name, 
    description, 
    category, 
    template_data, 
    is_premium,
    is_active
) VALUES (
    'Graduate Starter CV',
    'Education-focused CV template perfect for fresh graduates and students. Prioritizes academic projects, internships, and extracurricular activities over work experience.',
    'entry_level',
    '{
        "component": "GraduateTemplate",
        "sections": [
            "header",
            "career_objective",
            "education",
            "academic_projects",
            "internships",
            "key_skills",
            "extracurricular_activities",
            "referees"
        ],
        "colors": {
            "primary": "#111827",
            "secondary": "#374151",
            "accent": "#1d4ed8"
        },
        "fonts": {
            "primary": "system-ui, -apple-system, sans-serif"
        },
        "layout": {
            "type": "single-column",
            "width": "794px",
            "height": "1123px",
            "padding": "40px"
        },
        "features": [
            "Education-focused layout",
            "Academic projects section",
            "Internship/attachment experience",
            "Extracurricular activities",
            "Skills showcase",
            "Career objective statement",
            "ATS-friendly",
            "A4 print-ready"
        ],
        "best_for": [
            "Fresh graduates",
            "University students",
            "Internship applicants",
            "Entry-level job seekers",
            "Recent diploma holders"
        ]
    }'::jsonb,
    false,
    true
);

-- Add comment for documentation
COMMENT ON TABLE cv_templates IS 'Stores CV template definitions with metadata and configuration';
