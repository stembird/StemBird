import assert from 'node:assert/strict'
import {
  extractTaleoContestNo,
  extractTaleoHost,
  extractTaleoLocation,
  extractTaleoPortal,
  extractTaleoSection,
  extractTaleoTitle,
  normalizeTaleoJob,
  parseLocationColumn,
  parseTaleoBoardUrl,
  parseTaleoInitialHistory,
  parseTaleoJoblistHistory,
} from './taleo-adapter'

assert.deepEqual(
  parseTaleoBoardUrl(
    'https://equitybank.taleo.net/careersection/ext_new/jobsearch.ftl'
  ),
  { host: 'equitybank.taleo.net', section: 'ext_new' }
)
assert.equal(
  extractTaleoContestNo(
    'https://britam.taleo.net/careersection/ke/jobdetail.ftl?lang=en&job=2600004N'
  ),
  '2600004N'
)
assert.equal(
  extractTaleoHost(
    'https://britam.taleo.net/careersection/ke/jobdetail.ftl?job=2600004N'
  ),
  'britam.taleo.net'
)
assert.equal(
  extractTaleoSection(
    'https://britam.taleo.net/careersection/ke/jobdetail.ftl?job=2600004N'
  ),
  'ke'
)
assert.equal(
  extractTaleoPortal(`var portalNo = '12300100254'; FacetedSearchSettings.portalNo = "12300100254";`),
  '12300100254'
)

assert.equal(parseLocationColumn('["Kenya"]'), 'Kenya')
assert.equal(parseLocationColumn('["Kenya-Nairobi"]'), 'Kenya, Nairobi')
assert.equal(
  extractTaleoLocation({
    column: ['Fraud Prevention Manager', '["Kenya"]', 'Jul 31, 2026'],
    locationsColumns: [1],
  }),
  'Kenya'
)
assert.equal(
  extractTaleoTitle({
    column: ['Banking Investigations Team Leader', '["Kenya"]', 'Jul 31, 2026'],
    linkedColumn: 0,
  }),
  'Banking Investigations Team Leader'
)

const history =
  'ftlx0!|!ftlUtil_resetPage!$!requisitionDescriptionInterface!|!descRequisition!|!rdPager!$!63153!|!true!|!63153!|!false!|!Submission for the position%5C: Banking Investigations Team Leader - (Job Number%5C: 2600009F)!|!false!|!63153!|!false!|!true!|!Banking Investigations Team Leader!|!' +
  '!*!<p>Equity Bank purpose statement.</p>!|!' +
  '!*!<p>Equity Bank purpose statement.</p>!|!' +
  '!*!<p>Qualifications go here.</p>!|!' +
  '!*!<p>Qualifications go here.</p>!|!'

const parsed = parseTaleoInitialHistory(history)
assert.equal(parsed.title, 'Banking Investigations Team Leader')
assert.equal(parsed.descriptionHtml, '<p>Equity Bank purpose statement.</p>')
assert.equal(parsed.qualificationsHtml, '<p>Qualifications go here.</p>')
assert.equal(parsed.descriptionHtml.includes('!|!'), false)

// AKU-style: URI-encoded HTML mixed with literal CSS percentages (115%).
const akuHistory =
  'ftlx0!|!true!|!118773!|!false!|!Submission for the position%5C: Building Operations Manager - (Job Number%5C: 260002SR)!|!false!|!118773!|!false!|!true!|!Building Operations Manager!|!260002SR!|!' +
  '!*!%3Cp class=%22paragraph%22 style=%22line-height%5C:115%;margin-bottom%5C:0cm%22%3EBuilding ops.%3C/p%3E' +
  '!*!%3Cp%3ERelevant experience.%3C/p%3E'
const akuParsed = parseTaleoInitialHistory(akuHistory)
assert.equal(akuParsed.title, 'Building Operations Manager')
assert.ok(akuParsed.descriptionHtml.includes('<p'))
assert.ok(akuParsed.descriptionHtml.includes('Building ops.'))
assert.ok(!akuParsed.descriptionHtml.includes('%3C'))
assert.notEqual(akuParsed.title, '260002SR')

const normalized = normalizeTaleoJob(
  {
    jobId: '63153',
    contestNo: '2600009F',
    title: 'Banking Investigations Team Leader',
    location: 'Kenya',
    detailUrl:
      'https://equitybank.taleo.net/careersection/ext_new/jobdetail.ftl?lang=en&job=2600009F',
    descriptionHtml: '<p>Lead investigations.</p>',
    qualificationsHtml: '<p>5+ years experience.</p>',
  },
  'Equity Bank'
)

assert.equal(normalized.title, 'Banking Investigations Team Leader')
assert.equal(normalized.company, 'Equity Bank')
assert.equal(normalized.job_location_country, 'Kenya')
assert.ok(normalized.application_url.includes('equitybank.taleo.net'))
assert.ok(normalized.description.includes('Lead investigations'))
assert.ok(normalized.required_qualifications.includes('5+ years'))

const joblistHistory =
  'ftlx0!|!ftlUtil_resetPage!$!requisitionListInterface!|!listRequisition!|!rlPager!$!false!|!' +
  'false!|!118773!|!Building Operations Manager (Fixed Term), UCN-Operations!|!118773!|!Building Operations Manager (Fixed Term), UCN-Operations!|!118773!|!118773!|!118773!|!118773!|!118773!|!260002SR!|!Kenya-Nairobi!|!false!|!!|!!|!!|!!|!16/07/2026!|!30/07/2026!|!Apply!|!Apply for this position!|!' +
  'false!|!113296!|!Full Time Faculty, Paediatric Nephrologist!|!113296!|!Full Time Faculty, Paediatric Nephrologist!|!113296!|!113296!|!113296!|!113296!|!113296!|!2600027E!|!Pakistan-Karachi!|!false!|!!|!!|!!|!!|!16/07/2026!|!16/08/2026!|!Apply!|!Apply for this position!|!'

const joblistJobs = parseTaleoJoblistHistory(joblistHistory)
assert.equal(joblistJobs.length, 2)
assert.equal(joblistJobs[0].contestNo, '260002SR')
assert.equal(joblistJobs[0].location, 'Kenya, Nairobi')
assert.equal(joblistJobs[1].contestNo, '2600027E')

console.log('taleo-adapter.test.ts: ok')
