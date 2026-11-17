-- Migration: Rebrand to StemBird & Update STEM Taxonomy (20 Industries, 36 Job Functions)
-- Date: 2026-11-18
-- Platform: StemBird (stembird.com)
-- Scope: STEM Careers (Science & Healthcare, Technology, Engineering & Architecture, Mathematics)
--
-- Replaces previous taxonomy with:
--   - 20 canonical STEM industries
--   - 36 canonical STEM job functions
-- Rebrands site_settings, site_name, and updates existing jobs.

BEGIN;

-- ============================================================================
-- 1. UPDATE SITE SETTINGS
-- ============================================================================

ALTER TABLE IF EXISTS public.site_settings
  ALTER COLUMN site_name SET DEFAULT 'StemBird';

UPDATE public.site_settings
SET site_name = 'StemBird'
WHERE site_name IS NULL OR site_name ILIKE '%chemistrylens%' OR site_name ILIKE '%careersasa%';

-- ============================================================================
-- 2. INSERT 20 CANONICAL STEM INDUSTRIES
-- ============================================================================

INSERT INTO public.industries (name, slug)
VALUES
  ('Science & Research',                           'science-and-research'),
  ('Healthcare & Medical Sciences',               'healthcare-and-medical-sciences'),
  ('Pharmaceuticals & Biotechnology',             'pharmaceuticals-and-biotechnology'),
  ('Agriculture & Food Science',                  'agriculture-and-food-science'),
  ('Chemicals & Chemical Manufacturing',          'chemicals-and-chemical-manufacturing'),
  ('Manufacturing & Industrial Processing',       'manufacturing-and-industrial-processing'),
  ('Energy, Oil & Gas',                           'energy-oil-and-gas'),
  ('Environmental & Natural Sciences',            'environmental-and-natural-sciences'),
  ('Information Technology & Software',           'information-technology-and-software'),
  ('Telecommunications & Networking',             'telecommunications-and-networking'),
  ('Data Science & Artificial Intelligence',      'data-science-and-artificial-intelligence'),
  ('Engineering & Construction',                  'engineering-and-construction'),
  ('Architecture & Urban Planning',               'architecture-and-urban-planning'),
  ('Mining, Geology & Earth Sciences',            'mining-geology-and-earth-sciences'),
  ('Water, Sanitation & Waste Management',        'water-sanitation-and-waste-management'),
  ('Mathematics, Statistics & Actuarial Science', 'mathematics-statistics-and-actuarial-science'),
  ('Education & STEM Training',                   'education-and-stem-training'),
  ('Aerospace & Aviation',                        'aerospace-and-aviation'),
  ('Automotive & Transport Technology',           'automotive-and-transport-technology'),
  ('Electronics & Electrical Equipment',          'electronics-and-electrical-equipment')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. INSERT 36 CANONICAL STEM JOB FUNCTIONS
-- ============================================================================

INSERT INTO public.job_functions (name, slug)
VALUES
  ('Research & Development',                      'research-and-development'),
  ('Laboratory & Scientific Analysis',            'laboratory-and-scientific-analysis'),
  ('Clinical & Medical Practice',                 'clinical-and-medical-practice'),
  ('Nursing & Patient Care',                      'nursing-and-patient-care'),
  ('Medical Laboratory & Diagnostics',            'medical-laboratory-and-diagnostics'),
  ('Pharmaceutical & Drug Development',           'pharmaceutical-and-drug-development'),
  ('Quality Assurance & Quality Control',         'quality-assurance-and-quality-control'),
  ('Production & Manufacturing',                  'production-and-manufacturing'),
  ('Process Engineering & Operations',            'process-engineering-and-operations'),
  ('Chemical Engineering & Processing',           'chemical-engineering-and-processing'),
  ('Mechanical Engineering',                      'mechanical-engineering'),
  ('Electrical & Electronics Engineering',        'electrical-and-electronics-engineering'),
  ('Civil & Structural Engineering',              'civil-and-structural-engineering'),
  ('Software Development & Programming',          'software-development-and-programming'),
  ('IT Support & Systems Administration',         'it-support-and-systems-administration'),
  ('Cybersecurity & Information Security',        'cybersecurity-and-information-security'),
  ('Data Science & Analytics',                    'data-science-and-analytics'),
  ('Artificial Intelligence & Machine Learning',  'artificial-intelligence-and-machine-learning'),
  ('Telecommunications & Network Engineering',    'telecommunications-and-network-engineering'),
  ('Architecture & Design',                       'architecture-and-design'),
  ('Surveying, GIS & Geospatial Analysis',        'surveying-gis-and-geospatial-analysis'),
  ('Environmental Management & Sustainability',   'environmental-management-and-sustainability'),
  ('Occupational Health, Safety & EHS',           'occupational-health-safety-and-ehs'),
  ('Agriculture & Agronomy',                      'agriculture-and-agronomy'),
  ('Food Science & Technology',                   'food-science-and-technology'),
  ('Biotechnology & Microbiology',                'biotechnology-and-microbiology'),
  ('Mathematics, Statistics & Actuarial Analysis', 'mathematics-statistics-and-actuarial-analysis'),
  ('Instrumentation, Automation & Control',       'instrumentation-automation-and-control'),
  ('Technical Maintenance & Reliability',         'technical-maintenance-and-reliability'),
  ('Energy & Renewable Energy Engineering',       'energy-and-renewable-energy-engineering'),
  ('Mining & Mineral Processing',                 'mining-and-mineral-processing'),
  ('Water Treatment & Wastewater Management',     'water-treatment-and-wastewater-management'),
  ('Technical Sales & Applications Engineering',  'technical-sales-and-applications-engineering'),
  ('STEM Education, Training & Instruction',      'stem-education-training-and-instruction'),
  ('Technical Project Management',                'technical-project-management'),
  ('Regulatory Affairs & Compliance',             'regulatory-affairs-and-compliance')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 4. MIGRATE EXISTING JOBS TO NEW CANONICAL TAXONOMY
