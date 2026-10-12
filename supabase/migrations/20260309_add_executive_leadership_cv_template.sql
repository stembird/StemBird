-- Add Executive Leadership CV Template
-- Premium layout for senior executives emphasizing leadership and strategic impact

-- First delete if exists
DELETE FROM cv_templates WHERE name = 'Executive Leadership';

-- Insert the new Executive Leadership template
INSERT INTO cv_templates (
  name,
  description,
  category,
  template_data,
  is_premium,
  is_active
) VALUES (
  'Executive Leadership',
  'A premium layout emphasizing leadership achievements, strategic impact, and measurable results. Perfect for directors, CEOs, senior managers, and consultants who need to highlight impact and leadership metrics.',
  'Executive',
  '{
    "component": "ExecutiveTemplate",
    "sections": [
      "header",
      "leadership_profile",
      "key_achievements",
      "strategic_experience",
      "board_memberships",
      "strategic_initiatives",
      "education",
      "certifications"
    ],
    "colors": {
      "primary": "#111827",
      "secondary": "#374151",
      "accent": "#1d4ed8"
    },
    "fonts": {
      "primary": "Georgia, serif",
      "secondary": "system-ui, sans-serif"
    },
    "layout": {
      "type": "single-column",
      "width": "794px",
      "height": "1123px",
      "padding": "32px"
    },
    "features": [
      "Premium serif typography",
      "Leadership-focused sections",
      "Strategic impact emphasis",
      "Board memberships section",
      "Executive education"
    ],
    "best_for": [
      "Directors",
      "CEOs and C-suite",
      "Senior managers",
      "Consultants",
      "Board members"
    ]
  }'::jsonb,
  true,
  true
);

-- Update descriptions for existing templates
UPDATE cv_templates 
SET description = 'A clean, ATS-friendly single-column layout perfect for entry to mid-level professionals. Emphasizes clarity and readability for administrative, technical, and general professional roles.'
WHERE name = 'Classic Professional';

UPDATE cv_templates 
SET description = 'A stylized two-column design with blue accents and modern aesthetics. Ideal for mid-career professionals in corporate roles, marketing, business, and communications positions.'
WHERE name = 'Modern Professional';
