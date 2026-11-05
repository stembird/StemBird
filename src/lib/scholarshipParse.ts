/**
 * Scholarship detail-page extraction — the parsing half of the scholarship
 * pipeline (mirrors scraperJobParsing.ts for jobs).
 *
 * Contract, in short:
 *   1. Rule-based pass over the page text gives GROUNDED facts (deadline,
 *      level, coverage, provider, "not open to Kenyans" signals).
 *   2. `parseScholarshipContent` asks the AI (same DeepSeek → Gemini chain as
 *      the job parser) for structured fields, then merges that JSON OVER the
 *      rule-based pass — the rules always win on the deadline unless the AI
 *      date is literally present in the page text (no invented dates: a
 *      fabricated deadline is worse than none, since publishing gates on it).
 *   3. Hard publication rules live in scholarshipProcess.ts, not here — this
 *      module only reports what the page said.
 *
 * ES2017 target: no regex lookbehind anywhere in this file.
 */

import { callAI, hasAIConfigured } from './aiProviders'
import { extractApplicationDeadline, parseDeadlineDate } from './scraperDeadline'
import { stripHtmlToText } from './scholarshipFacts'

// ─── Types ─────────────────────────────────────────────────────────────────
export type ParsedScholarship = {
  title: string
  /** Funder / sponsoring organization. */
  provider: string | null
  description: string | null
  /** Canonical study levels, e.g. ['Masters','PhD']. */
  level: string[]
  /** Field-of-study restriction strings (raw wording, normalized casing). */
  fieldOfStudy: string[]
  /** Country the award funds study IN (not necessarily the applicant's). */
  studyDestination: string | null
  openToKenyans: boolean
  /** True when the page explicitly stated eligibility by nationality. */
  openToKenyansExplicit: boolean
  eligibility: string | null
  /** Funder / program mission prose — feeds gate test S2. */
  programMission: string | null
  /** Canonical coverage items, e.g. ['Tuition','Stipend','Travel']. */
  coverage: string[]
  isPartialAward: boolean
  awardValue: string | null
  /** yyyy-mm-dd, or null when the page never stated one (publish requires it). */
  applicationDeadline: string | null
  deadlineSource: 'page' | 'ai' | null
  academicYear: number | null
  durationText: string | null
  applicationUrl: string | null
}

export type ScholarshipParseInput = {
  /** Title from the listing page (already known before the detail fetch). */
  title?: string | null
  /** Raw detail-page HTML. */
  html?: string | null
  /** Pre-extracted detail text (extractJobDetails output). Optional. */
  text?: string | null
  /** Scholarship detail page URL — application URL fallback. */
  sourceUrl: string
  /** Optional explicit apply/link URL pulled from the page's apply button. */
  applyUrl?: string | null
}

// ─── Canonical vocabularies ────────────────────────────────────────────────
export const SCHOLARSHIP_LEVEL_CANON = [
  'Undergraduate',
  'Diploma',
  'Masters',
  'PhD',
  'Postdoctoral',
  'Short Course',
  'TVET',
] as const

export const SCHOLARSHIP_COVERAGE_CANON = [
  'Tuition',
  'Stipend',
  'Living Costs',
  'Accommodation',
  'Travel',
  'Airfare',
  'Books',
  'Research',
  'Health Insurance',
  'Full Funding',
] as const

