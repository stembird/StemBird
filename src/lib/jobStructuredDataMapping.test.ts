/**
 * Run: npx tsx src/lib/jobStructuredDataMapping.test.ts
 */
import assert from 'node:assert/strict'
import {
  inferEmploymentType,
  resolveBaseSalary,
  resolveDatePosted,
  resolveEmploymentTypes,
  resolveJobAddress,
  resolveValidThrough,
  toGoogleJobPostingDate,
  type JobForSchema,
  type JobPlace,
} from './jobStructuredDataMapping'

function job(partial: Partial<JobForSchema>): JobForSchema {
  return {
    title: 'Software Engineer',
    company: 'Acme',
    description: '<p>Build things.</p>',
    date_posted: '2026-09-01T08:00:00.000Z',
    created_at: '2026-09-01T08:00:00.000Z',
    valid_through: null,
    employment_type: 'FULL_TIME',
    job_location_type: 'ON_SITE',
    job_location_city: 'Nairobi',
    job_location_county: 'Nairobi',
    job_location_country: 'Kenya',
    location: 'Nairobi, Kenya',
    ...partial,
  } as JobForSchema
}

function asPlace(value: ReturnType<typeof resolveJobAddress>): JobPlace {
  assert.ok(value, 'expected a jobLocation')
  const place = Array.isArray(value) ? value[0] : value
  assert.equal(place['@type'], 'Place')
  return place
}

assert.equal(
  toGoogleJobPostingDate('2026-09-04T19:30:56.328Z'),
  '2026-09-04T19:30:56+00:00',
  'Google format drops milliseconds and uses +00:00 instead of Z'
)

assert.equal(
  resolveDatePosted(job({ date_posted: '2026-09-01T08:00:00.000Z' })),
  '2026-09-01T08:00:00+00:00',
  'uses date_posted when present'
)

assert.equal(
  resolveDatePosted(
    job({
      date_posted: '2026-08-20T00:00:00.000Z',
      created_at: '2026-09-09T12:00:00.000Z',
    })
  ),
  '2026-08-20T00:00:00+00:00',
  'date_posted wins over created_at'
)

assert.equal(
  resolveDatePosted(
    job({
      date_posted: null,
      created_at: '2026-09-09T12:00:00.000Z',
    })
  ),
  '2026-09-09T12:00:00+00:00',
  'created_at fills in when date_posted is missing (GSC datePosted)'
)

assert.equal(
  resolveDatePosted(
    job({
      date_posted: null,
      created_at: '',
      posted_date: '2026-09-07',
    })
  ),
  toGoogleJobPostingDate('2026-09-07'),
  'posted_date is a fallback when created_at is empty'
)

assert.equal(
  resolveDatePosted(
    job({
      date_posted: null,
      created_at: '',
      posted_date: null,
      updated_at: '2026-09-10T06:00:00.000Z',
    })
  ),
  '2026-09-10T06:00:00+00:00',
  'updated_at is the last-resort fallback'
)

assert.equal(
  resolveDatePosted(
    job({
      date_posted: 'not-a-date',
      created_at: '2026-09-09T12:00:00.000Z',
    })
  ),
  '2026-09-09T12:00:00+00:00',
  'invalid date_posted still falls back to created_at'
)

assert.equal(
  resolveDatePosted(job({ date_posted: 'not-a-date', created_at: 'also-bad' })),
  undefined,
  'invalid dates are omitted rather than emitted'
)

assert.equal(
  resolveValidThrough(job({ valid_through: '2026-10-04T00:00:00.000Z' })),
  '2026-10-04T00:00:00+00:00',
  'uses stored valid_through when present'
)

assert.equal(
  resolveValidThrough(
    job({
      valid_through: null,
      expires_at: null,
      application_deadline: null,
      date_posted: '2026-09-01T08:00:00.000Z',
    })
  ),
  '2026-10-01T08:00:00+00:00',
  'GSC validThrough: defaults to datePosted + 30 days'
)

assert.equal(
  resolveValidThrough(
    job({
      valid_through: null,
      expires_at: '2026-09-20T23:59:59.000Z',
    })
  ),
  '2026-09-20T23:59:59+00:00',
  'expires_at fills validThrough when deadline column is empty'
)

