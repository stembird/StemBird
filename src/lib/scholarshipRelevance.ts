/**
 * Chemistry Lens scholarship publication gate — decides whether a scraped
 * scholarship/award is in-scope for the Chemistry Lens hub.
 *
 * Mirrors chemistryRelevance.ts (T1–T4 for jobs) with scholarship-shaped
 * tests. A scholarship passes if ANY of:
 *   S1 FIELD        — field_of_study restriction includes a chemistry-family
 *                     discipline (see CHEM_DEGREE_STEMS in chemistryRelevance).
 *   S2 FUNDER       — funder / program mission is chemistry-relevant: chemical
 *                     industry, materials, pharma, energy, water quality.
 *   S3 GENERAL STEM — a general STEM scholarship a chemistry student could
 *                     apply to: hard-science cue in title/prose (STEM, natural
 *                     /pure/applied sciences, engineering, technology, maths).
 *
 * Hard veto (never rescued by tagging alone): the award is explicitly for
 * humanities / arts / business / law / social-science fields ONLY. Same
 * clause-level discipline as the job gate: a restriction counts when it sits
 * in the same clause as the non-chemistry discipline.
 *
 * Env config (mirrors CHEMISTRY_LENS_GATE_ENABLED):
 *   SCHOLARSHIP_GATE_ENABLED  "true" (default) | "false" to bypass
 */

import { SKIPPED_NON_CHEMISTRY_MESSAGE } from './chemistryRelevance'

/**
 * Queue error_message stamped when the scholarship gate rejects an award.
 * Contains the job gate's `'outside chemistry'` substring on purpose, so the
 * existing admin bucketing (isNonStemSkip / isNonStemSkipMessage) classifies
 * scholarship skips into the same "screened out" bucket with no UI changes.
 */
export const SKIPPED_NON_CHEM_SCHOLARSHIP = `${SKIPPED_NON_CHEMISTRY_MESSAGE} (scholarship)`

// ─── S1 — chemistry-family disciplines (subset shared with the job gate) ────
const CHEM_FIELD_STEMS = [
  'chemistry',
  'chemical',
  'biochem',
  'petrochem',
  'polymer',
  'material',
  'metallurg',
  'mineral',
  'pharmaceutic',
  'pharmacolog',
  'toxicolog',
  'forensic',
  'food science',
  'food technolog',
  'nutrition',
  'environmental science',
  'environmental chem',
  'water',
  'laborator',
  'geolog',
  'geochem',
  'soil science',
  'agricultural chem',
  'agrochem',
  'biotechnolog',
  'bioprocess',
  'fermentation',
  'cosmetic',
  'flavour',
  'fragrance',
  'energy',
  'petroleum',
  'electrochem',
  'spectroscop',
]

// ─── S2 — chemistry-relevant funder/mission cues ────────────────────────────
const CHEM_INDUSTRY_CUES = [
  'chemical',
  'chemical industry',
  'chemistry',
  'petrochemical',
  'pharmaceutic',
  'drug development',
  'materials',
  'metallurg',
  'mining',
  'extractive',
  'energy',
  'renewable energy',
  'fuel',
  'refinery',
  'oil and gas',
  'water quality',
  'water sanitation',
  'wastewater',
  'environment',
  'pollution',
  'laborator',
  'scientific research',
  'csir',
  'icipe',
  'kebs',
]

// ─── S3 — general STEM scholarships open to chemistry students ──────────────
// "hard science" cue in scholarship prose. Deliberately excludes social /
// political / business "sciences", which never read as chemistry-adjacent.
const HARD_SCIENCE_RE =
  /\b(stem|st e m|sciences? and technolog|technolog(y|ical) and scien|engineering and applied science|pure and applied scien|natural scien|physical scien|hard scien|life scien|applied scien|scientific research|science,? technology,? (engineering|and)|mathematic|scientists? and engineers)\b/i

// Social/political/business "science" must not fire S3. Single-word forms
// ("social sciences", "political science") are matched directly so a clause
// consisting only of the term still counts as soft (splitClauses has no
// lookbehind per the ES2017 target).
const SOFT_SCIENCE_RE =
  /\b(social|political|economic|management|business|public policy)\s+sciences?\b|\bpublic\s+administration\b/i

// ─── Vetoes: explicitly humanities / arts / business-only awards ─────────────
const NON_CHEM_DISCIPLINE_RE =
  /\b(humanities|liberal arts|arts?\b|art and design|business|commerce|accounting|finance|economics?|law|legal studies|management|marketing|social sciences?|political science|public administration|journalism|communications?|languages?\b|literature|history|philosophy|theology|religious studies|music|film|education studies?|curriculum)\b/i

// Restriction context: the discipline is the EXCLUSIVE target of the award.
const RESTRICTION_CUE_RE =
  /\b(?:only|exclusive\w*|restricted to|reserved for|specifically for|intended for|open (?:only )?to|candidates? must (?:be|have|come from)|applicants? must (?:be|have|come from)|for students? (?:of|in|pursuing)|in the field(?:s)? of|pursuing (?:a|an|their) (?:degree|studies|studies in))\b/i

/** Clause splitter — identical discipline to the job gate. No lookbehind (ES2017). */
function splitClauses(text: string): string[] {
  const sentinel = '\u0000'
  const normalized = text
    .replace(/[\u2022\t]/g, sentinel)
    .replace(/[.;:\n()]+/g, sentinel)
    .replace(/\b(?:and\s*\/?\s*or|or)\b/gi, sentinel)
  return normalized.split(sentinel).map(s => s.trim()).filter(Boolean)
}

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
  const raw = (envValue('SCHOLARSHIP_GATE_ENABLED') || 'true').trim().toLowerCase()
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
  return list.some(p => hasWord(lower, p))
}

