import assert from 'node:assert/strict'
import {
  normalizeFuzuJob,
  parseFuzuJobHtml,
  resolveFuzuLocation,
} from './fuzu-adapter'

assert.deepEqual(
  resolveFuzuLocation({
    locality: 'Nairobi',
    region: null,
    country: 'KE',
  }),
  { display: 'Nairobi, Kenya', city: 'Nairobi', county: 'Nairobi' }
)

const listingHtml = `
<script type="application/ld+json">
{"@context":"http://schema.org","@type":"ItemList","url":"https://www.fuzu.com/kenya/job","name":"Jobs","numberOfItems":2,"itemListElement":[{"@type":"ListItem","position":1,"name":"Finance Internship","url":"https://www.fuzu.com/kenya/jobs/finance-internship-james-finlays"},{"@type":"ListItem","position":2,"name":"COLLECTIONS AGENT","url":"https://www.fuzu.com/kenya/jobs/collections-agent-futureinno-digital-tech-ltd"}]}
</script>
<a href="/kenya/jobs/front-desk-representative-dojo-wellness-club">Front Desk</a>
`
const listingPaths = listingHtml.match(/\/kenya\/jobs\/[a-z0-9-]+/gi) || []
assert.equal(new Set(listingPaths).size, 3)

const sampleHtml = `
<html><head></head><body>
<script>
window.__FUZU__={"external_url":""};
</script>
<script type="application/ld+json">
{
  "@context": "http://schema.org",
  "@type": "JobPosting",
  "title": "B2B Sales Executive",
  "description": "<p>JOB SUMMARY</p><p>Sell identity products across Nairobi.</p><p>Deadline: 25th July 2026</p>",
  "datePosted": "2026-07-16",
  "validThrough": "2026-07-25T00:00:00+00:00",
  "employmentType": "FULL_TIME",
  "industry": "Financial Services",
  "skills": "B2B sales Account management",
  "experienceRequirements": {
    "@type": "OccupationalExperienceRequirements",
    "monthsOfExperience": 36
  },
  "jobLocation": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Nairobi",
      "addressCountry": "KE"
    }
  },
  "hiringOrganization": {
    "@type": "Organization",
    "name": "Identify Africa",
    "logo": "https://public-s3.fuzu.com/employers/example.jpg"
  },
  "identifier": {
    "@type": "PropertyValue",
    "name": "Fuzu",
    "value": 945267
  },
  "url": "https://www.fuzu.com/kenya/jobs/b2b-sales-executive-identify-africa"
}
</script>
</body></html>
`

const detail = parseFuzuJobHtml(
  sampleHtml,
  'https://www.fuzu.com/kenya/jobs/b2b-sales-executive-identify-africa'
)

assert.equal(detail.title, 'B2B Sales Executive')
assert.equal(detail.company, 'Identify Africa')
assert.ok(detail.location.includes('Nairobi'))
assert.equal(detail.applicationDeadline, '2026-07-25')
assert.equal(detail.validThrough, '2026-07-25')
assert.equal(detail.employmentType, 'FULL_TIME')
assert.equal(detail.minimumExperienceYears, 3)
assert.equal(detail.fuzuJobId, '945267')
assert.equal(detail.industry, 'Financial Services')
assert.equal(detail.companyId, null)
assert.equal(detail.companySlug, null)
assert.ok(detail.companyLogo?.includes('public-s3.fuzu.com/employers/example.jpg'))

// Bootstrap company refs on the job page
const withCompanyRefHtml = sampleHtml.replace(
  'window.__FUZU__={"external_url":""};',
  'window.__FUZU__={"company_id":209277,"company_slug":"digital-qatalyst","company_logo":"https://public-s3.fuzu.com/employers/medium_abc.png","external_url":""};'
)
const withRef = parseFuzuJobHtml(
  withCompanyRefHtml,
  'https://www.fuzu.com/kenya/jobs/b2b-sales-executive-identify-africa'
)
assert.equal(withRef.companyId, '209277')
assert.equal(withRef.companySlug, 'digital-qatalyst')
assert.equal(
  withRef.companyLogo,
  'https://public-s3.fuzu.com/employers/example.jpg'
) // JSON-LD logo wins over medium bootstrap when both present

