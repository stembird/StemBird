import assert from 'node:assert/strict'
import {
  summarizeDiscoverResults,
  shouldAbortAfterConsecutiveFailures,
  scrapeQueueRowIsKnownToDiscover,
  DiscoverSourceResult,
} from './scrapeDiscover'
import { filterDiscoveredByTitle, matchesSubjectFocus } from './scrapeSubjectFilter'

function result(
  partial: Partial<DiscoverSourceResult> & { source_id: string }
): DiscoverSourceResult {
  return {
    found: 0,
    queued: 0,
    already_known: 0,
    skipped_off_topic: 0,
    error: null,
    ...partial,
  }
}

// Empty run is success
{
  const summary = summarizeDiscoverResults([])
  assert.equal(summary.success, true)
  assert.equal(summary.sources_processed, 0)
  assert.equal(summary.error_summary, null)
}

// All sources failed → success false
{
  const summary = summarizeDiscoverResults([
    result({ source_id: 'a', error: 'timeout' }),
    result({ source_id: 'b', error: 'HTTP 503' }),
  ])
  assert.equal(summary.success, false)
  assert.equal(summary.sources_failed, 2)
  assert.equal(summary.sources_ok, 0)
  assert.match(summary.error_summary || '', /a: timeout/)
  assert.match(summary.error_summary || '', /b: HTTP 503/)
}

// Failures with zero yield (no stopped_early) → success false
{
  const summary = summarizeDiscoverResults([
    result({ source_id: 'ok-empty', found: 0, error: null }),
    result({ source_id: 'bad', error: 'ECONNRESET' }),
  ])
  assert.equal(summary.success, false)
  assert.equal(summary.sources_failed, 1)
  assert.equal(summary.total_found, 0)
}

// Partial success with some jobs found → success true
{
  const summary = summarizeDiscoverResults([
    result({ source_id: 'ok', found: 10, queued: 3, already_known: 7 }),
    result({ source_id: 'bad', error: 'timeout' }),
  ])
  assert.equal(summary.success, true)
  assert.equal(summary.sources_ok, 1)
  assert.equal(summary.sources_failed, 1)
  assert.equal(summary.total_queued, 3)
  assert.equal(summary.total_found, 10)
  assert.ok(summary.error_summary)
}

// All known (no new queue) with no errors → success true
{
  const summary = summarizeDiscoverResults([
    result({ source_id: 'ok', found: 5, queued: 0, already_known: 5 }),
  ])
  assert.equal(summary.success, true)
  assert.equal(summary.sources_failed, 0)
}

// Fail-fast consecutive helper
assert.equal(shouldAbortAfterConsecutiveFailures(5, 5, 0), true)
assert.equal(shouldAbortAfterConsecutiveFailures(4, 5, 0), false)
assert.equal(shouldAbortAfterConsecutiveFailures(5, 5, 2), false) // already queued something
assert.equal(shouldAbortAfterConsecutiveFailures(10, 0, 0), false) // disabled

// Error summary truncates after 3
{
  const summary = summarizeDiscoverResults([
    result({ source_id: 'a', error: '1' }),
    result({ source_id: 'b', error: '2' }),
    result({ source_id: 'c', error: '3' }),
    result({ source_id: 'd', error: '4' }),
  ])
  assert.match(summary.error_summary || '', /\+1 more/)
}

assert.equal(
  scrapeQueueRowIsKnownToDiscover('failed'),
  true,
  'failed jobs stay failed — Discover must not reset attempts and retry'
)
assert.equal(scrapeQueueRowIsKnownToDiscover('pending'), true)
assert.equal(scrapeQueueRowIsKnownToDiscover('processing'), true)
assert.equal(scrapeQueueRowIsKnownToDiscover('done'), true)

// ── STEM subject filter (deep publish gate + optional discover cost gate) ──

// PROSE tier (qualifications): a study cue + a HARD STEM degree promotes even
// when the title is ambiguous; a non-STEM degree does not.
assert.equal(
  matchesSubjectFocus(['Production Manager'], null, ['BSc degree in Chemistry']),
  true,
  'production manager WITH chemistry qualification is STEM'
)
assert.equal(
  matchesSubjectFocus(['Production Manager'], null, ['Degree in Film and Media Studies']),
  false,
  'production manager WITH film/media qualification is not STEM'
)

// BODY tier (description): a hard STEM degree buried in body copy promotes.
// Your exact scenario — sales/marketing title, degree buried in body copy.
assert.equal(
  matchesSubjectFocus(
    ['Sales Representative'],
    'The ideal candidate holds a degree in Pharmacy or Pharmacology.'
  ),
  true,
  'sales rep: pharmacy degree in description is STEM'
)
assert.equal(
  matchesSubjectFocus(
    ['Marketer in Eldoret'],
    'Requirements: Bachelor of Science in Biological Sciences.'
  ),
  true,
  'marketer: biology degree in description is STEM'
)
// Same rescue when the degree sits in the qualifications PROSE field.
assert.equal(
  matchesSubjectFocus(
    ['Sales Representative'],
    null,
    ['Bachelor of Pharmacy (PharmD) or equivalent']
  ),
  true,
  'sales rep: pharmacy degree in qualifications prose is STEM'
)

