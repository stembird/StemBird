-- Migration: Add Academic / Research CV Template
-- Description: Template designed for academics, researchers, PhD applicants, and fellowship seekers
-- Typical users: University lecturers, researchers, PhD candidates, postdocs, grant applicants

DELETE FROM cv_templates WHERE name = 'Academic / Research CV';

INSERT INTO cv_templates (
  name,
  description,
  category,
  template_data,
  is_premium,
  is_active
) VALUES (
  'Academic / Research CV',
  'Designed for academics, researchers, and PhD applicants. Highlights research interests, publications, conference presentations, teaching positions, grants, and academic achievements. Single-column serif layout optimised for credibility and content density.',
  'academic',
  jsonb_build_object(
    'component', 'AcademicTemplate',
    'sections', jsonb_build_array(
      'header',
      'profile',
      'researchInterests',
      'positions',
      'publications',
      'conferences',
      'education',
      'grants',
      'awards'
    ),
    'features', jsonb_build_array(
      'Single-column serif layout',
      'Research interests section',
      'Academic positions with department',
      'Numbered publications list',
      'Conferences and presentations',
      'Grants and funding section',
      'Awards and honours',
      'ORCID and ResearchGate links',
      'Thesis title display'
    ),
    'sampleData', jsonb_build_object(
      'name', 'Dr. Daniel Mwangi Njoroge',
      'title', 'Senior Lecturer – Department of Environmental Science',
      'contact', jsonb_build_object(
        'institution', 'University of Nairobi',
        'location', 'Nairobi, Kenya',
        'email', 'daniel.njoroge@uonbi.ac.ke',
        'phone', '+254 722 100 200',
        'orcid', 'orcid.org/0000-0002-1234-5678'
      ),
      'profile', 'Environmental scientist with over 12 years of research and teaching experience focusing on climate change adaptation and sustainable land management in East Africa. Published author of 15+ peer-reviewed articles and recipient of three national research grants.',
      'researchInterests', jsonb_build_array(
        'Climate Change Adaptation in Sub-Saharan Africa',
        'Sustainable Agriculture and Food Security',
        'Environmental Policy and Governance',
        'Land Degradation and Ecological Restoration'
      ),
      'positions', jsonb_build_array(
        jsonb_build_object(
          'role', 'Senior Lecturer',
          'institution', 'University of Nairobi',
          'department', 'Department of Environmental Science',
          'location', 'Nairobi, Kenya',
          'dates', '2018 – Present'
        ),
        jsonb_build_object(
          'role', 'Lecturer',
          'institution', 'Egerton University',
          'department', 'Department of Natural Resources',
          'location', 'Nakuru, Kenya',
          'dates', '2014 – 2018'
        )
      ),
      'publications', jsonb_build_array(
        'Njoroge, D.M. (2023). Climate Adaptation Strategies for Smallholder Farmers in Kenya. Journal of Environmental Studies, 45(3), 112–128.',
        'Njoroge, D.M. & Kamau, P. (2021). Land Restoration Techniques in Semi-Arid Regions of East Africa. African Environmental Review, 18(2), 45–62.',
        'Njoroge, D.M. (2019). Sustainable Agriculture Practices in Kenya. International Journal of Climate Research, 12(4), 78–95.'
      ),
      'conferences', jsonb_build_array(
        'International Climate Change Conference – Nairobi, Kenya (2024) – Keynote Presenter',
        'African Environmental Research Forum – Kigali, Rwanda (2022) – Paper Presenter',
        'Sustainable Agriculture Summit – Addis Ababa, Ethiopia (2021) – Panel Discussant'
      ),
      'education', jsonb_build_array(
        jsonb_build_object(
          'degree', 'PhD Environmental Science',
          'institution', 'University of Nairobi',
          'thesis', 'Thesis: Climate Variability and Adaptive Strategies Among Pastoral Communities in Northern Kenya',
          'dates', '2010 – 2014'
        ),
        jsonb_build_object(
          'degree', 'MSc Environmental Management',
          'institution', 'Kenyatta University',
          'dates', '2007 – 2009'
        )
      ),
      'grants', jsonb_build_array(
        'Principal Investigator – NEMA Research Grant: "Ecosystem Restoration in Degraded Drylands" (KES 4.5M, 2022–2024)',
        'Co-Investigator – IDRC Climate Adaptation Fund (USD 120,000, 2020–2022)'
      ),
      'awards', jsonb_build_array(
        'Best Research Paper Award – African Environmental Research Forum (2022)',
        'University of Nairobi Excellence in Teaching Award (2021)',
        'Young Scientist Award – Kenya National Academy of Sciences (2018)'
      )
    )
  ),
  false,
  true
);