-- ============================================================================

-- Industries
UPDATE public.jobs SET industry = 'Chemicals & Chemical Manufacturing', industries = ARRAY['Chemicals & Chemical Manufacturing']
WHERE industry IN ('Industrial & Basic Chemicals', 'Paints, Coatings, Adhesives & Sealants', 'Polymers, Plastics & Rubber', 'Personal Care, Cosmetics & Fragrances', 'Chemicals, Paints, Polymers & Industrial Materials', 'Chemical & Process Engineering Consultancy');

UPDATE public.jobs SET industry = 'Agriculture & Food Science', industries = ARRAY['Agriculture & Food Science']
WHERE industry IN ('Fertilizers & Agrochemicals', 'Food, Beverage & Brewery Laboratories', 'Food & Beverage Manufacturing', 'Tea, Coffee & Horticulture Post-Harvest Processing', 'Agriculture, Agribusiness & Agricultural Technology');

UPDATE public.jobs SET industry = 'Pharmaceuticals & Biotechnology', industries = ARRAY['Pharmaceuticals & Biotechnology']
WHERE industry IN ('Pharmaceuticals & Drug Manufacturing', 'Biotechnology & Life Sciences', 'Life Sciences & Biomedical Research', 'Pharmaceuticals & Biotechnology');

UPDATE public.jobs SET industry = 'Healthcare & Medical Sciences', industries = ARRAY['Healthcare & Medical Sciences']
WHERE industry IN ('Clinical Chemistry & Medical Laboratory Services', 'Healthcare, Hospitals & Medical Laboratories', 'Development Organisations & NGO Laboratory Programmes');

UPDATE public.jobs SET industry = 'Science & Research', industries = ARRAY['Science & Research']
WHERE industry IN ('Forensic & Toxicology Laboratories', 'Scientific Research & R&D Institutions', 'Scientific Research & Development', 'Testing, Inspection, Certification & Calibration', 'Laboratory & Scientific Supply Services', 'Laboratories & Scientific Services', 'Regulatory, Standards & Public Health Authorities');

UPDATE public.jobs SET industry = 'Energy, Oil & Gas', industries = ARRAY['Energy, Oil & Gas']
WHERE industry IN ('Petrochemicals, Refining & Fuels', 'Oil, Gas & Petrochemicals', 'Energy, Power & Utilities', 'Energy, Power & Renewable Energy');

UPDATE public.jobs SET industry = 'Manufacturing & Industrial Processing', industries = ARRAY['Manufacturing & Industrial Processing']
WHERE industry IN ('Chemicals-Driven Manufacturing & Industrial Production', 'Manufacturing & Industrial Production', 'Paper, Pulp & Packaging', 'Textiles, Apparel & Leather Manufacturing');

UPDATE public.jobs SET industry = 'Water, Sanitation & Waste Management', industries = ARRAY['Water, Sanitation & Waste Management']
WHERE industry IN ('Water Supply & Treatment', 'Wastewater & Effluent Management', 'Water, Wastewater & Water Treatment', 'Waste Management & Recycling');

UPDATE public.jobs SET industry = 'Environmental & Natural Sciences', industries = ARRAY['Environmental & Natural Sciences']
WHERE industry IN ('Environmental Consulting, EIA & Air Quality', 'Environmental Services & Conservation');