const LEVEL_SYNONYMS: Array<[RegExp, string]> = [
  [/\b(ph\.?\s?d|doctoral|doctor of philosophy|tutorial fellow)\b/i, 'PhD'],
  [/\b(m\.?\s?sc|m\.?\s?eng|masters?|master'?s|msc|ma\/msc|postgraduate|post-graduate|graduate assistant)\b/i, 'Masters'],
  [/\b(undergraduate|bachelors?|bachelor'?s|b\.?\s?sc|ba\/?bsc|b\.?\s?eng|four year course)\b/i, 'Undergraduate'],
  [/\b(diploma|grade\s*[123]|craft certificate)\b/i, 'Diploma'],
  [/\b(post-?doc|postdoctoral|doctoral research fellowship)\b/i, 'Postdoctoral'],
  [/\b(short course|certificate course|training programme|three months of intensive)\b/i, 'Short Course'],
  [/\b(tvet|technician|technologist|artisan)\b/i, 'TVET'],
]

const COVERAGE_SYNONYMS: Array<[RegExp, string]> = [
  [/\b(fully funded|full scholarship|covers? (?:all|the cost)|full funding)\b/i, 'Full Funding'],
  [/\btuition\b/i, 'Tuition'],
  [/\b(stipend|monthly allowance|maintenance allowance)\b/i, 'Stipend'],
  [/\b(living (?:costs?|allowance)|accommodation|housing)\b/i, 'Accommodation'],
  [/\b(travel(|ling)? allowance|transport(?:ation)? (?:allowance|costs?))\b/i, 'Travel'],
  [/\b(return )?airfare|air ?ticket|flight\b/i, 'Airfare'],
  [/\b(books?|reading materials?)\b/i, 'Books'],
  [/\b(research (?:grant|funding|costs?)|consumables|lab(?:oratory)? equipment)\b/i, 'Research'],
  [/\b(health (?:insurance|cover)|medical)\b/i, 'Health Insurance'],
]

function matchesList(
  text: string,
  table: Array<[RegExp, string]>,
  cap: number
): string[] {
  const out: string[] = []
  for (const [re, canonical] of table) {
    if (re.test(text)) out.push(canonical)
    if (out.length >= cap) break
  }
  return out
}

/** Trim, dedup, drop blanks and over-long junk entries. */
function cleanStringList(values: unknown, cap = 12): string[] {
  if (!Array.isArray(values)) return []
  const out: string[] = []
  for (const raw of values) {
    const value = String(raw ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^["'\s]+|["'\s,;]+$/g, '')
    if (!value) continue
    if (value.length > 80) continue
    if (out.some(v => v.toLowerCase() === value.toLowerCase())) continue
    out.push(value)
    if (out.length >= cap) break
  }
  return out
}

// ─── Deadline grounding ────────────────────────────────────────────────────
const MONTH_NAMES: Record<string, string> = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12',
}
const MONTH_ABBREVS: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  sept: '09',
  oct: '10',
  nov: '11',
  dec: '12',
}

/**
 * True when a `yyyy-mm-dd` date is actually supported by the page text —
 * the year must appear, plus either the numeric month or a month name.
 * Blocks the classic failure mode of an LLM "closing soon" → today+30.
 */
export function deadlineAppearsInText(deadline: string, text: string): boolean {
  const day = parseDeadlineDate(deadline)
  if (!day) return false
  const [year, month] = day.split('-')
  const lower = text.toLowerCase()
  if (!lower.includes(year)) return false
  const monthName = Object.keys(MONTH_NAMES).find(m => MONTH_NAMES[m] === month)
  const abbr = Object.keys(MONTH_ABBREVS).find(a => MONTH_ABBREVS[a] === month && a.length === 3) || null
  const dayOfMonth = String(parseInt(day.slice(8, 10), 10))
  const numericOk =
    lower.includes(`/${month}/`) ||
    lower.includes(`-${month}-`) ||
    lower.includes(`${month}/${year.slice(2)}`) ||
    lower.includes(`${dayOfMonth}/${parseInt(month, 10)}/${year}`) ||
    lower.includes(`${dayOfMonth}/${month}/${year}`)
  // Word-boundary month matching: a bare `includes('may')` would match
  // "maybe", and `\bmar\w*` would match "market" — both would let an invented
  // date pass the grounding check.
  const nameOk =
    (monthName ? new RegExp(`\\b${monthName}\\b`, 'i').test(lower) : false) ||
    (abbr ? new RegExp(`\\b${abbr}(?:\\.|\\s+\\d{1,2})`, 'i').test(lower) : false)
  return numericOk || nameOk
}

/** Rule-based deadline hunt: labelled dates first, then generic dates near deadline words. */
export function extractScholarshipDeadlineText(html: string, text: string): string | null {
  const fromHtml = extractApplicationDeadline(html)
  if (fromHtml) return fromHtml
  const patterns: RegExp[] = [
    /\b(?:application|entry|submission)\s*(?:date|deadline)?\s*(?:is|:|-|by|of)?\s*(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+,?\s*\d{4})/i,
    /\b(?:deadline|closing date|closes?|close date|last date|applications?\s+(?:close|deadline))\s*(?:is|:|-|by|on|of)?\s*(\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?[A-Za-z]+\s+,?\s*\d{4})/i,
    /\b(?:deadline|closing date|closes?|last date|apply by|applications?\s+close)\s*(?:is|:|-|by|on|of)?\s*(\d{4}-\d{2}-\d{2})/i,
    /\b(?:deadline|closing date|closes?|last date|apply by)\s*(?:is|:|-|by|on|of)?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i,
    /\b(?:on or before|before|no later than|by)\s+(\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?[A-Za-z]+\s+,?\s*\d{4})/i,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) {
      const parsed = parseDeadlineDate(m[1])
      if (parsed) return parsed
    }
  }
  return null
}

// ─── Nationality / eligibility signals ─────────────────────────────────────
// Accuracy-first: only an EXPLICIT exclusion flips the flag. Silence means
// "unknown" and defaults to open (Kenyan aggregators list international
// awards constantly; a wrong false would drop real opportunities).
const NOT_OPEN_PATTERNS: RegExp[] = [
  /\b(?:not|n't)\s+(?:open\s+to|available\s+to|eligible\s+for)\s+(?:the\s+)?ken(?:yan|ya)\b/i,
  /\bken(?:yan|ya)\s+(?:citizens?|nationals?|applicants?|students?)\s+(?:are\s+)?(?:not|ineligible)\b/i,
  /\bnot\s+(?:eligible|allowed|permitted)\s+to\s+apply\s+(?:as\s+)?(?:a\s+)?kenyan\b/i,
  /\b(?:excluded|excludes?)\s+(?:from\s+)?ken(?:yan|ya)\s+(?:citizens?|applicants?|nationals?)\b/i,
  /\bkenyans?\s+(?:are\s+)?(?:excluded|not\s+eligible)\b/i,
  // Named-nationality-only wording. Safe because the nationality list is
  // explicit — "US citizens only" can never be a mis-parse of a Kenya award.
  /\b(?:us|american|uk|british|canadian|australian|new\s+zealand|chinese|indian|eu|european|commonwealth)\s+(?:citizens?|nationals?|residents?|students?)\s+only\b/i,
]

// Exclusivity + nationality + country: "restricted to citizens of Ghana".
// Global so every occurrence is inspected; a match counts as an exclusion
// only when the WHOLE matched phrase says nothing about Kenya (the lookahead
// alone is not enough — "students of chemistry in Kenya" would otherwise
// capture "chemistry in " and read as a foreign-only award).
const FOREIGN_ONLY_RES = [
  /\b(?:restricted|exclusiv\w*|limit\w*|confined)\s+(?:to|for)\s+(?:only\s+)?(?:the\s+)?(?:citizens?|nationals?|residents?|applicants?|students?|candidates?)\s+(?:of|from|in)\s+[a-z][a-z\s-]{2,30}\b/gi,
  /\b(?:open|available|applicable)\s+only\s+(?:to|for)\s+(?:the\s+)?(?:citizens?|nationals?|residents?|applicants?|students?|candidates?)\s+(?:of|from|in)\s+[a-z][a-z\s-]{2,30}\b/gi,
  /\b(?:citizens?|nationals?|residents?)\s+(?:of|from)\s+[a-z][a-z\s-]{2,30}\s+only\b/gi,
]

const OPEN_TO_KENYA_PATTERNS: RegExp[] = [
  /\b(?:all\s+)?ken(?:yan|ya)\s+(?:citizens?|nationals?|applicants?|students?|youth)\b/i,
  /\bopen\s+to\s+(?:the\s+)?ken(?:yan|ya)\b/i,
  /\bkenyan\b[\s\S]{0,40}\b(?:are\s+)?(?:encouraged|eligible|welcome)\b/i,
]

export type KenyanOpenness = { openToKenyans: boolean; explicit: boolean }

export function detectOpenToKenyans(text: string): KenyanOpenness {
  for (const re of NOT_OPEN_PATTERNS) {
    if (re.test(text)) return { openToKenyans: false, explicit: true }
  }
  for (const re of FOREIGN_ONLY_RES) {
    // Fresh lastIndex per call: these are module-level /g regexes.
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      if (/ken/i.test(m[0])) continue
      return { openToKenyans: false, explicit: true }
    }
  }
  if (OPEN_TO_KENYA_PATTERNS.some(re => re.test(text))) {
    return { openToKenyans: true, explicit: true }
  }
  return { openToKenyans: true, explicit: false }
}

// ─── Provider / destination / duration / award value ───────────────────────
export function extractProvider(title: string, text: string): string | null {
  const labelled = text.match(
    /\b(?:provided|offered|sponsored|funded|administered|hosted)\s+(?:by|from)\s+([A-Z][^,.;\n]{2,70})/i
  )
  if (labelled?.[1]) return cleanLabel(labelled[1])
  const sponsor = text.match(/\b(?:sponsor|funder|organisation|organization)\s*:\s*([^\n,.;]{2,70})/i)
  if (sponsor?.[1]) return cleanLabel(sponsor[1])
  // Award names usually lead with the funder: "Chevening Scholarship",
  // "DAAD In-Country Programme", "HESLB Bursary".
  const fromTitle = title.match(/^([A-Z][A-Za-z0-9&'.-]*(?:\s+[A-Z0-9][A-Za-z0-9&'.-]*){0,3})\s+(?:scholarship|bursary|award|fellowship|grant|studentship|funding)\b/i)
  if (fromTitle?.[1]) return cleanLabel(fromTitle[1])
  return null
}

function cleanLabel(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:the)\s+/i, '')
    .replace(/["'`]+$/g, '')
    .slice(0, 120)
}

const COUNTRY_LIST =
  'kenya|uganda|tanzania|ethiopia|rwanda|nigeria|south africa|ghana|china|india|japan|south korea|korea|germany|france|united kingdom|uk|england|scotland|wales|northern ireland|ireland|netherlands|sweden|norway|denmark|finland|iceland|poland|spain|portugal|italy|austria|switzerland|russia|turkey|malaysia|singapore|thailand|australia|new zealand|canada|united states|usa|us|mexico|brazil|saudi arabia|united arab emirates|uae|qatar|kuwait|oman|bahrain|egypt|morocco|mauritius|seychelles|zambia|zimbabwe|botswana|namibia|malawi|mozambique|senegal|ivory coast|belgium|czech|hungary|greece|israel|iran|pakistan|bangladesh|sri lanka|vietnam|indonesia'

export function extractStudyDestination(text: string): string | null {
  const re = new RegExp(
    `\\b(?:to study|study|studies|programme|program|course|university|institution|tenable|based)\\s+(?:in|at|from)\\s+(?:the\\s+)?((?:${COUNTRY_LIST})|\\[[A-Za-z ,]+\\]|[A-Z][A-Za-z ]{2,24})\\b`,
    'i'
  )
  const m = text.match(re)
  if (!m?.[1]) return null
  const raw = m[1].trim().toLowerCase()
  const known = COUNTRY_LIST.split('|').find(c => raw.startsWith(c))
  const value = known
    ? known
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : cleanLabel(m[1])
  return value && value.length <= 60 ? value : null
}

export function extractDurationText(text: string): string | null {
  // A bare "2 years" / "6 months" is ambiguous — it is just as often an age
  // limit ("under the age of 30 years") or an experience requirement
  // ("2 years of experience"), which would corrupt duration. Require study
  // context nearby before accepting the phrase as an award duration.
  const WORD_DIGITS: Record<string, string> = {
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    nine: '9',
    twelve: '12',
  }
  const re =
    /\b(\d+|one|two|three|four|five|six|nine|twelve)\s*(months?|years?)\b/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    // Tight window: a wider one lets a neighbouring "years of experience" or
    // age limit contaminate a legitimate "Two years of study" phrase.
    const window = text.slice(Math.max(0, m.index - 25), m.index + m[0].length + 25)
    if (/\b(?:experience|exper|age|old)\b/i.test(window)) continue
    if (
      !/\b(?:study|studying|programme|program|course|duration|tenable|spread|ph\.?d|masters?)\b/i.test(
        window
      )
    ) {
      continue
    }
    const raw = m[1].toLowerCase()
    const count = WORD_DIGITS[raw] || raw
    return m[2].toLowerCase().startsWith('month')
      ? `${count} month${count === '1' ? '' : 's'}`
      : `${count} year${count === '1' ? '' : 's'}`
  }
  if (/for the duration of (?:the )?(?:study|programme|program)/i.test(text)) return 'Duration of study'
  return null
}

export function extractAwardValue(text: string): string | null {
  const money = text.match(
    /(?:^|[^\w])([Kk]sh|N|₦|R|USD|US\$|\$|£|€|GBP|EUR)\s?([\d,]{3,15})(?:\s*-\s*([\d,]{3,15}))?\b(?:\s*(?:per|a|an|each)\s*(?:annum|year|student|month))?/
  )
  if (money) {
    const range = money[3] ? `–${money[3]}` : ''
    const symbol = money[1].trim()
    // Alphabetic symbols need a space ("Ksh 100,000"); glyphs do not ("$5,000").
    const sep = /^[A-Za-z]/.test(symbol) ? ' ' : ''
    return `${symbol}${sep}${money[2]}${range}`.slice(0, 80)
  }
  const covered = text.match(
    /\b(full scholarship|fully funded|partial scholarship|tuition only|covers? tuition)\b/i
  )
  if (covered) return cleanLabel(covered[1])
  return null
}

/**
 * Academic year drives cohort dedup ("Chevening 2026" vs "2027" are separate
 * records). Prefer an explicit intake year in the page, else derive from the
 * deadline (Nov/Dec deadlines recruit for the FOLLOWING intake).
 */
export function deriveAcademicYear(text: string, deadline: string | null, now = new Date()): number {
  const intake = text.match(
    /\b(?:intake|academic year|year of entry|commencement)\s*(?:of|:|-)?\s*(20\d{2}(?:[/–-]20?\d{2})?)\b/i
  )
  if (intake?.[1]) {
    const first = parseInt(intake[1].slice(0, 4), 10)
    if (first >= 2000 && first <= 2100) return first
  }
  const plain = text.match(/\b(20\d{2})\s*(?:intake|academic year|entry)\b/i)
  if (plain?.[1]) return parseInt(plain[1], 10)
  if (deadline) {
    const y = parseInt(deadline.slice(0, 4), 10)
    const m = parseInt(deadline.slice(5, 7), 10)
    if (Number.isFinite(y)) return m >= 10 ? y + 1 : y
  }
  return now.getUTCMonth() >= 9 ? now.getUTCFullYear() + 1 : now.getUTCFullYear()
}

// ─── Rule-based fallback parse ─────────────────────────────────────────────
function toParagraphs(text: string, maxChars = 4000): string | null {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return null
  const clipped = clean.length > maxChars ? `${clean.slice(0, maxChars)}…` : clean
  return `<p>${clipped.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
}

export function parseScholarshipFallback(input: ScholarshipParseInput): ParsedScholarship {
  const title = (input.title || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
  const text = stripHtmlToText(input.html) || (input.text || '').replace(/\s+/g, ' ').trim()
  const hay = `${title} ${text}`.trim()

  const pageDeadline = extractScholarshipDeadlineText(input.html || '', hay)
  const openness = detectOpenToKenyans(hay)
  const coverage = matchesList(hay, COVERAGE_SYNONYMS, 6)
  const isPartialAward = /\bpartial scholarships?\b|\bpartially funded\b/i.test(hay)

  return {
    title,
    provider: extractProvider(title, hay),
    description: toParagraphs(text),
    level: matchesList(hay, LEVEL_SYNONYMS, 4),
    fieldOfStudy: [],
    studyDestination: extractStudyDestination(hay),
    openToKenyans: openness.openToKenyans,
    openToKenyansExplicit: openness.explicit,
    eligibility: toParagraphs(text, 2500),
    programMission: null,
    coverage,
    isPartialAward,
    awardValue: extractAwardValue(hay),
    applicationDeadline: pageDeadline,
    deadlineSource: pageDeadline ? 'page' : null,
    academicYear: deriveAcademicYear(hay, pageDeadline),
    durationText: extractDurationText(hay),
    applicationUrl: (input.applyUrl || '').trim() || input.sourceUrl,
  }
}

// ─── AI prompt + merge ─────────────────────────────────────────────────────
function buildScholarshipSystemPrompt(): string {
  return [
    'You extract structured facts from a scholarship / bursary / fellowship / award listing page.',
    'Reply with a single JSON object and no prose. Use null for anything the page does not state.',
    'NEVER invent a deadline: copy a date only when it appears in the text. If no closing date is stated, deadline must be null.',
    'level: pick only from ["Undergraduate","Diploma","Masters","PhD","Postdoctoral","Short Course","TVET"].',
    'coverage: pick only from ["Tuition","Stipend","Living Costs","Accommodation","Travel","Airfare","Books","Research","Health Insurance","Full Funding"].',
    'fieldOfStudy: the disciplines the award funds, in the page\'s own words (e.g. ["Chemical Engineering","Materials Science"]). Empty array when unrestricted.',
    'openToKenyans: false ONLY when the page explicitly excludes Kenyan citizens or restricts the award to other nationalities. Default true.',
    'studyDestination: country the winner studies IN, or null for in-country funding.',
    'programMission: one sentence on why the funder offers the award (its sector/mandate), or null.',
    'description: 2-4 sentences of factual summary using ONLY page content. eligibility: bullet-style summary of who may apply.',
    'deadline: "YYYY-MM-DD" copied from the page. awardValue: e.g. "Ksh 100,000" or "Full tuition". duration: e.g. "2 years".',
  ].join('\n')
}

function buildScholarshipUserPrompt(input: ScholarshipParseInput, fallback: ParsedScholarship, pageText: string): string {
  return [
    'Scholarship listing page to extract.',
    `Known title from the listing: ${fallback.title || '(none)'}`,
    `Source URL: ${input.sourceUrl}`,
    `Rule-based deadline already found on the page: ${fallback.applicationDeadline || '(none)'}`,
    '',
    'Page text:',
    '"""',
    pageText.slice(0, 9000),
    '"""',
    '',
    'JSON keys: title, provider, deadline, academic_year (integer or null), level, fieldOfStudy,',
    'studyDestination, openToKenyans (boolean), eligibility, programMission, coverage, awardValue,',
    'duration, applicationUrl, description.',
  ].join('\n')
}

type AiScholarshipJson = Record<string, unknown>

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const clean = value.replace(/\s+/g, ' ').trim()
  return clean || null
}

function asBool(value: unknown, dflt: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    if (v === 'true' || v === 'yes') return true
    if (v === 'false' || v === 'no') return false
  }
  return dflt
}

/**
 * Extract a scholarship detail page into publish-ready fields.
 * Rule-based first, AI second; the AI can only override the deadline when its
 * date is literally supported by the page text.
 */
export async function parseScholarshipContent(
  input: ScholarshipParseInput
): Promise<ParsedScholarship> {
  const fallback = parseScholarshipFallback(input)
  const pageText =
    stripHtmlToText(input.html) || (input.text || '').replace(/\s+/g, ' ').trim()

  if (!pageText) return fallback
  if (!hasAIConfigured()) return fallback

  let ai: AiScholarshipJson | null = null
  try {
    const result = await callAI(buildScholarshipUserPrompt(input, fallback, pageText), {
      systemPrompt: buildScholarshipSystemPrompt(),
      json: true,
      temperature: 0.1,
      maxTokens: 1400,
      timeoutMs: 45_000,
      // Same budget discipline as the job parser: one try per key, two keys max.
      maxKeyTries: 2,
    })
    ai = result.parsed && typeof result.parsed === 'object' ? (result.parsed as AiScholarshipJson) : null
  } catch (err) {
    console.warn(
      '[scholarshipParse] AI parse failed, using rule-based fallback:',
      err instanceof Error ? err.message : err
    )
    return fallback
  }

  if (!ai) return fallback

  // ── Deadline: page value wins; AI date must be grounded in the text ──
  const aiDeadlineRaw = asString(ai.deadline) || asString(ai.application_deadline) || asString(ai.applicationDeadline)
  const aiDeadline = parseDeadlineDate(aiDeadlineRaw || '')
  let applicationDeadline = fallback.applicationDeadline
  let deadlineSource = fallback.deadlineSource
  if (aiDeadline && !applicationDeadline && deadlineAppearsInText(aiDeadline, pageText)) {
    applicationDeadline = aiDeadline
    deadlineSource = 'ai'
  }

  const levelFromAi = cleanStringList(ai.level, 4).map(entry => {
    const hit = SCHOLARSHIP_LEVEL_CANON.find(c => c.toLowerCase() === entry.toLowerCase())
    return hit || entry
  })
  const coverageFromAi = cleanStringList(ai.coverage, 6).map(entry => {
    const hit = SCHOLARSHIP_COVERAGE_CANON.find(c => c.toLowerCase() === entry.toLowerCase())
    return hit || entry
  })

  const openness = detectOpenToKenyans(pageText)
  // A page-explicit statement always wins. Without one, an AI-reported
  // exclusion is only trusted when the page actually talks about nationality
  // eligibility — models hallucinate restrictions, and a false negative here
  // silently drops a real opportunity for Kenyan students.
  const aiOpen = asBool(ai.openToKenyans, openness.openToKenyans)
  const nationalityTalked =
    /\b(?:citizens?|nationals?|residents?|eligible|eligibility|open\s+(?:only\s+)?to|restricted\s+to)\b/i.test(
      pageText
    )
  const aiExclusionTrusted = aiOpen === false && nationalityTalked
  const openToKenyans = openness.explicit ? openness.openToKenyans : !aiExclusionTrusted
  const openToKenyansExplicit = openness.explicit || aiExclusionTrusted

  const yearRaw = ai.academic_year ?? ai.academicYear
  const academicYear =
    typeof yearRaw === 'number' && yearRaw >= 2000 && yearRaw <= 2100
      ? Math.floor(yearRaw)
      : typeof yearRaw === 'string' && /^(?:20\d{2}|20\d{2}\/\d{2})$/.test(yearRaw.trim())
        ? parseInt(yearRaw.trim().slice(0, 4), 10)
        : fallback.academicYear

  const aiTitle = asString(ai.title)
  const aiProvider = asString(ai.provider) || asString(ai.organization)
  const aiMission = asString(ai.programMission) || asString(ai.program_mission)
  const aiApplicationUrl = asString(ai.applicationUrl) || asString(ai.application_url)
  const aiAwardValue = asString(ai.awardValue) || asString(ai.award_value)
  const aiDuration = asString(ai.duration) || asString(ai.durationText)
  const aiDescription = asString(ai.description)
  const aiEligibility = asString(ai.eligibility)

  const fieldFromAi = cleanStringList(ai.fieldOfStudy ?? ai.field_of_study)

  return {
    ...fallback,
    title: (aiTitle && aiTitle.slice(0, 200)) || fallback.title,
    provider: aiProvider || fallback.provider,
    description: aiDescription ? toParagraphs(aiDescription) : fallback.description,
    level: levelFromAi.length ? levelFromAi : fallback.level,
    fieldOfStudy: fieldFromAi.length ? fieldFromAi : fallback.fieldOfStudy,
    studyDestination:
      asString(ai.studyDestination) || asString(ai.study_destination) || fallback.studyDestination,
    openToKenyans,
    openToKenyansExplicit,
    eligibility: aiEligibility ? toParagraphs(aiEligibility) : fallback.eligibility,
    programMission: aiMission,
    coverage: coverageFromAi.length ? coverageFromAi : fallback.coverage,
    isPartialAward:
      asBool(ai.isPartialAward, /\bpartial\b/i.test(coverageFromAi.join(' ') + ' ' + (aiAwardValue || ''))) ||
      fallback.isPartialAward,
    awardValue: aiAwardValue || fallback.awardValue,
    applicationDeadline,
    deadlineSource,
    academicYear,
    durationText: aiDuration || fallback.durationText,
    applicationUrl:
      aiApplicationUrl && /^https?:\/\//i.test(aiApplicationUrl)
        ? aiApplicationUrl
        : fallback.applicationUrl,
  }
}