const nairobi = asPlace(
  resolveJobAddress(
    job({
      location: 'Nairobi, Kenya',
      job_location_city: 'Nairobi',
      job_location_county: 'Nairobi',
    })
  )
).address
assert.equal(nairobi.addressCountry, 'KE')
assert.equal(nairobi.addressLocality, 'Nairobi')
assert.equal(nairobi.addressRegion, 'Nairobi')
assert.equal(nairobi.streetAddress, 'Nairobi')
assert.equal(nairobi.postalCode, '00100', 'GSC postalCode: Nairobi GPO')

const eldoret = asPlace(
  resolveJobAddress(
    job({
      location: 'Eldoret',
      job_location_city: 'Eldoret',
      job_location_county: null,
    })
  )
).address
assert.equal(eldoret.addressLocality, 'Eldoret')
assert.equal(eldoret.addressRegion, 'Uasin Gishu')
assert.equal(eldoret.postalCode, '30100')

const westlands = asPlace(
  resolveJobAddress(
    job({
      location: 'Westlands, Nairobi',
      job_location_city: 'Nairobi',
      job_location_county: 'Nairobi',
      location_town: 'Westlands',
    })
  )
).address
assert.equal(westlands.streetAddress, 'Westlands')
assert.equal(westlands.addressLocality, 'Nairobi')
assert.equal(westlands.postalCode, '00800')

const street = asPlace(
  resolveJobAddress(
    job({
      location: 'Moi Avenue Bihi Towers, Nairobi, Kenya',
      job_location_city: 'Nairobi',
      job_location_county: 'Nairobi',
    })
  )
).address
assert.match(street.streetAddress || '', /Moi Avenue/i)
assert.equal(street.addressLocality, 'Nairobi')

const kenyaOnly = asPlace(
  resolveJobAddress(
    job({
      location: 'Kenya',
      job_location_city: null,
      job_location_county: null,
      job_location_country: 'Kenya',
    })
  )
).address
assert.equal(kenyaOnly.addressCountry, 'KE')
assert.equal(
  kenyaOnly.streetAddress,
  'Kenya',
  'GSC streetAddress: Kenya-wide listings use the same label shown on the page'
)
assert.equal(
  kenyaOnly.addressLocality,
  undefined,
  'does not invent a city when the job is Kenya-wide'
)

const baringoCountyJob = asPlace(
  resolveJobAddress(
    job({
      title: 'Special Needs Education (SNE) ECDE Teachers',
      company: 'Baringo County Government',
      location: 'Kenya',
      job_location_city: null,
      job_location_county: null,
      job_location_country: 'Kenya',
    })
  )
).address
assert.equal(baringoCountyJob.addressLocality, 'Baringo')
assert.equal(baringoCountyJob.addressRegion, 'Baringo')
assert.equal(baringoCountyJob.streetAddress, 'Baringo')
assert.equal(baringoCountyJob.postalCode, '30400')

const foreignCompanyHq = asPlace(
  resolveJobAddress(
    job({
      title: 'Intern (M) - Business',
      company: 'Absa Bank Limited',
      location: 'Kenya',
      job_location_city: null,
      job_location_county: null,
      job_location_country: 'Kenya',
      companies: {
        location:
          '7th Floor, Barclays Towers West 15 Troye Street Johannesburg, Johannesburg 2001 South Africa',
      } as JobForSchema['companies'],
    })
  )
).address
assert.equal(
  foreignCompanyHq.streetAddress,
  'Kenya',
  'does not copy a foreign company HQ street onto a Kenyan job'
)
assert.equal(foreignCompanyHq.addressLocality, undefined)

const wellness = asPlace(
  resolveJobAddress(
    job({
      title: 'Wellness Lead',
      location: 'Nairobi',
      job_location_city: 'Nairobi',
      job_location_county: null,
    })
  )
).address
assert.equal(wellness.addressRegion, 'Nairobi', 'GSC addressRegion derived from Nairobi city')
assert.equal(wellness.postalCode, '00100')

assert.equal(resolveJobAddress(job({ job_location_type: 'REMOTE' })), undefined)

const extras = resolveJobAddress(
  job({
    job_location_city: 'Nairobi',
    job_location_county: 'Nairobi',
    additional_locations: [{ city: 'Mombasa', county: 'Mombasa' }],
  })
)
assert.ok(Array.isArray(extras))
assert.equal(extras[1].address.addressLocality, 'Mombasa')
assert.equal(extras[1].address.postalCode, '80100')

