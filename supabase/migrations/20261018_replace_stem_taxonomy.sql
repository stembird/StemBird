-- Migration: Replace the Kenya-wide job taxonomy with the StemBird STEM taxonomy
-- New sets: 40 industries, 47 job functions (full replacement).
-- Idempotent: safe to re-run. Apply via Supabase Dashboard SQL Editor.

BEGIN;

-- ============================================================================
-- 1. ADD NEW LOOKUP ROWS (existing exact-name rows are kept as-is)
-- ============================================================================

-- Industries (STEM)
INSERT INTO public.industries (name, slug)
VALUES
  ('Agriculture, Agribusiness & Agricultural Technology', 'agriculture-agribusiness-agricultural-technology'),
  ('Food & Beverage Manufacturing', 'food-beverage-manufacturing'),
  ('Chemicals, Paints, Polymers & Industrial Materials', 'chemicals-paints-polymers-industrial-materials'),
  ('Pharmaceuticals & Biotechnology', 'pharmaceuticals-biotechnology'),
  ('Healthcare, Hospitals & Medical Laboratories', 'healthcare-hospitals-medical-laboratories'),
  ('Manufacturing & Industrial Production', 'manufacturing-industrial-production'),
  ('Paper, Pulp & Packaging', 'paper-pulp-packaging'),
  ('Plastics, Rubber & Composites', 'plastics-rubber-composites'),
  ('Oil, Gas & Petrochemicals', 'oil-gas-petrochemicals'),
  ('Energy, Power & Renewable Energy', 'energy-power-renewable-energy'),
  ('Water, Wastewater & Water Treatment', 'water-wastewater-water-treatment'),
  ('Environmental Services & Conservation', 'environmental-services-conservation'),
  ('Mining, Geology & Mineral Processing', 'mining-geology-mineral-processing'),
  ('Construction, Infrastructure & Built Environment', 'construction-infrastructure-built-environment'),
  ('Electrical & Electronics Manufacturing', 'electrical-electronics-manufacturing'),
  ('Automotive & Transport Equipment', 'automotive-transport-equipment'),
  ('Aerospace & Defence', 'aerospace-defence'),
  ('Information Technology & Software', 'information-technology-software'),
  ('Telecommunications & Networking', 'telecommunications-networking'),
  ('Data, Artificial Intelligence & Analytics', 'data-artificial-intelligence-analytics'),
  ('Banking, Finance & Insurance', 'banking-finance-insurance'),
  ('Consulting & Professional Services', 'consulting-professional-services'),
  ('Scientific Research & Development', 'scientific-research-development'),
  ('Testing, Inspection, Certification & Calibration', 'testing-inspection-certification-calibration'),
  ('Schools & Secondary Education', 'schools-secondary-education'),
  ('Universities & Higher Education', 'universities-higher-education'),
  ('Technical & Vocational Education and Training (TVET)', 'technical-vocational-education-and-training-tvet'),
  ('STEM Training & Professional Development', 'stem-training-professional-development'),
  ('Educational Technology (EdTech)', 'educational-technology-edtech'),
  ('Government & Public Sector', 'government-public-sector'),
  ('NGOs, Development & International Organisations', 'ngos-development-international-organisations'),
  ('Logistics, Supply Chain & Distribution', 'logistics-supply-chain-distribution'),
  ('Consumer Goods & Retail', 'consumer-goods-retail'),
  ('Textiles, Apparel & Leather Manufacturing', 'textiles-apparel-leather-manufacturing'),
  ('Life Sciences & Biomedical Research', 'life-sciences-biomedical-research'),
  ('Laboratories & Scientific Services', 'laboratories-scientific-services'),
  ('Aviation & Aerospace Services', 'aviation-aerospace-services'),
  ('Real Estate & Facilities Management', 'real-estate-facilities-management'),
  ('Telecommunications Infrastructure', 'telecommunications-infrastructure'),
  ('Waste Management & Recycling', 'waste-management-recycling')
ON CONFLICT (name) DO NOTHING;

