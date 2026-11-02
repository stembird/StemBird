-- Migration: Chemistry Lens taxonomy v1.1
-- Replaces the StemBird STEM taxonomy (40 industries, 47 job functions) with
-- the Chemistry Lens hub taxonomy (27 active industries + 2 reserved,
-- 29 active job functions + 2 reserved).
--
-- Doctrine: "Chemistry is the subject. Industry is the application. Careers
-- are the opportunity." Deprecated industries (banking, ICT, telecoms, real
-- estate, general logistics, consumer retail, pure agriculture, textiles,
-- automotive, aerospace, general construction, etc.) are nulled out so the
-- re-enrich pass can pick a chemistry-relevant value or leave the job
-- uncategorised — never force a wrong tag.
--
-- Idempotent: safe to re-run. Apply via Supabase Dashboard SQL Editor or
--   npx supabase db push.
--
-- Companion code changes:
--   - src/lib/chemistryLens.taxonomy.ts (canonical lists)
--   - src/lib/jobParseNormalization.ts (FALLBACK_* re-sourced)
--   - src/lib/chemistryRelevance.ts (new publication gate)
--   - src/lib/scrapeProcess.ts / scrapePublish.ts (gate wired)
--   - src/lib/jobIndustryModel.ts (portrait map)
--   - src/lib/companyIndustryInference.ts (returns null for out-of-scope)

BEGIN;

-- ============================================================================
-- 1. ADD NEW LOOKUP ROWS (existing exact-name rows are kept as-is via ON CONFLICT)
-- ============================================================================

INSERT INTO public.industries (name, slug)
VALUES
  -- S1 Chemicals & Advanced Materials
  ('Industrial & Basic Chemicals',                                        'industrial-and-basic-chemicals'),
  ('Fertilizers & Agrochemicals',                                         'fertilizers-and-agrochemicals'),
  ('Paints, Coatings, Adhesives & Sealants',                              'paints-coatings-adhesives-and-sealants'),
  ('Polymers, Plastics & Rubber',                                         'polymers-plastics-and-rubber'),
  ('Personal Care, Cosmetics & Fragrances',                               'personal-care-cosmetics-and-fragrances'),
  ('Petrochemicals, Refining & Fuels',                                    'petrochemicals-refining-and-fuels'),
  ('Building & Construction Materials Chemistry',                        'building-and-construction-materials-chemistry'),
  -- S2 Pharmaceutical, Biochemical & Laboratory Sciences
  ('Pharmaceuticals & Drug Manufacturing',                                'pharmaceuticals-and-drug-manufacturing'),
  ('Biotechnology & Life Sciences',                                       'biotechnology-and-life-sciences'),
  ('Clinical Chemistry & Medical Laboratory Services',                    'clinical-chemistry-and-medical-laboratory-services'),
  ('Forensic & Toxicology Laboratories',                                  'forensic-and-toxicology-laboratories'),
  -- S3 Energy, Process & Manufacturing
  ('Food, Beverage & Brewery Laboratories',                                'food-beverage-and-brewery-laboratories'),
  ('Energy, Power & Utilities',                                           'energy-power-and-utilities'),
  ('Chemicals-Driven Manufacturing & Industrial Production',              'chemicals-driven-manufacturing-and-industrial-production'),
  ('Tea, Coffee & Horticulture Post-Harvest Processing',                  'tea-coffee-and-horticulture-post-harvest-processing'),
  -- S4 Environment, Water & Waste
  ('Water Supply & Treatment',                                            'water-supply-and-treatment'),
  ('Wastewater & Effluent Management',                                    'wastewater-and-effluent-management'),
  ('Environmental Consulting, EIA & Air Quality',                          'environmental-consulting-eia-and-air-quality'),
  ('Waste Management & Recycling',                                        'waste-management-and-recycling'),
  -- S5 Mining, Minerals & Resource Processing
  ('Mining, Geology & Assay Laboratories',                                'mining-geology-and-assay-laboratories'),
  ('Mineral Processing & Hydrometallurgy',                                'mineral-processing-and-hydrometallurgy'),
  -- S6 Research, Regulation & Public Interest
  ('Scientific Research & R&D Institutions',                              'scientific-research-and-rd-institutions'),
  ('Regulatory, Standards & Public Health Authorities',                    'regulatory-standards-and-public-health-authorities'),
  ('Development Organisations & NGO Laboratory Programmes',                'development-organisations-and-ngo-laboratory-programmes'),
  -- S7 Testing, Science Services & Skills
  ('Testing, Inspection, Certification & Calibration',                     'testing-inspection-certification-and-calibration'),
  ('Laboratory & Scientific Supply Services',                              'laboratory-and-scientific-supply-services'),
  ('Chemical & Process Engineering Consultancy',                            'chemical-and-process-engineering-consultancy'),
  ('Education & Training — Schools',                                        'education-and-training-schools'),
  ('Education & Training — Universities, TVET & Professional',              'education-and-training-universities-tvet-and-professional')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.job_functions (name, slug)
