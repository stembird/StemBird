-- Add Classic Professional CV Template for Kenyan Candidates
-- This template is specifically designed for the Kenyan job market

-- First, check if the template already exists and delete it if it does
DELETE FROM cv_templates WHERE name = 'Classic Professional';

-- Insert the new Classic Professional template
INSERT INTO cv_templates (
    name, 
    description, 
    category, 
    template_data, 
    is_premium,
    is_active
) VALUES (
    'Classic Professional',
    'Clean, single-column CV template perfect for Kenyan professionals. ATS-friendly design suitable for administrative, corporate, and government positions.',
    'classic',
    '{
        "component": "ClassicTemplate",
        "sections": [
            "header",
            "professional_summary",
            "key_skills",
            "professional_experience",
            "education",
            "certifications",
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
            "padding": "48px"
        },
        "features": [
            "ATS-friendly",
            "A4 print-ready",
            "Kenyan format",
            "Professional typography",
            "Clean sections"
        ],
        "best_for": [
            "Administrative roles",
            "Management positions",
            "Corporate jobs",
            "Government applications",
            "Entry to mid-level positions"
        ]
    }'::jsonb,
    false,
    true
);

-- Add comment for documentation
COMMENT ON TABLE cv_templates IS 'Stores CV template definitions with metadata and configuration';