assert.equal(resolveEmploymentTypes(job({ employment_type: 'FULL_TIME' })), 'FULL_TIME')
assert.deepEqual(
  resolveEmploymentTypes(
    job({
      employment_type: 'FULL_TIME',
      employment_types: ['FULL_TIME', 'CONTRACTOR'],
    })
  ),
  ['FULL_TIME', 'CONTRACTOR']
)
assert.equal(
  resolveEmploymentTypes(
    job({
      employment_type: null,
      employment_types: null,
      title: 'Finance Intern',
    })
  ),
  'INTERN'
)
assert.equal(
  resolveEmploymentTypes(
    job({
      employment_type: null,
      employment_types: null,
      title: 'Operations Officer',
    })
  ),
  'FULL_TIME',
  'GSC employmentType: product default when unknown'
)
assert.equal(inferEmploymentType('Contract Manager'), undefined)
assert.equal(inferEmploymentType('Volunteer Coordinator'), undefined)
assert.equal(inferEmploymentType('Community Volunteer'), 'VOLUNTEER')

const range = resolveBaseSalary(
  job({
    salary_min: 80000,
    salary_max: 120000,
    salary_currency: 'KES',
    salary_period: 'MONTH',
    salary_is_estimated: false,
    salary_visibility: 'Show',
  })
)
assert.equal(range?.value.minValue, 80000)
assert.equal(range?.value.maxValue, 120000)
assert.equal('value' in range!.value, false)

const minOnly = resolveBaseSalary(
  job({
    salary_min: 50000,
    salary_max: null,
    salary_is_estimated: false,
    salary_visibility: 'Show',
    salary_period: 'MONTH',
  })
)
assert.equal(
  minOnly?.value.value,
  50000,
  'GSC maxValue: single bound uses QuantitativeValue.value'
)
assert.equal('maxValue' in minOnly!.value, false)

const estimated = resolveBaseSalary(
  job({
    salary_min: 80000,
    salary_max: 120000,
    salary_is_estimated: true,
    salary_visibility: 'Show',
    title: 'Accounting Clerk - Weighbridge Operations',
    job_location_country: 'Kenya',
  })
)
assert.equal(estimated?.value.minValue, 80000)
assert.equal(estimated?.value.maxValue, 120000)
assert.equal(
  estimated?.currency,
  'KES',
  'GSC baseSalary: estimated Kenyan ranges are emitted when shown on the page'
)

const scraperHiddenEstimate = resolveBaseSalary(
  job({
    title: 'Teacher of Music',
    salary_min: 60000,
    salary_max: 90000,
    salary_is_estimated: true,
    salary_visibility: 'Hide',
    job_location_country: 'Kenya',
    experience_level: 'Mid',
  })
)
assert.equal(scraperHiddenEstimate?.value.minValue, 60000)
assert.equal(scraperHiddenEstimate?.value.maxValue, 90000)

const liveEstimate = resolveBaseSalary(
  job({
    title: 'Microbiologist at Biopharma Limited',
    salary_min: null,
    salary_max: null,
    salary: null,
    salary_is_estimated: false,
    salary_visibility: 'Show',
    experience_level: 'Entry',
    job_location_country: 'Kenya',
  })
)
assert.ok(liveEstimate?.value.minValue, 'GSC example microbiologist gets a market estimate')
assert.ok(liveEstimate?.value.maxValue)

const hiddenEmployerPay = resolveBaseSalary(
  job({
    salary_min: 100000,
    salary_max: 150000,
    salary_is_estimated: false,
    salary_visibility: 'Hide',
  })
)
assert.equal(
  hiddenEmployerPay,
  undefined,
  'employer-stated pay stays out of markup when visibility is Hide'
)

const financeIntern = resolveBaseSalary(
  job({
    title: 'Finance Internship',
    salary_min: null,
    salary_max: null,
    salary: null,
    salary_is_estimated: false,
    salary_visibility: 'Hide',
    experience_level: 'Internship',
    job_location_country: 'Kenya',
  })
)
assert.ok(financeIntern?.value.minValue)
assert.ok(financeIntern?.value.maxValue)
assert.equal(financeIntern?.value.unitText, 'MONTH')

const fromText = resolveBaseSalary(
  job({
    salary_min: null,
    salary_max: null,
    salary: 'KES 80,000 - 120,000',
    salary_is_estimated: false,
    salary_visibility: 'Show',
    salary_period: 'MONTH',
  })
)
assert.equal(fromText?.value.minValue, 80000)
assert.equal(fromText?.value.maxValue, 120000)

console.log('jobStructuredDataMapping.test.ts: all assertions passed')
