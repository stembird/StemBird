/**
 * Subject focus gate for scraped jobs.
 *
 * StemBird publishes STEM (science, technology, engineering, mathematics)
 * roles only. The job boards we scrape (MyJobMag, BrighterMonday, Fuzu) mix
 * ALL categories on their listing pages and their adapters rebuild the listing
 * URL from the origin (they ignore any keyword path/query), so subject-scoping
 * cannot be done via scraper_sources.base_url. This module is the single place
 * that enforces the subject filter:
 *   - at DISCOVER time (filterDiscoveredByTitle): OFF by default. Accuracy
 *     wins over cost — a non-STEM title can hide a STEM requirement (e.g.
 *     "Sales Representative" or "Marketer in Eldoret" needing a Pharmacy
 *     degree), so we never drop a job on its title alone. Every URL is queued
 *     for the deep gate. Set STEMBIRD_SUBJECT_DISCOVER_FILTER=true to re-enable
 *     cheap title-based skipping of confident non-STEM roles (trades accuracy
 *     for AI cost).
 *   - at PUBLISH time on full parsed fields (matchesSubjectFocus). A STEM
 *     title or explicit field/area of study qualifies directly. Classifier
 *     job functions and tags do not qualify a listing on their own; free text
 *     must pair a study cue with a hard-STEM discipline.
 *
 * CONFIG (no code edits needed to widen/narrow later):
 *   - STEMBIRD_SUBJECT_FILTER_ENABLED      "true" (default) | "false" to disable
 *   - STEMBIRD_SUBJECT_DISCOVER_FILTER     "false" (default, accuracy-first) |
 *                                          "true" to skip confident non-STEM
 *                                          titles at discovery (cost-saving)
 *   - STEMBIRD_SUBJECT_TERMS               comma-separated stems that OVERRIDE
 *                                          the built-in default list. Each
 *                                          entry is treated as a case-
 *                                          insensitive substring match.
 *
 * The deep matcher reads the description and qualification/responsibility
 * fields to catch explicit STEM degree requirements buried in the posting.
 *
 * NOTE: the filter never checks location. A STEM role outside Kenya still
 * passes; country gating is a separate concern.
 */

/**
 * Queue error_message stamped when the deep gate rejects a job. Admin UI
 * buckets `done` rows by this message (published vs non-STEM screened) —
 * keep in sync with scrapeQueueStats bucketing.
 */
export const SKIPPED_NON_STEM_MESSAGE = 'Skipped: outside STEM focus'

