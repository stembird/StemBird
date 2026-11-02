/**
 * Run: npx tsx src/lib/chemistryRelevance.test.ts
 *
 * Chemistry Lens publication gate smoke tests. Each case exercises one of the
 * T1–T4 tests or a hard veto with/without rescue.
 */
import assert from 'node:assert/strict'
import {
  evaluateChemistryRelevance,
  matchesChemistryFocus,
  SKIPPED_NON_CHEMISTRY_MESSAGE,
} from './chemistryRelevance'

// ── T1 — chemistry-core function tag publishes on its own ────────────────────
assert.equal(
  matchesChemistryFocus({
    title: 'QC Analyst',
    jobFunctions: ['Quality Control (QC)'],
  }),
  true,
  'T1 — QC function is chemistry-core, publishes even without prose'
)
assert.equal(
  matchesChemistryFocus({
    title: 'Officer',
    jobFunctions: ['Analytical & Instrumental Chemistry'],
  }),
  true,
  'T1 — analytical chemistry function publishes'
)

// ── T2 — chemistry-family degree requirement in qualifications ───────────────
assert.equal(
  matchesChemistryFocus({
    title: 'Production Supervisor',
    jobFunctions: ['Production & Plant Operations Management'],
    requiredQualifications: '<ul><li>Bachelor of Science in Industrial Chemistry</li></ul>',
  }),
  true,
  'T2 — Industrial Chemistry degree requirement publishes'
)
assert.equal(
  matchesChemistryFocus({
    title: 'Production Supervisor',
    requiredQualifications: '<ul><li>Degree in Business Administration</li></ul>',
  }),
  false,
  'non-chemistry degree does not fire T2, no other test passes'
)

// ── T3 — chemical duty language in description/title ─────────────────────────
assert.equal(
  matchesChemistryFocus({
    title: 'Laboratory Assistant',
    description: '<p>Perform HPLC and titration on incoming raw materials.</p>',
  }),
  true,
  'T3 — HPLC/titration phrases publish'
)

// ── T4 — commercial chemistry (instrument sales + chem-literacy) ────────────
assert.equal(
  matchesChemistryFocus({
    title: 'Sales Representative',
    description:
      '<p>Sell HPLC columns and chromatography consumables. Candidates must have a BSc in Chemistry.</p>',
  }),
  true,
  'T4 — chemistry product sales with a chem degree requirement publishes'
)
assert.equal(
  matchesChemistryFocus({
    title: 'Sales Representative',
    description: '<p>Sell insurance policies across Nairobi.</p>',
  }),
  false,
  'non-chemistry sales fails all four tests'
)

// ── Hard vetoes: clinical care, pure biology, general business ───────────────
assert.equal(
  matchesChemistryFocus({
    title: 'Registered Nurse',
    jobFunctions: ['Laboratory Operations & Management'],
  }),
  false,
  'vetoed clinical-care title cannot be rescued by tagging alone'
)
assert.equal(
  matchesChemistryFocus({
    title: 'Geneticist',
    description: '<p>Runs PCR panels for rare disease research.</p>',
  }),
  false,
  'vetoed pure-biology title stays excluded'
)

// ── Veto rescue: chem degree + chemical duties re-admits an otherwise vetoed title
assert.equal(
  matchesChemistryFocus({
    title: 'Operations Manager',
    requiredQualifications: '<p>Must hold a BSc in Analytical Chemistry.</p>',
    description: '<p>Oversee wet chemistry and ICP-OES sample preparation for the refinery lab.</p>',
  }),
  true,
  'veto rescued via T2+T3'
)

// ── Detailed verdict shape (used by admin moderation & skip messaging) ───────
const verdict = evaluateChemistryRelevance({
  title: 'Analytical Chemist',
  jobFunctions: ['Analytical & Instrumental Chemistry'],
  description: '<p>Run GC-MS and HPLC on beverage samples.</p>',
})
assert.equal(verdict.publish, true, 'analytical chemist publishes')
assert.ok(verdict.testsPassed.includes('T1'), 'T1 fires')
assert.ok(verdict.testsPassed.includes('T3'), 'T3 fires from GC-MS/HPLC duties')
assert.equal(verdict.vetoed, false)

assert.equal(SKIPPED_NON_CHEMISTRY_MESSAGE, 'Skipped: outside chemistry focus')

console.log('chemistryRelevance.test.ts: all assertions passed')
