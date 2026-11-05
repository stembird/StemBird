/**
 * Run: npx tsx src/lib/scholarshipParse.test.ts
 *
 * Rule-based (no-AI) half of the scholarship parser. These are the guards that
 * keep a hallucinated deadline or a mis-read eligibility clause from ever
 * reaching the `scholarships` table: the AI merge can only add fields, it can
 * never land a date the page does not print.
 */
import assert from 'node:assert/strict'
import {
  deadlineAppearsInText,
  deriveAcademicYear,
  detectOpenToKenyans,
  extractAwardValue,
  extractDurationText,
  extractProvider,
  extractScholarshipDeadlineText,
  extractStudyDestination,
  parseScholarshipFallback,
  SCHOLARSHIP_COVERAGE_CANON,
  SCHOLARSHIP_LEVEL_CANON,
} from './scholarshipParse'

// ── Deadline extraction ────────────────────────────────────────────────────
assert.equal(
  extractScholarshipDeadlineText('', 'Applications close 31 July 2026.'),
  '2026-07-31',
  'a close-date sentence is parsed to ISO'
)
assert.equal(
  extractScholarshipDeadlineText('', 'Apply before 5 Mar 2027 to be considered.'),
  '2027-03-05',
  'abbreviated month with a single-digit day parses'
)
assert.equal(
  extractScholarshipDeadlineText('', 'This award is closing soon, deadline TBD.'),
  null,
  'an unparseable deadline stays null (the row FAILS — never a guessed window)'
)

// ── Deadline grounding (blocks "closing soon" → today+30) ─────────────────
assert.equal(
  deadlineAppearsInText('2026-07-31', 'Applications close 31 July 2026.'),
  true,
  'a date printed on the page grounds'
)
assert.equal(
  deadlineAppearsInText('2026-08-30', 'Applications close 31 July 2026.'),
  false,
  'an invented date with no matching text is rejected'
)
assert.equal(
  deadlineAppearsInText('2026-05-01', 'Maybe apply in 2026 for this award.'),
  false,
  '"maybe" is not the month of May — word-boundary month matching'
)
assert.equal(
  deadlineAppearsInText('2026-03-01', 'We work in the market in 2026.'),
  false,
  '"market" is not the month of March'
)

// ── Cohort / academic year ─────────────────────────────────────────────────
const NOW = new Date('2026-05-20T12:00:00Z')
assert.equal(
  deriveAcademicYear('Chevening applications for the 2027 intake close now', null, NOW),
  2027,
  'an explicit intake year wins'
)
assert.equal(
  deriveAcademicYear('Apply now', '2026-11-15', NOW),
  2027,
  'a Nov/Dec deadline recruits for the FOLLOWING academic year'
)
assert.equal(
  deriveAcademicYear('Apply now', '2026-06-30', NOW),
  2026,
  'a mid-year deadline belongs to the current intake'
)
assert.equal(deriveAcademicYear('Apply now', null, NOW), 2026, 'last resort is the current year')

// ── Kenyan eligibility signals ─────────────────────────────────────────────
assert.deepEqual(
  detectOpenToKenyans('Open to all Kenyan citizens pursuing chemistry studies.'),
  { openToKenyans: true, explicit: true },
  'an explicit Kenyan inclusion is recorded as explicit'
)
assert.deepEqual(
  detectOpenToKenyans('This award is not open to Kenyan applicants.'),
  { openToKenyans: false, explicit: true },
  'an explicit exclusion flips the flag'
)
assert.deepEqual(
  detectOpenToKenyans('Restricted to citizens of Ghana.'),
  { openToKenyans: false, explicit: true },
  'a foreign-nationality restriction reads as closed'
)
assert.deepEqual(
  detectOpenToKenyans('US citizens only.'),
  { openToKenyans: false, explicit: true },
  'named-nationality-only wording is an exclusion'
)
assert.deepEqual(
  detectOpenToKenyans('A scholarship for students of chemistry in Kenya.'),
  { openToKenyans: true, explicit: false },
  'a nationality-LOOKING phrase that actually concerns Kenya is not an exclusion'
)
assert.deepEqual(
  detectOpenToKenyans('Chemistry graduates are eligible to apply.'),
  { openToKenyans: true, explicit: false },
  'silence about nationality defaults to open (accuracy-first: a wrong false drops real awards)'
)

