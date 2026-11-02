/**
 * Chemistry Lens publication gate — decides whether a scraped/parsed job is
 * in-scope for the Chemistry Lens hub.
 *
 * Doctrine: "Chemistry is the subject. Industry is the application. Careers
 * are the opportunity." Industry alone never publishes.
 *
 * A job passes if ANY of the following tests succeed:
 *   T1 FUNCTION       — job_functions contain a chemistry-core entry
 *                       (see CHEMISTRY_CORE_FUNCTION_NAMES).
 *   T2 QUALIFICATION  — required_qualifications / responsibilities / description
 *                       demand a chemistry-family degree in the same clause as
 *                       a study cue.
 *   T3 DUTIES         — title OR description contains a chemistry-core duty
 *                       phrase (wet analysis, HPLC, formulation, assay, etc.).
 *   T4 COMMERCIAL     — role trades in chemical/lab/pharma products or
 *                       instruments AND demands chemical literacy (degree or
 *                       technical duties present).
 *
 * Hard vetoes (never rescued by tagging alone):
 *   clinical care (nurse, doctor, pharmacist, etc.), pure biology/genetics,
 *   general business/HR/marketing/etc. A vetoed title is only re-admitted
 *   when T2 fires AND duties also pass T3.
 *
 * Env config (mirrors STEMBIRD_SUBJECT_FILTER_*):
 *   CHEMISTRY_LENS_GATE_ENABLED     "true" (default) | "false" to bypass
 *   CHEMISTRY_LENS_DISCOVER_FILTER  "false" (default; accuracy-first)
 */

import {
  CHEMISTRY_CORE_FUNCTION_NAMES,
} from '@/lib/chemistryLens.taxonomy';

/**
 * Queue error_message stamped when the gate rejects a job.
 * Keep in sync with scrapeQueueStats bucketing (see scrapeProcess.ts).
 */
export const SKIPPED_NON_CHEMISTRY_MESSAGE = 'Skipped: outside chemistry focus'

// ─── T1 — chemistry-core functions (from taxonomy) ─────────────────────────
const CHEM_CORE_SET = new Set(CHEMISTRY_CORE_FUNCTION_NAMES.map((n) => n.toLowerCase()))

// ─── T2 — chemistry-family degree stems ────────────────────────────────────
// Only these count for the qualification rescue. They deliberately exclude
// 'nursing', 'medicine', 'pharmacy' (registration), 'biology', 'agronomy'
// because those are hard-vetoed identity fields.
const CHEM_DEGREE_STEMS = [
  'chemistry',
  'chemical engineering',
  'industrial chemistry',
  'analytical chemistry',
  'physical chemistry',
  'biochemistry',
  'petrochemical',
  'polymer science',
  'materials science',
  'materials engineering',
  'metallurg',
  'mineral processing',
  'food science',
  'food technology',
  'cosmetic science',
  'flavour',
  'fragrance',
  'pharmaceutical chemistry',
  'pharmaceutical science',
  'pharmacology',        // science, not retail dispensing
  'toxicology',
  'forensic science',
  'environmental chemistry',
  'water sanitation',
  'applied chemistry',
  'chemical technology',
  'laboratory science',
  'laboratory technology',
]

const STUDY_CUE_RE =
  /\b(degree|diploma|bachelor|baccalaureate|bsc|master|msc|phd|doctorate|field of study|area of study|major|speciali[sz]ation|studied|qualification|background in|discipline|graduate|university|college|institute|polytechnic|coursework)\b/i

// ─── T3 — chemistry-core duty phrases ──────────────────────────────────────
// Whole-phrase matches on title/description. Deliberately concrete so
// business-ese ("analytical mindset") does not fire.
const CHEM_DUTY_PHRASES = [
  'hplc', 'gc-ms', 'gcms', 'icp-oes', 'icp-ms', 'aas', 'ftir', 'uv-vis',
  'titration', 'wet chemistry', 'wet analysis', 'sample preparation',
  'sample handling', 'assay', 'spectroscopy', 'chromatography',
  'mass spectrometry', 'xrf', 'xrd', 'karl fischer',
  'formulation', 'polymerisation', 'distillation', 'crystallisation',
  'ph calibration', 'moisture content', 'method validation',
  'method development', 'iso 17025', 'glp', 'gmp',
  'chemical analysis', 'quality control chemist', 'quality assurance chemist',
  'laboratory analyst', 'laboratory chemist', 'process chemist',
  'plant chemist', 'QC chemist', 'QA chemist', 'analytical chemist',
  'research chemist', 'formulation chemist', 'materials chemist',
  'petrochemical', 'hydrometallurgy', 'pyrometallurgy', 'beneficiation',
  'effluent treatment', 'water treatment chemist', 'boiler water treatment',
  'toxicology analysis', 'drug analysis', 'residue analysis',
  'microbiological testing', 'sterility testing', 'endotoxin',
  'proximate analysis', 'calorific value',
]