VALUES
  -- F1 Laboratory & Analytical Sciences
  ('Analytical & Instrumental Chemistry',                                   'analytical-and-instrumental-chemistry'),
  ('Laboratory Operations & Management',                                    'laboratory-operations-and-management'),
  ('Laboratory Technician & Sample Handling',                               'laboratory-technician-and-sample-handling'),
  ('Microbiology & Molecular Analysis (Product/Quality)',                    'microbiology-and-molecular-analysis'),
  ('Forensic & Toxicology Analysis',                                         'forensic-and-toxicology-analysis'),
  ('Method Development & Validation',                                        'method-development-and-validation'),
  -- F2 Research & Development
  ('Research & Development (R&D)',                                           'research-and-development-rd'),
  ('Clinical Research & Trials (Chemistry-Relevant)',                        'clinical-research-and-trials'),
  -- F3 Process, Production & Engineering
  ('Formulation & Product Development',                                      'formulation-and-product-development'),
  ('Chemical & Process Engineering',                                         'chemical-and-process-engineering'),
  ('Process Operations & Plant Optimisation',                                'process-operations-and-plant-optimisation'),
  ('Production & Plant Operations Management',                                'production-and-plant-operations-management'),
  ('Materials & Polymer Science',                                            'materials-and-polymer-science'),
  ('Mining, Assay & Mineral Processing',                                     'mining-assay-and-mineral-processing'),
  ('Energy & Utilities Process',                                             'energy-and-utilities-process'),
  ('Water & Wastewater Treatment Operations',                                'water-and-wastewater-treatment-operations'),
  -- F4 Quality, Compliance & Regulation
  ('Quality Control (QC)',                                                   'quality-control-qc'),
  ('Quality Assurance & QMS',                                                'quality-assurance-and-qms'),
  ('Regulatory Affairs & Compliance',                                        'regulatory-affairs-and-compliance'),
  ('Metrology, Calibration & Lab Accreditation (ISO 17025)',                  'metrology-calibration-and-lab-accreditation'),
  -- F5 Engineering Support, Safety & Maintenance
  ('Instrumentation & Control',                                              'instrumentation-and-control'),
  ('Maintenance & Reliability Engineering',                                  'maintenance-and-reliability-engineering'),
  ('HSE & Process Safety',                                                   'hse-and-process-safety'),
  -- F6 Commercial, Service & Supply Chain
  ('Technical Sales & Business Development (Chemistry)',                      'technical-sales-and-business-development'),
  ('Applications, Technical Support & Field Service',                        'applications-technical-support-and-field-service'),
  ('Procurement, Warehousing & Supply Chain (Lab/Chemical)',                 'procurement-warehousing-and-supply-chain'),
  -- F7 Digital Science & Data
  ('Laboratory Information Systems (LIMS) & Informatics',                     'laboratory-information-systems-and-informatics'),
  ('Cheminformatics & Computational Chemistry',                              'cheminformatics-and-computational-chemistry'),
  ('Chemometrics, Data Science & Statistics for Lab Systems',                 'chemometrics-data-science-and-statistics'),
  -- F8 Education & Cross-Functional
  ('Chemistry Teaching, Training & Science Communication',                    'chemistry-teaching-training-and-science-communication'),
  ('Technical Project Management',                                            'technical-project-management')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. REMAP LEGACY CATEGORY TEXT ONTO THE NEW CHEMISTRY LENS TAXONOMY
--    Where an old industry/function was split, this chooses the most
--    general/likely new target for the single-text column; array columns
--    are also reduced to one deterministic entry per split to avoid
--    inflating counts. Ambiguous cases will be re-tagged by the AI enricher
--    on the next pass.
-- ============================================================================

