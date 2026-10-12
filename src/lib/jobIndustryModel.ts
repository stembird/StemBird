/**
 * Job-function → professional model image mapping for share cards / OG images.
 * Images live in public/assets/job-thumbnails/ and are fetched at runtime
 * (not imported into the Edge OG bundle) to stay under Vercel's ~500KB limit.
 *
 * All portraits are Black / Kenyan professionals. Matching is function-first
 * with word-boundary title fallback so "Hospitality" never resolves as
 * "hospital" (nurse) and "Nairobi" never resolves as "AI".
 */

import { OG_FETCH_TIMEOUT_MS, fetchWithTimeout } from '@/lib/ogFetch';
import { FALLBACK_JOB_FUNCTIONS } from '@/lib/jobParseNormalization';

export type JobIndustryModelCategory =
  | 'healthcare'
  | 'health-safety'
  | 'technology'
  | 'education'
  | 'finance'
  | 'food-services'
  | 'hospitality'
  | 'tourism'
  | 'agriculture'
  | 'veterinary'
  | 'construction'
  | 'engineering'
  | 'retail'
  | 'government'
  | 'creative'
  | 'marketing'
  | 'professional'
  | 'driver'
  | 'security'
  | 'legal'
  | 'hr'
  | 'science'
  | 'beauty'
  | 'sports'
  | 'manufacturing'
  | 'community'
  | 'customer-service'
  | 'maintenance'
  | 'real-estate'
  | 'environment'
  | 'sales'
  | 'telecommunications';

/** Filename under /assets/job-thumbnails/ for each category */
export const INDUSTRY_MODEL_FILENAMES: Record<JobIndustryModelCategory, string> = {
  healthcare: 'healthcare-professional.jpg',
  'health-safety': 'health-safety-professional.jpg',
  technology: 'technology-professional.jpg',
  education: 'education-professional.jpg',
  finance: 'finance-professional.jpg',
  'food-services': 'food-services-professional.jpg',
  hospitality: 'hospitality-professional.jpg',
  tourism: 'tourism-professional.jpg',
  agriculture: 'agriculture-professional.jpg',
  veterinary: 'veterinary-professional.jpg',
  construction: 'construction-professional.jpg',
  engineering: 'engineering-professional.jpg',
  retail: 'retail-professional.jpg',
  government: 'government-professional.jpg',
  creative: 'creative-professional.jpg',
  marketing: 'marketing-professional.jpg',
  professional: 'professional-default.jpg',
  driver: 'driver-professional.jpg',
  security: 'security-professional.jpg',
  legal: 'legal-professional.jpg',
  hr: 'hr-professional.jpg',
  science: 'science-professional.jpg',
  beauty: 'beauty-professional.jpg',
  sports: 'sports-professional.jpg',
  manufacturing: 'manufacturing-professional.jpg',
  community: 'community-professional.jpg',
  'customer-service': 'customer-service-professional.jpg',
  maintenance: 'maintenance-professional.jpg',
  'real-estate': 'real-estate-professional.jpg',
  environment: 'environment-professional.jpg',
  sales: 'sales-professional.jpg',
  telecommunications: 'telecommunications-professional.jpg',
};

/**
 * Canonical Careersasa job function → portrait category.
 * Every FALLBACK_JOB_FUNCTIONS entry must appear here.
 */
export const JOB_FUNCTION_MODEL_CATEGORY: Record<
  (typeof FALLBACK_JOB_FUNCTIONS)[number],
  JobIndustryModelCategory
> = {
  'Accounting, Auditing & Finance': 'finance',
  'Admin & Office': 'professional',
  'Agriculture, Food & Natural Resources': 'agriculture',
  'Building & Architecture': 'construction',
  'Community & Social Services': 'community',
  'Consulting & Strategy': 'professional',
  'Creative & Design': 'creative',
  'Customer Service & Support': 'customer-service',
  'Driver & Transport Services': 'driver',
  'Education & Training': 'education',
  'Engineering & Technology': 'engineering',
  'Environment, Energy & Natural Resources': 'environment',
  'Estate Agents & Property Management': 'real-estate',
  'Farming & Veterinary': 'veterinary',
  'Food Services & Catering': 'food-services',
  'Health & Safety': 'health-safety',
  'Healthcare & Medical': 'healthcare',
  'Hospitality & Leisure': 'hospitality',
  'Human Resources & Recruitment': 'hr',
  'IT & Software': 'technology',
  'Legal Services': 'legal',
  'Management & Business Development': 'professional',
  'Manufacturing & Warehousing': 'manufacturing',
  'Marketing & Communications': 'marketing',
  'Product & Project Management': 'professional',
  'Quality Control & Assurance': 'manufacturing',
  'Research, Teaching & Training': 'education',
  Sales: 'sales',
  Security: 'security',
  'Supply Chain & Procurement': 'manufacturing',
  'Trades & Services': 'maintenance',
  'Travel, Tourism & Leisure': 'tourism',
  'Volunteer & NGO Work': 'community',
  'Government & Public Service': 'government',
  'Banking, Insurance & Financial Services': 'finance',
  'Media, Advertising & PR': 'marketing',
  'Science & Laboratory': 'science',
  Telecommunications: 'telecommunications',
  'Sports, Fitness & Recreation': 'sports',
  'NGO, NPO & Charity': 'community',
  'Beauty, Wellness & Fitness': 'beauty',
  'Real Estate & Construction': 'construction',
  'Logistics & Transportation': 'driver',
  'Retail, Fashion & FMCG': 'retail',
  'Maintenance, Repair & Installation': 'maintenance',
  'Data, Analytics & AI': 'technology',
  'Other / Miscellaneous': 'professional',
};

