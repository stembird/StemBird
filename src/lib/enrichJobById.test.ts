import assert from 'node:assert/strict'
import {
  backfillCareerTipsForRecentJobs,
  buildInputFromJobRow,
  CAREER_TIPS_BACKFILL_ENABLED,
  isJobPostedWithinDays,
  jobNeedsEnrichment,
  selectJobsMissingCareerTips,
} from './enrichJobById'

const input = buildInputFromJobRow({
  id: 'job-1',
  title: 'Credit Analyst',
  company: 'KCB Group',
  hiring_organization_name: 'KCB Group',
  description: '<p>About the credit risk role at the bank.</p>',
  responsibilities: '<ul><li>Assess credit applications</li></ul>',
  required_qualifications: '<ul><li>Bachelor’s degree in Finance</li></ul>',
  additional_info: null,
  industry: null,
  job_function: null,
  location: 'Nairobi, Kenya',
  employment_type: 'FULL_TIME',
  job_location_type: 'ON_SITE',
})

assert.ok(input)
assert.equal(input!.company, 'KCB Group')
assert.ok(input!.descriptionSection?.includes('credit risk'))
assert.ok(input!.requirementsSection?.includes('Finance'))

const tooThin = buildInputFromJobRow({
  id: 'job-2',
  title: 'X',
  company: 'Y',
  hiring_organization_name: null,
  description: '<p>Hi</p>',
  responsibilities: null,
  required_qualifications: null,
  additional_info: null,
  industry: null,
  job_function: null,
  location: null,
  employment_type: null,
  job_location_type: null,
})
assert.equal(tooThin, null)

assert.equal(
  jobNeedsEnrichment({
    id: 'job-3',
    title: 'Analyst',
    company: 'KCB',
    hiring_organization_name: 'KCB',
    description: '<p>Role overview</p>',
    responsibilities: '<ul><li>Analyse credit</li></ul>',
    required_qualifications: '<ul><li>Finance degree</li></ul>',
    additional_info: '<p><strong>How to Apply:</strong> Use the apply button.</p>',
    industry: 'Banking, Insurance & Financial Services',
    job_function: 'Accounting, Auditing & Finance',
    location: 'Nairobi',
    employment_type: 'FULL_TIME',
    job_location_type: 'ON_SITE',
  }),
  false,
  'complete jobs do not need sparse enrichment just because career tips are missing'
)

assert.equal(
  jobNeedsEnrichment({
    id: 'job-3b',
    title: 'Analyst',
    company: 'KCB',
    hiring_organization_name: 'KCB',
    description: '<p>Role overview</p>',
    responsibilities: '<ul><li>Analyse credit</li></ul>',
    required_qualifications: '<ul><li>Finance degree</li></ul>',
    additional_info: '<p><strong>How to Apply:</strong> Use the apply button.</p>',
    industry: null,
    job_function: 'Accounting, Auditing & Finance',
    location: 'Nairobi',
    employment_type: 'FULL_TIME',
    job_location_type: 'ON_SITE',
  }),
  true,
  'jobs missing taxonomy still need sparse enrichment'
)

assert.equal(
  jobNeedsEnrichment({
    id: 'job-4',
    title: 'Analyst',
    company: 'KCB',
    hiring_organization_name: 'KCB',
    description: '<p>Role overview</p>',
    responsibilities: '<ul><li>Analyse credit</li></ul>',
    required_qualifications: '<ul><li>Finance degree</li></ul>',
    additional_info: `<p><strong>How to Apply:</strong> Use the apply button.</p>
<h3>What Credit Files Must Prove Before The Committee</h3>
<p>Intro</p>
<p><strong>1. Spread the facility:</strong> Show the model.</p>
<p><strong>2. Sector notes:</strong> Know SME risk.</p>
<p><strong>3. Security pack:</strong> List collateral.</p>
<p><strong>4. First 90 days:</strong> Name the reviews.</p>`,
    industry: 'Banking, Insurance & Financial Services',
    job_function: 'Accounting, Auditing & Finance',
    location: 'Nairobi',
    employment_type: 'FULL_TIME',
    job_location_type: 'ON_SITE',
  }),
  false
)

const now = new Date('2026-09-05T04:55:00.000Z')
const applyOnly =
  '<p><strong>How to Apply:</strong> Use the apply button.</p>'
const withTips = `<p><strong>How to Apply:</strong> Use the apply button.</p>
<h3>What Credit Files Must Prove Before The Committee</h3>
<p>Intro</p>
<p><strong>1. Spread the facility:</strong> Show the model.</p>
<p><strong>2. Sector notes:</strong> Know SME risk.</p>
<p><strong>3. Security pack:</strong> List collateral.</p>
<p><strong>4. First 90 days:</strong> Name the reviews.</p>`

assert.equal(
  isJobPostedWithinDays({ date_posted: '2026-09-03' }, 7, now),
  true,
  'jobs posted 2 days ago are in the 7-day window'
)
assert.equal(
  isJobPostedWithinDays({ date_posted: '2026-08-29' }, 7, now),
  true,
  'date-only postings from exactly 7 days ago stay in the window'
)
assert.equal(
  isJobPostedWithinDays({ date_posted: '2026-08-28' }, 7, now),
  false,
  'jobs posted 8 calendar days ago are excluded'
)
assert.equal(
  isJobPostedWithinDays(
    { date_posted: null, created_at: '2026-09-02T12:00:00.000Z' },
    7,
    now
  ),
  true,
  'created_at fills in when date_posted is missing'
)
assert.equal(
  isJobPostedWithinDays(
    { date_posted: '2026-08-01', created_at: '2026-09-04T08:00:00.000Z' },
    7,
    now
  ),
  false,
  'stale date_posted wins over a recent created_at'
)

const selected = selectJobsMissingCareerTips(
  [
    {
      id: 'recent-no-tips',
      title: 'Analyst',
      additional_info: applyOnly,
      date_posted: '2026-09-04',
    },
    {
      id: 'recent-with-tips',
      title: 'Analyst',
      additional_info: withTips,
      date_posted: '2026-09-04',
    },
    {
      id: 'old-no-tips',
      title: 'Analyst',
      additional_info: applyOnly,
      date_posted: '2026-08-20',
    },
    {
      id: 'created-fallback',
      title: 'Analyst',
      additional_info: applyOnly,
      date_posted: null,
      created_at: '2026-09-01T09:00:00.000Z',
    },
  ],
  { days: 7, now }
)
assert.deepEqual(
  selected.map(j => j.id),
  ['recent-no-tips', 'created-fallback']
)

const limited = selectJobsMissingCareerTips(
  [
    {
      id: 'a',
      additional_info: applyOnly,
      date_posted: '2026-09-04',
    },
    {
      id: 'b',
      additional_info: applyOnly,
      date_posted: '2026-09-03',
    },
  ],
  { days: 7, limit: 1, now }
)
assert.deepEqual(
  limited.map(j => j.id),
  ['a']
)

assert.equal(CAREER_TIPS_BACKFILL_ENABLED, false)

const disabledBackfill = await backfillCareerTipsForRecentJobs(
  {
    from() {
      throw new Error('career tips backfill must not query the database')
    },
  } as never,
  { days: 7, limit: 20 }
)
assert.equal(disabledBackfill.disabled, true)
assert.equal(disabledBackfill.updated, 0)
assert.equal(disabledBackfill.examined, 0)
assert.equal(disabledBackfill.scanned, 0)
assert.deepEqual(disabledBackfill.results, [])

console.log('enrichJobById.test.ts: ok')
