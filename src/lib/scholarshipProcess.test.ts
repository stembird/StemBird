/**
 * Run: npx tsx src/lib/scholarshipProcess.test.ts
 *
 * Pure-logic parts of the scholarship process step: cohort-aware dedup hash,
 * slug generation, and the hard publication rules (deadline / eligibility)
 * that gate the insert. The Supabase-touching half is exercised on Vercel by a
 * real seeded run — these are the rules that must never silently publish a
 * dead or wrong award.
 */
import assert from 'node:assert/strict'
import {
  applyScholarshipHardRules,
  normalizeScholarshipProgramTitle,
  scholarshipContentHash,
  slugifyScholarship,
  NO_DEADLINE_MESSAGE,
} from './scholarshipProcess'
import { SKIPPED_NON_CHEM_SCHOLARSHIP } from './scholarshipRelevance'

const TODAY = new Date('2026-05-20T12:00:00Z')

function parsed(overrides: Partial<{ title: string; applicationDeadline: string | null; openToKenyans: boolean }>) {
  return {
    title: 'Chevening Masters Scholarship',
    applicationDeadline: '2026-08-31',
    openToKenyans: true,
    ...overrides,
  }
}

// ── Cohort-aware hash: same program, different academic year ───────────────
const hash2026 = scholarshipContentHash('Chevening Masters Scholarship 2026', 2026)
const hash2027 = scholarshipContentHash('Chevening Masters Scholarship 2027', 2027)
assert.notEqual(hash2026, hash2027, '2026 and 2027 cohorts of one program are distinct records')

// Same cohort, different wording/case/punctuation → same record (re-scrape safe).
assert.equal(
  scholarshipContentHash('Chevening Masters Scholarship 2026!', 2026),
  hash2026,
  'punctuation and case do not create a new cohort'
)
assert.equal(
  scholarshipContentHash('CHEVENING MASTERS SCHOLARSHIPS 2027', 2027),
  hash2027,
  'plural/case-insensitive program normalization holds across cohorts'
)
assert.match(hash2026, /^[0-9a-f]{64}$/, 'cohort hash is sha256 hex')

// Program-name normalization strips award-noun noise so "X Scholarship" and
// "X Bursary Applications Open" collapse to the same program stem.
assert.equal(
  normalizeScholarshipProgramTitle('HELB Bursary Applications Open'),
  normalizeScholarshipProgramTitle('HELB Bursary'),
  'award-noun and call-for-application words are stripped from the program key'
)

// A missing academic year must not silently collide every undated cohort.
assert.notEqual(
  scholarshipContentHash('Some Award', null),
  scholarshipContentHash('Some Award', 2026),
  'unknown cohort is its own bucket'
)

// ── Hard rules ─────────────────────────────────────────────────────────────
assert.deepEqual(
  applyScholarshipHardRules(parsed({}), TODAY),
  { action: 'publish' },
  'future deadline + open to Kenyans publishes'
)

assert.deepEqual(
  applyScholarshipHardRules(parsed({ applicationDeadline: null }), TODAY),
  { action: 'fail', message: NO_DEADLINE_MESSAGE },
  'missing deadline FAILS the row (never the jobs 30-day default)'
)

assert.deepEqual(
  applyScholarshipHardRules(parsed({ applicationDeadline: '   ' as unknown as string }), TODAY),
  { action: 'fail', message: NO_DEADLINE_MESSAGE },
  'whitespace deadline is treated as missing'
)

const pastRule = applyScholarshipHardRules(parsed({ applicationDeadline: '2026-05-19' }), TODAY)
assert.equal(pastRule.action, 'skip', 'past deadline skips')
assert.deepEqual(
  pastRule,
  {
    action: 'skip',
    message: 'Skipped: scholarship expired on 2026-05-19',
    reason: 'expired',
  },
  'expired skip carries a bucket-matching message ("expired")'
)

// Deadline falling TODAY is still open — a student can apply today.
assert.equal(
  applyScholarshipHardRules(parsed({ applicationDeadline: '2026-05-20' }), TODAY).action,
  'publish',
  'same-day deadline is not expired'
)

const closedRule = applyScholarshipHardRules(parsed({ openToKenyans: false }), TODAY)
assert.deepEqual(
  closedRule,
  { action: 'skip', message: 'Skipped: not open to Kenyans', reason: 'not_open_to_kenyans' },
  'explicit Kenyan exclusion skips'
)
assert.ok(
  closedRule.action === 'skip' && closedRule.message.toLowerCase().includes('kenyan'),
  'kenyan skip message stays greppable in the queue'
)

const noTitle = applyScholarshipHardRules(parsed({ title: '   ' }), TODAY)
assert.equal(noTitle.action, 'skip', 'empty title never publishes')
assert.equal(noTitle.action === 'skip' && noTitle.reason, 'no_title', 'empty title reason')

// Deadline is checked before the title: an untitled page with no date is a
// parse failure worth retrying, not a permanent skip.
assert.equal(
  applyScholarshipHardRules(parsed({ title: '', applicationDeadline: null }), TODAY).action,
  'fail',
  'missing deadline outranks empty title'
)

// ── Gate skip message stays catchable by the shared admin bucketing ────────
assert.ok(
  SKIPPED_NON_CHEM_SCHOLARSHIP.includes('outside chemistry'),
  'scholarship gate skips reuse the jobs non_stem bucket substring'
)

// ── Slugs (Phase 2 public pages, generated now) ────────────────────────────
assert.equal(
  slugifyScholarship('Chevening Masters Scholarship 2026', 'UK Government'),
  'uk-government-chevening-masters-scholarship-2026',
  'slug is provider-prefixed and url-safe'
)
assert.equal(slugifyScholarship('！！！', null), 'scholarship', 'junk title falls back safely')
assert.ok(
  slugifyScholarship('A'.repeat(200)).length <= 80,
  'slug is capped so the unique index stays readable'
)
assert.equal(
  slugifyScholarship('Hélb Bursary — MSc & PhD', 'HELB'),
  'helb-helb-bursary-msc-and-phd',
  'accents fold and & expands to "and" in the slug'
)

console.log('scholarshipProcess: all assertions passed')
