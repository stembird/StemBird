-- Add Skills-Based (Functional) CV Template
-- This template emphasizes skills and competencies over chronological work history
-- Ideal for career changers, people with employment gaps, and entry-level candidates

-- First, check if the template already exists and delete it if it does
DELETE FROM cv_templates WHERE name = 'Skills-Based (Functional)';

-- Insert the Skills-Based (Functional) CV template
INSERT INTO cv_templates (
    name, 
    description, 
    category, 
    template_data, 
    is_premium,
    is_active
) VALUES (
    'Skills-Based (Functional)',
    'Skills-first CV template that emphasizes competencies over chronological work history. Perfect for career changers, candidates with employment gaps, or those with strong transferable skills.',
    'functional',
    '{
        "component": "FunctionalTemplate",
        "sections": [
            "header",
            "professional_summary",
            "core_competencies",
            "skills_categories",
            "work_experience_brief",
            "education",
            "certifications"
        ],
        "colors": {
            "primary": "#111827",
            "secondary": "#374151",
            "accent": "#1e40af"
        },
        "fonts": {
            "primary": "system-ui, -apple-system, sans-serif"
        },
        "layout": {
            "type": "single-column",
            "width": "794px",
            "height": "1123px",
            "padding": "48px"
        },
        "features": [
            "Skills-first approach",
            "Core competencies section",
            "Categorized professional skills",
            "Brief work experience summary",
            "Transferable skills focus",
            "ATS-friendly",
            "A4 print-ready"
        ],
        "best_for": [
            "Career changers",
            "Candidates with employment gaps",
            "Entry-level with transferable skills",
            "Industry switchers",
            "Diverse experience backgrounds"
        ]
    }'::jsonb,
    false,
    true
);

-- Add comment for documentation
COMMENT ON TABLE cv_templates IS 'Stores CV template definitions with metadata and configuration. The functional template prioritizes skills over chronological experience.';
