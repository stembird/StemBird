/**
 * StemBird taxonomy — the single source of truth for STEM industries,
 * job functions, sectors, families, degree fields, and migration maps.
 *
 * Platform: StemBird (stembird.com)
 * Scope: STEM Careers (Science & Healthcare, Technology, Engineering & Architecture, Mathematics)
 *
 * THREE SEPARATE DIMENSIONS (never conflated):
 *   - Degree fields — what did you study?  → DEGREE_FIELDS
 *   - Industries    — where does the employer operate?  → INDUSTRIES (20 canonical industries)
 *   - Job functions — what work do you perform?  → JOB_FUNCTIONS (36 canonical functions)
 */

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// STEM SECTORS (Level 1 — landing-page grouping & SEO hubs)
// ─────────────────────────────────────────────────────────────────────────────

export type SectorId = 'S' | 'T' | 'E' | 'M' | 'ED';

export type Sector = {
  id: SectorId;
  name: string;
  slug: string;
  blurb: string;
};

export const SECTORS: readonly Sector[] = [
  {
    id: 'S',
    name: 'Science & Healthcare',
    slug: 'science-and-healthcare',
    blurb: 'Life sciences, clinical medicine, pharmaceuticals, biotechnology, agriculture and chemical manufacturing.',
  },
  {
    id: 'T',
    name: 'Technology',
    slug: 'technology',
    blurb: 'Software engineering, IT systems, telecommunications, cybersecurity, data science and artificial intelligence.',
  },
  {
    id: 'E',
    name: 'Engineering & Architecture',
    slug: 'engineering-and-architecture',
    blurb: 'Civil, mechanical, electrical, process engineering, architecture, mining, energy and built environment.',
  },
  {
    id: 'M',
    name: 'Mathematics',
    slug: 'mathematics',
    blurb: 'Mathematics, statistics, actuarial analysis, quantitative research and operations analysis.',
  },
  {
    id: 'ED',
    name: 'STEM Education & Training',
    slug: 'stem-education-and-training',
    blurb: 'Universities, research institutes, TVET colleges, schools and technical workforce development.',
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// INDUSTRIES (Level 2 — 20 Canonical STEM Industries)
// ─────────────────────────────────────────────────────────────────────────────

export type Industry = {
  code: string;         // stable identifier e.g. 'I01'
  name: string;         // canonical display name — used in DB & UI
  slug: string;         // SEO slug
  sector: SectorId;
  active: boolean;
  aliases?: readonly string[];
};

export const INDUSTRIES: readonly Industry[] = [
  {
    code: 'I01',
    name: 'Science & Research',
    slug: 'science-and-research',
    sector: 'S',
    active: true,
    aliases: [
      'scientific research',
      'research institute',
      'r&d institutions',
      'scientific research & r&d institutions',
      'scientific research & development',
      'laboratories & scientific services',
      'laboratory & scientific supply services',
      'testing, inspection, certification & calibration',
      'tic',
      'forensic and toxicology laboratories',
    ],
  },
  {
    code: 'I02',
    name: 'Healthcare & Medical Sciences',
    slug: 'healthcare-and-medical-sciences',
    sector: 'S',
    active: true,
    aliases: [
      'healthcare',
      'medical sciences',
      'hospitals',
      'clinical chemistry & medical laboratory services',
      'healthcare, hospitals & medical laboratories',
      'medical laboratory',
      'pathology',
      'health care, medical',
      'development organisations & ngo laboratory programmes',
    ],
  },
  {
    code: 'I03',
    name: 'Pharmaceuticals & Biotechnology',
    slug: 'pharmaceuticals-and-biotechnology',
    sector: 'S',
    active: true,
    aliases: [
      'pharmaceuticals',
      'pharma',
      'biotechnology',
      'biotech',
      'life sciences',
      'pharmaceuticals & drug manufacturing',
      'biotechnology & life sciences',
      'life sciences & biomedical research',
      'drug manufacturing',
    ],
  },
  {
    code: 'I04',
    name: 'Agriculture & Food Science',
    slug: 'agriculture-and-food-science',
    sector: 'S',
    active: true,
    aliases: [
      'agriculture',
      'agribusiness',
      'food science',
      'food manufacturing',
      'food & beverage manufacturing',
      'food, beverage & brewery laboratories',
      'fertilizers & agrochemicals',
      'tea, coffee & horticulture post-harvest processing',
      'agriculture, agribusiness & agricultural technology',
      'dairy',
      'brewery',
      'horticulture',
    ],
  },
  {
    code: 'I05',
    name: 'Chemicals & Chemical Manufacturing',
    slug: 'chemicals-and-chemical-manufacturing',
    sector: 'S',
    active: true,
    aliases: [
      'chemicals',
      'chemical manufacturing',
      'industrial & basic chemicals',
      'chemicals, paints, polymers & industrial materials',
      'paints, coatings, adhesives & sealants',
      'polymers, plastics & rubber',
      'personal care, cosmetics & fragrances',
      'chemical & process engineering consultancy',
      'cosmetics',
      'plastics',
      'paints',
    ],
  },
  {
    code: 'I06',
    name: 'Manufacturing & Industrial Processing',
    slug: 'manufacturing-and-industrial-processing',
    sector: 'E',
    active: true,
    aliases: [
      'manufacturing',
      'industrial processing',
      'manufacturing & industrial production',
      'chemicals-driven manufacturing & industrial production',
      'paper, pulp & packaging',
      'textiles, apparel & leather manufacturing',
      'industrial production',
      'steel',
      'paper milling',
    ],
  },
  {
    code: 'I07',
    name: 'Energy, Oil & Gas',
    slug: 'energy-oil-and-gas',
    sector: 'E',
    active: true,
    aliases: [
      'energy',
      'oil & gas',
      'oil, gas & petrochemicals',
      'energy, power & utilities',
      'energy, power & renewable energy',
      'petrochemicals, refining & fuels',
      'power',
      'renewable energy',
      'petroleum',
      'utilities',
      'refinery',
    ],
  },
  {
    code: 'I08',
    name: 'Environmental & Natural Sciences',
    slug: 'environmental-and-natural-sciences',
    sector: 'S',
    active: true,
    aliases: [
      'environmental sciences',
      'natural sciences',
      'environmental consulting, eia & air quality',
      'environmental services & conservation',
      'environmental consulting',
      'conservation',
      'ecology',
      'climate change',
      'forestry',
    ],
  },
  {
    code: 'I09',
    name: 'Information Technology & Software',
    slug: 'information-technology-and-software',
    sector: 'T',
    active: true,
    aliases: [
      'information technology',
      'software',
      'it',
      'tech',
      'saas',
      'cloud computing',
      'educational technology (edtech)',
      'edtech',
      'software development',
    ],
  },
  {
    code: 'I10',
    name: 'Telecommunications & Networking',
    slug: 'telecommunications-and-networking',
    sector: 'T',
    active: true,
    aliases: [
      'telecommunications',
      'telecoms',
      'networking',
      'telecom',
      'telecommunications infrastructure',
      'isp',
      'broadband',
      'wireless',
    ],
  },
  {
    code: 'I11',
    name: 'Data Science & Artificial Intelligence',
    slug: 'data-science-and-artificial-intelligence',
    sector: 'T',
    active: true,
    aliases: [
      'data science',
      'artificial intelligence',
      'ai',
      'machine learning',
      'data, artificial intelligence & analytics',
      'big data',
      'business intelligence',
      'deep learning',
    ],
  },
  {
    code: 'I12',
    name: 'Engineering & Construction',
    slug: 'engineering-and-construction',
    sector: 'E',
    active: true,
    aliases: [
      'engineering & construction',
      'construction',
      'construction, infrastructure & built environment',
      'building & construction materials chemistry',
      'civil engineering',
      'infrastructure',
      'structural engineering',
      'cement',
    ],
  },
  {
    code: 'I13',
    name: 'Architecture & Urban Planning',
    slug: 'architecture-and-urban-planning',
    sector: 'E',
    active: true,
    aliases: [
      'architecture',
      'urban planning',
      'town planning',
      'landscape architecture',
      'spatial planning',
      'building design',
      'real estate & facilities management',
    ],
  },
  {
    code: 'I14',
    name: 'Mining, Geology & Earth Sciences',
    slug: 'mining-geology-and-earth-sciences',
    sector: 'E',
    active: true,
    aliases: [
      'mining',
      'geology',
      'earth sciences',
      'mining, geology & assay laboratories',
      'mining, geology & mineral processing',
      'mineral processing & hydrometallurgy',
      'geoscience',
      'mineral exploration',
    ],
  },
  {
    code: 'I15',
    name: 'Water, Sanitation & Waste Management',
    slug: 'water-sanitation-and-waste-management',
    sector: 'E',
    active: true,
    aliases: [
      'water supply & treatment',
      'wastewater & effluent management',
      'waste management & recycling',
      'water, wastewater & water treatment',
      'water treatment',
      'sanitation',
      'effluent',
      'recycling',
      'waste management',
    ],
  },
  {
    code: 'I16',
    name: 'Mathematics, Statistics & Actuarial Science',
    slug: 'mathematics-statistics-and-actuarial-science',
    sector: 'M',
    active: true,
    aliases: [
      'mathematics',
      'statistics',
      'actuarial science',
      'actuarial',
      'quantitative finance',
      'banking, finance & insurance',
    ],
  },
  {
    code: 'I17',
    name: 'Education & STEM Training',
    slug: 'education-and-stem-training',
    sector: 'ED',
    active: true,
    aliases: [
      'education',
      'stem training',
      'education & training — schools',
      'education & training — universities, tvet & professional',
      'schools & secondary education',
      'universities & higher education',
      'technical & vocational education and training (tvet)',
      'stem training & professional development',
      'tvet',
      'university',
      'college',
    ],
  },
  {
    code: 'I18',
    name: 'Aerospace & Aviation',
    slug: 'aerospace-and-aviation',
    sector: 'E',
    active: true,
    aliases: [
      'aerospace',
      'aviation',
      'aerospace & defence',
      'aviation & aerospace services',
      'aeronautical',
      'avionics',
      'airlines technical',
    ],
  },
  {
    code: 'I19',
    name: 'Automotive & Transport Technology',
    slug: 'automotive-and-transport-technology',
    sector: 'E',
    active: true,
    aliases: [
      'automotive',
      'transport technology',
      'automotive & transport equipment',
      'transport engineering',
      'ev technology',
      'vehicle assembly',
    ],
  },
  {
    code: 'I20',
    name: 'Electronics & Electrical Equipment',
    slug: 'electronics-and-electrical-equipment',
    sector: 'T',
    active: true,
    aliases: [
      'electronics',
      'electrical equipment',
      'electrical & electronics manufacturing',
      'semiconductor',
      'hardware',
      'embedded systems',
      'circuit design',
    ],
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// JOB FUNCTION FAMILIES
// ─────────────────────────────────────────────────────────────────────────────

export type FamilyId = 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9';

export type FunctionFamily = {
  id: FamilyId;
  name: string;
  slug: string;
};

export const FUNCTION_FAMILIES: readonly FunctionFamily[] = [
  { id: 'F1', name: 'Scientific Research & Laboratory Analysis', slug: 'scientific-research-and-laboratory-analysis' },
  { id: 'F2', name: 'Healthcare & Clinical Practice', slug: 'healthcare-and-clinical-practice' },
  { id: 'F3', name: 'Software & Information Technology', slug: 'software-and-information-technology' },
  { id: 'F4', name: 'Data Science, AI & Mathematics', slug: 'data-science-ai-and-mathematics' },
  { id: 'F5', name: 'Engineering & Built Environment', slug: 'engineering-and-built-environment' },
  { id: 'F6', name: 'Production, Operations & Technical Maintenance', slug: 'production-operations-and-technical-maintenance' },
  { id: 'F7', name: 'Quality, Safety & Regulation', slug: 'quality-safety-and-regulation' },
  { id: 'F8', name: 'Agriculture, Environment & Natural Resources', slug: 'agriculture-environment-and-natural-resources' },
  { id: 'F9', name: 'Commercial, Project Management & STEM Education', slug: 'commercial-project-management-and-stem-education' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// JOB FUNCTIONS (Level 2 — 36 Canonical STEM Functions)
// ─────────────────────────────────────────────────────────────────────────────

export type JobFunction = {
  code: string;
  name: string;
  slug: string;
  family: FamilyId;
  active: boolean;
  stemCore: boolean;
  aliases?: readonly string[];
};

export const JOB_FUNCTIONS: readonly JobFunction[] = [
  {
    code: 'J01',
    name: 'Research & Development',
    slug: 'research-and-development',
    family: 'F1',
    active: true,
    stemCore: true,
    aliases: ['r&d', 'research & development (r&d)', 'research scientist', 'scientific researcher', 'postdoctoral researcher'],
  },
  {
    code: 'J02',
    name: 'Laboratory & Scientific Analysis',
    slug: 'laboratory-and-scientific-analysis',
    family: 'F1',
    active: true,
    stemCore: true,
    aliases: [
      'analytical & instrumental chemistry',
      'analytical chemistry',
      'laboratory operations & management',
      'laboratory operations & testing',
      'laboratory technician & sample handling',
      'forensic & toxicology analysis',
      'method development & validation',
      'metrology, calibration & lab accreditation (iso 17025)',
      'lab analyst',
      'lab technician',
      'chemist',
    ],
  },
  {
    code: 'J03',
    name: 'Clinical & Medical Practice',
    slug: 'clinical-and-medical-practice',
    family: 'F2',
    active: true,
    stemCore: true,
    aliases: [
      'medical doctor',
      'physician',
      'clinical officer',
      'clinical research & trials',
      'clinical research & trials (chemistry-relevant)',
      'public health science & epidemiology',
      'pharmacist',
      'surgeon',
    ],
  },
  {
    code: 'J04',
    name: 'Nursing & Patient Care',
    slug: 'nursing-and-patient-care',
    family: 'F2',
    active: true,
    stemCore: true,
    aliases: ['nurse', 'nursing', 'registered nurse', 'patient care', 'midwife', 'clinical nurse'],
  },
  {
    code: 'J05',
    name: 'Medical Laboratory & Diagnostics',
    slug: 'medical-laboratory-and-diagnostics',
    family: 'F2',
    active: true,
    stemCore: true,
    aliases: ['medical laboratory', 'diagnostics', 'medical lab scientist', 'pathology technician', 'biomedical engineering', 'radiographer'],
  },
  {
    code: 'J06',
    name: 'Pharmaceutical & Drug Development',
    slug: 'pharmaceutical-and-drug-development',
    family: 'F1',
    active: true,
    stemCore: true,
    aliases: ['formulation & product development', 'product development & formulation', 'pharmaceutical development', 'drug formulation', 'pharmacology research'],
  },
  {
    code: 'J07',
    name: 'Quality Assurance & Quality Control',
    slug: 'quality-assurance-and-quality-control',
    family: 'F7',
    active: true,
    stemCore: true,
    aliases: [
      'quality control (qc)',
      'quality assurance & qms',
      'quality assurance & quality management',
      'qa',
      'qc',
      'qms',
      'quality officer',
      'qc analyst',
    ],
  },
  {
    code: 'J08',
    name: 'Production & Manufacturing',
    slug: 'production-and-manufacturing',
    family: 'F6',
    active: true,
    stemCore: true,
    aliases: [
      'production & plant operations management',
      'production & manufacturing operations',
      'industrial & manufacturing engineering',
      'manufacturing operations',
      'plant supervisor',
      'production engineer',
    ],
  },
  {
    code: 'J09',
    name: 'Process Engineering & Operations',
    slug: 'process-engineering-and-operations',
    family: 'F5',
    active: true,
    stemCore: true,
    aliases: [
      'process operations & plant optimisation',
      'process optimisation & production planning',
      'operations engineering',
      'process technologist',
      'plant operations',
    ],
  },
  {
    code: 'J10',
    name: 'Chemical Engineering & Processing',
    slug: 'chemical-engineering-and-processing',
    family: 'F5',
    active: true,
    stemCore: true,
    aliases: [
      'chemical & process engineering',
      'materials & polymer science',
      'materials science & engineering',
      'chemical engineer',
      'polymer engineer',
      'process chemist',
    ],
  },
  {
    code: 'J11',
    name: 'Mechanical Engineering',
    slug: 'mechanical-engineering',
    family: 'F5',
    active: true,
    stemCore: true,
    aliases: ['mechanical engineer', 'mechanical technician', 'mechatronics', 'hvac engineer', 'automotive engineer'],
  },
  {
    code: 'J12',
    name: 'Electrical & Electronics Engineering',
    slug: 'electrical-and-electronics-engineering',
    family: 'F5',
    active: true,
    stemCore: true,
    aliases: ['electrical engineer', 'electronics engineer', 'power systems engineer', 'electrical technician'],
  },
  {
    code: 'J13',
    name: 'Civil & Structural Engineering',
    slug: 'civil-and-structural-engineering',
    family: 'F5',
    active: true,
    stemCore: true,
    aliases: ['civil engineer', 'structural engineer', 'site engineer', 'construction engineer', 'bridge engineer', 'geotechnical engineer'],
  },
  {
    code: 'J14',
    name: 'Software Development & Programming',
    slug: 'software-development-and-programming',
    family: 'F3',
    active: true,
    stemCore: true,
    aliases: [
      'software development & engineering',
      'software engineer',
      'full stack developer',
      'frontend developer',
      'backend developer',
      'mobile developer',
      'cloud computing & devops',
      'devops engineer',
    ],
  },
  {
    code: 'J15',
    name: 'IT Support & Systems Administration',
    slug: 'it-support-and-systems-administration',
    family: 'F3',
    active: true,
    stemCore: true,
    aliases: [
      'it infrastructure, systems & support',
      'systems administrator',
      'it support',
      'helpdesk engineer',
      'network administrator',
      'system admin',
      'laboratory information systems (lims) & informatics',
    ],
  },
  {
    code: 'J16',
    name: 'Cybersecurity & Information Security',
    slug: 'cybersecurity-and-information-security',
    family: 'F3',
    active: true,
    stemCore: true,
    aliases: ['cybersecurity', 'infosec', 'security analyst', 'soc analyst', 'penetration tester', 'information security officer'],
  },
  {
    code: 'J17',
    name: 'Data Science & Analytics',
    slug: 'data-science-and-analytics',
    family: 'F4',
    active: true,
    stemCore: true,
    aliases: [
      'data science, analytics & artificial intelligence',
      'data analyst',
      'data engineer',
      'business intelligence analyst',
      'bi analyst',
      'biostatistics & bioinformatics',
      'scientific data management',
      'chemometrics, data science & statistics for lab systems',
    ],
  },
  {
    code: 'J18',
    name: 'Artificial Intelligence & Machine Learning',
    slug: 'artificial-intelligence-and-machine-learning',
    family: 'F4',
    active: true,
    stemCore: true,
    aliases: ['ai engineer', 'machine learning engineer', 'ml engineer', 'deep learning', 'nlp engineer', 'computational intelligence'],
  },
  {
    code: 'J19',
    name: 'Telecommunications & Network Engineering',
    slug: 'telecommunications-and-network-engineering',
    family: 'F3',
    active: true,
    stemCore: true,
    aliases: ['networking & telecommunications', 'telecom engineer', 'rf engineer', 'network engineer', 'transmission engineer', 'fibre engineer'],
  },
  {
    code: 'J20',
    name: 'Architecture & Design',
    slug: 'architecture-and-design',
    family: 'F5',
    active: true,
    stemCore: true,
    aliases: ['architect', 'architectural designer', 'urban designer', 'landscape architect', 'interior architect'],
  },
  {
    code: 'J21',
    name: 'Surveying, GIS & Geospatial Analysis',
    slug: 'surveying-gis-and-geospatial-analysis',
    family: 'F5',
    active: true,
    stemCore: true,
    aliases: ['surveying & geospatial science', 'land surveyor', 'gis analyst', 'geospatial engineer', 'cartographer', 'photogrammetry'],
  },
  {
    code: 'J22',
    name: 'Environmental Management & Sustainability',
    slug: 'environmental-management-and-sustainability',
    family: 'F8',
    active: true,
    stemCore: true,
    aliases: ['environmental science & management', 'environmental officer', 'sustainability specialist', 'eia expert', 'conservation officer'],
  },
  {
    code: 'J23',
    name: 'Occupational Health, Safety & EHS',
    slug: 'occupational-health-safety-and-ehs',
    family: 'F7',
    active: true,
    stemCore: true,
    aliases: ['hse & process safety', 'health, safety & process risk management', 'ehs officer', 'osh officer', 'safety engineer'],
  },
  {
    code: 'J24',
    name: 'Agriculture & Agronomy',
    slug: 'agriculture-and-agronomy',
    family: 'F8',
    active: true,
    stemCore: true,
    aliases: ['agricultural science & technology', 'agronomist', 'crop scientist', 'soil scientist', 'agricultural officer', 'horticulturist'],
  },
  {
    code: 'J25',
    name: 'Food Science & Technology',
    slug: 'food-science-and-technology',
    family: 'F8',
    active: true,
    stemCore: true,
    aliases: ['food technologist', 'food safety officer', 'haccp specialist', 'brewery chemist', 'sensory analyst'],
  },
  {
    code: 'J26',
    name: 'Biotechnology & Microbiology',
    slug: 'biotechnology-and-microbiology',
    family: 'F1',
    active: true,
    stemCore: true,
    aliases: ['microbiology & biotechnology', 'microbiologist', 'biotechnologist', 'molecular biologist', 'fermentation scientist'],
  },
  {
    code: 'J27',
    name: 'Mathematics, Statistics & Actuarial Analysis',
    slug: 'mathematics-statistics-and-actuarial-analysis',
    family: 'F4',
    active: true,
    stemCore: true,
    aliases: [
      'mathematics, statistics & actuarial science',
      'mathematician',
      'statistician',
      'actuary',
      'actuarial analyst',
      'operations research & optimisation',
      'quantitative analyst',
    ],
  },
  {
    code: 'J28',
    name: 'Instrumentation, Automation & Control',
    slug: 'instrumentation-automation-and-control',
    family: 'F6',
    active: true,
    stemCore: true,
    aliases: [
      'instrumentation & control',
      'instrumentation, control & metrology',
      'robotics, mechatronics & automation',
      'plc programmer',
      'scada engineer',
      'control systems engineer',
    ],
  },
  {
    code: 'J29',
    name: 'Technical Maintenance & Reliability',
    slug: 'technical-maintenance-and-reliability',
    family: 'F6',
    active: true,
    stemCore: true,
    aliases: ['maintenance & reliability engineering', 'maintenance engineer', 'reliability engineer', 'plant technician'],
  },
  {
    code: 'J30',
    name: 'Energy & Renewable Energy Engineering',
    slug: 'energy-and-renewable-energy-engineering',
    family: 'F8',
    active: true,
    stemCore: true,
    aliases: ['energy & utilities process', 'energy systems & renewable energy', 'solar engineer', 'energy auditor', 'power engineer'],
  },
  {
    code: 'J31',
    name: 'Mining & Mineral Processing',
    slug: 'mining-and-mineral-processing',
    family: 'F8',
    active: true,
    stemCore: true,
    aliases: ['mining, assay & mineral processing', 'geology, geoscience & mineral exploration', 'mining engineer', 'metallurgist', 'mineral processing engineer', 'geologist'],
  },
  {
    code: 'J32',
    name: 'Water Treatment & Wastewater Management',
    slug: 'water-treatment-and-wastewater-management',
    family: 'F8',
    active: true,
    stemCore: true,
    aliases: ['water & wastewater treatment operations', 'water & wastewater engineering', 'water treatment engineer', 'effluent treatment operator'],
  },
  {
    code: 'J33',
    name: 'Technical Sales & Applications Engineering',
    slug: 'technical-sales-and-applications-engineering',
    family: 'F9',
    active: true,
    stemCore: true,
    aliases: [
      'technical sales & business development (chemistry)',
      'technical sales & business development',
      'applications, technical support & field service',
      'applications engineer',
      'field service engineer',
      'technical sales engineer',
    ],
  },
  {
    code: 'J34',
    name: 'STEM Education, Training & Instruction',
    slug: 'stem-education-training-and-instruction',
    family: 'F9',
    active: true,
    stemCore: true,
    aliases: [
      'chemistry teaching, training & science communication',
      'stem education, teaching & curriculum development',
      'technical training, academic research & science communication',
      'science teacher',
      'engineering lecturer',
      'mathematics teacher',
      'stem trainer',
    ],
  },
  {
    code: 'J35',
    name: 'Technical Project Management',
    slug: 'technical-project-management',
    family: 'F9',
    active: true,
    stemCore: true,
    aliases: [
      'technical project management & operations',
      'engineering project manager',
      'it project manager',
      'procurement, warehousing & supply chain (lab/chemical)',
      'technical procurement & supply chain',
    ],
  },
  {
    code: 'J36',
    name: 'Regulatory Affairs & Compliance',
    slug: 'regulatory-affairs-and-compliance',
    family: 'F7',
    active: true,
    stemCore: true,
    aliases: ['regulatory affairs', 'compliance officer', 'standards compliance', 'regulatory specialist'],
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// DEGREE FIELDS (advisory — used for CV/profile matching & STEM relevance)
// ─────────────────────────────────────────────────────────────────────────────

export const DEGREE_FIELDS: readonly string[] = [
  'Computer Science & Software Engineering',
  'Information Technology & Systems',
  'Data Science & Artificial Intelligence',
  'Electrical & Electronics Engineering',
  'Mechanical & Mechatronics Engineering',
  'Civil & Structural Engineering',
  'Architecture & Urban Planning',
  'Chemistry & Industrial Chemistry',
  'Chemical & Process Engineering',
  'Biochemistry & Molecular Biology',
  'Biotechnology & Microbiology',
  'Medicine & Surgery (MBChB)',
  'Nursing & Health Sciences',
  'Pharmacy & Pharmacology',
  'Medical Laboratory Science & Pathology',
  'Mathematics & Statistics',
  'Actuarial Science',
  'Physics & Applied Physics',
  'Geology, Geoscience & Mining Engineering',
  'Agriculture, Agronomy & Food Science',
  'Environmental Science & Natural Resources',
  'Telecommunications & Network Engineering',
  'Aerospace & Aeronautical Engineering',
  'Materials Science & Metallurgy',
  'Water & Environmental Engineering',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Derived lists (consumed across the codebase)
// ─────────────────────────────────────────────────────────────────────────────

export const ACTIVE_INDUSTRIES = INDUSTRIES.filter((i) => i.active);
export const ACTIVE_JOB_FUNCTIONS = JOB_FUNCTIONS.filter((f) => f.active);

export const ACTIVE_INDUSTRY_NAMES: readonly string[] = ACTIVE_INDUSTRIES.map((i) => i.name);
export const ACTIVE_JOB_FUNCTION_NAMES: readonly string[] = ACTIVE_JOB_FUNCTIONS.map((f) => f.name);

export const STEM_CORE_FUNCTION_NAMES: readonly string[] = ACTIVE_JOB_FUNCTIONS
  .filter((f) => f.stemCore)
  .map((f) => f.name);

// Backward-compat alias for any code expecting chemistry-core function names
export const CHEMISTRY_CORE_FUNCTION_NAMES: readonly string[] = STEM_CORE_FUNCTION_NAMES;

export function industryToSector(code: string): Sector | undefined {
  const ind = INDUSTRIES.find((i) => i.code === code);
  return ind ? SECTORS.find((s) => s.id === ind.sector) : undefined;
}

/** Lookup industry by canonical name (case-insensitive). */
export function findIndustryByName(name: string): Industry | undefined {
  const n = name.toLowerCase().trim();
  return INDUSTRIES.find((i) => i.name.toLowerCase() === n);
}

/** Lookup function by canonical name (case-insensitive). */
export function findFunctionByName(name: string): JobFunction | undefined {
  const n = name.toLowerCase().trim();
  return JOB_FUNCTIONS.find((f) => f.name.toLowerCase() === n);
}

// ─────────────────────────────────────────────────────────────────────────────
// MIGRATION MAPS — legacy / StemBird taxonomy → new StemBird STEM taxonomy
// ─────────────────────────────────────────────────────────────────────────────

export const INDUSTRY_MIGRATION: Readonly<Record<string, readonly string[]>> = {
  // Legacy / StemBird → Canonical StemBird
  'Industrial & Basic Chemicals': ['Chemicals & Chemical Manufacturing'],
  'Fertilizers & Agrochemicals': ['Agriculture & Food Science'],
  'Paints, Coatings, Adhesives & Sealants': ['Chemicals & Chemical Manufacturing'],
  'Polymers, Plastics & Rubber': ['Chemicals & Chemical Manufacturing'],
  'Personal Care, Cosmetics & Fragrances': ['Chemicals & Chemical Manufacturing'],
  'Petrochemicals, Refining & Fuels': ['Energy, Oil & Gas'],
  'Building & Construction Materials Chemistry': ['Engineering & Construction'],
  'Pharmaceuticals & Drug Manufacturing': ['Pharmaceuticals & Biotechnology'],
  'Biotechnology & Life Sciences': ['Pharmaceuticals & Biotechnology'],
  'Clinical Chemistry & Medical Laboratory Services': ['Healthcare & Medical Sciences'],
  'Forensic & Toxicology Laboratories': ['Science & Research'],
  'Food, Beverage & Brewery Laboratories': ['Agriculture & Food Science'],
  'Energy, Power & Utilities': ['Energy, Oil & Gas'],
  'Chemicals-Driven Manufacturing & Industrial Production': ['Manufacturing & Industrial Processing'],
  'Tea, Coffee & Horticulture Post-Harvest Processing': ['Agriculture & Food Science'],
  'Water Supply & Treatment': ['Water, Sanitation & Waste Management'],
  'Wastewater & Effluent Management': ['Water, Sanitation & Waste Management'],
  'Environmental Consulting, EIA & Air Quality': ['Environmental & Natural Sciences'],
  'Waste Management & Recycling': ['Water, Sanitation & Waste Management'],
  'Mining, Geology & Assay Laboratories': ['Mining, Geology & Earth Sciences'],
  'Mineral Processing & Hydrometallurgy': ['Mining, Geology & Earth Sciences'],
  'Scientific Research & R&D Institutions': ['Science & Research'],
  'Regulatory, Standards & Public Health Authorities': ['Science & Research'],
  'Development Organisations & NGO Laboratory Programmes': ['Healthcare & Medical Sciences'],
  'Testing, Inspection, Certification & Calibration': ['Science & Research'],
  'Laboratory & Scientific Supply Services': ['Science & Research'],
  'Chemical & Process Engineering Consultancy': ['Chemicals & Chemical Manufacturing'],
  'Education & Training — Schools': ['Education & STEM Training'],
  'Education & Training — Universities, TVET & Professional': ['Education & STEM Training'],

  // Older CareerSasa / STEM sets
  'Chemicals, Paints, Polymers & Industrial Materials': ['Chemicals & Chemical Manufacturing'],
  'Manufacturing & Industrial Production': ['Manufacturing & Industrial Processing'],
  'Food & Beverage Manufacturing': ['Agriculture & Food Science'],
  'Agriculture, Agribusiness & Agricultural Technology': ['Agriculture & Food Science'],
  'Pharmaceuticals & Biotechnology': ['Pharmaceuticals & Biotechnology'],
  'Healthcare, Hospitals & Medical Laboratories': ['Healthcare & Medical Sciences'],
  'Oil, Gas & Petrochemicals': ['Energy, Oil & Gas'],
  'Energy, Power & Renewable Energy': ['Energy, Oil & Gas'],
  'Water, Wastewater & Water Treatment': ['Water, Sanitation & Waste Management'],
  'Environmental Services & Conservation': ['Environmental & Natural Sciences'],
  'Mining, Geology & Mineral Processing': ['Mining, Geology & Earth Sciences'],
  'Construction, Infrastructure & Built Environment': ['Engineering & Construction'],
  'Electrical & Electronics Manufacturing': ['Electronics & Electrical Equipment'],
  'Automotive & Transport Equipment': ['Automotive & Transport Technology'],
  'Aerospace & Defence': ['Aerospace & Aviation'],
  'Aviation & Aerospace Services': ['Aerospace & Aviation'],
  'Information Technology & Software': ['Information Technology & Software'],
  'Telecommunications & Networking': ['Telecommunications & Networking'],
  'Telecommunications Infrastructure': ['Telecommunications & Networking'],
  'Data, Artificial Intelligence & Analytics': ['Data Science & Artificial Intelligence'],
  'Banking, Finance & Insurance': ['Mathematics, Statistics & Actuarial Science'],
  'Scientific Research & Development': ['Science & Research'],
  'Schools & Secondary Education': ['Education & STEM Training'],
  'Universities & Higher Education': ['Education & STEM Training'],
  'Technical & Vocational Education and Training (TVET)': ['Education & STEM Training'],
  'STEM Training & Professional Development': ['Education & STEM Training'],
  'Educational Technology (EdTech)': ['Information Technology & Software'],
  'Life Sciences & Biomedical Research': ['Pharmaceuticals & Biotechnology'],
  'Laboratories & Scientific Services': ['Science & Research'],
  'Real Estate & Facilities Management': ['Architecture & Urban Planning'],
  'Paper, Pulp & Packaging': ['Manufacturing & Industrial Processing'],
  'Textiles, Apparel & Leather Manufacturing': ['Manufacturing & Industrial Processing'],
  'Government & Public Sector': ['Science & Research'],
  'NGOs, Development & International Organisations': ['Healthcare & Medical Sciences'],
  'Logistics, Supply Chain & Distribution': ['Manufacturing & Industrial Processing'],
  'Consumer Goods & Retail': ['Chemicals & Chemical Manufacturing'],
};

export const FUNCTION_MIGRATION: Readonly<Record<string, readonly string[]>> = {
  // StemBird → Canonical StemBird
  'Analytical & Instrumental Chemistry': ['Laboratory & Scientific Analysis'],
  'Analytical Chemistry': ['Laboratory & Scientific Analysis'],
  'Laboratory Operations & Management': ['Laboratory & Scientific Analysis'],
  'Laboratory Operations & Testing': ['Laboratory & Scientific Analysis'],
  'Laboratory Technician & Sample Handling': ['Laboratory & Scientific Analysis'],
  'Microbiology & Molecular Analysis (Product/Quality)': ['Biotechnology & Microbiology'],
  'Microbiology & Biotechnology': ['Biotechnology & Microbiology'],
  'Forensic & Toxicology Analysis': ['Laboratory & Scientific Analysis'],
  'Method Development & Validation': ['Research & Development'],
  'Research & Development (R&D)': ['Research & Development'],
  'Clinical Research & Trials (Chemistry-Relevant)': ['Clinical & Medical Practice'],
  'Clinical Research & Trials': ['Clinical & Medical Practice'],
  'Formulation & Product Development': ['Pharmaceutical & Drug Development'],
  'Product Development & Formulation': ['Pharmaceutical & Drug Development'],
  'Chemical & Process Engineering': ['Chemical Engineering & Processing'],
  'Process Operations & Plant Optimisation': ['Process Engineering & Operations'],
  'Process Optimisation & Production Planning': ['Process Engineering & Operations'],
  'Production & Plant Operations Management': ['Production & Manufacturing'],
  'Production & Manufacturing Operations': ['Production & Manufacturing'],
  'Industrial & Manufacturing Engineering': ['Production & Manufacturing'],
  'Materials & Polymer Science': ['Chemical Engineering & Processing'],
  'Materials Science & Engineering': ['Chemical Engineering & Processing'],
  'Mining, Assay & Mineral Processing': ['Mining & Mineral Processing'],
  'Mining & Mineral Processing': ['Mining & Mineral Processing'],
  'Geology, Geoscience & Mineral Exploration': ['Mining & Mineral Processing'],
  'Energy & Utilities Process': ['Energy & Renewable Energy Engineering'],
  'Energy Systems & Renewable Energy': ['Energy & Renewable Energy Engineering'],
  'Water & Wastewater Treatment Operations': ['Water Treatment & Wastewater Management'],
  'Water & Wastewater Engineering': ['Water Treatment & Wastewater Management'],
  'Quality Control (QC)': ['Quality Assurance & Quality Control'],
  'Quality Assurance & QMS': ['Quality Assurance & Quality Control'],
  'Quality Assurance & Quality Management': ['Quality Assurance & Quality Control'],
  'Regulatory Affairs & Compliance': ['Regulatory Affairs & Compliance'],
  'Metrology, Calibration & Lab Accreditation (ISO 17025)': ['Laboratory & Scientific Analysis'],
  'Instrumentation & Control': ['Instrumentation, Automation & Control'],
  'Instrumentation, Control & Metrology': ['Instrumentation, Automation & Control'],
  'Maintenance & Reliability Engineering': ['Technical Maintenance & Reliability'],
  'HSE & Process Safety': ['Occupational Health, Safety & EHS'],
  'Health, Safety & Process Risk Management': ['Occupational Health, Safety & EHS'],
  'Technical Sales & Business Development (Chemistry)': ['Technical Sales & Applications Engineering'],
  'Technical Sales & Business Development': ['Technical Sales & Applications Engineering'],
  'Applications, Technical Support & Field Service': ['Technical Sales & Applications Engineering'],
  'Technical Support & Field Service': ['IT Support & Systems Administration'],
  'Procurement, Warehousing & Supply Chain (Lab/Chemical)': ['Technical Project Management'],
  'Technical Procurement & Supply Chain': ['Technical Project Management'],
  'Technical Project Management': ['Technical Project Management'],
  'Technical Project Management & Operations': ['Technical Project Management'],
  'Laboratory Information Systems (LIMS) & Informatics': ['IT Support & Systems Administration'],
  'Cheminformatics & Computational Chemistry': ['Data Science & Analytics'],
  'Chemometrics, Data Science & Statistics for Lab Systems': ['Data Science & Analytics'],
  'Chemistry Teaching, Training & Science Communication': ['STEM Education, Training & Instruction'],
  'STEM Education, Teaching & Curriculum Development': ['STEM Education, Training & Instruction'],
  'Technical Training, Academic Research & Science Communication': ['STEM Education, Training & Instruction'],

  // Previous STEM Functions
  'Biostatistics & Bioinformatics': ['Data Science & Analytics'],
  'Scientific Data Management': ['Data Science & Analytics'],
  'Data Science, Analytics & Artificial Intelligence': ['Data Science & Analytics'],
  'Mathematics, Statistics & Actuarial Science': ['Mathematics, Statistics & Actuarial Analysis'],
  'Operations Research & Optimisation': ['Mathematics, Statistics & Actuarial Analysis'],
  'Robotics, Mechatronics & Automation': ['Instrumentation, Automation & Control'],
  'Mechanical Engineering': ['Mechanical Engineering'],
  'Electrical & Electronics Engineering': ['Electrical & Electronics Engineering'],
  'Civil & Structural Engineering': ['Civil & Structural Engineering'],
  'Biomedical Engineering': ['Medical Laboratory & Diagnostics'],
  'Surveying & Geospatial Science': ['Surveying, GIS & Geospatial Analysis'],
  'Software Development & Engineering': ['Software Development & Programming'],
  'IT Infrastructure, Systems & Support': ['IT Support & Systems Administration'],
  'Cybersecurity': ['Cybersecurity & Information Security'],
  'Cloud Computing & DevOps': ['Software Development & Programming'],
  'Networking & Telecommunications': ['Telecommunications & Network Engineering'],
  'Environmental Science & Management': ['Environmental Management & Sustainability'],
  'Public Health Science & Epidemiology': ['Clinical & Medical Practice'],
  'Agricultural Science & Technology': ['Agriculture & Agronomy'],
  'Food Science & Technology': ['Food Science & Technology'],
};

/**
 * Free-text / scrape industry labels → canonical StemBird industry names.
 */
export const EXTRA_INDUSTRY_ALIASES: Readonly<Record<string, string>> = {
  // Common free-text / scrape variations
  governmental: 'Science & Research',
  government: 'Science & Research',
  'public sector': 'Science & Research',
  pharmaceuticals: 'Pharmaceuticals & Biotechnology',
  pharmaceutical: 'Pharmaceuticals & Biotechnology',
  pharma: 'Pharmaceuticals & Biotechnology',
  biotechnology: 'Pharmaceuticals & Biotechnology',
  biotech: 'Pharmaceuticals & Biotechnology',
  'health care, medical': 'Healthcare & Medical Sciences',
  healthcare: 'Healthcare & Medical Sciences',
  hospital: 'Healthcare & Medical Sciences',
  'medical services': 'Healthcare & Medical Sciences',
  'consumer goods': 'Chemicals & Chemical Manufacturing',
  fmcg: 'Manufacturing & Industrial Processing',
  'ngo/non-profit': 'Healthcare & Medical Sciences',
  'ngo / non-profit': 'Healthcare & Medical Sciences',
  'paper milling': 'Manufacturing & Industrial Processing',
  manufacturing: 'Manufacturing & Industrial Processing',
  'transportation, logistics, storage': 'Automotive & Transport Technology',
  'construction, renovation, maintenance': 'Engineering & Construction',
  'consulting, business support, auditing': 'Science & Research',
  'global wines & spirits': 'Agriculture & Food Science',
  'wines & spirits': 'Agriculture & Food Science',
  brewery: 'Agriculture & Food Science',
  beverage: 'Agriculture & Food Science',
  dairy: 'Agriculture & Food Science',
  cement: 'Engineering & Construction',
  'water treatment': 'Water, Sanitation & Waste Management',
  wastewater: 'Water, Sanitation & Waste Management',
  assay: 'Mining, Geology & Earth Sciences',
  refinery: 'Energy, Oil & Gas',
  'oil and gas': 'Energy, Oil & Gas',
  cosmetics: 'Chemicals & Chemical Manufacturing',
  'personal care': 'Chemicals & Chemical Manufacturing',
  tea: 'Agriculture & Food Science',
  coffee: 'Agriculture & Food Science',
  kebs: 'Science & Research',
  'testing laboratory': 'Science & Research',
  software: 'Information Technology & Software',
  it: 'Information Technology & Software',
  telecom: 'Telecommunications & Networking',
  telecoms: 'Telecommunications & Networking',
  'data science': 'Data Science & Artificial Intelligence',
  ai: 'Data Science & Artificial Intelligence',
  aviation: 'Aerospace & Aviation',
  automotive: 'Automotive & Transport Technology',
  electronics: 'Electronics & Electrical Equipment',
};