const DEFAULT_SUBJECT_STEMS = [
  // ── Life sciences / lab (original focus) ──
  'biolog', // biology, biologist, biology teacher, molecular biology
  'biochem', // biochemistry, biochemist
  'genetic', // genetics, geneticist
  'chemis', // chemistry, chemist
  'chemical engineer', // chemical engineering (must come before 'chemical')
  'chemical', // chemical (but not "chemical sales" unless rescued by degree)
  'botan', // botany, botanist
  'zoolog', // zoology, zoologist
  'microbio', // microbiology, microbiologist, microbial
  'biotech', // biotechnology, biotechnologist
  'life science',
  'food science',
  'food technolog',
  'laborator', // laboratory, lab technician
  'pharmac', // pharmacy, pharmaceutical, pharmacology
  'clinical research',
  // 'analytical' removed: fires on business-ese ("analytical skills",
  // "analytical mindset") in prose fields. Analytical chemist/lab still pass
  // via 'chemis'/'laborator'.
  'lab', // \blab\b only
  // ── Health / medical ──
  'medic', // medicine, medical, paramedic
  'health officer', // public health, health officer (not bare "health" - too generic)
  'public health',
  'midwif',
  'mental health',
  'radiolog',
  'nurs', // nurse, nursing officer
  'dental',
  'nutrition',
  'dietitian', // was bare 'diet' — substring of 'study of diet' noise; titles say "Dietitian"
  'veterinar',
  'epidemiolog',
  'clinical',
  // ── Engineering ──
  'engineer', // engineer, engineering (any discipline)
  'mechanical engineer',
  'electron', // electronics, electrical engineering
  'electrical engineer',
  'civil engineer',
  'telecomm', // telecommunications
  'automotive',
  'mechantron',
  'architect', // architect, architectural, architecture, urban planning
  'structural design',
  'construction engineer',
  'auto-mechanic',
  'electrician',
  'printing technolog',
  'packaging technolog',
  // ── Technology / IT / data ──
  'software engineer',
  'software developer',
  'software',
  'hardware',
  'information technology',
  'quantity survey',
  'building technology',
  'construction',
  'ict',
  'network engineer',
  'network administrator',
  'network technician',
  'database',
  'sysadmin',
  'system admin',
  'devops',
  'cyber',
  'informatics',
  'computer scien', // computer science/scientist
  'computer engineer',
  'programming',
  'developer', // software/web/app developer
  'data scien', // data scientist (two-word stem avoids "data entry")
  'data analy', // data analyst
  'data engineer', // data engineer
  'machine learning',
  'artificial intelligence',
  'ai engineer', // AI engineer (word-boundary "ai" would be noisy; use compound)
  'business intelligence analyst', // BI analyst — borderline but analytics-role signal
  'geospatial',
  'gis', // \bGIS\b only
  // ── Physical sciences / math ──
  'physics',
  'physicist',
  'physical science',
  'mathemat', // mathematics, mathematician
  'statistic', // statistician, statistics
  'actuar', // actuarial
  'geolog', // geology, geologist
  'geograph', // physical geography / geospatial roles
  'astronom',
  'forensic',
  // ── Agriculture / environment ──
  'agricultur', // agriculture, agriculturalist
  'agronom', // agronomy
  'livestock',
  'fisher', // fisheries
  'environmental science', // environmental science/officer
  'environmental engineer',
  'meteorolog',
  'climate scien',
  'conservation',
  // ── Research / general STEM ──
  'scientist',
  // Bare 'research' removed: "market research", "user research", "research
  // and development" prose fires on sales/finance/HR jobs. Match the STEM
  // title/role compounds explicitly instead.
  'research scientist',
  'scientific research',
  'science teacher',
  'math teacher',
  'maths teacher',
  'stem',
  // 'technical' REMOVED: Too generic - fires on "technical sales", "technical writer",
  // "technical support" for non-STEM products. Real technical roles will have specific
  // STEM keywords (engineer, technician, laboratory, etc.)
]

/** Stems that are too short/common to substring-match; require word boundaries. */
const WORD_BOUNDARY_TERMS = new Set(['lab', 'gis', 'stem', 'ict', 'it'])

/**
 * Title stems that are CONFIDENTLY non-STEM. Two jobs:
 *   1. Discovery (cheap cost cut) — obvious off-topic roles never reach the AI.
 *   2. Publish gate title veto — a title matched here can ONLY be rescued by a
 *   hard STEM degree named next to a study cue in responsibilities /
 *   qualifications / description (see matchesSubjectFocus). This encodes the
 *      rule that generic management / operations / business / administrative
 *      roles ("Business Continuity Management Analyst", "Assistant Operations
 *      Manager") are NOT STEM unless the requirements actually demand a STEM
 *      discipline — an AI-tagged job_function or a source skills string alone
 *      is no longer enough.
 * A positive STEM word in the title only wins over a veto when it also names a
 * technical role or a STEM teaching role.
 */