const FUNCTION_CATEGORY_BY_LOWER = new Map<string, JobIndustryModelCategory>(
  Object.entries(JOB_FUNCTION_MODEL_CATEGORY).map(([name, category]) => [
    name.toLowerCase(),
    category,
  ]),
);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole-phrase match so "hospital" does not hit "hospitality" and "ai" does not hit "Nairobi". */
export function hasPhrase(text: string, phrase: string): boolean {
  const trimmed = phrase.trim();
  if (!trimmed) return false;
  const pattern = escapeRegExp(trimmed).replace(/\s+/g, '\\s+');
  return new RegExp(`(?:^|[^a-z0-9])${pattern}(?:[^a-z0-9]|$)`, 'i').test(text);
}

function hasAnyPhrase(text: string, phrases: readonly string[]): boolean {
  return phrases.some((phrase) => hasPhrase(text, phrase));
}

/** Title-only occupations — specific job titles beat a generic function label. */
const TITLE_OCCUPATION_PHRASES: Array<[JobIndustryModelCategory, readonly string[]]> = [
  [
    'food-services',
    [
      'chef',
      'sous chef',
      'chef de partie',
      'chef de party',
      'pastry',
      'cook',
      'waiter',
      'waitress',
      'bartender',
      'barista',
      'baker',
      'catering',
      'kitchen steward',
      'kitchen assistant',
      'sommelier',
      'dishwasher',
      'commis',
    ],
  ],
  [
    'health-safety',
    [
      'health and safety',
      'health & safety',
      'safety officer',
      'safety manager',
      'hse officer',
      'hse manager',
      'ehs officer',
      'occupational safety',
    ],
  ],
  [
    'veterinary',
    ['veterinarian', 'veterinary', 'vet officer', 'animal health', 'livestock officer'],
  ],
  [
    'healthcare',
    [
      'nurse',
      'nursing',
      'doctor',
      'physician',
      'surgeon',
      'pharmacist',
      'dentist',
      'clinician',
      'clinical officer',
      'medical officer',
      'physiotherapist',
      'radiographer',
      'midwife',
      'paramedic',
      'optometrist',
      'clinical nurse',
    ],
  ],
  [
    'tourism',
    ['tour guide', 'safari guide', 'tour operator', 'park ranger', 'wildlife'],
  ],
  [
    'hospitality',
    [
      'hotel',
      'concierge',
      'front office',
      'guest relations',
      'housekeeper',
      'housekeeping',
      'bellhop',
      'reservations agent',
    ],
  ],
  [
    'driver',
    [
      'driver',
      'chauffeur',
      'courier',
      'truck driver',
      'bus driver',
      'taxi',
      'matatu',
      'fleet officer',
    ],
  ],
  ['security', ['security guard', 'security officer', 'watchman', 'bouncer', 'loss prevention']],
  [
    'legal',
    [
      'lawyer',
      'advocate',
      'attorney',
      'magistrate',
      'legal officer',
      'legal assistant',
      'barrister',
      'counsel',
    ],
  ],
  [
    'hr',
    [
      'human resource',
      'human resources',
      'hr officer',
      'hr manager',
      'recruiter',
      'talent acquisition',
      'people partner',
    ],
  ],
  [
    'science',
    ['laboratory', 'lab scientist', 'research scientist', 'chemist', 'biologist', 'microbiologist'],
  ],
  [
    'beauty',
    ['beautician', 'hairstylist', 'hair dresser', 'hairdresser', 'cosmetologist', 'makeup artist', 'barber', 'spa therapist'],
  ],
  [
    'sports',
    ['fitness trainer', 'personal trainer', 'gym instructor', 'coach', 'physiotherapist sports'],
  ],
  [
    'customer-service',
    ['customer service', 'call centre', 'call center', 'contact centre', 'helpdesk', 'help desk'],
  ],
  [
    'community',
    [
      'social worker',
      'community officer',
      'community development',
      'humanitarian',
      'ngo',
      'programme officer',
      'program officer',
    ],
  ],
  [
    'education',
    [
      'teacher',
      'lecturer',
      'professor',
      'tutor',
      'educator',
      'instructor',
      'headteacher',
      'head teacher',
    ],
  ],
  [
    'finance',
    [
      'accountant',
      'auditor',
      'banker',
      'teller',
      'credit officer',
      'loan officer',
      'finance officer',
      'financial analyst',
      'tax officer',
      'stock broker',
      'broker',
    ],
  ],
  [
    'technology',
    [
      'software',
      'developer',
      'programmer',
      'fullstack',
      'full stack',
      'frontend',
      'front end',
      'backend',
      'back end',
      'devops',
      'data scientist',
      'data analyst',
      'data engineer',
      'cyber security',
      'cybersecurity',
      'it officer',
      'system administrator',
      'systems administrator',
      'network administrator',
      'network engineer',
    ],
  ],
  [
    'engineering',
    [
      'civil engineer',
      'mechanical engineer',
      'electrical engineer',
      'structural engineer',
      'site engineer',
      'project engineer',
    ],
  ],
  ['construction', ['architect', 'quantity surveyor', 'foreman', 'mason', 'carpenter', 'welder']],
  [
    'telecommunications',
    ['telecom', 'fibre technician', 'fiber technician', 'bts engineer', 'radio technician'],
  ],
  [
    'environment',
    [
      'environmental',
      'renewable energy',
      'climate officer',
      'conservation officer',
      'energy officer',
      'solar technician',
    ],
  ],
  [
    'maintenance',
    ['electrician', 'plumber', 'technician', 'mechanic', 'installer', 'maintenance officer'],
  ],
  ['real-estate', ['estate agent', 'real estate', 'property manager', 'property officer']],
  ['agriculture', ['farmer', 'agronomist', 'horticultur', 'agricultural officer', 'extension officer', 'fisheries', 'plantation', 'tea', 'coffee']],
  ['manufacturing', ['warehouse', 'storekeeper', 'procurement', 'supply chain', 'quality officer']],
  ['marketing', ['marketer', 'brand manager', 'content creator', 'social media manager', 'copywriter']],
  ['creative', ['graphic designer', 'ui designer', 'ux designer', 'photographer', 'videographer', 'animator', 'music producer', 'film director', 'producer']],
  [
    'sales',
    [
      'sales executive',
      'sales representative',
      'sales agent',
      'sales manager',
      'account executive',
      'business development executive',
    ],
  ],
  ['retail', ['sales associate', 'shop attendant', 'merchandiser', 'cashier']],
  ['government', ['county administrator', 'civil servant', 'immigration officer', 'police officer', 'administrative officer', 'parliamentary', 'parliament']],
];