// ─── T4 — commercial context (product/instrument trading + chemistry literacy) ─
const CHEM_TRADE_NOUNS = [
  'reagent', 'laboratory instrument', 'scientific instrument', 'hplc column',
  'chromatography', 'spectrophotometer', 'analytical instrument',
  'chemical supplier', 'pharmaceutical products', 'laboratory consumables',
  'reference standard', 'lab supplies',
]
const CHEM_LITERACY_SIGNALS = [
  'degree in chemistry', 'degree in chemical', 'degree in biochemistry',
  'bachelor of science in chemistry', 'bsc chemistry', 'technical background in chemistry',
  'strong chemistry', 'sound knowledge of chemistry', 'chemistry qualification',
]

// ─── Hard vetoes ────────────────────────────────────────────────────────────
const CLINICAL_CARE_VETO = [
  'nurse', 'nursing officer', 'clinical officer', 'medical officer',
  'doctor', 'surgeon', 'physician', 'dentist', 'pharmacist', 'dispensing chemist',
  'optometrist', 'paramedic', 'midwife', 'physiotherapist', 'radiographer',
  'medical laboratory technologist', // pure clinical; keep chemists via rescue
]
const PURE_BIOLOGY_VETO = [
  'geneticist', 'genetics researcher', 'molecular biologist',
  'zoologist', 'botanist', 'ecologist', 'field biologist', 'wildlife officer',
  'marine biologist', 'entomologist', 'horticulturist', 'agronomist',
]
const GENERAL_BUSINESS_VETO = [
  'accountant', 'auditor', 'human resource', 'hr officer', 'recruiter',
  'marketing', 'brand manager', 'public relations', 'sales executive',
  'business development', 'customer service', 'call centre', 'receptionist',
  'cleaner', 'driver', 'security guard', 'watchman', 'cashier',
  'teacher of english', 'teacher of mathematics', 'teacher of physics',
  'teacher of biology',
]

// ─── Helpers ────────────────────────────────────────────────────────────────
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function envValue(name: string): string | undefined {
  const g = globalThis as unknown as {
    process?: { env?: Record<string, string | undefined> }
  }
  return g.process?.env?.[name]
}

function isGateEnabled(): boolean {
  const raw = (envValue('CHEMISTRY_LENS_GATE_ENABLED') || 'true').trim().toLowerCase()
  return raw !== 'false' && raw !== 'off' && raw !== '0'
}

function hasWord(text: string, phrase: string): boolean {
  const trimmed = phrase.trim()
  if (!trimmed) return false
  const pattern = escapeRe(trimmed).replace(/\s+/g, '\\s+')
  return new RegExp(`(?:^|[^a-z0-9])${pattern}(?:[^a-z0-9]|$)`, 'i').test(text)
}

function anyPhrase(text: string, list: readonly string[]): boolean {
  const lower = text.toLowerCase()
  return list.some((p) => hasWord(lower, p))
}

function splitClauses(text: string): string[] {
  const sentinel = '\u0000'
  const normalized = text
    .replace(/[\u2022\t]/g, sentinel)
    .replace(/[.;:\n]+/g, sentinel)
    .replace(/\b(?:and\s*\/?\s*or|or)\b/gi, sentinel)
  return normalized.split(sentinel).map((s) => s.trim()).filter(Boolean)
}

function hasChemDegreeClause(texts: Array<string | null | undefined>): boolean {
  const joined = texts
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .join(' \n ')
    .toLowerCase()
  if (!joined.trim()) return false
  return splitClauses(joined).some(
    (clause) => STUDY_CUE_RE.test(clause) && CHEM_DEGREE_STEMS.some((stem) => clause.includes(stem))
  )
}