-- Job Functions (STEM)
INSERT INTO public.job_functions (name, slug)
VALUES
  ('Research & Development (R&D)', 'research-and-development-rd'),
  ('Analytical Chemistry', 'analytical-chemistry'),
  ('Laboratory Operations & Testing', 'laboratory-operations-testing'),
  ('Quality Control (QC)', 'quality-control-qc'),
  ('Quality Assurance & Quality Management', 'quality-assurance-quality-management'),
  ('Regulatory Affairs & Compliance', 'regulatory-affairs-compliance'),
  ('Product Development & Formulation', 'product-development-formulation'),
  ('Microbiology & Biotechnology', 'microbiology-biotechnology'),
  ('Clinical Research & Trials', 'clinical-research-trials'),
  ('Materials Science & Engineering', 'materials-science-engineering'),
  ('Food Science & Technology', 'food-science-technology'),
  ('Environmental Science & Management', 'environmental-science-management'),
  ('Geology, Geoscience & Mineral Exploration', 'geology-geoscience-mineral-exploration'),
  ('Agricultural Science & Technology', 'agricultural-science-technology'),
  ('Public Health Science & Epidemiology', 'public-health-science-epidemiology'),
  ('Biostatistics & Bioinformatics', 'biostatistics-bioinformatics'),
  ('Scientific Data Management', 'scientific-data-management'),
  ('Chemical & Process Engineering', 'chemical-process-engineering'),
  ('Industrial & Manufacturing Engineering', 'industrial-manufacturing-engineering'),
  ('Mechanical Engineering', 'mechanical-engineering'),
  ('Electrical & Electronics Engineering', 'electrical-electronics-engineering'),
  ('Civil & Structural Engineering', 'civil-structural-engineering'),
  ('Biomedical Engineering', 'biomedical-engineering'),
  ('Robotics, Mechatronics & Automation', 'robotics-mechatronics-automation'),
  ('Instrumentation, Control & Metrology', 'instrumentation-control-metrology'),
  ('Maintenance & Reliability Engineering', 'maintenance-reliability-engineering'),
  ('Production & Manufacturing Operations', 'production-manufacturing-operations'),
  ('Process Optimisation & Production Planning', 'process-optimisation-production-planning'),
  ('Health, Safety & Process Risk Management', 'health-safety-process-risk-management'),
  ('Energy Systems & Renewable Energy', 'energy-systems-renewable-energy'),
  ('Water & Wastewater Engineering', 'water-wastewater-engineering'),
  ('Mining & Mineral Processing', 'mining-mineral-processing'),
  ('Surveying & Geospatial Science', 'surveying-geospatial-science'),
  ('Software Development & Engineering', 'software-development-engineering'),
  ('IT Infrastructure, Systems & Support', 'it-infrastructure-systems-support'),
  ('Cybersecurity', 'cybersecurity'),
  ('Cloud Computing & DevOps', 'cloud-computing-devops'),
  ('Data Science, Analytics & Artificial Intelligence', 'data-science-analytics-artificial-intelligence'),
  ('Networking & Telecommunications', 'networking-telecommunications'),
  ('Mathematics, Statistics & Actuarial Science', 'mathematics-statistics-actuarial-science'),
  ('Operations Research & Optimisation', 'operations-research-optimisation'),
  ('Technical Support & Field Service', 'technical-support-field-service'),
  ('Technical Sales & Business Development', 'technical-sales-business-development'),
  ('Technical Procurement & Supply Chain', 'technical-procurement-supply-chain'),
  ('Technical Project Management & Operations', 'technical-project-management-operations'),
  ('STEM Education, Teaching & Curriculum Development', 'stem-education-teaching-curriculum-development'),
  ('Technical Training, Academic Research & Science Communication', 'technical-training-academic-research-science-communication')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. REMAP LEGACY CATEGORY TEXT ONTO THE NEW TAXONOMY (conservative mapping;
--    legacy values with no clear STEM equivalent are left untouched)
-- ============================================================================

CREATE TEMP TABLE industry_remap ON COMMIT DROP AS
SELECT * FROM (VALUES
  ('Agriculture, Fishing & Forestry',            'Agriculture, Agribusiness & Agricultural Technology'),
  ('Agriculture & Agribusiness',                 'Agriculture, Agribusiness & Agricultural Technology'),
  ('Food Services, Hospitality & Catering',      'Food & Beverage Manufacturing'),
  ('Chemical & Process Industry',                'Chemicals, Paints, Polymers & Industrial Materials'),
  ('Healthcare, Medical & Pharmaceutical',       'Healthcare, Hospitals & Medical Laboratories'),
  ('Health Tech & Biotechnology',                'Pharmaceuticals & Biotechnology'),
  ('Manufacturing & Warehousing',                'Manufacturing & Industrial Production'),
  ('Printing, Publishing & Packaging',           'Paper, Pulp & Packaging'),
  ('Mining, Oil & Gas',                          'Oil, Gas & Petrochemicals'),
  ('Energy, Utilities & Waste Management',       'Energy, Power & Renewable Energy'),
  ('Renewable Energy & Climate',                 'Energy, Power & Renewable Energy'),
  ('Environment & Natural Resources',            'Environmental Services & Conservation'),
  ('Building, Construction & Real Estate',       'Construction, Infrastructure & Built Environment'),
  ('Transport & Infrastructure',                 'Construction, Infrastructure & Built Environment'),
  ('Real Estate & Property Management',          'Real Estate & Facilities Management'),
  ('Automotive & Aviation',                      'Automotive & Transport Equipment'),
  ('Maritime & Shipping',                        'Logistics, Supply Chain & Distribution'),
  ('Logistics & Transportation',                 'Logistics, Supply Chain & Distribution'),
  ('Import & Export',                            'Logistics, Supply Chain & Distribution'),
  ('ICT & Telecommunications',                   'Information Technology & Software'),
  ('Education Technology (EdTech)',              'Educational Technology (EdTech)'),
  ('Research, Science & Technology',             'Scientific Research & Development'),
  ('Banking, Insurance & Financial Services',    'Banking, Finance & Insurance'),
  ('Accounting, Auditing & Finance',             'Banking, Finance & Insurance'),
  ('Financial Technology (FinTech)',             'Banking, Finance & Insurance'),
  ('Charity, NGO & Non-Profit',                  'NGOs, Development & International Organisations'),
  ('NGO, NPO & Charity',                         'NGOs, Development & International Organisations'),
  ('Community & Social Services',                'NGOs, Development & International Organisations'),
  ('Government & Public Administration',         'Government & Public Sector'),
  ('Retail, Wholesale, E-commerce & FMCG',       'Consumer Goods & Retail'),
  ('Fashion & Beauty',                           'Consumer Goods & Retail'),
  ('Security & Defence',                         'Aerospace & Defence'),
  ('Legal Services',                             'Consulting & Professional Services'),
  ('Business Process Outsourcing (BPO)',         'Consulting & Professional Services'),
  ('Human Resources & Recruitment',              'Consulting & Professional Services')
) AS m(old_name, new_name);

