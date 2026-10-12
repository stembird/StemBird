/**
 * Run: npx tsx src/components/JobStructuredData.test.ts
 *
 * Recreates the Search Console "Missing field datePosted" case:
 * Regenerative Market Garden Lead had null jobs.date_posted, so JSON-LD
 * omitted the required property. created_at must fill it in.
 */
import assert from 'node:assert/strict'
import { buildJobPostingJsonLd } from './JobStructuredData'
import type { Database } from '@/integrations/supabase/types'

type JobRow = Database['public']['Tables']['jobs']['Row']

function job(partial: Partial<JobRow> & { companies?: null }): JobRow & {
  companies?: null
} {
  return {
    title: 'Regenerative Market Garden Lead',
    company: 'Black House Syntropics',
    description: '<p>Farm manager role.</p>',
    date_posted: null,
    created_at: '2026-09-09T08:00:00.000Z',
    valid_through: '2026-10-04T00:00:00.000Z',
    employment_type: 'FULL_TIME',
    job_location_type: 'ON_SITE',
    job_location_city: 'Kajiado',
    job_location_county: 'Kajiado',
    job_location_country: 'Kenya',
    location: 'Kajiado, Kenya',
    salary_min: 16000,
    salary_max: 30000,
    salary_currency: 'KES',
    salary_period: 'MONTH',
    salary_is_estimated: false,
    salary_visibility: 'Show',
    minimum_experience: 1,
    industry: 'Agriculture & Agribusiness',
    direct_apply: false,
    companies: null,
    ...partial,
  } as JobRow & { companies?: null }
}

const liveGscCase = buildJobPostingJsonLd(job({}))
assert.ok(liveGscCase, 'emits JobPosting when date_posted is null')
assert.equal(liveGscCase['@type'], 'JobPosting')
assert.equal(
  liveGscCase.datePosted,
  '2026-09-09T08:00:00+00:00',
  'datePosted falls back to created_at for the GSC-invalid listing'
)
assert.equal(liveGscCase.title, 'Regenerative Market Garden Lead')
const liveKeys = Object.keys(liveGscCase)
assert.ok(
  liveKeys.indexOf('datePosted') < liveKeys.indexOf('description'),
  'datePosted is emitted before description so it cannot be lost to a partial parse'
)

const withBoardDate = buildJobPostingJsonLd(
  job({ date_posted: '2026-08-20T10:45:32.000Z' })
)
assert.equal(
  withBoardDate?.datePosted,
  '2026-08-20T10:45:32+00:00',
  'board date_posted is preferred when present'
)

const operationAgent = buildJobPostingJsonLd(
  job({
    title: 'Operation Agent',
    date_posted: null,
    created_at: '2026-09-04T19:30:56.328Z',
  })
)
assert.equal(operationAgent?.title, 'Operation Agent')
assert.equal(
  operationAgent?.datePosted,
  '2026-09-04T19:30:56+00:00',
  'GSC example /jobs/operation-agent always gets datePosted'
)

const medicalRep = buildJobPostingJsonLd(
  job({
    title: 'Medical Representative - Aesthetic & Wellness',
    date_posted: null,
    created_at: '2026-09-05T12:01:10.330Z',
  })
)
assert.equal(
  medicalRep?.datePosted,
  '2026-09-05T12:01:10+00:00',
  'GSC example /jobs/medical-representative-aesthetic-wellness always gets datePosted'
)

const noDates = buildJobPostingJsonLd(
  job({ date_posted: null, created_at: '', posted_date: null, updated_at: '' })
)
assert.equal(
  noDates,
  null,
  'does not emit JobPosting when no valid datePosted can be resolved'
)

const kajiado = liveGscCase.jobLocation as {
  address: Record<string, string>
}
assert.equal(kajiado.address['@type'], 'PostalAddress')
assert.equal(kajiado.address.addressCountry, 'KE')
assert.equal(kajiado.address.addressLocality, 'Kajiado')
assert.equal(kajiado.address.addressRegion, 'Kajiado')
assert.equal(kajiado.address.streetAddress, 'Kajiado')
assert.equal(kajiado.address.postalCode, '01100')

const kenyaWide = buildJobPostingJsonLd(
  job({
    title: 'Credit Controller',
    company: 'JM Associates',
    location: 'Kenya',
    job_location_city: null,
    job_location_county: null,
  })
)
const kenyaWidePlace = kenyaWide?.jobLocation as {
  address: Record<string, string | undefined>
}
assert.equal(
  kenyaWidePlace.address.streetAddress,
  'Kenya',
  'GSC example Kenya-wide jobs still emit streetAddress'
)
assert.equal(kenyaWidePlace.address.addressCountry, 'KE')

const missingDeadline = buildJobPostingJsonLd(
  job({ valid_through: null, expires_at: null, application_deadline: null })
)
assert.equal(
  missingDeadline?.validThrough,
  '2026-10-09T08:00:00+00:00',
  'GSC validThrough: datePosted + 30 days when no employer deadline'
)

const missingEmployment = buildJobPostingJsonLd(
  job({ employment_type: null, employment_types: null })
)
assert.equal(missingEmployment?.employmentType, 'FULL_TIME')

const salaryRange = liveGscCase.baseSalary as {
  value: { minValue: number; maxValue: number; value?: number }
}
assert.equal(salaryRange.value.minValue, 16000)
assert.equal(salaryRange.value.maxValue, 30000)

const singleSalary = buildJobPostingJsonLd(
  job({ salary_min: 80000, salary_max: null })
)
const singleValue = singleSalary?.baseSalary as {
  value: { value: number; maxValue?: number }
}
assert.equal(singleValue.value.value, 80000)
assert.equal(singleValue.value.maxValue, undefined)

const estimatedSalary = buildJobPostingJsonLd(job({ salary_is_estimated: true }))
const estimatedValue = estimatedSalary?.baseSalary as {
  value: { minValue: number; maxValue: number }
}
assert.equal(estimatedValue.value.minValue, 16000)
assert.equal(estimatedValue.value.maxValue, 30000)

const intern = buildJobPostingJsonLd(
  job({ title: 'Graduate Intern — Finance', employment_type: null, employment_types: null })
)
assert.equal(intern?.employmentType, 'INTERN')

console.log('JobStructuredData.test.ts: all assertions passed')