function hasChemDutyLanguage(texts: Array<string | null | undefined>): boolean {
  return texts
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .some((t) => anyPhrase(t, CHEM_DUTY_PHRASES))
}

function isVetoedTitle(title: string): boolean {
  const lower = title.toLowerCase()
  return (
    CLINICAL_CARE_VETO.some((p) => hasWord(lower, p)) ||
    PURE_BIOLOGY_VETO.some((p) => hasWord(lower, p)) ||
    GENERAL_BUSINESS_VETO.some((p) => hasWord(lower, p))
  )
}

// ─── Public types ──────────────────────────────────────────────────────────
export type ChemistryGateInput = {
  title: string
  jobFunctions?: string[] | null
  industries?: string[] | null
  description?: string | null
  requiredQualifications?: string | null
  responsibilities?: string | null
  tags?: string | null
  fieldOfStudy?: string | null
  areaOfStudy?: string | null
}

export type ChemistryGateVerdict = {
  publish: boolean
  testsPassed: Array<'T1' | 'T2' | 'T3' | 'T4'>
  vetoed: boolean
  reason: string
}

// ─── Main gate ──────────────────────────────────────────────────────────────
export function evaluateChemistryRelevance(input: ChemistryGateInput): ChemistryGateVerdict {
  if (!isGateEnabled()) {
    return { publish: true, testsPassed: [], vetoed: false, reason: 'gate disabled' }
  }

  const proseFields = [
    input.requiredQualifications,
    input.responsibilities,
    input.description,
    input.tags,
    input.fieldOfStudy,
    input.areaOfStudy,
  ]

  const title = (input.title || '').trim()
  const functions = (input.jobFunctions || []).map((f) => f.toLowerCase().trim())
  const titleVetoed = isVetoedTitle(title)

  // T1 — chemistry-core function tag
  const chemCoreHit = functions.some((f) => CHEM_CORE_SET.has(f))

  // T2 — chemistry-family degree requirement in prose
  const degreeHit = hasChemDegreeClause(proseFields)

  // T3 — chemistry duty language in title or prose
  const dutyHit = hasChemDutyLanguage([title, ...proseFields])

  // T4 — commercial context requires product trading PLUS chemistry literacy
  const tradeHit =
    proseFields.concat(title).some((t) => t && anyPhrase(t, CHEM_TRADE_NOUNS)) &&
    (degreeHit ||
      proseFields.some((t) => t && anyPhrase(t, CHEM_LITERACY_SIGNALS)))

  const testsPassed: ChemistryGateVerdict['testsPassed'] = []
  if (chemCoreHit) testsPassed.push('T1')
  if (degreeHit) testsPassed.push('T2')
  if (dutyHit) testsPassed.push('T3')
  if (tradeHit) testsPassed.push('T4')

  // Hard veto: only rescued by BOTH T2 (chem degree required) AND T3 (duties are chemical)
  if (titleVetoed) {
    if (degreeHit && dutyHit) {
      return {
        publish: true,
        testsPassed,
        vetoed: true,
        reason: 'veto rescued by chemistry degree + chemical duties',
      }
    }
    return {
      publish: false,
      testsPassed,
      vetoed: true,
      reason: 'vetoed title (clinical care / pure biology / general business) without chemistry rescue',
    }
  }

  // Non-vetoed: publish when at least one content test fires.
  // T1 (chemistry-core function) publishes on its own.
  // Non-core active functions (Technical Sales, Applications, Procurement,
  // Teaching, etc.) require corroborating content evidence (T2/T3/T4)
  // because post-migration the tag alone may be a legacy remap artifact.
  const publish =
    chemCoreHit || degreeHit || dutyHit || tradeHit

  return {
    publish,
    testsPassed,
    vetoed: false,
    reason: publish
      ? testsPassed.length
        ? `passed ${testsPassed.join(', ')}`
        : 'T1 chemistry-core function'
      : 'no chemistry evidence (T1-T4 all negative)',
  }
}

/** Convenience boolean wrapper used by scrapeProcess/scrapePublish call sites. */
export function matchesChemistryFocus(input: ChemistryGateInput): boolean {
  return evaluateChemistryRelevance(input).publish
}