/** Weaker combined-text phrases, still word-bounded. Checked after title + function. */
const FALLBACK_TEXT_PHRASES: Array<[JobIndustryModelCategory, readonly string[]]> = [
  ['food-services', ['food services', 'catering', 'restaurant', 'kitchen']],
  ['health-safety', ['health and safety', 'health & safety', 'occupational safety']],
  ['veterinary', ['veterinary', 'veterinarian', 'animal health']],
  [
    'healthcare',
    ['healthcare', 'medical', 'clinic', 'hospital', 'pharmacy', 'nursing', 'clinical'],
  ],
  ['tourism', ['tourism', 'safari', 'tour guide']],
  ['hospitality', ['hospitality', 'hotel', 'resort', 'lodging']],
  ['community', ['non profit', 'non-profit', 'charity', 'humanitarian', 'ngo', 'npo', 'social work']],
  ['driver', ['logistics', 'transport', 'fleet', 'courier']],
  ['security', ['security']],
  ['legal', ['legal', 'law firm', 'advocate']],
  ['hr', ['human resource', 'recruitment', 'talent']],
  ['science', ['laboratory', 'science']],
  ['beauty', ['beauty', 'salon', 'spa', 'wellness']],
  ['sports', ['fitness', 'recreation', 'gym']],
  ['customer-service', ['customer service', 'call centre', 'call center']],
  ['education', ['education', 'teaching', 'university', 'college', 'school', 'lecturer']],
  ['finance', ['finance', 'accounting', 'audit', 'banking', 'insurance', 'investment']],
  [
    'technology',
    [
      'information technology',
      'software',
      'developer',
      'programmer',
      'data analytics',
    ],
  ],
  ['engineering', ['engineering']],
  ['construction', ['construction', 'architecture', 'building']],
  ['maintenance', ['maintenance', 'repair', 'installation', 'trades']],
  ['real-estate', ['real estate', 'property management', 'estate agent']],
  ['agriculture', ['agriculture', 'farming', 'agribusiness', 'horticulture', 'forestry']],
  ['environment', ['environment', 'renewable', 'climate', 'natural resources']],
  ['telecommunications', ['telecom', 'telecommunications', 'fibre', 'fiber optic']],
  ['manufacturing', ['manufacturing', 'warehouse', 'procurement', 'supply chain', 'quality control']],
  ['marketing', ['marketing', 'communications', 'advertising', 'public relations']],
  ['creative', ['creative', 'design', 'media']],
  ['sales', ['sales']],
  ['retail', ['retail', 'fmcg', 'supermarket']],
  ['government', ['government', 'public service', 'civil service', 'county government', 'ministry']],
  ['professional', ['consulting', 'strategy', 'administration', 'office']],
];

