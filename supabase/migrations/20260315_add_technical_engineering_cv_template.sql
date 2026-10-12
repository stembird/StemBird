-- Migration: Add Technical / Engineering CV Template
-- Description: Template designed for engineers, technicians, and manufacturing professionals
-- Typical users: Mechanical engineers, electrical engineers, civil engineers, plant operators,
--                production supervisors, process engineers, manufacturing professionals

DELETE FROM cv_templates WHERE name = 'Technical / Engineering CV';

INSERT INTO cv_templates (
  name,
  description,
  category,
  template_data,
  is_premium,
  is_active
) VALUES (
  'Technical / Engineering CV',
  'Designed for engineers, technicians, and manufacturing professionals. Two-column layout with a sidebar for technical skills, tools, and certifications. Main section highlights engineering projects, measurable outcomes, and structured work experience. Ideal for mechanical, electrical, civil, and process engineers.',
  'technical',
  jsonb_build_object(
    'component', 'TechnicalEngineeringTemplate',
    'sections', jsonb_build_array(
      'header',
      'summary',
      'skills',
      'tools',
      'certifications',
      'projects',
      'experience',
      'education'
    ),
    'features', jsonb_build_array(
      'Two-column layout with sidebar',
      'Technical skills sidebar',
      'Tools & systems section',
      'Key engineering projects with outcomes',
      'Measurable achievements',
      'Certifications display',
      'Structured work experience with responsibilities',
      'Clean professional typography'
    ),
    'sampleData', jsonb_build_object(
      'name', 'Samuel Kiprotich Cheruiyot',
      'title', 'Mechanical Engineer | Manufacturing Operations',
      'contact', jsonb_build_object(
        'location', 'Nairobi, Kenya',
        'phone', '+254 712 333 777',
        'email', 'samuel.cheruiyot@email.com',
        'linkedin', 'linkedin.com/in/samuel-cheruiyot'
      ),
      'summary', 'Mechanical engineer with 6 years of experience in manufacturing operations, equipment maintenance, and process optimization within large-scale production facilities.',
      'skills', jsonb_build_array(
        'Mechanical Systems Maintenance',
        'Preventive Maintenance Planning',
        'Production Line Optimization',
        'Root Cause Analysis',
        'Industrial Safety Compliance',
        'Process Improvement (Lean/Kaizen)'
      ),
      'tools', jsonb_build_array(
        'AutoCAD',
        'SolidWorks',
        'SAP PM',
        'PLC Systems',
        'Microsoft Excel'
      ),
      'certifications', jsonb_build_array(
        'Certified Maintenance Professional (CMP)',
        'Occupational Safety & Health Certificate'
      ),
      'projects', jsonb_build_array(
        jsonb_build_object(
          'title', 'Production Line Efficiency Improvement',
          'company', 'East Africa Packaging Ltd',
          'year', '2023',
          'description', 'Led a process improvement initiative that increased production efficiency by 18% through equipment optimization and preventive maintenance scheduling.'
        ),
        jsonb_build_object(
          'title', 'Machine Maintenance Program Overhaul',
          'company', 'Nairobi Steel Manufacturing',
          'year', '2022',
          'description', 'Designed and implemented a preventive maintenance program that reduced equipment downtime by 25%.'
        )
      ),
      'experience', jsonb_build_array(
        jsonb_build_object(
          'role', 'Mechanical Engineer',
          'company', 'East Africa Packaging Ltd',
          'location', 'Nairobi',
          'dates', '2022 – Present',
          'responsibilities', jsonb_build_array(
            'Oversee maintenance of 40+ production machines across 3 manufacturing lines',
            'Develop and execute preventive maintenance schedules using SAP PM',
            'Lead root cause analysis for recurring equipment failures'
          )
        ),
        jsonb_build_object(
          'role', 'Maintenance Engineer',
          'company', 'Nairobi Steel Manufacturing',
          'location', 'Nairobi',
          'dates', '2019 – 2022',
          'responsibilities', jsonb_build_array(
            'Managed mechanical maintenance for steel rolling and cutting equipment',
            'Supervised a team of 6 technicians on daily maintenance activities'
          )
        )
      ),
      'education', jsonb_build_array(
        jsonb_build_object(
          'degree', 'BSc Mechanical Engineering',
          'institution', 'Jomo Kenyatta University of Agriculture & Technology',
          'dates', '2014 – 2018'
        )
      )
    )
  ),
  false,
  true
);
