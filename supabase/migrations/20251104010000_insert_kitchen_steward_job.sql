-- Insert Kitchen Steward job at People FOCO
INSERT INTO public.jobs (
  title,
  company,
  location,
  location_town,
  county_id,
  description,
  responsibilities,
  qualifications,
  salary,
  salary_type,
  salary_visibility,
  apply_email,
  industry_id,
  job_function_id,
  education_level_id,
  experience_level_ref_id,
  minimum_experience,
  is_featured,
  additional_info,
  source
) VALUES (
  'Kitchen Steward',
  'People FOCO',
  'Nairobi',
  'Nairobi (CBD)',
  (SELECT id FROM public.counties WHERE name = 'Nairobi'),
  'The Kitchen Steward ensures cleanliness, sanitation, and proper organization of the kitchen, dishwashing area, equipment, and storage areas. The role supports smooth restaurant operations by maintaining high hygiene standards in line with food safety regulations.',
  '• Wash and sanitize dishes, cutlery, pots, pans, glassware, and utensils. • Clean kitchen equipment, work surfaces, storage areas, walk-in fridges, and floors. • Maintain cleanliness of back-of-house areas according to HACCP and food safety standards. • Dispose of garbage, sort recyclables, and ensure proper waste removal. • Operate and maintain dishwashing machines and cleaning tools. • Support chefs by providing clean equipment promptly. • Store clean equipment in designated areas. • Assist with basic food prep tasks when required. • Ensure service stations are stocked. • Report damaged or malfunctioning equipment. • Follow daily and weekly cleaning checklists. • Handle cleaning chemicals safely. • Adhere to grooming standards and wear PPE at all times.',
  'Minimum 1 year experience as steward/dishwasher/cleaner in a hotel or restaurant (fine dining experience is an added advantage). Knowledge of food safety & hygiene standards. Ability to work in a fast-paced kitchen environment. KCSE qualification.',
  'Confidential',
  'Monthly',
  'Hide',
  'recruitmenttrat@gmail.com',
  (SELECT id FROM public.industries WHERE name = 'Food Services, Hospitality & Catering'),
  (SELECT id FROM public.job_functions WHERE name = 'Food Services & Catering'),
  (SELECT id FROM public.education_levels WHERE name = 'KCSE'),
  (SELECT id FROM public.experience_levels WHERE name = 'Entry Level'),
  1,
  true,
  'Candidates should use the job title as the email subject when applying.',
  'Employer'
);




