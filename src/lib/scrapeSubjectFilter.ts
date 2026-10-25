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
 *   - at PUBLISH time on full parsed fields (matchesSubjectFocus) — the
 *     intelligent decision. Three confidence tiers:
 *       HIGH  : title, field/area of study, job function, tags — a STEM stem
 *               alone counts.
 *       PROSE : required_qualifications, responsibilities — AI-restated free
 *               text; a stem only counts next to a study cue AND a hard-STEM
 *               degree/discipline (so business-ese like "supports technical
 *               systems" or "market research" no longer passes).
 *       BODY  : description — same guarded treatment as PROSE.
 *     A confident non-STEM title ("Sales Executive") can therefore only be
 *     rescued by an explicit hard-STEM study requirement ("degree in
 *     Pharmacy"), never by a loose stem lurking in prose fields.
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
 * The deep matcher reads high-signal fields plus the description so that a STEM
 * requirement buried in body copy (a required degree/discipline) is caught. The
 * description is only ever ADDITIVE: it can promote a job to STEM, never
 * demote one, so incidental mentions don't cause wrongful skips.
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
  'chemis', // chemistry, chemist
  'chemical',
  'botan', // botany, botanist
  'zoolog', // zoology, zoologist
  'microbio', // microbiology, microbiologist, microbial
  'biotech', // biotechnology, biotechnologist
  'life science',
  'laborator', // laboratory, lab technician
  'pharmac', // pharmacy, pharmaceutical, pharmacology
  'clinical research',
  'quality control',
  'quality assurance',
  // 'analytical' removed: fires on business-ese ("analytical skills",
  // "analytical mindset") in prose fields. Analytical chemist/lab still pass
  // via 'chemis'/'laborator'.
  'lab', // \blab\b only
  'qc', // \bQC\b only
  'qa', // \bQA\b only
  // ── Health / medical ──
  'medic', // medicine, medical, paramedic
  'health', // public health, health officer
  'nursing', // nursing officer (avoids matching inside random words)
  'dental',
  'nutrition',
  'dietitian', // was bare 'diet' — substring of 'study of diet' noise; titles say "Dietitian"
  'veterinar',
  'epidemiolog',
  'public health',
  'clinical',
  // ── Engineering ──
  'engineer', // engineer, engineering (any discipline)
  'mechanic', // mechanical engineer/technician
  'electron', // electronics, electrical engineering
  'electric', // electrician is trade; electrical engineer passes anyway via "engineer"
  'civil', // civil engineer/works — common Kenyan STEM title stem
  'telecomm', // telecommunications
  'automotive',
  'mechantron',
  // ── Technology / IT / data ──
  'technolog', // technology, technical
  'software',
  'hardware',
  'network',
  'database',
  'sysadmin',
  'system admin',
  'devops',
  'cyber',
  'informatics',
  'computer',
  'programming',
  'developer', // software/web/app developer
  'data scien', // data scientist (two-word stem avoids "data entry")
  'data analy', // data analyst
  'data engine', // data engineer
  'data manage', // data manager (avoids bare "data")
  'machine learning',
  'artificial intelligence',
  'ai engine', // AI engineer (word-boundary "ai" would be noisy; use compound)
  'business intel', // BI analyst — borderline but analytics-role signal
  'geospatial',
  'gis', // \bGIS\b only
  // ── Physical sciences / math ──
  'physic', // physics, physicist
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
  'environment', // environmental science/officer
  'meteorolog',
  'climate',
  'conservation',
  // ── Research / general STEM ──
  'scientist',
  // Bare 'research' removed: "market research", "user research", "research
  // and development" prose fires on sales/finance/HR jobs. Match the STEM
  // title/role compounds explicitly instead.
  'research officer',
  'research assistant',
  'research associate',
  'research scientist',
  'research fellow',
  'research intern',
  'scientific research',
  'research programme',
  'research program',
  'stem',
  'technical',
]

/** Stems that are too short/common to substring-match; require word boundaries. */
const WORD_BOUNDARY_TERMS = new Set(['lab', 'qc', 'qa', 'gis', 'stem'])

/**
 * Title stems that are CONFIDENTLY non-STEM. Used only at discovery as a cheap
 * cost cut on obvious off-topic roles (these never reach the AI parse). Kept
 * deliberately narrow: when a title is ambiguous (e.g. "Production Manager",
 * "Officer", "Technician") it is QUEUED so the deep gate can read its
 * qualifications instead. A positive STEM signal always wins over these
 * (e.g. "Sales Engineer" keeps via "engineer", not dropped by "sales").
 */
const NEGATIVE_TITLE_STEMS = [
  'sales',
  'marketing',
  'advertis',
  'brand',
  'public relations',
  'driver',
  'chauffeur',
  'cleaner',
  'cleaning',
  'housekeep',
  'guard',
  'watchman',
  'cashier',
  'teller',
  'accountant',
  'account officer',
  'bookkeep',
  'audit',
  'tax',
  'receptionist',
  'secretary',
  'personal assistant',
  'administrative assistant',
  'admin assistant',
  'office assistant',
  'customer care',
  'customer service',
  'call center',
  'call centre',
  'telemarket',
  'waiter',
  'waitress',
  'chef',
  'cook',
  'barista',
  'bartend',
  'tailor',
  'seamstress',
  'hairdress',
  'barber',
  'mason',
  'plumber',
  'storekeeper',
  'store keeper',
  'warehouse',
  'courier',
  'dispatch',
  'rider',
  'pilot', // aircraft pilot, not "pilot project"
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
  'lawyer',
  'advocate',
  'paralegal',
  'legal officer',
  'recruiter',
  'recruitment officer',
  'human resource',
  'hr ',
  'clergy',
  'pastor',
  'usher',
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

/** True when a listing title is CONFIDENTLY a non-STEM role (discovery-only). */
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
  'physic',
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
  'environment',
  'meteorolog',
  'climate',
  'conservation',
  'scientist',
]

/**
 * Cues that indicate a STEM word in free-text is a genuine study/qualification
 * requirement (not an incidental mention like "computer literacy" or "strong
 * analytical skills"). Paired with a stem in the SAME clause to promote a job.
 */
const STUDY_CUE_RE =
  /\b(degree|diploma|associate|bachelor|baccalaureate|bsc|master|msc|mba|phd|doctorate|doctoral|field of study|area of study|major|speciali[sz]ation|studied|study of|qualification|certified|certification|background in|discipline|curriculum|alumni|alumna|graduate|graduated|university|college|institute|polytechnic|coursework|course of study)\b/i

/**
 * Split free text into short clauses so a study cue and a STEM word must sit in
 * the SAME clause to count. Separates on sentence/list boundaries and on
 * "or"/"and/or" (so "degree in Chemistry or Biology" evaluates both disciplines).
 * Lookbehind is avoided — tsconfig targets ES2017.
 */
function splitClauses(text: string): string[] {
  const sentinel = '\u0000'
  const normalized = text
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
  return splitClauses(lower).some(
    clause =>
      STUDY_CUE_RE.test(clause) &&
      HARD_DEGREE_STEMS.some(stem =>
        WORD_BOUNDARY_TERMS.has(stem)
          ? new RegExp(`\\b${escapeRe(stem)}\\b`, 'i').test(clause)
          : clause.includes(stem)
      )
  )
}

/**
 * Returns true when the job should be PUBLISHED (i.e. it matches the subject
 * focus, or the filter is disabled). Returns false to SKIP as off-topic.
 *
 * Three confidence tiers:
 *   - `fields` (title, field/area of study, job function, tags) are HIGH
 *     signal: a STEM stem anywhere in them counts.
 *   - `proseFields` (required_qualifications, responsibilities) are
 *     AI-restated free text: a stem only counts when a study cue AND a hard
 *     STEM degree stem sit in the same clause.
 *   - `description` (raw body copy): same guarded treatment as proseFields.
 *
 * Title dominance: when the title is confidently non-STEM ("Sales
 * Executive"), a high-signal stem that appears ONLY in non-title fields
 * (e.g. the AI taxonomy tagging job_function "Technical Sales & Business
 * Development") cannot rescue it — the title itself must carry the stem, or
 * prose/description must name a hard STEM degree ("degree in Pharmacy").
 */
export function matchesSubjectFocus(
  fields: Array<string | null | undefined>,
  description?: string | null,
  proseFields?: Array<string | null | undefined>
): boolean {
  if (!isFilterEnabled()) return true

  const values = fields.filter((v): v is string => typeof v === 'string' && v.length > 0)
  const title = (values[0] || '').trim()
  const hasTitle = title.length > 0

  const highSignal = values.join(' \n ').toLowerCase()
  const desc = (description || '').trim()
  const prose = (proseFields || []).filter((v): v is string => typeof v === 'string' && v.length > 0)

  // ── HIGH-signal tier ──
  if (hasTitle && containsStem(title)) return true

  if (highSignal.trim() && containsStem(highSignal)) {
    // A confident non-STEM title vetoes rescue by loose stems in other
    // fields ("Sales Executive" + job_function "Technical Sales…"). Unless
    // the title itself carries a STEM word ("Sales Engineer" — checked
    // above), non-title high-signal fields only pass when they contain a
    // study-qualified HARD degree requirement.
    if (!isConfidentlyNonStem(title)) return true
    if (matchesHardStudyContext([...values.slice(1), ...prose, desc])) return true
    return false
  }

  // ── PROSE / BODY tiers: stem must sit in the same clause as a study cue
  //    AND be a hard STEM degree discipline. ──
  if (matchesHardStudyContext([...prose, desc])) return true

  const hasAnySignal =
    highSignal.trim().length > 0 || desc.length > 0 || prose.length > 0
  // No signal at all -> keep, so we never silently drop everything when parsing
  // degraded. Err on the side of publishing.
  if (!hasAnySignal) return true

  return false
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