CREATE TEMP TABLE industry_remap ON COMMIT DROP AS
SELECT * FROM (VALUES
  -- Direct renames
  ('Food & Beverage Manufacturing',                     'Food, Beverage & Brewery Laboratories'),
  ('Plastics, Rubber & Composites',                     'Polymers, Plastics & Rubber'),
  ('Oil, Gas & Petrochemicals',                         'Petrochemicals, Refining & Fuels'),
  ('Energy, Power & Renewable Energy',                  'Energy, Power & Utilities'),
  ('Environmental Services & Conservation',             'Environmental Consulting, EIA & Air Quality'),
  ('Scientific Research & Development',                 'Scientific Research & R&D Institutions'),
  ('Healthcare, Hospitals & Medical Laboratories',      'Clinical Chemistry & Medical Laboratory Services'),
  ('Manufacturing & Industrial Production',             'Chemicals-Driven Manufacturing & Industrial Production'),
  ('Testing, Inspection, Certification & Calibration',  'Testing, Inspection, Certification & Calibration'),
  ('Waste Management & Recycling',                      'Waste Management & Recycling'),

  -- Splits → most general target (AI re-enrich refines)
  ('Chemicals, Paints, Polymers & Industrial Materials','Industrial & Basic Chemicals'),
  ('Pharmaceuticals & Biotechnology',                   'Pharmaceuticals & Drug Manufacturing'),
  ('Water, Wastewater & Water Treatment',               'Water Supply & Treatment'),
  ('Mining, Geology & Mineral Processing',              'Mining, Geology & Assay Laboratories'),
  ('Laboratories & Scientific Services',                'Laboratory & Scientific Supply Services'),

  -- Merges
  ('Life Sciences & Biomedical Research',               'Biotechnology & Life Sciences'),
  ('Universities & Higher Education',                   'Education & Training — Universities, TVET & Professional'),
  ('Technical & Vocational Education and Training (TVET)','Education & Training — Universities, TVET & Professional'),
  ('STEM Training & Professional Development',          'Education & Training — Universities, TVET & Professional'),
  ('Schools & Secondary Education',                     'Education & Training — Schools'),
  ('Consulting & Professional Services',                'Chemical & Process Engineering Consultancy'),
  ('Government & Public Sector',                        'Regulatory, Standards & Public Health Authorities'),

  -- Reserved-for-later (target row is inactive in code but present in DB)
  ('Construction, Infrastructure & Built Environment',  'Building & Construction Materials Chemistry'),
  ('NGOs, Development & International Organisations',   'Development Organisations & NGO Laboratory Programmes'),

  -- Explicit NULL (retired industries — the AI re-enrich will re-tag)
  ('Agriculture, Agribusiness & Agricultural Technology', NULL),
  ('Paper, Pulp & Packaging',                             NULL),
  ('Electrical & Electronics Manufacturing',              NULL),
  ('Automotive & Transport Equipment',                    NULL),
  ('Aerospace & Defence',                                 NULL),
  ('Aviation & Aerospace Services',                       NULL),
  ('Textiles, Apparel & Leather Manufacturing',           NULL),
  ('Information Technology & Software',                   NULL),
  ('Telecommunications & Networking',                     NULL),
  ('Telecommunications Infrastructure',                   NULL),
  ('Data, Artificial Intelligence & Analytics',           NULL),
  ('Banking, Finance & Insurance',                        NULL),
  ('Educational Technology (EdTech)',                     NULL),
  ('Logistics, Supply Chain & Distribution',              NULL),
  ('Real Estate & Facilities Management',                 NULL),
  ('Consumer Goods & Retail',                             NULL)
) AS m(old_name, new_name);