CREATE TEMP TABLE function_remap ON COMMIT DROP AS
SELECT * FROM (VALUES
  ('IT & Software',                              'Software Development & Engineering'),
  ('Data, Analytics & AI',                       'Data Science, Analytics & Artificial Intelligence'),
  ('Telecommunications',                         'Networking & Telecommunications'),
  ('Quality Control & Assurance',                'Quality Assurance & Quality Management'),
  ('Science & Laboratory',                       'Laboratory Operations & Testing'),
  ('Health & Safety',                            'Health, Safety & Process Risk Management'),
  ('Environment, Energy & Natural Resources',    'Environmental Science & Management'),
  ('Agriculture, Food & Natural Resources',      'Agricultural Science & Technology'),
  ('Research, Teaching & Training',              'Technical Training, Academic Research & Science Communication'),
  ('Education & Training',                       'STEM Education, Teaching & Curriculum Development'),
  ('Product & Project Management',               'Technical Project Management & Operations'),
  ('Manufacturing & Warehousing',                'Production & Manufacturing Operations'),
  ('Maintenance, Repair & Installation',         'Maintenance & Reliability Engineering'),
  ('Supply Chain & Procurement',                 'Technical Procurement & Supply Chain'),
  ('Customer Service & Support',                 'Technical Support & Field Service'),
  ('Sales',                                      'Technical Sales & Business Development'),
  ('Engineering & Technology',                   'Industrial & Manufacturing Engineering')
) AS m(old_name, new_name);

-- jobs.industry (single text, used by the listing filter)
UPDATE public.jobs j
SET industry = r.new_name
FROM industry_remap r
WHERE j.industry = r.old_name;

-- jobs.industries (text array) — replace mapped elements and de-dupe
UPDATE public.jobs j
SET industries = (
  SELECT array_agg(DISTINCT COALESCE(r.new_name, elem))
  FROM unnest(j.industries) AS elem
  LEFT JOIN industry_remap r ON r.old_name = elem
)
WHERE j.industries IS NOT NULL AND array_length(j.industries, 1) > 0;

-- companies.industry
UPDATE public.companies c
SET industry = r.new_name
FROM industry_remap r
WHERE c.industry = r.old_name;

-- jobs.job_function (single text, used by the listing filter)
UPDATE public.jobs j
SET job_function = r.new_name
FROM function_remap r
WHERE j.job_function = r.old_name;

-- jobs.job_functions (text array)
UPDATE public.jobs j
SET job_functions = (
  SELECT array_agg(DISTINCT COALESCE(r.new_name, elem))
  FROM unnest(j.job_functions) AS elem
  LEFT JOIN function_remap r ON r.old_name = elem
)
WHERE j.job_functions IS NOT NULL AND array_length(j.job_functions, 1) > 0;

-- Keep text arrays in sync with the single-text columns
UPDATE public.jobs
SET industries = ARRAY[industry]
WHERE industry IS NOT NULL
  AND (industries IS NULL OR array_length(industries, 1) IS NULL);

UPDATE public.jobs
SET job_functions = ARRAY[job_function]
WHERE job_function IS NOT NULL
  AND (job_functions IS NULL OR array_length(job_functions, 1) IS NULL);

-- ============================================================================
-- 3. DROP OLD LOOKUP ROWS NOT IN THE NEW TAXONOMY
--    (jobs.industry_id / jobs.job_function_id FKs are ON DELETE SET NULL)
-- ============================================================================

