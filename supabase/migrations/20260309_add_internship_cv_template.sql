-- Migration: Add Internship / Industrial Attachment CV Template
-- Template #6: Designed for Kenyan students applying for industrial attachment or internships
-- Focus: Education, technical skills, academic projects, and potential

-- First, check if the template already exists and delete it if it does
DELETE FROM cv_templates WHERE name = 'Internship / Industrial Attachment';

-- Insert the Internship / Industrial Attachment CV template
INSERT INTO cv_templates (
    name, 
    description, 
    category, 
    template_data, 
    is_premium,
    is_active
) VALUES (
    'Internship / Industrial Attachment',
    'Student-focused CV template perfect for industrial attachment and internship applications. Emphasizes education, technical skills, academic projects, and potential over work experience.',
    'student',
    '{
        "component": "InternshipTemplate",
        "sections": [
            "header",
            "career_objective",
            "education",
            "technical_skills",
            "academic_projects",
            "industrial_attachment",
            "extracurricular_activities",
            "referees"
        ],
        "colors": {
            "primary": "#111827",
            "secondary": "#374151",
            "accent": "#1f2937"
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
            "Education-first layout",
            "Career objective section",
            "Technical skills showcase",
            "Academic projects/labs section",
            "Industrial attachment experience",
            "Extracurricular activities",
            "Referees section",
            "ATS-friendly",
            "A4 print-ready"
        ],
        "best_for": [
            "Students seeking industrial attachment",
            "Internship applicants",
            "Technical college students",
            "Diploma students",
            "TVET graduates",
            "Entry-level candidates with limited work experience"
        ]
    }'::jsonb,
    false,
    true
);

-- Add comment for documentation
COMMENT ON TABLE cv_templates IS 'Stores CV template definitions with metadata and configuration';
