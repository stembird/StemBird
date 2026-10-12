-- Migration: Add Creative Portfolio CV Template
-- Template #7: Creative Portfolio CV for designers, photographers, and creative professionals

-- First, check if the template already exists and delete it if it does
DELETE FROM cv_templates WHERE name = 'Creative Portfolio';

-- Insert the new Creative Portfolio template
INSERT INTO cv_templates (
    name, 
    description, 
    category, 
    template_data, 
    is_premium,
    is_active
) VALUES (
    'Creative Portfolio',
    'Eye-catching template for graphic designers, UI/UX designers, photographers, and creative professionals. Features portfolio projects prominently with a bold sidebar design.',
    'creative',
    '{
        "component": "CreativeTemplate",
        "sections": [
            "header",
            "tagline",
            "contact",
            "creative_profile",
            "core_skills",
            "design_tools",
            "portfolio_projects",
            "work_experience",
            "education"
        ],
        "colors": {
            "primary": "#4f46e5",
            "secondary": "#ffffff",
            "accent": "#6366f1",
            "text": "#374151"
        },
        "fonts": {
            "primary": "system-ui, -apple-system, sans-serif"
        },
        "layout": {
            "type": "two-column",
            "width": "794px",
            "height": "1123px",
            "sidebar_width": "33%",
            "main_width": "67%"
        },
        "features": [
            "Portfolio showcase",
            "Creative sidebar design",
            "Project highlights",
            "Skills visualization",
            "Bold color scheme"
        ],
        "best_for": [
            "Graphic designers",
            "UI/UX designers",
            "Photographers",
            "Video editors",
            "Creative directors",
            "Social media creatives"
        ],
        "default_data": {
            "name": "Your Name",
            "tagline": "Your Creative Title | Specialization",
            "contact": {
                "location": "City, Country",
                "phone": "+254 XXX XXX XXX",
                "email": "your.email@example.com",
                "website": "www.yourportfolio.com"
            },
            "profile": "Brief creative profile highlighting your design philosophy, experience, and what makes your work unique. Focus on your creative approach and impact.",
            "skills": [
                "Brand Identity Design",
                "Logo Design",
                "Typography",
                "Social Media Graphics",
                "Illustration",
                "Visual Storytelling"
            ],
            "tools": [
                "Adobe Photoshop",
                "Adobe Illustrator",
                "Figma",
                "Canva",
                "After Effects"
            ],
            "projects": [
                {
                    "title": "Project Name",
                    "client": "Client Name",
                    "year": "2024",
                    "description": "Brief description of the project, your role, and the impact or results achieved."
                }
            ],
            "experience": [
                {
                    "role": "Job Title",
                    "company": "Company Name",
                    "location": "City",
                    "dates": "Start – End"
                }
            ],
            "education": [
                {
                    "degree": "Degree/Diploma Name",
                    "institution": "Institution Name",
                    "dates": "Start – End"
                }
            ]
        }
    }'::jsonb,
    false,
    true
);

-- Add comment for documentation
COMMENT ON TABLE cv_templates IS 'Stores CV template definitions with metadata and configuration';