DELETE FROM public.industries
WHERE name NOT IN (
  'Agriculture, Agribusiness & Agricultural Technology',
  'Food & Beverage Manufacturing',
  'Chemicals, Paints, Polymers & Industrial Materials',
  'Pharmaceuticals & Biotechnology',
  'Healthcare, Hospitals & Medical Laboratories',
  'Manufacturing & Industrial Production',
  'Paper, Pulp & Packaging',
  'Plastics, Rubber & Composites',
  'Oil, Gas & Petrochemicals',
  'Energy, Power & Renewable Energy',
  'Water, Wastewater & Water Treatment',
  'Environmental Services & Conservation',
  'Mining, Geology & Mineral Processing',
  'Construction, Infrastructure & Built Environment',
  'Electrical & Electronics Manufacturing',
  'Automotive & Transport Equipment',
  'Aerospace & Defence',
  'Information Technology & Software',
  'Telecommunications & Networking',
  'Data, Artificial Intelligence & Analytics',
  'Banking, Finance & Insurance',
  'Consulting & Professional Services',
  'Scientific Research & Development',
  'Testing, Inspection, Certification & Calibration',
  'Schools & Secondary Education',
  'Universities & Higher Education',
  'Technical & Vocational Education and Training (TVET)',
  'STEM Training & Professional Development',
  'Educational Technology (EdTech)',
  'Government & Public Sector',
  'NGOs, Development & International Organisations',
  'Logistics, Supply Chain & Distribution',
  'Consumer Goods & Retail',
  'Textiles, Apparel & Leather Manufacturing',
  'Life Sciences & Biomedical Research',
  'Laboratories & Scientific Services',
  'Aviation & Aerospace Services',
  'Real Estate & Facilities Management',
  'Telecommunications Infrastructure',
  'Waste Management & Recycling'
);

DELETE FROM public.job_functions
WHERE name NOT IN (
  'Research & Development (R&D)',
  'Analytical Chemistry',
  'Laboratory Operations & Testing',
  'Quality Control (QC)',
  'Quality Assurance & Quality Management',
  'Regulatory Affairs & Compliance',
  'Product Development & Formulation',
  'Microbiology & Biotechnology',
  'Clinical Research & Trials',
  'Materials Science & Engineering',
  'Food Science & Technology',
  'Environmental Science & Management',
  'Geology, Geoscience & Mineral Exploration',
  'Agricultural Science & Technology',
  'Public Health Science & Epidemiology',
  'Biostatistics & Bioinformatics',
  'Scientific Data Management',
  'Chemical & Process Engineering',
  'Industrial & Manufacturing Engineering',
  'Mechanical Engineering',
  'Electrical & Electronics Engineering',
  'Civil & Structural Engineering',
  'Biomedical Engineering',
  'Robotics, Mechatronics & Automation',
  'Instrumentation, Control & Metrology',
  'Maintenance & Reliability Engineering',
  'Production & Manufacturing Operations',
  'Process Optimisation & Production Planning',
  'Health, Safety & Process Risk Management',
  'Energy Systems & Renewable Energy',
  'Water & Wastewater Engineering',
  'Mining & Mineral Processing',
  'Surveying & Geospatial Science',
  'Software Development & Engineering',
  'IT Infrastructure, Systems & Support',
  'Cybersecurity',
  'Cloud Computing & DevOps',
  'Data Science, Analytics & Artificial Intelligence',
  'Networking & Telecommunications',
  'Mathematics, Statistics & Actuarial Science',
  'Operations Research & Optimisation',
  'Technical Support & Field Service',
  'Technical Sales & Business Development',
  'Technical Procurement & Supply Chain',
  'Technical Project Management & Operations',
  'STEM Education, Teaching & Curriculum Development',
  'Technical Training, Academic Research & Science Communication'
);

-- ============================================================================
-- 4. REBUILD ID COLUMNS FROM CANONICAL NAMES (after the DELETE above)
-- ============================================================================

UPDATE public.jobs j
SET industry_ids = COALESCE(
  (SELECT array_agg(i.id ORDER BY i.id) FROM public.industries i WHERE i.name = ANY (j.industries)),
  '{}'
);

UPDATE public.jobs j
SET job_function_ids = COALESCE(
  (SELECT array_agg(f.id ORDER BY f.id) FROM public.job_functions f WHERE f.name = ANY (j.job_functions)),
  '{}'
);

UPDATE public.jobs j
SET industry_id = (SELECT i.id FROM public.industries i WHERE i.name = j.industry LIMIT 1);

UPDATE public.jobs j
SET job_function_id = (SELECT f.id FROM public.job_functions f WHERE f.name = j.job_function LIMIT 1);

COMMIT;