CREATE TEMP TABLE function_remap ON COMMIT DROP AS
SELECT * FROM (VALUES
  -- Renames / direct targets
  ('Analytical Chemistry',                              'Analytical & Instrumental Chemistry'),
  ('Laboratory Operations & Testing',                   'Laboratory Operations & Management'),
  ('Product Development & Formulation',                 'Formulation & Product Development'),
  ('Microbiology & Biotechnology',                      'Microbiology & Molecular Analysis (Product/Quality)'),
  ('Materials Science & Engineering',                   'Materials & Polymer Science'),
  ('Food Science & Technology',                         'Formulation & Product Development'),
  ('Scientific Data Management',                        'Laboratory Information Systems (LIMS) & Informatics'),
  ('Chemical & Process Engineering',                    'Chemical & Process Engineering'),
  ('Industrial & Manufacturing Engineering',            'Process Operations & Plant Optimisation'),
  ('Production & Manufacturing Operations',             'Production & Plant Operations Management'),
  ('Process Optimisation & Production Planning',        'Process Operations & Plant Optimisation'),
  ('Health, Safety & Process Risk Management',          'HSE & Process Safety'),
  ('Energy Systems & Renewable Energy',                 'Energy & Utilities Process'),
  ('Water & Wastewater Engineering',                    'Water & Wastewater Treatment Operations'),
  ('Mining & Mineral Processing',                       'Mining, Assay & Mineral Processing'),
  ('Geology, Geoscience & Mineral Exploration',         'Mining, Assay & Mineral Processing'),
  ('Instrumentation, Control & Metrology',              'Instrumentation & Control'),
  ('Technical Support & Field Service',                 'Applications, Technical Support & Field Service'),
  ('Technical Procurement & Supply Chain',              'Procurement, Warehousing & Supply Chain (Lab/Chemical)'),
  ('Technical Project Management & Operations',         'Technical Project Management'),
  ('STEM Education, Teaching & Curriculum Development', 'Chemistry Teaching, Training & Science Communication'),
  ('Technical Training, Academic Research & Science Communication','Chemistry Teaching, Training & Science Communication'),
  ('Biostatistics & Bioinformatics',                    'Chemometrics, Data Science & Statistics for Lab Systems'),
  ('Data Science, Analytics & Artificial Intelligence', 'Chemometrics, Data Science & Statistics for Lab Systems'),
  ('Mathematics, Statistics & Actuarial Science',       'Chemometrics, Data Science & Statistics for Lab Systems'),
  ('Operations Research & Optimisation',                'Process Operations & Plant Optimisation'),
  ('Robotics, Mechatronics & Automation',               'Laboratory Information Systems (LIMS) & Informatics'),
  ('Mechanical Engineering',                            'Maintenance & Reliability Engineering'),
  ('Electrical & Electronics Engineering',              'Instrumentation & Control'),
  ('Environmental Science & Management',                'HSE & Process Safety'),
  ('Public Health Science & Epidemiology',              'Forensic & Toxicology Analysis'),
  ('IT Infrastructure, Systems & Support',              'Laboratory Information Systems (LIMS) & Informatics'),

  -- Kept-as-is (name unchanged)
  ('Research & Development (R&D)',                      'Research & Development (R&D)'),
  ('Quality Control (QC)',                              'Quality Control (QC)'),
  ('Quality Assurance & Quality Management',            'Quality Assurance & QMS'),
  ('Regulatory Affairs & Compliance',                   'Regulatory Affairs & Compliance'),
  ('Clinical Research & Trials',                        'Clinical Research & Trials (Chemistry-Relevant)'),
  ('Maintenance & Reliability Engineering',             'Maintenance & Reliability Engineering'),
  ('Technical Sales & Business Development',            'Technical Sales & Business Development (Chemistry)'),

  -- Retired functions → NULL (drop the tag)
  ('Agricultural Science & Technology',                 NULL),
  ('Civil & Structural Engineering',                    NULL),
  ('Biomedical Engineering',                            NULL),
  ('Surveying & Geospatial Science',                    NULL),
  ('Software Development & Engineering',                NULL),
  ('Cybersecurity',                                     NULL),
  ('Cloud Computing & DevOps',                          NULL),
  ('Networking & Telecommunications',                   NULL)
) AS m(old_name, new_name);

-- jobs.industry (single text) — NULL where the industry is retired
UPDATE public.jobs j
SET industry = r.new_name
FROM industry_remap r
WHERE j.industry = r.old_name;

-- jobs.industries (text array) — replace mapped elements and de-dupe (drops NULLs)
UPDATE public.jobs j
SET industries = (
  SELECT COALESCE(array_agg(DISTINCT r.new_name), '{}')
  FROM unnest(j.industries) AS elem
  JOIN industry_remap r ON r.old_name = elem
  WHERE r.new_name IS NOT NULL
)
WHERE j.industries IS NOT NULL AND array_length(j.industries, 1) > 0;

-- companies.industry
UPDATE public.companies c
SET industry = r.new_name
FROM industry_remap r
WHERE c.industry = r.old_name;

-- jobs.job_function (single text)
UPDATE public.jobs j
SET job_function = r.new_name
FROM function_remap r
WHERE j.job_function = r.old_name;