UPDATE public.jobs SET industry = 'Mining, Geology & Earth Sciences', industries = ARRAY['Mining, Geology & Earth Sciences']
WHERE industry IN ('Mining, Geology & Assay Laboratories', 'Mineral Processing & Hydrometallurgy', 'Mining, Geology & Mineral Processing');

UPDATE public.jobs SET industry = 'Engineering & Construction', industries = ARRAY['Engineering & Construction']
WHERE industry IN ('Building & Construction Materials Chemistry', 'Construction, Infrastructure & Built Environment');

UPDATE public.jobs SET industry = 'Education & STEM Training', industries = ARRAY['Education & STEM Training']
WHERE industry IN ('Education & Training — Schools', 'Education & Training — Universities, TVET & Professional', 'Schools & Secondary Education', 'Universities & Higher Education', 'Technical & Vocational Education and Training (TVET)', 'STEM Training & Professional Development');

UPDATE public.jobs SET industry = 'Electronics & Electrical Equipment', industries = ARRAY['Electronics & Electrical Equipment']
WHERE industry IN ('Electrical & Electronics Manufacturing');

UPDATE public.jobs SET industry = 'Automotive & Transport Technology', industries = ARRAY['Automotive & Transport Technology']
WHERE industry IN ('Automotive & Transport Equipment');

UPDATE public.jobs SET industry = 'Aerospace & Aviation', industries = ARRAY['Aerospace & Aviation']
WHERE industry IN ('Aerospace & Defence', 'Aviation & Aerospace Services');

-- Job Functions
UPDATE public.jobs SET job_function = 'Laboratory & Scientific Analysis', job_functions = ARRAY['Laboratory & Scientific Analysis']
WHERE job_function IN ('Analytical & Instrumental Chemistry', 'Analytical Chemistry', 'Laboratory Operations & Management', 'Laboratory Operations & Testing', 'Laboratory Technician & Sample Handling', 'Forensic & Toxicology Analysis', 'Metrology, Calibration & Lab Accreditation (ISO 17025)');

UPDATE public.jobs SET job_function = 'Biotechnology & Microbiology', job_functions = ARRAY['Biotechnology & Microbiology']
WHERE job_function IN ('Microbiology & Molecular Analysis (Product/Quality)', 'Microbiology & Biotechnology');

UPDATE public.jobs SET job_function = 'Research & Development', job_functions = ARRAY['Research & Development']
WHERE job_function IN ('Method Development & Validation', 'Research & Development (R&D)');

UPDATE public.jobs SET job_function = 'Clinical & Medical Practice', job_functions = ARRAY['Clinical & Medical Practice']
WHERE job_function IN ('Clinical Research & Trials (Chemistry-Relevant)', 'Clinical Research & Trials', 'Public Health Science & Epidemiology');

UPDATE public.jobs SET job_function = 'Pharmaceutical & Drug Development', job_functions = ARRAY['Pharmaceutical & Drug Development']
WHERE job_function IN ('Formulation & Product Development', 'Product Development & Formulation');

UPDATE public.jobs SET job_function = 'Chemical Engineering & Processing', job_functions = ARRAY['Chemical Engineering & Processing']
WHERE job_function IN ('Chemical & Process Engineering', 'Materials & Polymer Science', 'Materials Science & Engineering');

UPDATE public.jobs SET job_function = 'Process Engineering & Operations', job_functions = ARRAY['Process Engineering & Operations']
WHERE job_function IN ('Process Operations & Plant Optimisation', 'Process Optimisation & Production Planning');

UPDATE public.jobs SET job_function = 'Production & Manufacturing', job_functions = ARRAY['Production & Manufacturing']
WHERE job_function IN ('Production & Plant Operations Management', 'Production & Manufacturing Operations', 'Industrial & Manufacturing Engineering');

UPDATE public.jobs SET job_function = 'Mining & Mineral Processing', job_functions = ARRAY['Mining & Mineral Processing']
WHERE job_function IN ('Mining, Assay & Mineral Processing', 'Geology, Geoscience & Mineral Exploration');

UPDATE public.jobs SET job_function = 'Energy & Renewable Energy Engineering', job_functions = ARRAY['Energy & Renewable Energy Engineering']
WHERE job_function IN ('Energy & Utilities Process', 'Energy Systems & Renewable Energy');

UPDATE public.jobs SET job_function = 'Water Treatment & Wastewater Management', job_functions = ARRAY['Water Treatment & Wastewater Management']
WHERE job_function IN ('Water & Wastewater Treatment Operations', 'Water & Wastewater Engineering');

UPDATE public.jobs SET job_function = 'Quality Assurance & Quality Control', job_functions = ARRAY['Quality Assurance & Quality Control']
WHERE job_function IN ('Quality Control (QC)', 'Quality Assurance & QMS', 'Quality Assurance & Quality Management');

