-- Migration: Add Personal Brand CV Template
-- Description: Template designed for professionals whose reputation and public presence matter
-- Typical users: Consultants, Marketing professionals, Speakers, Influencers, Coaches, Content creators

-- First, check if the template already exists and delete it if it does
DELETE FROM cv_templates WHERE name = 'Personal Brand CV';

-- Insert the new Personal Brand CV template
INSERT INTO cv_templates (
  name,
  description,
  category,
  template_data,
  is_premium,
  is_active
) VALUES (
  'Personal Brand CV',
  'Designed for professionals whose reputation, voice, and public presence matter as much as their work history. Perfect for consultants, marketing professionals, public speakers, influencers, coaches, and content creators. Highlights personal tagline, online presence, media features, speaking engagements, and publications.',
  'creative_digital',
  jsonb_build_object(
    'component', 'PersonalBrandTemplate',
    'sections', jsonb_build_array(
      'header',
      'contact',
      'social',
      'skills',
      'profile',
      'publications',
      'speaking',
      'experience',
      'education',
      'certifications'
    ),
    'features', jsonb_build_array(
      'Personal tagline and branding',
      'Online presence and social media links',
      'Publications and media features section',
      'Speaking engagements showcase',
      'Professional experience with descriptions',
      'Certifications display',
      'Two-column layout with sidebar',
      'Indigo accent color scheme'
    ),
    'sampleData', jsonb_build_object(
      'name', 'Grace Wanjiku Mwangi',
      'tagline', 'Marketing Strategist | Brand Storyteller | Public Speaker',
      'contact', jsonb_build_object(
        'location', 'Nairobi, Kenya',
        'phone', '+254 712 555 444',
        'email', 'grace.mwangi@email.com'
      ),
      'social', jsonb_build_array(
        'LinkedIn: linkedin.com/in/gracemwangi',
        'Twitter: @gracebrands',
        'Instagram: @gracemwangi',
        'Website: www.gracemwangi.co.ke',
        'Medium: @gracemwangi'
      ),
      'profile', 'Award-winning marketing strategist with over 8 years of experience helping brands build strong customer connections through storytelling, digital marketing, and brand positioning. Recognized thought leader in African brand development with a proven track record of driving growth for SMEs and established corporations.',
      'skills', jsonb_build_array(
        'Brand Strategy & Positioning',
        'Digital Marketing',
        'Public Speaking & Training',
        'Content Marketing',
        'Personal Branding',
        'Social Media Strategy',
        'Influencer Marketing',
        'Marketing Analytics',
        'Campaign Management',
        'Storytelling'
      ),
      'publications', jsonb_build_array(
        jsonb_build_object(
          'title', 'Building Authentic Brands in Africa: A Strategic Guide',
          'platform', 'Marketing Africa Magazine',
          'year', '2024'
        ),
        jsonb_build_object(
          'title', 'How SMEs Can Win With Digital Marketing on Limited Budgets',
          'platform', 'Business Daily Kenya',
          'year', '2023'
        ),
        jsonb_build_object(
          'title', 'The Power of Storytelling in Modern Marketing',
          'platform', 'The Standard Digital',
          'year', '2023'
        ),
        jsonb_build_object(
          'title', 'Personal Branding for African Professionals',
          'platform', 'Medium (Featured Article)',
          'year', '2022'
        ),
        jsonb_build_object(
          'title', 'Social Media Strategies That Actually Work',
          'platform', 'Nation Media Group',
          'year', '2022'
        )
      ),
      'speaking', jsonb_build_array(
        jsonb_build_object(
          'event', 'Nairobi Digital Marketing Summit - Keynote Speaker',
          'location', 'Nairobi, Kenya',
          'year', '2024'
        ),
        jsonb_build_object(
          'event', 'Kenya SME Growth Forum - Panel Discussion',
          'location', 'Nairobi, Kenya',
          'year', '2023'
        ),
        jsonb_build_object(
          'event', 'East Africa Marketing Conference',
          'location', 'Kampala, Uganda',
          'year', '2023'
        ),
        jsonb_build_object(
          'event', 'Women in Business Leadership Summit',
          'location', 'Nairobi, Kenya',
          'year', '2022'
        ),
        jsonb_build_object(
          'event', 'Digital Transformation Workshop Series',
          'location', 'Mombasa, Kenya',
          'year', '2022'
        )
      ),
      'experience', jsonb_build_array(
        jsonb_build_object(
          'role', 'Marketing Consultant & Brand Strategist',
          'company', 'BrandGrow Africa',
          'location', 'Nairobi, Kenya',
          'dates', '2021 – Present',
          'description', 'Lead brand strategy development for 20+ clients across East Africa. Delivered 150% average ROI improvement through integrated marketing campaigns.'
        ),
        jsonb_build_object(
          'role', 'Senior Marketing Manager',
          'company', 'BrightWave Agency',
          'location', 'Nairobi, Kenya',
          'dates', '2018 – 2021',
          'description', 'Managed marketing campaigns for major brands including Safaricom, KCB, and Equity Bank. Led team of 8 marketing professionals.'
        ),
        jsonb_build_object(
          'role', 'Marketing Specialist',
          'company', 'Creative Hub Kenya',
          'location', 'Nairobi, Kenya',
          'dates', '2016 – 2018',
          'description', 'Developed and executed digital marketing strategies for SME clients. Increased client social media engagement by average of 300%.'
        )
      ),
      'education', jsonb_build_array(
        jsonb_build_object(
          'degree', 'Bachelor of Commerce (Marketing) - First Class Honours',
          'institution', 'Kenyatta University',
          'dates', '2013 – 2017'
        )
      ),
      'certifications', jsonb_build_array(
        'Google Digital Marketing Certification',
        'HubSpot Content Marketing',
        'Facebook Blueprint Certified',
        'Professional Speaker Certification'
      )
    )
  ),
  false,
  true
);

-- Add comment for documentation
COMMENT ON TABLE cv_templates IS 'Stores CV template definitions with metadata and configuration';