const NEGATIVE_TITLE_STEMS = [
  'sales',
  'marketing',
  'advertis',
  'brand',
  'public relations',
  'business',
  // ── Generic business / management / operations (publish-gate title veto) ──
  // Roles whose title is pure management/operations/business carry no STEM
  // signal on their face; require an explicit STEM degree to publish.
  'operations manager',
  'operations officer',
  'operations coordinator',
  'business continuity',
  'continuity',
  'business analyst',
  'business development',
  'management analyst',
  'project management',
  'project manager',
  'project coordinator',
  'general management',
  'assistant manager',
  'deputy manager',
  'administration',
  'administrative',
  'admin ',
  'office manager',
  'team leader',
  'unit manager',
  'center manager',
  'centre manager',
  'branch manager',
  'regional manager',
  'country manager',
  'cluster manager',
  'store manager',
  'outlet manager',
  'retail manager',
  'shop manager',
  // ── Finance / Accounting ──
  'finance',
  'financial',
  'accountant',
  'account officer',
  'bookkeep',
  'audit',
  'tax',
  'credit control',
  'credit officer',
  'loan officer',
  'banking',
  'cashier',
  'teller',
  // ── HR / Recruitment ──
  'recruiter',
  'recruitment',
  'human resource',
  'hr ',
  'people operations',
  'talent acquisition',
  // ── Support / Admin roles ──
  'receptionist',
  'reception',
  'secretary',
  'personal assistant',
  'administrative assistant',
  'admin assistant',
  'office assistant',
  'executive assistant',
  'customer care',
  'customer service',
  'customer success',
  'call center',
  'call centre',
  'telemarket',
  'front desk',
  // ── Procurement / Logistics / Supply Chain ──
  'procurement',
  'supply chain',
  'logistics',
  'warehouse',
  'storekeeper',
  'store keeper',
  'inventory clerk',
  'courier',
  'dispatch',
  'rider',
  'driver',
  'chauffeur',
  // ── Legal / Compliance ──
  'lawyer',
  'advocate',
  'paralegal',
  'legal officer',
  'legal counsel',
  'compliance officer',
  'regulatory affairs', // unless pharmaceutical/medical context
  // ── Hospitality / Service ──
  'waiter',
  'waitress',
  'chef',
  'cook',
  'barista',
  'bartend',
  'housekeeper',
  'housekeep',
  'cleaner',
  'cleaning',
  'catering',
  // ── Security / Facilities ──
  'guard',
  'security guard',
  'watchman',
  'security officer',
  // ── Trades / Manual labor ──
  'tailor',
  'seamstress',
  'hairdress',
  'barber',
  'mason',
  'plumber',
  'carpenter',
  'welder',
  'mechanic', // will be overridden by "mechanical engineer" in positive list
  'fitter',
  'electrician', // will be overridden by "electrical engineer" in positive list
  'pilot', // aircraft pilot, not "pilot project"
  // ── Communications / Creative ──
  'journalist',
  'writer',
  'editor',
  'translator',
  'interpreter',
  'photograph',
  'videograph',
  'graphic design',
  'social media',
  'content creat',
  'content writer',
  'copywriter',
  'communications',
  // ── Religious ──
  'clergy',
  'pastor',
  'usher',
  'chaplain',
  // ── Education (non-STEM) ──
  'teacher', // generic teacher without STEM subject
  'tutor',
  'instructor',
  'lecturer', // generic, unless in STEM department
  // ── Agriculture (non-technical) ──
  'farm worker',
  'farm hand',
  'farm manager', // unless agricultural engineer/scientist
]

const TECHNICAL_ROLE_TITLE_STEMS = [
  'engineer',
  'scientist',
  'architect',
  'developer',
  'programmer',
  'technician',
  'technologist',
  'chemist',
  'biologist',
  'statistician',
  'mathematician',
  'auto-mechanic',
  'electrician',
  'head of it',
  'it support',
  'information technology',
  'ict',
  'business intelligence analyst',
]

const STEM_EDUCATION_ROLE_STEMS = [
  'teacher',
  'lecturer',
  'tutor',
  'instructor',
  'trainer',
  'training',
]

const HARD_NON_STEM_TITLE_STEMS = [
  'driver',
  'chauffeur',
  'housekeeper',
  'housekeeping',
  'head of security',
  'security guard',
  'security officer',
  'chef',
  'cook',
]

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Context-safe env read (works whether or not node types are in scope). */
function envValue(name: string): string | undefined {
  const g = globalThis as unknown as {
    process?: { env?: Record<string, string | undefined> }
  }
  return g.process?.env?.[name]
}

