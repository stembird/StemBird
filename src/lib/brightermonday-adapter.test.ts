import assert from 'node:assert/strict'
import {
  normalizeBrighterMondayJob,
  parseBrighterMondayJobHtml,
  resolveBrighterMondayLocation,
} from './brightermonday-adapter'

assert.deepEqual(
  resolveBrighterMondayLocation({
    locationName: 'Nairobi',
    locality: 'Kenya',
    region: 'Kenya',
    country: 'KE',
  }),
  { display: 'Nairobi, Kenya', city: 'Nairobi', county: 'Nairobi' }
)

const listingHtml = `
<link rel="prerender" href="https://www.brightermonday.co.ke/listings/sales-and-marketing-officer-executive-6qxq97">
<a href="/listings/valuer-wrene5">Valuer</a>
`
const listingPaths = listingHtml.match(/\/listings\/[a-z0-9-]+/gi) || []
assert.equal(new Set(listingPaths).size, 2)

const sampleHtml = `
<html><head></head><body>
<script>
onesignal({"location_name":"Nairobi","listing_title":"Sales and Marketing Officer"});
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "JobPosting",
      "@id": "https://www.brightermonday.co.ke/#/schema/JobPosting/listing-1",
      "title": "Sales and Marketing Officer",
      "description": "<p>Sell print services across Nairobi.</p><p>Deadline: 27th July 2026</p>",
      "datePosted": "2026-07-14T00:00:00.000000Z",
      "employmentType": "FULL_TIME",
      "industry": "Manufacturing & Warehousing",
      "occupationalCategory": "Sales",
      "qualifications": "Mid level",
      "validThrough": "2026-10-13T00:00:00.000000Z",
      "baseSalary": {
        "@type": "MonetaryAmount",
        "currency": "KES",
        "value": {
          "@type": "QuantitativeValue",
          "minValue": 60000,
          "maxValue": 75000,
          "unitText": "MONTH"
        }
      },
      "experienceRequirements": {
        "@type": "OccupationalExperienceRequirements",
        "monthsOfExperience": 36
      },
      "jobLocation": {
        "@id": "https://www.brightermonday.co.ke/#/schema/Place/location-1"
      },
      "hiringOrganization": {
        "@id": "https://www.brightermonday.co.ke/#/schema/Organization/agency-1"
      }
    },
    {
      "@type": "Organization",
      "@id": "https://www.brightermonday.co.ke/#/schema/Organization/agency-1",
      "name": "Elite Offset Ltd",
      "legalName": "Elite Offset Ltd"
    },
    {
      "@type": "Place",
      "@id": "https://www.brightermonday.co.ke/#/schema/Place/location-1",
      "address": {
        "@id": "https://www.brightermonday.co.ke/#/schema/PostalAddress/1"
      }
    },
    {
      "@type": "PostalAddress",
      "@id": "https://www.brightermonday.co.ke/#/schema/PostalAddress/1",
      "addressLocality": "Kenya",
      "addressRegion": "Kenya",
      "addressCountry": "KE"
    }
  ]
}
</script>
</body></html>
`

const detail = parseBrighterMondayJobHtml(
  sampleHtml,
  'https://www.brightermonday.co.ke/listings/sales-and-marketing-officer-6qxq97'
)

assert.equal(detail.title, 'Sales and Marketing Officer')
assert.equal(detail.company, 'Elite Offset Ltd')

const entityHtml = sampleHtml.replace(
  '"title": "Sales and Marketing Officer"',
  '"title": "Brand Voice &amp; Editorial Lead"'
)
const entityDetail = parseBrighterMondayJobHtml(
  entityHtml,
  'https://www.brightermonday.co.ke/listings/sales-and-marketing-officer-6qxq97'
)
assert.equal(entityDetail.title, 'Brand Voice & Editorial Lead')
assert.equal(detail.locationName, 'Nairobi')
assert.ok(detail.location.includes('Nairobi'))
assert.equal(detail.applicationDeadline, '2026-07-27')
assert.equal(detail.validThrough, '2026-07-27')
assert.notEqual(detail.applicationDeadline, '2026-10-13')
assert.equal(detail.salaryMin, 60000)
assert.equal(detail.salaryMax, 75000)
assert.equal(detail.employmentType, 'FULL_TIME')
assert.equal(detail.minimumExperienceYears, 3)

const normalized = normalizeBrighterMondayJob(detail)
assert.equal(normalized.company, 'Elite Offset Ltd')
assert.equal(normalized.required_qualifications, '')
assert.equal(normalized.experience_level, 'Mid level')
assert.equal(detail.qualifications, 'Mid level')
assert.equal(normalized.job_location_county, 'Nairobi')
assert.equal(normalized.job_location_city, 'Nairobi')
assert.equal(normalized.valid_through, '2026-07-27')
assert.equal(normalized.date_posted, new Date('2026-07-14T00:00:00.000000Z').toISOString())
assert.equal(normalized.salary_visibility, 'Show')
assert.ok(normalized.tags.includes('BrighterMonday'))
assert.equal(detail.applyEmail, null)
assert.equal(normalized.application_url, detail.jobUrl)

const withEmailHtml = sampleHtml.replace(
  '"description": "<p>Sell print services across Nairobi.</p><p>Deadline: 27th July 2026</p>"',
  '"description": "<p>How to Apply: email careers@eliteoffset.co.ke</p><p>Deadline: 27th July 2026</p>"'
)
const emailed = parseBrighterMondayJobHtml(
  withEmailHtml,
  'https://www.brightermonday.co.ke/listings/sales-and-marketing-officer-6qxq97'
)
assert.equal(emailed.applyEmail, 'careers@eliteoffset.co.ke')
assert.equal(emailed.applicationUrl, null)
assert.equal(emailed.applyLink, null)
assert.equal(emailed.applicationDeadline, '2026-07-27')

console.log('brightermonday-adapter.test.ts: ok')