UPDATE public.jobs SET job_function = 'Instrumentation, Automation & Control', job_functions = ARRAY['Instrumentation, Automation & Control']
WHERE job_function IN ('Instrumentation & Control', 'Instrumentation, Control & Metrology', 'Robotics, Mechatronics & Automation');

UPDATE public.jobs SET job_function = 'Technical Maintenance & Reliability', job_functions = ARRAY['Technical Maintenance & Reliability']
WHERE job_function IN ('Maintenance & Reliability Engineering');

UPDATE public.jobs SET job_function = 'Occupational Health, Safety & EHS', job_functions = ARRAY['Occupational Health, Safety & EHS']
WHERE job_function IN ('HSE & Process Safety', 'Health, Safety & Process Risk Management');

UPDATE public.jobs SET job_function = 'Technical Sales & Applications Engineering', job_functions = ARRAY['Technical Sales & Applications Engineering']
WHERE job_function IN ('Technical Sales & Business Development (Chemistry)', 'Technical Sales & Business Development', 'Applications, Technical Support & Field Service');

UPDATE public.jobs SET job_function = 'Technical Project Management', job_functions = ARRAY['Technical Project Management']
WHERE job_function IN ('Procurement, Warehousing & Supply Chain (Lab/Chemical)', 'Technical Procurement & Supply Chain', 'Technical Project Management & Operations');

UPDATE public.jobs SET job_function = 'IT Support & Systems Administration', job_functions = ARRAY['IT Support & Systems Administration']
WHERE job_function IN ('Laboratory Information Systems (LIMS) & Informatics', 'Technical Support & Field Service', 'IT Infrastructure, Systems & Support');

UPDATE public.jobs SET job_function = 'Data Science & Analytics', job_functions = ARRAY['Data Science & Analytics']
WHERE job_function IN ('Cheminformatics & Computational Chemistry', 'Chemometrics, Data Science & Statistics for Lab Systems', 'Data Science, Analytics & Artificial Intelligence', 'Biostatistics & Bioinformatics', 'Scientific Data Management');

UPDATE public.jobs SET job_function = 'STEM Education, Training & Instruction', job_functions = ARRAY['STEM Education, Training & Instruction']
WHERE job_function IN ('Chemistry Teaching, Training & Science Communication', 'STEM Education, Teaching & Curriculum Development', 'Technical Training, Academic Research & Science Communication');

UPDATE public.jobs SET job_function = 'Mathematics, Statistics & Actuarial Analysis', job_functions = ARRAY['Mathematics, Statistics & Actuarial Analysis']
WHERE job_function IN ('Mathematics, Statistics & Actuarial Science', 'Operations Research & Optimisation');

UPDATE public.jobs SET job_function = 'Software Development & Programming', job_functions = ARRAY['Software Development & Programming']
WHERE job_function IN ('Software Development & Engineering', 'Cloud Computing & DevOps');

UPDATE public.jobs SET job_function = 'Telecommunications & Network Engineering', job_functions = ARRAY['Telecommunications & Network Engineering']
WHERE job_function IN ('Networking & Telecommunications');

UPDATE public.jobs SET job_function = 'Environmental Management & Sustainability', job_functions = ARRAY['Environmental Management & Sustainability']
WHERE job_function IN ('Environmental Science & Management');

UPDATE public.jobs SET job_function = 'Agriculture & Agronomy', job_functions = ARRAY['Agriculture & Agronomy']
WHERE job_function IN ('Agricultural Science & Technology');

UPDATE public.jobs SET job_function = 'Civil & Structural Engineering', job_functions = ARRAY['Civil & Structural Engineering']
WHERE job_function IN ('Civil & Structural Engineering');

UPDATE public.jobs SET job_function = 'Mechanical Engineering', job_functions = ARRAY['Mechanical Engineering']
WHERE job_function IN ('Mechanical Engineering');

UPDATE public.jobs SET job_function = 'Electrical & Electronics Engineering', job_functions = ARRAY['Electrical & Electronics Engineering']
WHERE job_function IN ('Electrical & Electronics Engineering');

UPDATE public.jobs SET job_function = 'Cybersecurity & Information Security', job_functions = ARRAY['Cybersecurity & Information Security']
WHERE job_function IN ('Cybersecurity');

UPDATE public.jobs SET job_function = 'Surveying, GIS & Geospatial Analysis', job_functions = ARRAY['Surveying, GIS & Geospatial Analysis']
WHERE job_function IN ('Surveying & Geospatial Science');

UPDATE public.jobs SET job_function = 'Medical Laboratory & Diagnostics', job_functions = ARRAY['Medical Laboratory & Diagnostics']
WHERE job_function IN ('Biomedical Engineering');

COMMIT;
