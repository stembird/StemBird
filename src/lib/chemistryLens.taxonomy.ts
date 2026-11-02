/**
 * Chemistry Lens taxonomy v1.1 — the single source of truth for industries,
 * job functions, sectors, families, degree fields, and the migration maps
 * from the retired ChemistryLens STEM taxonomy.
 *
 * THREE SEPARATE DIMENSIONS (never conflated):
 *   - Degree fields — what did you study?  → DEGREE_FIELDS
 *   - Industries    — where does the employer operate?  → INDUSTRIES
 *   - Job functions — what work do you perform?  → JOB_FUNCTIONS
 *
 * PUBLICATION DOCTRINE:
 *   "Chemistry is the subject. Industry is the application. Careers are
 *   the opportunity." Industry alone never publishes a job — the
 *   chemistry-relevance gate in `chemistryRelevance.ts` decides.
 *
 * TAGGING CEILINGS: max 3 industries and max 3 functions per job —
 * CEILINGS, never quotas. Zero matches → omit the field entirely.
 *
 * Reserved entries (`active: false`) exist so activation later is a
 * one-line change; the fallback lists and prompts only ever expose
 * active entries to parsers, filters and hub pages.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SECTORS (Level 1 — used for landing-page grouping & SEO hubs)
// ─────────────────────────────────────────────────────────────────────────────

export type SectorId =
  | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7';

export type Sector = {
  id: SectorId;
  name: string;
  slug: string;
  blurb: string;
};

export const SECTORS: readonly Sector[] = [
  {
    id: 'S1',
    name: 'Chemicals & Advanced Materials',
    slug: 'chemicals-and-advanced-materials',
    blurb: 'Industrial chemicals, agrochemicals, coatings, polymers, cosmetics and refining.',
  },
  {
    id: 'S2',
    name: 'Pharmaceutical, Biochemical & Laboratory Sciences',
    slug: 'pharmaceutical-biochemical-and-laboratory-sciences',
    blurb: 'Pharma manufacturing, biotech, clinical chemistry, forensics and toxicology.',
  },
  {
    id: 'S3',
    name: 'Energy, Process & Manufacturing',
    slug: 'energy-process-and-manufacturing',
    blurb: 'Power and utilities, food and beverage labs, and chemicals-driven plants.',
  },
  {
    id: 'S4',
    name: 'Environment, Water & Waste',
    slug: 'environment-water-and-waste',
    blurb: 'Water supply, effluent treatment, environmental consulting and recycling.',
  },
  {
    id: 'S5',
    name: 'Mining, Minerals & Resource Processing',
    slug: 'mining-minerals-and-resource-processing',
    blurb: 'Assay labs, extractive metallurgy and hydrometallurgy.',
  },
  {
    id: 'S6',
    name: 'Research, Regulation & Public Interest',
    slug: 'research-regulation-and-public-interest',
    blurb: 'Public research institutes, standards/regulatory authorities and labelling bodies.',
  },
  {
    id: 'S7',
    name: 'Testing, Science Services & Skills',
    slug: 'testing-science-services-and-skills',
    blurb: 'TIC houses, laboratory supply, process consultancy and chemistry education.',
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// INDUSTRIES (Level 2 — 27 active + 2 reserved at launch)
// ─────────────────────────────────────────────────────────────────────────────

export type Industry = {
  code: string;         // stable identifier e.g. 'I01'
  name: string;         // canonical display name — used in DB & UI
  slug: string;         // SEO slug
  sector: SectorId;
  active: boolean;      // false = reserved for future activation
  /** Extra labels this industry should answer to during fuzzy resolution. */
  aliases?: readonly string[];
};

