-- Add Modern Professional CV Template for Kenyan Candidates
-- Two-column layout with color accents

DELETE FROM cv_templates WHERE name = 'Modern Professional';

INSERT INTO cv_templates (
    name, 
    description, 
    category, 
    template_data, 
    is_premium,
    is_active
) VALUES (
    'Modern Professional',
    'Stylized two-column CV with subtle color accents and modern design. Perfect for mid-career professionals in corporate, marketing, and business roles.',
    'modern',
    '{
        "component": "ModernTemplate",
        "sections": [
            "header",
            "professional_profile",
            "professional_experience",
            "education",
            "certifications",
            "key_skills",
            "tools_platforms",
            "languages",
            "referees"
        ],
        "colors": {
            "primary": "#1e40af",
            "secondary": "#3b82f6",
            "accent": "#eff6ff",
            "text": "#111827"
        },
        "fonts": {
            "primary": "system-ui, -apple-system, sans-serif"
        },
        "layout": {
            "type": "two-column",
            "width": "794px",
            "height": "1123px",
            "sidebar_width": "35%",
            "main_width": "65%"
        },
        "features": [
            "Two-column layout",
            "Color accents",
            "Modern design",
            "ATS-friendly",
            "A4 print-ready",
            "Icon-enhanced contact"
        ],
        "best_for": [
            "Mid-career professionals",
            "Corporate roles",
            "Marketing positions",
            "Business jobs",
            "Communications roles"
        ]
    }'::jsonb,
    false,
    true
);
