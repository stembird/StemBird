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
// "Or related field / discipline" phrasing typically follows one of these
// stems, which is how chemists qualify into adjacent roles (Food Tech,
// Nutrition, Environmental Science, Geology, etc.).
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
  'food safety',
  'food quality',
  'nutrition',
  'dietetics',
  'cosmetic science',
  'flavour',
  'fragrance',
  'pharmaceutical chemistry',
  'pharmaceutical science',
  'pharmaceutical technology',
  'pharmacology',        // science, not retail dispensing
  'toxicology',
  'forensic science',
  'forensic chemistry',
  'environmental chemistry',
  'environmental science',
  'environmental management',
  'water sanitation',
  'water science',
  'applied chemistry',
  'chemical technology',
  'laboratory science',
  'laboratory technology',
  'medical laboratory',
  'geology',
  'geoscience',
  'soil science',
  'agricultural chemistry',
  'quality assurance',
  'quality control',
  'bioprocess',
  'bio-processing',
  'fermentation',
  'biotechnology',
]

const STUDY_CUE_RE =
  /\b(degree|diploma|bachelor|baccalaureate|bsc|master|msc|phd|doctorate|field of study|area of study|major|speciali[sz]ation|studied|qualification|background in|discipline|graduate|university|college|institute|polytechnic|coursework)\b/i

// ─── T3 — chemistry-core duty phrases ──────────────────────────────────────
// STRONG phrases are instrument names, chemical techniques, or lab-science
// vocabulary that essentially cannot appear in non-chemistry job descriptions.
// A strong hit publishes on its own.
const CHEM_STRONG_DUTIES = [
  'hplc', 'gc-ms', 'gcms', 'lc-ms', 'icp-oes', 'icp-ms', 'ftir', 'uv-vis',
  'aas', 'xrf', 'xrd', 'msk', 'karl fischer',
  'titration', 'wet chemistry', 'wet analysis',
  'sample preparation', 'sample analysis', 'samples analysis',
  'method development', 'method validation', 'method transfer',
  'spectroscop', 'chromatograph', 'mass spectrometry',
  'chemical analysis', 'chemical testing', 'chemical handling',
  'chemical inventory', 'chemical storage', 'chemical safety',
  'physical chemical', 'physical-chemical', 'physicochemical',
  'polymerisation', 'distillation', 'crystallisation',
  'ph calibration', 'moisture content', 'ash content',
  'iso 17025', 'iso17025', 'glp', 'gmp', 'haccp',
  'good laboratory practice', 'good manufacturing practice',
  'quality control chemist', 'quality assurance chemist',
  'laboratory analyst', 'laboratory chemist', 'process chemist',
  'plant chemist', 'qc chemist', 'qa chemist', 'analytical chemist',
  'research chemist', 'formulation chemist', 'materials chemist',
  'petrochemical', 'hydrometallurgy', 'pyrometallurgy', 'beneficiation',
  'effluent treatment', 'water treatment chemist', 'boiler water treatment',
  'toxicology analysis', 'drug analysis', 'residue analysis',
  'microbiological testing', 'sterility testing', 'endotoxin',
  'proximate analysis', 'calorific value', 'calorimet', 'calorimetry',
  'reagent preparation', 'reagents preparation',
  'wet laboratory', 'wet lab',
  'stability testing', 'shelf life',
  'assay',
  'batch release', 'batch record',
  'contamination monitoring',
  'formulation development', 'formulation optimization', 'formulation of',
  'materials characterisation', 'materials characterization',
  'measurement uncertainty',
  'pharmaceutical technology', 'pharmacopoeia',
  'food safety system',
]

