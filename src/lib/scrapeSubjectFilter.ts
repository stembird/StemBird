/**
 * Subject focus gate for scraped jobs.
 *
 * StemBird is currently scoped to biology / chemistry roles in Kenya. The job
 * boards we scrape (MyJobMag, BrighterMonday, Fuzu) mix ALL categories on their
 * listing pages and their adapters rebuild the listing URL from the origin
 * (they ignore any keyword path/query), so subject-scoping cannot be done via
 * scraper_sources.base_url. This module is the single place that enforces the
 * subject filter at publish time.
 *
 * CONFIG (no code edits needed to widen/narrow later):
 *   - STEMBIRD_SUBJECT_FILTER_ENABLED  "true" (default) | "false" to disable
 *   - STEMBIRD_SUBJECT_TERMS           comma-separated stems that OVERRIDE the
 *                                      built-in default list. Each entry is
 *                                      treated as a case-insensitive substring
 *                                      match (e.g. "biolog,chemis,geolog").
 *
 * The matcher is checked against high-signal fields only (title, field/area of
 * study, job function, tags, qualifications) — NOT the full description — to
 * avoid false positives where "chemistry" is mentioned incidentally.
 */

const DEFAULT_SUBJECT_STEMS = [
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
  'analytical', // analytical chemist / analytical lab
  'lab', // \blab\b only
  'qc', // \bQC\b only
  'qa', // \bQA\b only
]

/** Stems that are too short/common to substring-match; require word boundaries. */
const WORD_BOUNDARY_TERMS = new Set(['lab', 'qc', 'qa'])

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

function activeStems(): string[] {
  const override = (envValue('STEMBIRD_SUBJECT_TERMS') || '').trim()
  if (!override) return DEFAULT_SUBJECT_STEMS
  return override
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Returns true when the job should be PUBLISHED (i.e. it matches the subject
 * focus, or the filter is disabled). Returns false to SKIP as off-topic.
 */
export function matchesSubjectFocus(fields: Array<string | null | undefined>): boolean {
  if (!isFilterEnabled()) return true

  const haystack = fields
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .join(' \n ')
    .toLowerCase()

  // No signal at all (all fields empty) -> keep, so we never silently drop
  // everything when parsing degraded. Err on the side of publishing.
  if (!haystack.trim()) return true

  for (const stem of activeStems()) {
    if (WORD_BOUNDARY_TERMS.has(stem)) {
      const re = new RegExp(`\\b${escapeRe(stem)}\\b`, 'i')
      if (re.test(haystack)) return true
    } else if (haystack.includes(stem)) {
      return true
    }
  }
  return false
}