export function categoryFromFunctionName(
  jobFunction?: string | null,
): JobIndustryModelCategory | null {
  const name = (jobFunction || '').trim();
  if (!name) return null;
  return FUNCTION_CATEGORY_BY_LOWER.get(name.toLowerCase()) ?? null;
}

function categoryFromPhraseTable(
  text: string,
  table: Array<[JobIndustryModelCategory, readonly string[]]>,
): JobIndustryModelCategory | null {
  if (!text.trim()) return null;
  for (const [category, phrases] of table) {
    if (hasAnyPhrase(text, phrases)) return category;
  }
  return null;
}

/**
 * Pick a portrait category for a job.
 * 1. Strong occupation words in the job title (Chef stays a chef even if tagged Hospitality)
 * 2. Canonical job_function / job_functions
 * 3. Word-bounded keywords in title + company + function text
 * 4. Professional default
 */
export function getModelForJob(
  jobTitle: string,
  company: string = '',
  jobFunction?: string | string[] | null,
): JobIndustryModelCategory {
  const title = jobTitle || '';
  const companyName = company || '';
  const functions = (Array.isArray(jobFunction)
    ? jobFunction
    : jobFunction
      ? [jobFunction]
      : []
  )
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const fromTitle = categoryFromPhraseTable(title, TITLE_OCCUPATION_PHRASES);
  if (fromTitle) return fromTitle;

  for (const fn of functions) {
    const fromFunction = categoryFromFunctionName(fn);
    if (fromFunction) return fromFunction;
  }

  const combined = `${title} ${companyName} ${functions.join(' ')}`;
  return categoryFromPhraseTable(combined, FALLBACK_TEXT_PHRASES) || 'professional';
}

export function getIndustryModelPublicPath(category: JobIndustryModelCategory): string {
  return `/assets/job-thumbnails/${INDUSTRY_MODEL_FILENAMES[category]}`;
}

export function getIndustryModelAbsoluteUrl(
  category: JobIndustryModelCategory,
  origin: string,
): string {
  const base = origin.replace(/\/$/, '');
  return `${base}${getIndustryModelPublicPath(category)}`;
}

/** Edge-safe ArrayBuffer → base64 for data URLs */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url, OG_FETCH_TIMEOUT_MS.asset);
    if (!res.ok) {
      console.warn(`Industry model image fetch failed (${res.status}): ${url}`);
      return null;
    }
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      console.warn(`Industry model URL was not an image: ${url} (${contentType})`);
      return null;
    }
    const buffer = await res.arrayBuffer();
    if (!buffer.byteLength) return null;
    return `data:${contentType};base64,${arrayBufferToBase64(buffer)}`;
  } catch (error) {
    console.warn('Industry model image fetch error:', error);
    return null;
  }
}

/**
 * Fetch one industry thumbnail and return a data URL for @vercel/og.
 * Tries `origin` first (preview/local), then `fallbackOrigin` (production).
 * Returns null on any failure so callers can omit the image (fail soft).
 */
export async function loadIndustryModelDataUrl(
  category: JobIndustryModelCategory,
  origin: string,
  fallbackOrigin = 'https://www.careersasa.co.ke',
): Promise<string | null> {
  const primary = getIndustryModelAbsoluteUrl(category, origin);
  const dataUrl = await fetchImageAsDataUrl(primary);
  if (dataUrl) return dataUrl;

  const normalizedOrigin = origin.replace(/\/$/, '');
  const normalizedFallback = fallbackOrigin.replace(/\/$/, '');
  if (normalizedOrigin !== normalizedFallback) {
    return fetchImageAsDataUrl(getIndustryModelAbsoluteUrl(category, fallbackOrigin));
  }
  return null;
}