-- jobs.job_functions (text array)
UPDATE public.jobs j
SET job_functions = (
  SELECT COALESCE(array_agg(DISTINCT r.new_name), '{}')
  FROM unnest(j.job_functions) AS elem
  JOIN function_remap r ON r.old_name = elem
  WHERE r.new_name IS NOT NULL
)
WHERE j.job_functions IS NOT NULL AND array_length(j.job_functions, 1) > 0;

-- ============================================================================
-- 3. DROP OLD LOOKUP ROWS NOT IN THE NEW CHEMISTRY LENS TAXONOMY
--    (jobs.industry_id / jobs.job_function_id FKs are ON DELETE SET NULL)
-- ============================================================================

DELETE FROM public.industries
WHERE name NOT IN (
  'Industrial & Basic Chemicals',
  'Fertilizers & Agrochemicals',
  'Paints, Coatings, Adhesives & Sealants',
  'Polymers, Plastics & Rubber',
  'Personal Care, Cosmetics & Fragrances',
  'Petrochemicals, Refining & Fuels',
  'Building & Construction Materials Chemistry',
  'Pharmaceuticals & Drug Manufacturing',
  'Biotechnology & Life Sciences',
  'Clinical Chemistry & Medical Laboratory Services',
  'Forensic & Toxicology Laboratories',
  'Food, Beverage & Brewery Laboratories',
  'Energy, Power & Utilities',
  'Chemicals-Driven Manufacturing & Industrial Production',
  'Tea, Coffee & Horticulture Post-Harvest Processing',
  'Water Supply & Treatment',
  'Wastewater & Effluent Management',
  'Environmental Consulting, EIA & Air Quality',
  'Waste Management & Recycling',
  'Mining, Geology & Assay Laboratories',
  'Mineral Processing & Hydrometallurgy',
  'Scientific Research & R&D Institutions',
  'Regulatory, Standards & Public Health Authorities',
  'Development Organisations & NGO Laboratory Programmes',
  'Testing, Inspection, Certification & Calibration',
  'Laboratory & Scientific Supply Services',
  'Chemical & Process Engineering Consultancy',
  'Education & Training — Schools',
  'Education & Training — Universities, TVET & Professional'
);

DELETE FROM public.job_functions
WHERE name NOT IN (
  'Analytical & Instrumental Chemistry',
  'Laboratory Operations & Management',
  'Laboratory Technician & Sample Handling',
  'Microbiology & Molecular Analysis (Product/Quality)',
  'Forensic & Toxicology Analysis',
  'Method Development & Validation',
  'Research & Development (R&D)',
  'Clinical Research & Trials (Chemistry-Relevant)',
  'Formulation & Product Development',
  'Chemical & Process Engineering',
  'Process Operations & Plant Optimisation',
  'Production & Plant Operations Management',
  'Materials & Polymer Science',
  'Mining, Assay & Mineral Processing',
  'Energy & Utilities Process',
  'Water & Wastewater Treatment Operations',
  'Quality Control (QC)',
  'Quality Assurance & QMS',
  'Regulatory Affairs & Compliance',
  'Metrology, Calibration & Lab Accreditation (ISO 17025)',
  'Instrumentation & Control',
  'Maintenance & Reliability Engineering',
  'HSE & Process Safety',
  'Technical Sales & Business Development (Chemistry)',
  'Applications, Technical Support & Field Service',
  'Procurement, Warehousing & Supply Chain (Lab/Chemical)',
  'Laboratory Information Systems (LIMS) & Informatics',
  'Cheminformatics & Computational Chemistry',
  'Chemometrics, Data Science & Statistics for Lab Systems',
  'Chemistry Teaching, Training & Science Communication',
  'Technical Project Management'
);

-- ============================================================================
-- 4. REBUILD ID COLUMNS FROM CANONICAL NAMES
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

-- ============================================================================
-- POST-MIGRATION OPERATIONS (manual, from admin UI or scripts):
--   1. Run npx tsx scripts/process-stem-backlog.ts equivalent re-enrich on
--      jobs whose `industries` or `job_functions` arrays are now empty.
--   2. Verify companies directory: companies whose stored industry was
--      retired now show null → the resolver will re-infer via
--      companyIndustryInference.ts on the next page load.
--   3. Update /companies/industry/[slug] canonical URLs (SEO 301s in
--      vercel.json if you need to preserve old-page equity).
-- ============================================================================