function compact(values: Array<string | null | undefined> | null | undefined): string[] {
  return (values || []).filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
}

// ─── Public types ──────────────────────────────────────────────────────────
export type ScholarshipGateFields = {
  title?: string | null
  /** Funder / sponsoring organization. */
  provider?: string | null
  /** Structured field-of-study restriction from the parser. */
  fieldOfStudy?: string[] | null
  /** Funder / program mission statement (why the award exists). */
  programMission?: string | null
  /** Eligibility prose. */
  eligibility?: string | null
  studyDestination?: string | null
}

export type ScholarshipGateVerdict = {
  publish: boolean
  testsPassed: Array<'S1' | 'S2' | 'S3'>
  vetoed: boolean
  reason: string
}

// ─── Main gate ──────────────────────────────────────────────────────────────
/**
 * `parsedFields` are the structured high-signal fields; `proseFields` are
 * free-text paragraphs (description excerpts, eligibility copy);
 * `description` is the full award description. Mirrors the jobs-gate call
 * shape so scrapeProcess-side call sites read the same way.
 */
export function evaluateScholarshipChemistryFocus(
  parsedFields: ScholarshipGateFields,
  proseFields: Array<string | null | undefined> = [],
  description?: string | null
): ScholarshipGateVerdict {
  if (!isGateEnabled()) {
    return { publish: true, testsPassed: [], vetoed: false, reason: 'gate disabled' }
  }

  const fields = compact([
    parsedFields.title,
    parsedFields.provider,
    ...(parsedFields.fieldOfStudy || []),
    parsedFields.programMission,
    parsedFields.eligibility,
  ])
  const prose = compact([
    ...proseFields,
    parsedFields.eligibility,
    description,
  ])
  const allText = [...fields, ...prose].join(' \n ')

  // S1 — field-of-study restriction names a chemistry-family discipline.
  const s1 = compact(parsedFields.fieldOfStudy).some(entry =>
    CHEM_FIELD_STEMS.some(stem => entry.toLowerCase().includes(stem))
  )

  // S2 — funder / program mission is chemistry-relevant (industry lens).
  const funderMissionText = [
    parsedFields.provider,
    parsedFields.programMission,
    parsedFields.title,
  ]
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .join(' \n ')
  const s2 =
    funderMissionText.trim().length > 0 &&
    (anyPhrase(funderMissionText, CHEM_INDUSTRY_CUES) ||
      splitClauses(funderMissionText).some(
        clause =>
          CHEM_FIELD_STEMS.some(stem => clause.toLowerCase().includes(stem)) &&
          /\b(scholarship|award|funding|programme|program|foundation|association|institute|research)\b/i.test(
            clause
          )
      ))

  // S3 — general STEM scholarship: hard-science cue in prose. Soft
  // "sciences" (social/political/business/data) never count.
  const s3 = (() => {
    if (!allText.trim()) return false
    // Evaluate per clause so "social sciences" cannot corroborate the cue.
    return splitClauses(allText).some(clause => {
      if (HARD_SCIENCE_RE.test(clause)) {
        // "and social sciences" riding along on a STEM list is still STEM.
        return true
      }
      // Bare "science(s)"/"scientists" with no soft-science qualifier.
      const hasBare = /\b(?:science|sciences|scientists?|scientific)\b/i.test(clause)
      if (!hasBare) return false
      return !SOFT_SCIENCE_RE.test(clause)
    })
  })()

  // Veto — the award is explicitly restricted to non-chemistry disciplines
  // only. Fires when a restriction cue and a non-chemistry discipline share a
  // clause AND no chemistry-family evidence exists anywhere (S1 keeps its
  // veto-rescue power, mirroring the jobs gate's T2+T3 rescue).
  const exclusiveNonChem = splitClauses(allText).some(
    clause => RESTRICTION_CUE_RE.test(clause) && NON_CHEM_DISCIPLINE_RE.test(clause)
  )
  const chemEvidenceAnywhere =
    s1 ||
    s2 ||
    splitClauses(allText).some(clause =>
      CHEM_FIELD_STEMS.some(stem => clause.toLowerCase().includes(stem))
    )
  const vetoed = exclusiveNonChem && !chemEvidenceAnywhere

  const publish = !vetoed && (s1 || s2 || s3)

  const testsPassed: ScholarshipGateVerdict['testsPassed'] = []
  if (s1) testsPassed.push('S1')
  if (s2) testsPassed.push('S2')
  if (s3) testsPassed.push('S3')

  return {
    publish,
    testsPassed,
    vetoed,
    reason: vetoed
      ? 'vetoed: explicitly restricted to humanities/arts/business/non-chemistry fields only'
      : publish
        ? testsPassed.length
          ? `passed ${testsPassed.join(', ')}`
          : 'accepted'
        : 'no chemistry/STEM evidence (S1-S3 all negative)',
  }
}

/** Convenience boolean wrapper used by scholarshipProcess call sites. */
export function matchesScholarshipChemistryFocus(
  parsedFields: ScholarshipGateFields,
  proseFields: Array<string | null | undefined> = [],
  description?: string | null
): boolean {
  return evaluateScholarshipChemistryFocus(parsedFields, proseFields, description).publish
}