// ── Provider / destination / duration / award value ────────────────────────
assert.equal(
  extractProvider('Chevening Scholarship', 'Ranked universities worldwide. No sponsor stated.'),
  'Chevening',
  'the award-name prefix is used when no labelled funder exists'
)
assert.equal(
  extractProvider('Chevening Scholarship', 'Sponsored by the UK Government.'),
  'UK Government',
  'a labelled funder beats the title prefix'
)
assert.equal(
  extractProvider('Some Award', 'Funded by the Wellcome Trust.'),
  'Wellcome Trust',
  'the leading article is stripped from the funder name'
)
assert.equal(extractStudyDestination('Tenable in the UK for chemistry students'), 'Uk', 'destination country is captured')
assert.equal(extractStudyDestination('A bursary for study in Kenya'), 'Kenya', 'in-country funding keeps its destination')
assert.equal(
  extractDurationText('The Masters programme lasts for two years of study at the host university.'),
  '2 years',
  'a study-context duration parses'
)
assert.equal(
  extractDurationText('Applicants must have 2 years of experience in a laboratory.'),
  null,
  '"years of experience" is never mistaken for the award duration'
)
assert.equal(
  extractDurationText('Candidates should be under the age of 30 years when applying.'),
  null,
  'an age limit is never mistaken for the award duration'
)
assert.equal(extractAwardValue('The bursary is worth Ksh100,000 per year.'), 'Ksh 100,000', 'Ksh gets a space')
assert.equal(extractAwardValue('Award value: $5,000 to cover fees.'), '$5,000', 'symbol glyphs stay tight')
assert.equal(extractAwardValue('This is a partial scholarship.'), 'partial scholarship', 'non-monetary value falls back to coverage wording')

// ── Whole-page fallback (Chevening-shaped fixture) ────────────────────────
const chevening = parseScholarshipFallback({
  title: 'Chevening Masters Scholarship 2026',
  html: '<h1>Chevening Masters Scholarship 2026</h1><div><p>Applications close 31 July 2026. ' +
    'Fully funded award covering tuition, a monthly stipend, accommodation and return airfare ' +
    'for a one year Masters programme in the United Kingdom. Open to Kenyan citizens.</p></div>',
  sourceUrl: 'https://www.chevening.org/scholarship/kenya',
})
assert.equal(chevening.title, 'Chevening Masters Scholarship 2026', 'title survives')
assert.equal(chevening.provider, 'Chevening Masters', 'provider derived from the award-name title prefix')
assert.equal(chevening.applicationDeadline, '2026-07-31', 'page deadline found')
assert.equal(chevening.deadlineSource, 'page', 'a page deadline is attributed to the page, not the AI')
assert.equal(chevening.academicYear, 2026, 'a July deadline is the current intake')
assert.deepEqual(chevening.level, ['Masters'], 'level is canonical')
assert.ok(
  ['Tuition', 'Stipend', 'Accommodation', 'Airfare', 'Full Funding'].every(c => chevening.coverage.includes(c)),
  'the coverage items named on the page are normalised to canonical vocabulary'
)
assert.equal(chevening.openToKenyans, true, 'Kenyan citizens are explicitly included')
assert.equal(chevening.openToKenyansExplicit, true, 'the inclusion is recorded as explicit')
assert.equal(chevening.durationText, '1 year', 'duration normalises the spelled number')
assert.equal(chevening.isPartialAward, false, 'a fully funded award is not partial')
assert.equal(chevening.applicationUrl, 'https://www.chevening.org/scholarship/kenya', 'source URL is the apply fallback')
assert.ok(chevening.description && chevening.description.startsWith('<p>'), 'description is paragraph HTML')
assert.ok(!/<[a-z]+/i.test((chevening.description || '').replace(/^<p>/, '')), 'no stray page markup leaks into stored copy')
assert.deepEqual(chevening.fieldOfStudy, [], 'the rule fallback does not invent disciplines')

// ── HELB-shaped fixture (in-country partial award, Nov deadline) ───────────
const helb = parseScholarshipFallback({
  title: 'HELB Postgraduate Bursary',
  html:
    '<h2>HELB Postgraduate Bursary</h2><div><p>Apply by 15 November 2026. ' +
    'This is a partial scholarship of Ksh100,000 towards tuition fees for Masters and PhD ' +
    'study in Kenya for Kenyan citizens.</p></div>',
  sourceUrl: 'https://www.helb.co.ke/our-services/scholarship-and-loans-opportunities/',
  applyUrl: 'https://www.helb.co.ke/apply/',
})
assert.equal(helb.applicationDeadline, '2026-11-15', 'labelled apply-by date parses')
assert.equal(helb.academicYear, 2027, 'a November deadline is the 2027 cohort')
assert.equal(helb.isPartialAward, true, 'partial award is flagged')
assert.equal(helb.awardValue, 'Ksh 100,000', 'award value is normalised')
assert.ok(helb.level.includes('Masters') && helb.level.includes('PhD'), 'multiple levels are kept')
assert.ok(helb.coverage.includes('Tuition'), 'tuition coverage detected')
assert.equal(helb.studyDestination, 'Kenya', 'in-country destination recorded')
assert.equal(helb.openToKenyans, true, 'HELB is open to Kenyans')
assert.equal(helb.applicationUrl, 'https://www.helb.co.ke/apply/', 'an explicit apply link wins over the source URL')
assert.ok(
  helb.coverage.every(c => SCHOLARSHIP_COVERAGE_CANON.includes(c as never)),
  'stored coverage values only ever come from the canonical vocabulary'
)
assert.ok(helb.level.every(l => SCHOLARSHIP_LEVEL_CANON.includes(l as never)), 'stored levels are canonical')

console.log('scholarshipParse: all assertions passed')
