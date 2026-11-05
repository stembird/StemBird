/**
 * Run: npx tsx src/lib/scholarshipRelevance.test.ts
 *
 * Scholarship publication gate smoke tests. Each case exercises one of the
 * S1–S3 admission tests or a hard veto, plus the env-flag bypass and the
 * skip-message bucketing contract.
 */
import assert from 'node:assert/strict'
import {
  evaluateScholarshipChemistryFocus,
  matchesScholarshipChemistryFocus,
  SKIPPED_NON_CHEM_SCHOLARSHIP,
} from './scholarshipRelevance'

// ── Skip-message bucketing contract ─────────────────────────────────────────
// The scholarship skip message MUST contain the job gate's 'outside chemistry'
// substring so admin bucketing (isNonStemSkip) classifies it with no changes.
assert.equal(
  SKIPPED_NON_CHEM_SCHOLARSHIP,
  'Skipped: outside chemistry focus (scholarship)',
  'skip message is the documented constant'
)
assert.ok(
  SKIPPED_NON_CHEM_SCHOLARSHIP.includes('outside chemistry'),
  'skip message stays catchable by isNonStemSkip substring rule'
)

// ── S1 — field_of_study names a chemistry-family discipline ─────────────────
assert.equal(
  matchesScholarshipChemistryFocus({
    title: 'Global Leaders Scholarship',
    fieldOfStudy: ['Chemistry'],
  }),
  true,
  'S1: pure chemistry field_of_study publishes'
)
assert.equal(
  matchesScholarshipChemistryFocus({
    title: 'Future Scientists Award',
    fieldOfStudy: ['Chemical Engineering', 'Materials Science'],
  }),
  true,
  'S1: chemical engineering + materials family publishes'
)
assert.equal(
  matchesScholarshipChemistryFocus({
    title: 'Commonwealth Scholarship',
    fieldOfStudy: ['Pharmaceutical Sciences'],
  }),
  true,
  'S1: pharmaceutics counts as chemistry-family'
)
assert.equal(
  matchesScholarshipChemistryFocus({
    title: 'Water Quality Research Fellowship',
    fieldOfStudy: ['Environmental Science'],
  }),
  true,
  'S1: environmental science (water quality lens) publishes'
)

// ── S2 — funder / program mission is chemistry-relevant ─────────────────────
assert.equal(
  matchesScholarshipChemistryFocus({
    title: 'Research Award',
    provider: 'Kenya Chemical Industries Association',
  }),
  true,
  'S2: chemical-industry funder publishes'
)
assert.equal(
  matchesScholarshipChemistryFocus({
    title: 'CSIR Science Scholarship',
    provider: 'Council of Scientific and Industrial Research (CSIR)',
  }),
  true,
  'S2: CSIR (scientific research funder) publishes'
)
assert.equal(
  matchesScholarshipChemistryFocus({
    title: 'Energy Sector Scholarship',
    provider: 'East African Refiners Association',
    programMission: 'Supporting the downstream fuel and refining industry',
  }),
  true,
  'S2: energy/refining mission publishes'
)

// ── S3 — general STEM scholarship open to chemistry students ────────────────
assert.equal(
  matchesScholarshipChemistryFocus(
    {
      title: 'STEM Excellence Scholarship',
    },
    [],
    'Open to students pursuing degrees in STEM disciplines at Kenyan universities.'
  ),
  true,
  'S3: bare STEM cue in description publishes'
)
assert.equal(
  matchesScholarshipChemistryFocus(
    {
      title: 'Women in Natural Sciences Award',
    },
    ['For graduate students in the natural sciences including physics and chemistry.']
  ),
  true,
  'S3: natural sciences prose cue publishes'
)
assert.equal(
  matchesScholarshipChemistryFocus(
    {
      title: 'Science and Technology Fund',
    },
    [],
    'Supporting science and technology research across East Africa.'
  ),
  true,
  'S3: "science and technology" cue publishes'
)
assert.equal(
  matchesScholarshipChemistryFocus(
    {
      title: 'Graduate Scholarship in Social Sciences',
    },
    [],
    'For students of social sciences, political science, and public policy. Chemistry applicants are not eligible.'
  ),
  false,
  'S3/veto: soft "sciences" with explicit chemistry exclusion is rejected'
)

// ── Vetoes — explicitly non-chemistry-only awards ───────────────────────────
assert.equal(
  matchesScholarshipChemistryFocus(
    {
      title: 'Arts and Humanities Fund',
    },
    [],
    'This scholarship is open only to candidates in the humanities and liberal arts.'
  ),
  false,
  'veto: humanities-only award rejected'
)
assert.equal(
  matchesScholarshipChemistryFocus(
    {
      title: 'Future Business Leaders Award',
    },
    [],
    'Restricted to students pursuing business administration and marketing.'
  ),
  false,
  'veto: business-only award rejected'
)
// Veto rescue: restriction says "law" but the program is chemistry-adjacent
// (funder is chemical industry) — S2 evidence rescues the veto.
assert.equal(
  matchesScholarshipChemistryFocus(
    {
      title: 'Regulatory Affairs Scholarship',
      provider: 'Chemical Regulation Authority',
    },
    [],
    'Open only to candidates with a background in law.'
  ),
  true,
  'veto rescue: chemistry funder evidence overrides non-chem restriction cue'
)

// ── Verdict shape ───────────────────────────────────────────────────────────
const s1Verdict = evaluateScholarshipChemistryFocus({
  title: 'Chevening Chemistry Scholarship',
  fieldOfStudy: ['Chemistry'],
})
assert.equal(s1Verdict.publish, true, 'verdict: publish true')
assert.ok(s1Verdict.testsPassed.includes('S1'), 'verdict: S1 recorded')

const rejectVerdict = evaluateScholarshipChemistryFocus({
  title: 'Drama Scholars Programme',
})
assert.equal(rejectVerdict.publish, false, 'verdict: arts-only default reject')
assert.equal(rejectVerdict.vetoed, false, 'verdict: no admission evidence is not a veto')

// ── Env-flag bypass (mirrors CHEMISTRY_LENS_GATE_ENABLED convention) ────────
process.env.SCHOLARSHIP_GATE_ENABLED = 'false'
assert.equal(
  matchesScholarshipChemistryFocus(
    { title: 'Fashion Design Grant' },
    [],
    'For students of fashion and textile design.'
  ),
  true,
  'bypass: SCHOLARSHIP_GATE_ENABLED=false publishes anything'
)
delete process.env.SCHOLARSHIP_GATE_ENABLED
assert.equal(
  matchesScholarshipChemistryFocus({ title: 'Fashion Design Grant' }),
  false,
  'bypass reverted: gate is back on after env cleanup'
)

console.log('scholarshipRelevance: all assertions passed')