function isFilterEnabled(): boolean {
  const raw = (envValue('STEMBIRD_SUBJECT_FILTER_ENABLED') || 'true').trim().toLowerCase()
  return raw !== 'false' && raw !== 'off' && raw !== '0'
}

/**
 * Discovery title-skip is OFF by default (accuracy wins: a non-STEM title can
 * hide a STEM requirement). Only when explicitly enabled do we drop confident
 * non-STEM titles before the (costly) detail fetch + AI parse.
 */
function isDiscoverFilterEnabled(): boolean {
  const raw = (envValue('STEMBIRD_SUBJECT_DISCOVER_FILTER') || 'false').trim().toLowerCase()
  return raw === 'true' || raw === 'on' || raw === '1'
}

function activeStems(): string[] {
  const override = (envValue('STEMBIRD_SUBJECT_TERMS') || '').trim()
  if (!override) return DEFAULT_SUBJECT_STEMS
  return override
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
}

/** True when the text contains any active STEM stem. */
function containsStem(text: string): boolean {
  const lower = text.toLowerCase()
  for (const stem of activeStems()) {
    if (WORD_BOUNDARY_TERMS.has(stem)) {
      const re = new RegExp(`\\b${escapeRe(stem)}\\b`, 'i')
      if (re.test(lower)) return true
    } else if (lower.includes(stem)) {
      return true
    }
  }
  return false
}

/** True when a listing title is confidently a non-STEM role. */
function isConfidentlyNonStem(title: string): boolean {
  const lower = title.toLowerCase()
  return NEGATIVE_TITLE_STEMS.some(stem => lower.includes(stem))
}

/**
 * Hard STEM degrees/disciplines. ONLY these can rescue a job whose title is
 * confidently non-STEM (e.g. "Sales Representative" requiring a Pharmacy
 * degree). Deliberately excludes loose business-English stems like
 * 'technical', 'research', 'analytical', 'health' — a "degree in Business
 * Research" or "degree in Marketing" must NOT promote a sales job to STEM.
 */
const HARD_DEGREE_STEMS = [
  'biolog',
  'biochem',
  'chemis',
  'chemical',
  'microbio',
  'biotech',
  'botan',
  'zoolog',
  'pharmac',
  'food science',
  'food technolog',
  'laborator',
  'clinical',
  'medic',
  'nursing',
  'dental',
  'nutrition',
  'dietetic',
  'veterinar',
  'epidemiolog',
  'public health',
  'engineer',
  'mechanic',
  'electron',
  'electrical',
  'telecomm',
  'software',
  'computer',
  'information technology',
  'cyber',
  'informatics',
  'data scien',
  'data analy',
  'data engine',
  'machine learning',
  'artificial intelligence',
  'physics',
  'physicist',
  'physical science',
  'mathemat',
  'statistic',
  'actuar',
  'geolog',
  'geospatial',
  'astronom',
  'forensic',
  'agricultur',
  'agronom',
  'livestock',
  'fisher',
  'environmental science',
  'environmental engineering',
  'printing technolog',
  'packaging technolog',
  'quantity survey',
  'building technology',
  'construction',
  'architect',
  'midwif',
  'meteorolog',
  'climate science',
  'conservation',
  'scientist',
]

/**
 * Cues that indicate a STEM word in free-text is a genuine study/qualification
 * requirement (not an incidental mention like "computer literacy" or "strong
 * analytical skills"). Paired with a stem in the SAME clause to promote a job.
 */
const STUDY_CUE_RE =
  /\b(degree|diploma|associate|bachelor|baccalaureate|bsc|master|msc|mba|phd|doctorate|doctoral|field of study|area of study|major|speciali[sz]ation|studied|study of|qualification|certified|certification|background in|coursework|course of study)\b/i
