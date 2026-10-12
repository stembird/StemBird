-- Migration: Add International / ATS Optimized CV Template
-- Description: Single-column, no-graphics template designed to pass ATS systems
-- Typical users: Professionals applying to remote jobs, international NGOs,
--                multinational companies, global tech companies using Workday,
--                Greenhouse, Lever, Taleo, BambooHR

DELETE FROM cv_templates WHERE name = 'International / ATS Optimized CV';

INSERT INTO cv_templates (
  name,
  description,
  category,
  template_data,
  is_premium,
  is_active
) VALUES (
  'International / ATS Optimized CV',
  'Single-column, plain-text-friendly CV designed to pass Applicant Tracking Systems (ATS) used by Workday, Greenhouse, Lever, Taleo, and BambooHR. No graphics, no icons, no text boxes — just clean, scannable content with standard section headings. Ideal for remote jobs, international NGOs, multinational companies, and global tech companies.',
  'international',
  jsonb_build_object(
    'component', 'ATSOptimizedTemplate',
    'sections', jsonb_build_array(
      'header',
      'summary',
      'skills',
      'experience',
      'education',
      'certifications',
      'additional'
    ),
    'features', jsonb_build_array(
      'Single-column ATS-friendly layout',
      'No graphics or icons',
      'Standard section headings',
      'Keyword-optimized skills section',
      'Clean plain-text structure',
      'Professional Summary section',
      'Core Skills with keyword density',
      'Additional Information for languages and volunteering'
    ),
    'sampleData', jsonb_build_object(
      'name', 'David Ochieng Onyango',
      'title', 'Data Analyst',
      'contact', jsonb_build_object(
        'location', 'Nairobi, Kenya',
        'phone', '+254 712 000 111',
        'email', 'david.onyango@email.com',
        'linkedin', 'linkedin.com/in/davidonyango'
      ),
      'summary', 'Data analyst with 5+ years of experience transforming complex datasets into actionable insights. Experienced in SQL, Python, and business intelligence tools to support data-driven decision making.',
      'skills', jsonb_build_array(
        'Data Analysis',
        'SQL',
        'Python',
        'Power BI',
        'Excel',
        'Data Visualization',
        'Statistical Analysis',
        'Business Intelligence'
      ),
      'experience', jsonb_build_array(
        jsonb_build_object(
          'role', 'Data Analyst',
          'company', 'Insight Analytics Ltd',
          'location', 'Nairobi',
          'dates', '2021 – Present',
          'responsibilities', jsonb_build_array(
            'Analyzed large datasets to support business decision-making across 5 departments.',
            'Developed dashboards using Power BI to track KPIs and operational metrics.',
            'Automated reporting processes using Python scripts, saving 8 hours per week.'
          )
        ),
        jsonb_build_object(
          'role', 'Junior Data Analyst',
          'company', 'TechData Solutions',
          'location', 'Nairobi',
          'dates', '2019 – 2021',
          'responsibilities', jsonb_build_array(
            'Prepared reports and visualizations for senior management review.',
            'Maintained company data warehouse and ensured data integrity.',
            'Supported analytics projects across finance, sales, and operations departments.'
          )
        )
      ),
      'education', jsonb_build_array(
        jsonb_build_object(
          'degree', 'BSc Statistics',
          'institution', 'University of Nairobi',
          'dates', '2015 – 2019'
        )
      ),
      'certifications', jsonb_build_array(
        'Google Data Analytics Professional Certificate',
        'Microsoft Power BI Certification'
      ),
      'additional', jsonb_build_array(
        'Languages: English (Fluent), Swahili (Fluent)',
        'Volunteer Data Analyst – DataKind Kenya (2022 – Present)'
      )
    )
  ),
  false,
  true
);