// SUPPORT phrases are chemist-doable duties that ALSO appear in non-chemistry
// job ads (bank process control, software QA, generic calibration, ISO 9001
// compliance, product specs). They only publish when corroborated by a
// chemistry-plausible title or T1/T2 signal.
const CHEM_SUPPORT_DUTIES = [
  'quality control', 'quality assurance', 'quality testing', 'quality inspection',
  'calibration', 'instrument calibration', 'instrument maintenance', 'instrument operation',
  'laboratory equipment', 'laboratory instrument', 'laboratory operation',
  'laboratory safety', 'laboratory management', 'laboratory supervision',
  'raw material testing', 'raw materials testing', 'raw material inspection',
  'finished product testing', 'in-process testing', 'product testing',
  'batch analysis', 'batch testing',
  'sample handling', 'sample collection and analysis',
  'test results', 'test methodology', 'testing methodology', 'test reports',
  'process monitoring', 'process control',
  'product specification', 'product specifications', 'specification testing',
  'specification compliance', 'parameter testing',
  'standard operating procedure', 'sop',
  'emission monitoring', 'water quality', 'water treatment', 'wastewater', 'effluent',
  'iso ', 'audits', 'microbial testing',
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

// ─── Title plausibility (T1 corroborator) ──────────────────────────────────
// The pre-Chemistry-Lens AI tagger frequently mis-assigned chemistry-core
// function tags to generic jobs (IT Support → LIMS, Housekeeper → Formulation,
// Volunteer → Forensic, Data Analyst → Chemometrics). To publish on a T1 tag
// alone, the title must at least LOOK like work a chemist could hold. When the
// title is silent, T2 (chem degree) or T3-strong (instrument/chemical) prose
// evidence must corroborate the tag.
// Deliberately compound — no bare "analysis", "quality", "research",
// "sample" or "process", which appear in bank/software/NGO titles too.
const CHEM_TITLE_STEMS = [
  'chemist', 'chemistry', 'chemical', 'biochem',
  'laborator', 'lab technician', 'lab technologist', 'lab scientist',
  'lab assistant', 'lab analyst', 'lab manager', 'lab supervisor', 'lab head',
  'analytical', 'qc chemist', 'qa chemist', 'qc officer', 'qa officer',
  'qc assistant', 'qa assistant', 'quality control', 'quality assurance',
  'quality officer', 'quality assistant', 'quality engineer',
  'formulation', 'formulator',
  'metrolog', 'calibration engineer',
  'process chemist', 'process engineer', 'process technician', 'process operator',
  'process development', 'process safety',
  'production chemist', 'plant chemist', 'plant operator', 'plant engineer',
  'production planner', 'production supervisor',
  'refinery', 'distillation', 'fermentation',
  'polymer', 'metallurg', 'mineral process', 'assay', 'ore',
  'petrochem', 'petroleum', 'oil and gas', 'gas processing',
  'spectroscop', 'chromatograph', 'mass spec',
  'microbiolog', 'toxicolog', 'forensic',
  'pharmac', 'cosmetic',
  'food science', 'food technolog', 'food safety', 'beverage', 'brewing', 'dairy',
  'water treatment', 'wastewater', 'effluent', 'sanitation', 'water quality',
  'environmental', 'pollution', 'emission',
  'excipient', 'reagent',
  'rubber', 'plastics', 'paint', 'coating', 'adhesive', 'cement', 'concrete',
  'agrochem', 'agricultural chem', 'fertiliser', 'fertilizer', 'pesticide',
  'flavour', 'fragrance',
  'explosive', 'hazmat',
  'r&d', 'research chemist', 'research scientist', 'research officer',
  'method development', 'method validation',
  'materials engineer', 'materials scientist', 'materials technician',
  'regulatory affairs', 'pharmacovigilance', 'clinical research',
]

function looksChemistryTitle(title: string): boolean {
  const lower = ` ${title.toLowerCase()} `
  // Substring match for compound phrases.
  if (CHEM_TITLE_STEMS.some((stem) => lower.includes(stem))) return true
  // Word-boundary match for short tokens that only count as standalone words.
  // (Bare 'qc' / 'qa' would otherwise collide with 'qatar', 'equable', etc.)
  return /\b(?:qc|qa|r&d|hse|ehs|cqc)\b/.test(lower)
}

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

function hasStrongChemDuty(texts: Array<string | null | undefined>): boolean {
  return texts
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .some((t) => anyPhrase(t, CHEM_STRONG_DUTIES))
}

function hasSupportChemDuty(texts: Array<string | null | undefined>): boolean {
  return texts
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .some((t) => anyPhrase(t, CHEM_SUPPORT_DUTIES))
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

  // T3 — split into STRONG (instrument/chemical) and SUPPORT (broad QC/ISO)
  const allTexts = [title, ...proseFields]
  const strongDutyHit = hasStrongChemDuty(allTexts)
  const supportDutyHit = hasSupportChemDuty(allTexts)
  const dutyHit = strongDutyHit || supportDutyHit

  // T4 — commercial context requires product trading PLUS chemistry literacy
  const tradeHit =
    proseFields.concat(title).some((t) => t && anyPhrase(t, CHEM_TRADE_NOUNS)) &&
    (degreeHit ||
      proseFields.some((t) => t && anyPhrase(t, CHEM_LITERACY_SIGNALS)))

  // Title plausibility — the title itself looks like chemist-doable work.
  const titlePlausible = looksChemistryTitle(title)

  // Publish rules:
  //   - T2 alone (chemistry degree explicitly required)
  //   - T3-STRONG alone (a named instrument/technique can't be business-ese)
  //   - T4 alone (already requires trade-noun + literacy combo)
  //   - T1 + corroborator (chem-core tag with a chem-plausible title or a
  //     chemistry degree/duty signal in prose)
  //   - titlePlausible + T3-SUPPORT (e.g., "Quality Assurance Officer" with
  //     generic QC/calibration duties — the title carries the chemistry weight)
  const publish =
    degreeHit
    || strongDutyHit
    || tradeHit
    || (chemCoreHit && (titlePlausible || degreeHit || strongDutyHit))
    || (titlePlausible && supportDutyHit)

  const testsPassed: ChemistryGateVerdict['testsPassed'] = []
  if (chemCoreHit) testsPassed.push('T1')
  if (degreeHit) testsPassed.push('T2')
  if (dutyHit) testsPassed.push('T3')
  if (tradeHit) testsPassed.push('T4')

  // Hard veto: only rescued by BOTH T2 (chem degree required) AND T3-STRONG.
  // Support-tier phrases (quality control, calibration, SOP) are too generic
  // to rescue a nurse / geneticist / accountant title on their own.
  if (titleVetoed) {
    if (degreeHit && strongDutyHit) {
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

  return {
    publish,
    testsPassed,
    vetoed: false,
    reason: publish
      ? testsPassed.length
        ? `passed ${testsPassed.join(', ')}`
        : 'accepted'
      : chemCoreHit
        ? 'chemistry-core tag present but title/prose lack chemistry evidence (stale tag)'
        : 'no chemistry evidence (T1-T4 all negative)',
  }
}

/** Convenience boolean wrapper used by scrapeProcess/scrapePublish call sites. */
export function matchesChemistryFocus(input: ChemistryGateInput): boolean {
  return evaluateChemistryRelevance(input).publish
}