// Avoid pairing a credential with an unrelated STEM word elsewhere in a long clause.
const MAX_DISCIPLINE_AFTER_STUDY_CUE_DISTANCE = 100
const MAX_DISCIPLINE_BEFORE_STUDY_CUE_DISTANCE = 40

/**
 * Split free text into short clauses so a study cue and a STEM word must sit in
 * the SAME clause to count. Separates on sentence/list boundaries and on
 * "or"/"and/or" (so "degree in Chemistry or Biology" evaluates both disciplines).
 * Lookbehind is avoided — tsconfig targets ES2017.
 */
function splitClauses(text: string): string[] {
  const sentinel = '\u0000'
  const normalized = text
    .replace(/<\/?(?:li|p|div|ul|ol|br|h[1-6])\b[^>]*>/gi, sentinel)
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u2022\t]/g, sentinel) // bullet / tab
    .replace(/[.;:\n]+/g, sentinel) // sentence / line boundaries
    .replace(/\b(?:and\s*\/?\s*or|or)\b/gi, sentinel) // "or", "and/or"
  return normalized
    .split(sentinel)
    .map(s => s.trim())
    .filter(Boolean)
}

/**
 * Stronger guard for PROSE/BODY tiers (qualifications, responsibilities,
 * description): a clause must pair a study cue with a HARD STEM degree stem
 * (HARD_DEGREE_STEMS), not just any stem. This blocks the classic false
 * positives — "degree in Business Research", "technical sales experience",
 * "manage customer health accounts" — while still catching "BSc Pharmacy".
 */
function matchesHardStudyContext(texts: Array<string | null | undefined>): boolean {
  const joined = texts
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .join(' \n ')
  if (!joined.trim()) return false
  const lower = joined.toLowerCase()
  return splitClauses(lower).some(clause => {
    const cueIndices: number[] = []
    const cuePattern = new RegExp(STUDY_CUE_RE.source, 'gi')
    let cueMatch: RegExpExecArray | null
    while ((cueMatch = cuePattern.exec(clause)) !== null) cueIndices.push(cueMatch.index)
    if (cueIndices.length === 0) return false

    return HARD_DEGREE_STEMS.some(stem => {
      const disciplinePattern = WORD_BOUNDARY_TERMS.has(stem)
        ? new RegExp(`\\b${escapeRe(stem)}\\b`, 'gi')
        : new RegExp(escapeRe(stem), 'gi')
      let disciplineMatch: RegExpExecArray | null
      while ((disciplineMatch = disciplinePattern.exec(clause)) !== null) {
        if (cueIndices.some(cueIndex => {
          const distance = disciplineMatch.index - cueIndex
          return distance >= 0
            ? distance <= MAX_DISCIPLINE_AFTER_STUDY_CUE_DISTANCE
            : -distance <= MAX_DISCIPLINE_BEFORE_STUDY_CUE_DISTANCE
        })) {
          return true
        }
      }
      return false
    })
  })
}

/**
 * Returns true when the job should be PUBLISHED (i.e. it matches the subject
 * focus, or the filter is disabled). Returns false to SKIP as off-topic.
 *
 * `fields` is ordered as title, field of study, area of study, job functions,
 * then tags. Only the title is trusted as a direct signal; the parsed fields,
 * functions, and tags are model-generated and must be corroborated by the
 * original posting text.
 * Classifier-generated job functions and tags are not sufficient on their
 * own; free text must pair a study cue with a hard STEM discipline.
 */
