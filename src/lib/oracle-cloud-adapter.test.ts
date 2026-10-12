import assert from 'node:assert/strict'
import {
  extractOracleCloudHost,
  extractOracleCloudJobId,
  extractOracleCloudSiteNumber,
  normalizeOracleCloudJob,
  parseOracleCloudBoardUrl,
} from './oracle-cloud-adapter'

assert.deepEqual(
  parseOracleCloudBoardUrl(
    'https://eoin.fa.em3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_3001/jobs'
  ),
  { host: 'eoin.fa.em3.oraclecloud.com', siteNumber: 'CX_3001' }
)

assert.equal(
  extractOracleCloudJobId(
    'https://eoin.fa.em3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_3001/job/6058'
  ),
  '6058'
)
assert.equal(
  extractOracleCloudHost(
    'https://eoin.fa.em3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_3001/job/6058'
  ),
  'eoin.fa.em3.oraclecloud.com'
)
assert.equal(
  extractOracleCloudSiteNumber(
    'https://eoin.fa.em3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_3001/job/6058'
  ),
  'CX_3001'
)

const normalized = normalizeOracleCloudJob(
  {
    id: '6058',
    title: 'Senior Manager, Investment Groups',
    location: 'Kenya',
    countryCode: 'KE',
    detailUrl:
      'https://eoin.fa.em3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_3001/job/6058',
    descriptionHtml: '<p>Drive investment group growth.</p>',
    qualificationsHtml: '',
    responsibilitiesHtml: '',
    jobSchedule: 'Full time',
    category: 'Senior Management',
    validThrough: '2026-07-31T20:59:00+00:00',
  },
  'KCB Group'
)

assert.equal(normalized.company, 'KCB Group')
assert.equal(normalized.job_location_country, 'Kenya')
assert.equal(normalized.employment_type, 'FULL_TIME')
assert.ok(normalized.application_url.includes('/job/6058'))
assert.ok(normalized.description.includes('investment group'))

console.log('oracle-cloud-adapter.test.ts: ok')