// FALSE POSITIVES the guard must block: STEM words with no study context.
assert.equal(
  matchesSubjectFocus(
    ['Sales Executive'],
    'Strong analytical and computer skills required. KPIs, targets.'
  ),
  false,
  'analytical/computer skills in description are NOT STEM without a study cue'
)
assert.equal(
  matchesSubjectFocus(
    ['Receptionist'],
    'Computer literacy required. A degree is not necessary.'
  ),
  false,
  'cue and STEM word in different clauses do not promote'
)

// ── Regressions: the holes that let non-STEM jobs through ──

// Loose business-ese in prose fields ("technical", "health") must not promote.
assert.equal(
  matchesSubjectFocus(
    ['Finance Manager'],
    null,
    ['Support the technical aspects of budgeting systems', 'Manage health portfolio accounts']
  ),
  false,
  'technical/health in responsibilities prose are NOT STEM'
)
// Business degrees named in qualifications must not promote a finance role.
assert.equal(
  matchesSubjectFocus(
    ['Financial Analyst'],
    'Bachelor degree in Economics or Business Administration. Strong analytical skills.'
  ),
  false,
  'economics/business degree with loose stems is NOT STEM'
)
// Title-dominant veto: confident non-STEM title + AI taxonomy tagging the
// job into a STEM-only function ("Technical Sales…") must NOT auto-pass.
assert.equal(
  matchesSubjectFocus(
    ['Sales Executive'],
    null,
    ['Technical Sales & Business Development']
  ),
  false,
  'insurance sales tagged Technical Sales function is NOT STEM'
)
// "market research" prose no longer matches (bare 'research' stem removed).
assert.equal(
  matchesSubjectFocus(
    ['Research Manager'],
    'Lead market research and consumer insight programmes.'
  ),
  false,
  'market research manager is NOT STEM'
)
assert.equal(
  matchesSubjectFocus(
    ['Human Resource Officer'],
    null,
    ['Degree in Human Resources; conduct research and development activities']
  ),
  false,
  'HR role with R&D duty prose is NOT STEM'
)
// STEM research titles still pass via the explicit research compounds.
assert.equal(
  matchesSubjectFocus(['Field Research Officer']),
  true,
  'field research officer is STEM'
)

// Clear STEM titles pass on title alone.
assert.equal(matchesSubjectFocus(['Laboratory Technician']), true, 'lab tech is STEM')
assert.equal(matchesSubjectFocus(['Software Developer']), true, 'dev is STEM')
assert.equal(matchesSubjectFocus(['Civil Engineer']), true, 'civil eng is STEM')
assert.equal(matchesSubjectFocus(['Data Analyst']), true, 'data analyst is STEM')

// Confidently non-STEM roles with no STEM signal anywhere fail.
assert.equal(
  matchesSubjectFocus(['Accountant'], null, ['CPA required']),
  false,
  'accountant is not STEM'
)
assert.equal(
  matchesSubjectFocus(['Sales Executive'], null, ['KPIs, targets']),
  false,
  'sales is not STEM'
)
assert.equal(
  matchesSubjectFocus(['Driver'], null, ['Valid class E license']),
  false,
  'driver is not STEM'
)

// "Data entry" must NOT match the two-word data stems.
assert.equal(matchesSubjectFocus(['Data Entry Clerk']), false, 'data entry is not STEM')

// Empty signal (all fields + description blank) → keep, err on publishing.
assert.equal(matchesSubjectFocus([null, '', undefined]), true, 'no signal keeps job')

// Discovery is a NO-OP by default (accuracy wins): keeps every title, even
// confident non-STEM ones, so the deep gate can read their description.
{
  const discovered = [
    { job_url: 'https://a/1', partial_data: { title: 'Chemist' } },
    { job_url: 'https://a/2', partial_data: { title: 'Sales Representative' } },
    { job_url: 'https://a/3', partial_data: { title: 'Production Manager' } },
    { job_url: 'https://a/4', partial_data: { title: 'Marketer in Eldoret' } },
  ]
  const { kept, skippedUrls } = filterDiscoveredByTitle(discovered)
  assert.equal(kept.length, 4, 'default: nothing dropped at discovery')
  assert.deepEqual(skippedUrls, [], 'default: no skips')
}

// Only the explicit cost mode (STEMBIRD_SUBJECT_DISCOVER_FILTER=true) drops
// confident non-STEM titles while still keeping ambiguous/STEM ones.
{
  process.env.STEMBIRD_SUBJECT_DISCOVER_FILTER = 'true'
  const discovered = [
    { job_url: 'https://a/1', partial_data: { title: 'Chemist' } }, // STEM signal → keep
    { job_url: 'https://a/2', partial_data: { title: 'Sales Executive' } }, // confident non-STEM → skip
    { job_url: 'https://a/3', partial_data: { title: 'Production Manager' } }, // ambiguous → keep
    { job_url: 'https://a/4', partial_data: { title: 'Sales Engineer' } }, // positive beats negative → keep
    { job_url: 'https://a/5', partial_data: {} }, // no title → keep
  ]
  const { kept, skippedUrls } = filterDiscoveredByTitle(discovered)
  assert.deepEqual(
    kept.map(j => j.job_url),
    ['https://a/1', 'https://a/3', 'https://a/4', 'https://a/5'],
    'cost mode: only confident non-STEM title dropped'
  )
  assert.deepEqual(skippedUrls, ['https://a/2'], 'Sales Executive skipped in cost mode')
  delete process.env.STEMBIRD_SUBJECT_DISCOVER_FILTER
}

console.log('scrapeDiscover.test.ts: all assertions passed')