export function matchesSubjectFocus(
  fields: Array<string | null | undefined>,
  description?: string | null,
  proseFields?: Array<string | null | undefined>
): boolean {
  if (!isFilterEnabled()) return true

  const title = (typeof fields[0] === 'string' ? fields[0] : '').trim()
  const desc = (description || '').trim()
  const prose = (proseFields || []).filter((v): v is string => typeof v === 'string' && v.length > 0)

  const lowerTitle = title.toLowerCase()
  const titleHasStem = containsStem(title)
  const titleVetoed = isConfidentlyNonStem(title)
  const technicalRoleTitle = TECHNICAL_ROLE_TITLE_STEMS.some(stem =>
    lowerTitle.includes(stem)
  )
  const hardNonStemTitle = HARD_NON_STEM_TITLE_STEMS.some(stem =>
    lowerTitle.includes(stem)
  )
  const stemEducationTitle =
    STEM_EDUCATION_ROLE_STEMS.some(stem => lowerTitle.includes(stem)) && titleHasStem
  if (hardNonStemTitle && !technicalRoleTitle) return false
  if (titleHasStem && (!titleVetoed || technicalRoleTitle || stemEducationTitle)) return true

  // In all other fields, require an explicit study cue and a STEM discipline
  // in the same clause. Use only posting text, never model-generated fields.
  if (matchesHardStudyContext([...prose, desc])) return true

  // Missing or ambiguous evidence is not enough to publish a STEM-only job.
  return false
}

export interface StemFocusInput {
  title: string
  jobFunctions?: string[] | null
  description?: string | null
  requiredQualifications?: string | null
  responsibilities?: string | null
  tags?: string | null
  fieldOfStudy?: string | null
  areaOfStudy?: string | null
}

export function matchesStemFocus(input: StemFocusInput): boolean {
  const fields = [
    input.title,
    input.fieldOfStudy ?? null,
    input.areaOfStudy ?? null,
    ...(input.jobFunctions || []),
    input.tags ?? null,
  ]
  return matchesSubjectFocus(
    fields,
    input.description ?? null,
    [input.requiredQualifications, input.responsibilities]
  )
}

export interface TitleFilterInput {
  job_url: string
  partial_data?: { title?: string } | Record<string, unknown>
}

export interface TitleFilterResult<T> {
  kept: T[]
  /** URLs dropped because the listing title existed but had no STEM signal. */
  skippedUrls: string[]
}

/**
 * Discover-time pre-filter on listing-page titles only.
 *
 * DISABLED BY DEFAULT (accuracy wins): a non-STEM title can hide a STEM
 * requirement buried in the description (e.g. "Sales Representative" or
 * "Marketer in Eldoret" needing a Pharmacy degree). At discovery we only have
 * the title, so dropping on title alone is unsafe — every URL is kept and the
 * deep publish gate (matchesSubjectFocus, which reads description +
 * qualifications) makes the real call.
 *
 * Only when STEMBIRD_SUBJECT_DISCOVER_FILTER=true (explicit cost-over-accuracy
 * mode) does this skip confident non-STEM titles. Even then: positive STEM
 * words win over negatives ("Sales Engineer" kept), and ambiguous/empty titles
 * are always kept.
 */
export function filterDiscoveredByTitle<T extends TitleFilterInput>(
  discovered: T[]
): TitleFilterResult<T> {
  // Default path: keep everything so the deep gate decides. Also keep
  // everything if the whole subject filter is off.
  if (!isFilterEnabled() || !isDiscoverFilterEnabled()) {
    return { kept: discovered, skippedUrls: [] }
  }

  const kept: T[] = []
  const skippedUrls: string[] = []

  for (const job of discovered) {
    const title =
      typeof job.partial_data?.title === 'string' ? job.partial_data.title : ''

    // No title → keep; the publish gate re-checks full fields.
    if (!title.trim()) {
      kept.push(job)
      continue
    }
    // Positive STEM signal in the title wins (even if a negative word co-occurs,
    // e.g. "Sales Engineer" is kept because of "engineer").
    if (containsStem(title)) {
      kept.push(job)
      continue
    }
    // No positive signal AND a confidently non-STEM title → skip (saves parse).
    if (isConfidentlyNonStem(title)) {
      skippedUrls.push(job.job_url)
      continue
    }
    // Ambiguous → keep and defer to the deep qualifications gate.
    kept.push(job)
  }

  return { kept, skippedUrls }
}