const entityHtml = sampleHtml.replace(
  '"title": "B2B Sales Executive"',
  '"title": "Brand Voice &amp; Editorial Lead"'
)
const entityDetail = parseFuzuJobHtml(
  entityHtml,
  'https://www.fuzu.com/kenya/jobs/b2b-sales-executive-identify-africa'
)
assert.equal(entityDetail.title, 'Brand Voice & Editorial Lead')

const normalized = normalizeFuzuJob(detail)
assert.equal(normalized.company, 'Identify Africa')
assert.equal(normalized.required_qualifications, '')
assert.equal(normalized.job_location_county, 'Nairobi')
assert.equal(normalized.job_location_city, 'Nairobi')
assert.equal(normalized.valid_through, '2026-07-25')
assert.equal(normalized.date_posted, new Date('2026-07-16').toISOString())
assert.ok(normalized.tags.includes('Fuzu'))
assert.equal(detail.applyEmail, null)
assert.equal(normalized.application_url, detail.jobUrl)

const withEmailHtml = sampleHtml.replace(
  '"description": "<p>JOB SUMMARY</p><p>Sell identity products across Nairobi.</p><p>Deadline: 25th July 2026</p>"',
  '"description": "<p>How to Apply: email careers@identify.africa</p><p>Deadline: 25th July 2026</p>"'
)
const emailed = parseFuzuJobHtml(
  withEmailHtml,
  'https://www.fuzu.com/kenya/jobs/b2b-sales-executive-identify-africa'
)
assert.equal(emailed.applyEmail, 'careers@identify.africa')
assert.equal(emailed.applicationUrl, null)
assert.equal(emailed.applyLink, null)
assert.equal(emailed.applicationDeadline, '2026-07-25')

// Recruiter email from Fuzu browse API (not in JSON-LD description) beats board URL fallback
const withRecruiter = parseFuzuJobHtml(
  sampleHtml,
  'https://www.fuzu.com/kenya/jobs/b2b-sales-executive-identify-africa',
  { recruiterEmail: 'hr@digitalqatalyst.com' }
)
assert.equal(withRecruiter.applyEmail, 'hr@digitalqatalyst.com')
assert.equal(withRecruiter.applicationUrl, null)
assert.equal(withRecruiter.applyLink, null)
const recruiterNormalized = normalizeFuzuJob(withRecruiter)
assert.equal(recruiterNormalized.apply_email, 'hr@digitalqatalyst.com')
assert.equal(recruiterNormalized.application_url, '')

// Bootstrap external_email_address when present
const bootstrapEmailHtml = sampleHtml.replace(
  'window.__FUZU__={"external_url":""};',
  'window.__FUZU__={"external_fields":{"external_email_address":"talent@example.co.ke","external_url":""}};'
)
const bootstrapped = parseFuzuJobHtml(
  bootstrapEmailHtml,
  'https://www.fuzu.com/kenya/jobs/b2b-sales-executive-identify-africa'
)
assert.equal(bootstrapped.applyEmail, 'talent@example.co.ke')
assert.equal(bootstrapped.applicationUrl, null)

// When description has no deadline, use Fuzu validThrough
const noDeadlineHtml = sampleHtml.replace(
  '<p>Deadline: 25th July 2026</p>',
  '<p>Join our team.</p>'
)
const noDeadline = parseFuzuJobHtml(
  noDeadlineHtml,
  'https://www.fuzu.com/kenya/jobs/b2b-sales-executive-identify-africa'
)
assert.equal(noDeadline.applicationDeadline, '2026-07-25')

console.log('fuzu-adapter.test.ts: ok')