export const INDUSTRIES: readonly Industry[] = [
  // ── S1 Chemicals & Advanced Materials ──────────────────────────────────
  { code: 'I01', name: 'Industrial & Basic Chemicals', slug: 'industrial-and-basic-chemicals', sector: 'S1', active: true,
    aliases: ['acids, alkalis and salts', 'industrial gases', 'soaps and detergents', 'basic chemicals'] },
  { code: 'I02', name: 'Fertilizers & Agrochemicals', slug: 'fertilizers-and-agrochemicals', sector: 'S1', active: true,
    aliases: ['pesticides', 'herbicides', 'agrochemicals', 'fertilizer'] },
  { code: 'I03', name: 'Paints, Coatings, Adhesives & Sealants', slug: 'paints-coatings-adhesives-and-sealants', sector: 'S1', active: true,
    aliases: ['paints', 'coatings', 'adhesives', 'sealants'] },
  { code: 'I04', name: 'Polymers, Plastics & Rubber', slug: 'polymers-plastics-and-rubber', sector: 'S1', active: true,
    aliases: ['plastics', 'rubber', 'composites', 'polymer'] },
  { code: 'I05', name: 'Personal Care, Cosmetics & Fragrances', slug: 'personal-care-cosmetics-and-fragrances', sector: 'S1', active: true,
    aliases: ['cosmetics', 'personal care', 'fragrance', 'toiletries'] },
  { code: 'I06', name: 'Petrochemicals, Refining & Fuels', slug: 'petrochemicals-refining-and-fuels', sector: 'S1', active: true,
    aliases: ['petrochemicals', 'refinery', 'fuels', 'lubricants', 'oil and gas'] },
  { code: 'I07', name: 'Building & Construction Materials Chemistry', slug: 'building-and-construction-materials-chemistry', sector: 'S1', active: false,
    aliases: ['cement', 'concrete admixtures', 'building materials'] },

  // ── S2 Pharmaceutical, Biochemical & Laboratory Sciences ───────────────
  { code: 'I08', name: 'Pharmaceuticals & Drug Manufacturing', slug: 'pharmaceuticals-and-drug-manufacturing', sector: 'S2', active: true,
    aliases: ['pharmaceutical', 'pharma', 'drug manufacturing', 'api manufacturing'] },
  { code: 'I09', name: 'Biotechnology & Life Sciences', slug: 'biotechnology-and-life-sciences', sector: 'S2', active: true,
    aliases: ['biotech', 'life sciences', 'reagents', 'molecular biology'] },
  { code: 'I10', name: 'Clinical Chemistry & Medical Laboratory Services', slug: 'clinical-chemistry-and-medical-laboratory-services', sector: 'S2', active: true,
    aliases: ['medical laboratory', 'clinical laboratory', 'pathology lab', 'chemical pathology'] },
  { code: 'I11', name: 'Forensic & Toxicology Laboratories', slug: 'forensic-and-toxicology-laboratories', sector: 'S2', active: true,
    aliases: ['forensics', 'toxicology', 'drugs and poisons'] },

  // ── S3 Energy, Process & Manufacturing ─────────────────────────────────
  { code: 'I12', name: 'Food, Beverage & Brewery Laboratories', slug: 'food-beverage-and-brewery-laboratories', sector: 'S3', active: true,
    aliases: ['food and beverage', 'brewery', 'dairy', 'beverage', 'wines and spirits', 'food manufacturing'] },
  { code: 'I13', name: 'Energy, Power & Utilities', slug: 'energy-power-and-utilities', sector: 'S3', active: true,
    aliases: ['power', 'electric utility', 'renewable energy', 'utilities', 'nuclear'] },
  { code: 'I14', name: 'Chemicals-Driven Manufacturing & Industrial Production', slug: 'chemicals-driven-manufacturing-and-industrial-production', sector: 'S3', active: true,
    aliases: ['manufacturing', 'industrial production', 'steel', 'general manufacturing'] },
  { code: 'I29', name: 'Tea, Coffee & Horticulture Post-Harvest Processing', slug: 'tea-coffee-and-horticulture-post-harvest-processing', sector: 'S3', active: true,
    aliases: ['tea', 'coffee', 'post-harvest', 'horticulture processing', 'flower export'] },

  // ── S4 Environment, Water & Waste ──────────────────────────────────────
  { code: 'I15', name: 'Water Supply & Treatment', slug: 'water-supply-and-treatment', sector: 'S4', active: true,
    aliases: ['water treatment', 'water utility', 'water quality'] },
  { code: 'I16', name: 'Wastewater & Effluent Management', slug: 'wastewater-and-effluent-management', sector: 'S4', active: true,
    aliases: ['wastewater', 'effluent', 'sewage treatment'] },
  { code: 'I17', name: 'Environmental Consulting, EIA & Air Quality', slug: 'environmental-consulting-eia-and-air-quality', sector: 'S4', active: true,
    aliases: ['environmental services', 'environmental consulting', 'eia', 'air quality', 'conservation'] },
  { code: 'I18', name: 'Waste Management & Recycling', slug: 'waste-management-and-recycling', sector: 'S4', active: true,
    aliases: ['waste management', 'recycling', 'e-waste'] },

  // ── S5 Mining, Minerals & Resource Processing ──────────────────────────
  { code: 'I19', name: 'Mining, Geology & Assay Laboratories', slug: 'mining-geology-and-assay-laboratories', sector: 'S5', active: true,
    aliases: ['mining', 'assay laboratory', 'geology', 'mineral exploration'] },
  { code: 'I20', name: 'Mineral Processing & Hydrometallurgy', slug: 'mineral-processing-and-hydrometallurgy', sector: 'S5', active: true,
    aliases: ['hydrometallurgy', 'pyrometallurgy', 'beneficiation', 'leaching', 'mineral processing'] },

  // ── S6 Research, Regulation & Public Interest ──────────────────────────
  { code: 'I21', name: 'Scientific Research & R&D Institutions', slug: 'scientific-research-and-rd-institutions', sector: 'S6', active: true,
    aliases: ['scientific research', 'research institute', 'r&d institution'] },
  { code: 'I22', name: 'Regulatory, Standards & Public Health Authorities', slug: 'regulatory-standards-and-public-health-authorities', sector: 'S6', active: true,
    aliases: ['government', 'public sector', 'regulator', 'standards body', 'kebs', 'phsd', 'county government'] },
  { code: 'I23', name: 'Development Organisations & NGO Laboratory Programmes', slug: 'development-organisations-and-ngo-laboratory-programmes', sector: 'S6', active: false,
    aliases: ['ngo', 'ngo/non-profit', 'non-profit', 'charity', 'development organisation'] },

  // ── S7 Testing, Science Services & Skills ──────────────────────────────
  { code: 'I24', name: 'Testing, Inspection, Certification & Calibration', slug: 'testing-inspection-certification-and-calibration', sector: 'S7', active: true,
    aliases: ['tic', 'inspection', 'certification', 'calibration', 'testing laboratory'] },
  { code: 'I25', name: 'Laboratory & Scientific Supply Services', slug: 'laboratory-and-scientific-supply-services', sector: 'S7', active: true,
    aliases: ['laboratory supplier', 'reagent supplier', 'instrument supplier', 'scientific services'] },
  { code: 'I26', name: 'Chemical & Process Engineering Consultancy', slug: 'chemical-and-process-engineering-consultancy', sector: 'S7', active: true,
    aliases: ['process consultancy', 'chemical engineering consultancy', 'engineering consultancy'] },
  { code: 'I27', name: 'Education & Training — Schools', slug: 'education-and-training-schools', sector: 'S7', active: true,
    aliases: ['school', 'secondary education', 'high school'] },
  { code: 'I28', name: 'Education & Training — Universities, TVET & Professional', slug: 'education-and-training-universities-tvet-and-professional', sector: 'S7', active: true,
    aliases: ['university', 'tvet', 'college', 'higher education', 'stem training', 'professional development'] },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// JOB FUNCTION FAMILIES (Level 1 for the function axis)
// ─────────────────────────────────────────────────────────────────────────────

export type FamilyId = 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8';

export type FunctionFamily = {
  id: FamilyId;
  name: string;
  slug: string;
};

export const FUNCTION_FAMILIES: readonly FunctionFamily[] = [
  { id: 'F1', name: 'Laboratory & Analytical Sciences', slug: 'laboratory-and-analytical-sciences' },
  { id: 'F2', name: 'Research & Development', slug: 'research-and-development' },
  { id: 'F3', name: 'Process, Production & Engineering', slug: 'process-production-and-engineering' },
  { id: 'F4', name: 'Quality, Compliance & Regulation', slug: 'quality-compliance-and-regulation' },
  { id: 'F5', name: 'Engineering Support, Safety & Maintenance', slug: 'engineering-support-safety-and-maintenance' },
  { id: 'F6', name: 'Commercial, Service & Supply Chain', slug: 'commercial-service-and-supply-chain' },
  { id: 'F7', name: 'Digital Science & Data', slug: 'digital-science-and-data' },
  { id: 'F8', name: 'Education & Cross-Functional', slug: 'education-and-cross-functional' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// JOB FUNCTIONS (Level 2 — 29 active + 2 reserved)
//   chemistryCore=true entries can satisfy gate Test T1 on their own.
// ─────────────────────────────────────────────────────────────────────────────

export type JobFunction = {
  code: string;
  name: string;
  slug: string;
  family: FamilyId;
  active: boolean;
  chemistryCore: boolean;
  aliases?: readonly string[];
};

export const JOB_FUNCTIONS: readonly JobFunction[] = [
  // ── F1 Laboratory & Analytical Sciences ────────────────────────────────
  { code: 'J01', name: 'Analytical & Instrumental Chemistry', slug: 'analytical-and-instrumental-chemistry', family: 'F1', active: true, chemistryCore: true,
    aliases: ['analytical chemistry', 'instrumental analysis', 'hplc', 'gc', 'aas', 'icp'] },
  { code: 'J02', name: 'Laboratory Operations & Management', slug: 'laboratory-operations-and-management', family: 'F1', active: true, chemistryCore: true,
    aliases: ['lab manager', 'laboratory manager', 'laboratory operations'] },
  { code: 'J03', name: 'Laboratory Technician & Sample Handling', slug: 'laboratory-technician-and-sample-handling', family: 'F1', active: true, chemistryCore: true,
    aliases: ['lab technician', 'laboratory technician', 'sample preparation'] },
  { code: 'J04', name: 'Microbiology & Molecular Analysis (Product/Quality)', slug: 'microbiology-and-molecular-analysis', family: 'F1', active: true, chemistryCore: true,
    aliases: ['microbiology', 'sterility testing', 'endotoxin', 'bioburden'] },
  { code: 'J05', name: 'Forensic & Toxicology Analysis', slug: 'forensic-and-toxicology-analysis', family: 'F1', active: true, chemistryCore: true,
    aliases: ['toxicology', 'forensic science', 'drugs analysis'] },
  { code: 'J06', name: 'Method Development & Validation', slug: 'method-development-and-validation', family: 'F1', active: true, chemistryCore: true,
    aliases: ['method dev', 'analytical method validation'] },

  // ── F2 Research & Development ──────────────────────────────────────────
  { code: 'J07', name: 'Research & Development (R&D)', slug: 'research-and-development', family: 'F2', active: true, chemistryCore: true,
    aliases: ['r&d', 'research scientist', 'postdoctoral research'] },
  { code: 'J08', name: 'Clinical Research & Trials (Chemistry-Relevant)', slug: 'clinical-research-and-trials', family: 'F2', active: true, chemistryCore: false,
    aliases: ['clinical trials', 'bioanalytical research'] },

  // ── F3 Process, Production & Engineering ───────────────────────────────
  { code: 'J09', name: 'Formulation & Product Development', slug: 'formulation-and-product-development', family: 'F3', active: true, chemistryCore: true,
    aliases: ['formulation chemist', 'product development', 'formulation scientist'] },
  { code: 'J10', name: 'Chemical & Process Engineering', slug: 'chemical-and-process-engineering', family: 'F3', active: true, chemistryCore: true,
    aliases: ['chemical engineer', 'process engineer', 'process modelling'] },
  { code: 'J11', name: 'Process Operations & Plant Optimisation', slug: 'process-operations-and-plant-optimisation', family: 'F3', active: true, chemistryCore: true,
    aliases: ['process optimisation', 'process chemist', 'plant optimisation'] },
  { code: 'J12', name: 'Production & Plant Operations Management', slug: 'production-and-plant-operations-management', family: 'F3', active: true, chemistryCore: true,
    aliases: ['production manager', 'production supervisor', 'plant operations'] },
  { code: 'J13', name: 'Materials & Polymer Science', slug: 'materials-and-polymer-science', family: 'F3', active: true, chemistryCore: true,
    aliases: ['materials science', 'polymer science', 'metallurgy'] },
  { code: 'J14', name: 'Mining, Assay & Mineral Processing', slug: 'mining-assay-and-mineral-processing', family: 'F3', active: true, chemistryCore: true,
    aliases: ['assay', 'mineral processing', 'metallurgist', 'geology'] },
  { code: 'J15', name: 'Energy & Utilities Process', slug: 'energy-and-utilities-process', family: 'F3', active: true, chemistryCore: true,
    aliases: ['boiler chemist', 'power plant chemist', 'energy systems'] },
  { code: 'J16', name: 'Water & Wastewater Treatment Operations', slug: 'water-and-wastewater-treatment-operations', family: 'F3', active: true, chemistryCore: true,
    aliases: ['water treatment', 'wastewater', 'effluent treatment', 'water chemist'] },

  // ── F4 Quality, Compliance & Regulation ────────────────────────────────
  { code: 'J17', name: 'Quality Control (QC)', slug: 'quality-control', family: 'F4', active: true, chemistryCore: true,
    aliases: ['qc', 'qc analyst', 'quality testing'] },
  { code: 'J18', name: 'Quality Assurance & QMS', slug: 'quality-assurance-and-qms', family: 'F4', active: true, chemistryCore: true,
    aliases: ['qa', 'quality assurance', 'qms', 'iso'] },
  { code: 'J19', name: 'Regulatory Affairs & Compliance', slug: 'regulatory-affairs-and-compliance', family: 'F4', active: true, chemistryCore: true,
    aliases: ['regulatory affairs', 'compliance officer', 'pharma registration'] },
  { code: 'J20', name: 'Metrology, Calibration & Lab Accreditation (ISO 17025)', slug: 'metrology-calibration-and-lab-accreditation', family: 'F4', active: true, chemistryCore: true,
    aliases: ['metrology', 'iso 17025', 'accreditation', 'calibration'] },

  // ── F5 Engineering Support, Safety & Maintenance ───────────────────────
  { code: 'J21', name: 'Instrumentation & Control', slug: 'instrumentation-and-control', family: 'F5', active: true, chemistryCore: true,
    aliases: ['instrumentation', 'process control', 'plc/scada'] },
  { code: 'J22', name: 'Maintenance & Reliability Engineering', slug: 'maintenance-and-reliability-engineering', family: 'F5', active: true, chemistryCore: false,
    aliases: ['maintenance engineer', 'reliability engineer', 'plant maintenance'] },
  { code: 'J23', name: 'HSE & Process Safety', slug: 'hse-and-process-safety', family: 'F5', active: true, chemistryCore: true,
    aliases: ['hse', 'ehs', 'health safety environment', 'process safety'] },

  // ── F6 Commercial, Service & Supply Chain ──────────────────────────────
  { code: 'J24', name: 'Technical Sales & Business Development (Chemistry)', slug: 'technical-sales-and-business-development', family: 'F6', active: true, chemistryCore: false,
    aliases: ['technical sales', 'business development chemist', 'instrument sales'] },
  { code: 'J25', name: 'Applications, Technical Support & Field Service', slug: 'applications-technical-support-and-field-service', family: 'F6', active: true, chemistryCore: false,
    aliases: ['application scientist', 'field service engineer', 'technical support'] },
  { code: 'J26', name: 'Procurement, Warehousing & Supply Chain (Lab/Chemical)', slug: 'procurement-warehousing-and-supply-chain', family: 'F6', active: true, chemistryCore: false,
    aliases: ['procurement', 'supply chain', 'storekeeper chemical', 'reagent procurement'] },

  // ── F7 Digital Science & Data ──────────────────────────────────────────
  { code: 'J27', name: 'Laboratory Information Systems (LIMS) & Informatics', slug: 'laboratory-information-systems-and-informatics', family: 'F7', active: true, chemistryCore: true,
    aliases: ['lims', 'scientific informatics', 'lab automation', 'electronic notebook'] },
  { code: 'J28', name: 'Cheminformatics & Computational Chemistry', slug: 'cheminformatics-and-computational-chemistry', family: 'F7', active: false, chemistryCore: true,
    aliases: ['computational chemistry', 'molecular modelling', 'cheminformatics'] },
  { code: 'J29', name: 'Chemometrics, Data Science & Statistics for Lab Systems', slug: 'chemometrics-data-science-and-statistics', family: 'F7', active: true, chemistryCore: true,
    aliases: ['chemometrics', 'design of experiments', 'doe', 'lab data analysis'] },

  // ── F8 Education & Cross-Functional ────────────────────────────────────
  { code: 'J30', name: 'Chemistry Teaching, Training & Science Communication', slug: 'chemistry-teaching-training-and-science-communication', family: 'F8', active: true, chemistryCore: false,
    aliases: ['chemistry teacher', 'chemistry lecturer', 'science communication'] },
  { code: 'J31', name: 'Technical Project Management', slug: 'technical-project-management', family: 'F8', active: false, chemistryCore: false,
    aliases: ['project manager engineering', 'technical project management'] },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// DEGREE FIELDS (advisory — free-text still accepted; used for CV/profile
// matching and the gate's T2 Qualification test).
// ─────────────────────────────────────────────────────────────────────────────

export const DEGREE_FIELDS: readonly string[] = [
  'Chemistry',
  'Applied Chemistry / Chemical Technology',
  'Industrial Chemistry',
  'Analytical Chemistry',
  'Physical Chemistry',
  'Biochemistry',
  'Chemical Engineering',
  'Polymer / Materials Science',
  'Pharmaceutical Chemistry',
  'Food Science & Technology',
  'Cosmetic Science / Flavour & Fragrance',
  'Environmental Chemistry',
  'Water Sanitation & Treatment',
  'Geology & Mineral / Extractive Metallurgy',
  'Microbiology (Quality / Product focus)',
  'Forensic Science & Toxicology',
  'Petrochemical / Petroleum Technology',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Derived lists (what the rest of the codebase consumes)
// ─────────────────────────────────────────────────────────────────────────────

export const ACTIVE_INDUSTRIES = INDUSTRIES.filter((i) => i.active);
export const ACTIVE_JOB_FUNCTIONS = JOB_FUNCTIONS.filter((f) => f.active);

export const ACTIVE_INDUSTRY_NAMES: readonly string[] = ACTIVE_INDUSTRIES.map((i) => i.name);
export const ACTIVE_JOB_FUNCTION_NAMES: readonly string[] = ACTIVE_JOB_FUNCTIONS.map((f) => f.name);

export const CHEMISTRY_CORE_FUNCTION_NAMES: readonly string[] = ACTIVE_JOB_FUNCTIONS
  .filter((f) => f.chemistryCore)
  .map((f) => f.name);

export function industryToSector(code: string): Sector | undefined {
  const ind = INDUSTRIES.find((i) => i.code === code);
  return ind ? SECTORS.find((s) => s.id === ind.sector) : undefined;
}

/** Lookup by canonical name (case-insensitive). */
export function findIndustryByName(name: string): Industry | undefined {
  const n = name.toLowerCase().trim();
  return INDUSTRIES.find((i) => i.name.toLowerCase() === n);
}

export function findFunctionByName(name: string): JobFunction | undefined {
  const n = name.toLowerCase().trim();
  return JOB_FUNCTIONS.find((f) => f.name.toLowerCase() === n);
}

// ─────────────────────────────────────────────────────────────────────────────
// MIGRATION MAPS — old ChemistryLens STEM taxonomy → new Chemistry Lens taxonomy.
// Value = array of new-taxonomy names; empty array means "deprecated, drop
// this tag". When more than one entry appears, the correct choice depends on
// the job description (see docs/migration notes).
// ─────────────────────────────────────────────────────────────────────────────

export const INDUSTRY_MIGRATION: Readonly<Record<string, readonly string[]>> = {
  // Renames
  'Food & Beverage Manufacturing': ['Food, Beverage & Brewery Laboratories'],
  'Plastics, Rubber & Composites': ['Polymers, Plastics & Rubber'],
  'Oil, Gas & Petrochemicals': ['Petrochemicals, Refining & Fuels'],
  'Energy, Power & Renewable Energy': ['Energy, Power & Utilities'],
  'Environmental Services & Conservation': ['Environmental Consulting, EIA & Air Quality'],
  'Scientific Research & Development': ['Scientific Research & R&D Institutions'],
  'Healthcare, Hospitals & Medical Laboratories': ['Clinical Chemistry & Medical Laboratory Services'],
  'Manufacturing & Industrial Production': ['Chemicals-Driven Manufacturing & Industrial Production'],
  'Waste Management & Recycling': ['Waste Management & Recycling'],
  'Testing, Inspection, Certification & Calibration': ['Testing, Inspection, Certification & Calibration'],

  // Splits — the parser/AI or admin must pick based on job context
  'Chemicals, Paints, Polymers & Industrial Materials': [
    'Industrial & Basic Chemicals',
    'Paints, Coatings, Adhesives & Sealants',
    'Polymers, Plastics & Rubber',
  ],
  'Pharmaceuticals & Biotechnology': [
    'Pharmaceuticals & Drug Manufacturing',
    'Biotechnology & Life Sciences',
  ],
  'Water, Wastewater & Water Treatment': [
    'Water Supply & Treatment',
    'Wastewater & Effluent Management',
  ],
  'Mining, Geology & Mineral Processing': [
    'Mining, Geology & Assay Laboratories',
    'Mineral Processing & Hydrometallurgy',
  ],
  'Laboratories & Scientific Services': [
    'Laboratory & Scientific Supply Services',
    'Testing, Inspection, Certification & Calibration',
  ],

  // Merges
  'Life Sciences & Biomedical Research': ['Biotechnology & Life Sciences'],
  'Universities & Higher Education': ['Education & Training — Universities, TVET & Professional'],
  'Technical & Vocational Education and Training (TVET)': ['Education & Training — Universities, TVET & Professional'],
  'STEM Training & Professional Development': ['Education & Training — Universities, TVET & Professional'],
  'Schools & Secondary Education': ['Education & Training — Schools'],
  'Consulting & Professional Services': ['Chemical & Process Engineering Consultancy'],
  'Government & Public Sector': ['Regulatory, Standards & Public Health Authorities'],

  // Reserved (row kept inactive; jobs tagged with these should be re-tagged or dropped)
  'Agriculture, Agribusiness & Agricultural Technology': [],
  'Paper, Pulp & Packaging': [],
  'Construction, Infrastructure & Built Environment': ['Building & Construction Materials Chemistry'],
  'Electrical & Electronics Manufacturing': [],
  'Automotive & Transport Equipment': [],
  'Aerospace & Defence': [],
  'Aviation & Aerospace Services': [],
  'Textiles, Apparel & Leather Manufacturing': [],
  'NGOs, Development & International Organisations': ['Development Organisations & NGO Laboratory Programmes'],

  // Deprecated (drop the tag; roles live via function + employer industry)
  'Information Technology & Software': [],
  'Telecommunications & Networking': [],
  'Telecommunications Infrastructure': [],
  'Data, Artificial Intelligence & Analytics': [],
  'Banking, Finance & Insurance': [],
  'Educational Technology (EdTech)': [],
  'Logistics, Supply Chain & Distribution': [],
  'Real Estate & Facilities Management': [],
  'Consumer Goods & Retail': [], // retired as industry — becomes company_type=FMCG
};

export const FUNCTION_MIGRATION: Readonly<Record<string, readonly string[]>> = {
  // Renames
  'Analytical Chemistry': ['Analytical & Instrumental Chemistry'],
  'Laboratory Operations & Testing': ['Laboratory Operations & Management', 'Laboratory Technician & Sample Handling'],
  'Product Development & Formulation': ['Formulation & Product Development'],
  'Microbiology & Biotechnology': ['Microbiology & Molecular Analysis (Product/Quality)'],
  'Materials Science & Engineering': ['Materials & Polymer Science'],
  'Food Science & Technology': ['Formulation & Product Development'],
  'Scientific Data Management': ['Laboratory Information Systems (LIMS) & Informatics'],
  'Chemical & Process Engineering': ['Chemical & Process Engineering'],
  'Industrial & Manufacturing Engineering': ['Process Operations & Plant Optimisation'],
  'Production & Manufacturing Operations': ['Production & Plant Operations Management'],
  'Process Optimisation & Production Planning': ['Process Operations & Plant Optimisation'],
  'Health, Safety & Process Risk Management': ['HSE & Process Safety'],
  'Energy Systems & Renewable Energy': ['Energy & Utilities Process'],
  'Water & Wastewater Engineering': ['Water & Wastewater Treatment Operations'],
  'Mining & Mineral Processing': ['Mining, Assay & Mineral Processing'],
  'Geology, Geoscience & Mineral Exploration': ['Mining, Assay & Mineral Processing'],
  'Instrumentation, Control & Metrology': ['Instrumentation & Control', 'Metrology, Calibration & Lab Accreditation (ISO 17025)'],
  'Technical Support & Field Service': ['Applications, Technical Support & Field Service'],
  'Technical Procurement & Supply Chain': ['Procurement, Warehousing & Supply Chain (Lab/Chemical)'],
  'Technical Project Management & Operations': ['Technical Project Management'],
  'STEM Education, Teaching & Curriculum Development': ['Chemistry Teaching, Training & Science Communication'],
  'Technical Training, Academic Research & Science Communication': ['Chemistry Teaching, Training & Science Communication', 'Research & Development (R&D)'],
  'Biostatistics & Bioinformatics': ['Chemometrics, Data Science & Statistics for Lab Systems'],
  'Data Science, Analytics & Artificial Intelligence': ['Chemometrics, Data Science & Statistics for Lab Systems'],
  'Mathematics, Statistics & Actuarial Science': ['Chemometrics, Data Science & Statistics for Lab Systems'],
  'Operations Research & Optimisation': ['Process Operations & Plant Optimisation'],
  'Robotics, Mechatronics & Automation': ['Laboratory Information Systems (LIMS) & Informatics'],
  'Mechanical Engineering': ['Maintenance & Reliability Engineering'],
  'Electrical & Electronics Engineering': ['Instrumentation & Control'],
  'Environmental Science & Management': ['HSE & Process Safety', 'Water & Wastewater Treatment Operations'],
  'Public Health Science & Epidemiology': ['Forensic & Toxicology Analysis', 'Clinical Research & Trials (Chemistry-Relevant)'],
  'Agricultural Science & Technology': [],
  'IT Infrastructure, Systems & Support': ['Laboratory Information Systems (LIMS) & Informatics'],

  // Kept as-is
  'Research & Development (R&D)': ['Research & Development (R&D)'],
  'Quality Control (QC)': ['Quality Control (QC)'],
  'Quality Assurance & Quality Management': ['Quality Assurance & QMS'],
  'Regulatory Affairs & Compliance': ['Regulatory Affairs & Compliance'],
  'Clinical Research & Trials': ['Clinical Research & Trials (Chemistry-Relevant)'],
  'Maintenance & Reliability Engineering': ['Maintenance & Reliability Engineering'],
  'Technical Sales & Business Development': ['Technical Sales & Business Development (Chemistry)'],

  // Deprecated (drop)
  'Civil & Structural Engineering': [],
  'Biomedical Engineering': [],
  'Surveying & Geospatial Science': [],
  'Software Development & Engineering': [],
  'Cybersecurity': [],
  'Cloud Computing & DevOps': [],
  'Networking & Telecommunications': [],
};

/**
 * Free-text / scrape industry labels → canonical Chemistry Lens names.
 * Consumed by `fuzzyMatchOption` in `jobParseNormalization.ts`.
 */
export const EXTRA_INDUSTRY_ALIASES: Readonly<Record<string, string>> = {
  // legacy → new (also handled in INDUSTRY_MIGRATION but aliases help live scrape)
  governmental: 'Regulatory, Standards & Public Health Authorities',
  government: 'Regulatory, Standards & Public Health Authorities',
  'public sector': 'Regulatory, Standards & Public Health Authorities',
  pharmaceuticals: 'Pharmaceuticals & Drug Manufacturing',
  pharmaceutical: 'Pharmaceuticals & Drug Manufacturing',
  pharma: 'Pharmaceuticals & Drug Manufacturing',
  biotechnology: 'Biotechnology & Life Sciences',
  'health care, medical': 'Clinical Chemistry & Medical Laboratory Services',
  healthcare: 'Clinical Chemistry & Medical Laboratory Services',
  'consumer goods': 'Personal Care, Cosmetics & Fragrances',
  fmcg: 'Personal Care, Cosmetics & Fragrances',
  'ngo/non-profit': 'Development Organisations & NGO Laboratory Programmes',
  'ngo / non-profit': 'Development Organisations & NGO Laboratory Programmes',
  'ngo, npo & charity': 'Development Organisations & NGO Laboratory Programmes',
  'non-profit': 'Development Organisations & NGO Laboratory Programmes',
  'paper milling': 'Chemicals-Driven Manufacturing & Industrial Production',
  manufacturing: 'Chemicals-Driven Manufacturing & Industrial Production',
  'transportation, logistics, storage': 'Procurement, Warehousing & Supply Chain (Lab/Chemical)',
  'construction, renovation, maintenance': 'Building & Construction Materials Chemistry',
  'consulting, business support, auditing': 'Chemical & Process Engineering Consultancy',
  'global wines & spirits': 'Food, Beverage & Brewery Laboratories',
  'wines & spirits': 'Food, Beverage & Brewery Laboratories',
  brewery: 'Food, Beverage & Brewery Laboratories',
  beverage: 'Food, Beverage & Brewery Laboratories',
  dairy: 'Food, Beverage & Brewery Laboratories',
  cement: 'Building & Construction Materials Chemistry',
  'water treatment': 'Water Supply & Treatment',
  wastewater: 'Wastewater & Effluent Management',
  assay: 'Mining, Geology & Assay Laboratories',
  refinery: 'Petrochemicals, Refining & Fuels',
  'oil and gas': 'Petrochemicals, Refining & Fuels',
  cosmetics: 'Personal Care, Cosmetics & Fragrances',
  'personal care': 'Personal Care, Cosmetics & Fragrances',
  tea: 'Tea, Coffee & Horticulture Post-Harvest Processing',
  coffee: 'Tea, Coffee & Horticulture Post-Harvest Processing',
  kebs: 'Regulatory, Standards & Public Health Authorities',
  'testing laboratory': 'Testing, Inspection, Certification & Calibration',
};
