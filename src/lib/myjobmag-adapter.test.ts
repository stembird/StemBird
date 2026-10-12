import assert from 'node:assert/strict'
import {
  dateFeedPageUrls,
  extractMyJobMagApplyNow,
  extractMyJobMagMethodOfApplicationHtml,
  isMyJobMagJobNotFound,
  listingPageUrls,
  nextKnownPageStreak,
  normalizeMyJobMagJob,
  parseMyJobMagCompanyHtml,
  parseMyJobMagJobHtml,
  resolveMyJobMagLocation,
  sanitizeJsonLdText,
} from './myjobmag-adapter'

assert.deepEqual(
  resolveMyJobMagLocation({
    locality: 'Nairobi',
    region: 'Nairobi',
    country: 'KE',
  }),
  { display: 'Nairobi, Kenya', city: 'Nairobi', county: 'Nairobi' }
)

// Duty station in title beats HQ locality (common MyJobMag pattern)
assert.deepEqual(
  resolveMyJobMagLocation({
    locality: 'Nairobi',
    region: 'Nairobi',
    country: 'KE',
    title: 'Direct Sales Agent - Naivasha',
  }),
  { display: 'Naivasha, Nakuru, Kenya', city: 'Naivasha', county: 'Nakuru' }
)

assert.deepEqual(
  resolveMyJobMagLocation({
    locality: 'Kitale',
    country: 'KE',
    title: 'Chief Manager Commercial and Corporate Affairs',
  }),
  { display: 'Kitale, Trans Nzoia, Kenya', city: 'Kitale', county: 'Trans Nzoia' }
)

assert.deepEqual(
  resolveMyJobMagLocation({
    locality: 'Nairobi',
    title: 'Sales Van Representative – North Rift',
  }),
  { display: 'North Rift, Kenya', city: 'North Rift', county: '' }
)

const brokenLd = `{
  "@type": "JobPosting",
  "title": "Internal Auditor",
  "description": "<p>Line one</p>
\\n<p>Line two</p>"
}`
const sanitized = sanitizeJsonLdText(brokenLd)
assert.doesNotThrow(() => JSON.parse(sanitized))

const listingHtml = `
<a href="/job/internal-auditor-association-for-the-physically-disabled-of-kenya">Auditor</a>
<a href="/job/php-backend-software-developer">PHP</a>
<a href="/job-application/1285615" class="apply-but">Apply Now</a>
`
const listingPaths = listingHtml.match(/\/job\/[a-z0-9-]+/gi) || []
assert.equal(new Set(listingPaths).size, 2)

const sampleHtml = `
<html><head></head><body>
<script type="application/ld+json">
{
  "@context": "http://schema.org",
  "@type": "JobPosting",
  "title": "Internal Auditor",
  "description": "&lt;p&gt;&lt;strong&gt;Role Summary&lt;/strong&gt;&lt;/p&gt;
&lt;p&gt;Audit financial records in Nairobi.&lt;/p&gt;
&lt;p&gt;Deadline: 5th August 2026&lt;/p&gt;",
  "datePosted": "2026-07-22T10:45:32+01:00",
  "validThrough": "2026-08-05T00:00:00+0000",
  "employmentType": "Full Time , Onsite",
  "industry": "NGO / Non-Profit Associations",
  "occupationalCategory": "Finance / Accounting / Audit",
  "experienceRequirements": {
    "@type": "OccupationalExperienceRequirements",
    "monthsOfExperience": "60"
  },
  "jobLocation": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Nairobi",
      "addressRegion": "Nairobi",
      "addressCountry": "KE"
    }
  },
  "hiringOrganization": {
    "@type": "Organization",
    "name": "Association for the Physically Disabled of Kenya",
    "sameAs": "https://www.myjobmag.co.ke/jobs-at/association-for-the-physically-disabled-of-kenya"
  }
}
</script>
<h2><span class="subjob-title">Internal Auditor</span></h2>
<ul class="job-key-info">
  <li><span class="jkey-title">Job Type</span> <span class="jkey-info">Full Time , Onsite</span></li>
  <li><span class="jkey-title">Experience</span> <span class="jkey-info">5 - 7 years</span></li>
  <li><span class="jkey-title">Location</span> <span class="jkey-info">Nairobi</span></li>
  <li><span class="jkey-title">Job Field</span> <span class="jkey-info">Finance / Accounting / Audit</span></li>
  <li><span class="jkey-title">Salary Range</span> <span class="jkey-info">KSh 100,000 - KSh 150,000/month</span></li>
</ul>
<div class="job-details"><p>Fallback HTML description</p></div>
</body></html>
`

const detail = parseMyJobMagJobHtml(
  sampleHtml,
  'https://www.myjobmag.co.ke/job/internal-auditor-association-for-the-physically-disabled-of-kenya'
)

assert.equal(detail.title, 'Internal Auditor')
assert.equal(detail.company, 'Association for the Physically Disabled of Kenya')
assert.ok(detail.location.includes('Nairobi'))
assert.equal(detail.applicationDeadline, '2026-08-05')
assert.equal(detail.validThrough, '2026-08-05')
assert.equal(detail.employmentType, 'FULL_TIME')
assert.equal(detail.minimumExperienceYears, 5)
assert.equal(detail.industry, 'NGO / Non-Profit Associations')
assert.equal(detail.salaryMin, 100000)
assert.equal(detail.salaryMax, 150000)
assert.equal(detail.salaryCurrency, 'KES')
assert.ok(detail.descriptionHtml.includes('Role Summary'))

const normalized = normalizeMyJobMagJob(detail)
assert.equal(normalized.company, 'Association for the Physically Disabled of Kenya')
assert.equal(normalized.required_qualifications, '')
assert.equal(normalized.job_location_county, 'Nairobi')
assert.equal(normalized.job_location_city, 'Nairobi')
assert.equal(normalized.valid_through, '2026-08-05')
assert.equal(normalized.date_posted, new Date('2026-07-22T10:45:32+01:00').toISOString())
assert.ok(normalized.tags.includes('MyJobMag'))
assert.equal(normalized.salary_visibility, 'Show')
assert.equal(detail.applyEmail, null)
assert.equal(normalized.application_url, detail.jobUrl)

const withEmailHtml = sampleHtml.replace(
  'Audit financial records in Nairobi.',
  'How to Apply: email careers@apdk.or.ke'
)
const emailed = parseMyJobMagJobHtml(
  withEmailHtml,
  'https://www.myjobmag.co.ke/job/internal-auditor-association-for-the-physically-disabled-of-kenya'
)
assert.equal(emailed.applyEmail, 'careers@apdk.or.ke')
assert.equal(emailed.applicationUrl, null)
assert.equal(emailed.applyLink, null)

// When description has no deadline, use MyJobMag validThrough
const noDeadlineHtml = sampleHtml.replace(
  '&lt;p&gt;Deadline: 5th August 2026&lt;/p&gt;',
  '&lt;p&gt;Join our team.&lt;/p&gt;'
)
const noDeadline = parseMyJobMagJobHtml(
  noDeadlineHtml,
  'https://www.myjobmag.co.ke/job/internal-auditor-association-for-the-physically-disabled-of-kenya'
)
assert.equal(noDeadline.applicationDeadline, '2026-08-05')

// HTML fallback when JSON-LD is missing
const htmlOnly = `
<html><body>
  <h1>Finance Officer at Acme Kenya</h1>
  <span class="subjob-title">Finance Officer</span>
  <ul class="job-key-info">
    <li><span class="jkey-title">Location</span> <span class="jkey-info">Mombasa</span></li>
    <li><span class="jkey-title">Job Type</span> <span class="jkey-info">Contract</span></li>
  </ul>
  <div class="job-details"><p>Manage books. Apply to hr@acme.co.ke</p></div>
  <a href="/jobs-at/acme-kenya">View Jobs at Acme Kenya</a>
</body></html>
`
const htmlDetail = parseMyJobMagJobHtml(
  htmlOnly,
  'https://www.myjobmag.co.ke/job/finance-officer-acme-kenya'
)
assert.equal(htmlDetail.title, 'Finance Officer')
assert.equal(htmlDetail.company, 'Acme Kenya')
assert.equal(htmlDetail.companySlug, 'acme-kenya')
assert.ok(htmlDetail.location.includes('Mombasa'))
assert.equal(htmlDetail.employmentType, 'CONTRACTOR')
assert.equal(htmlDetail.applyEmail, 'hr@acme.co.ke')
assert.ok(htmlDetail.descriptionHtml.includes('Manage books'))

// Company tab LocalBusiness JSON-LD
const companyTabHtml = `
<html><head><title>Glantix Jobs in Kenya | MyJobMag</title></head><body>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "image": ["https://www.myjobmag.co.ke/company_logo/86/35570glantix.png"],
  "name": "Glantix",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Moi Avenue Bihi Towers, Nairobi, Kenya"
  },
  "url": "https://glantix.co.ke/",
  "telephone": "(+254)0700 000736"
}
</script>
<img alt="Glantix logo" src="/company_logo/86/35570glantix.png" />
<a href="/jobs-at/glantix">Glantix</a>
</body></html>
`
const companyProfile = parseMyJobMagCompanyHtml(
  companyTabHtml,
  'https://www.myjobmag.co.ke/jobs-at/glantix'
)
assert.ok(companyProfile)
assert.equal(companyProfile!.name, 'Glantix')
assert.equal(companyProfile!.website, 'https://glantix.co.ke/')
assert.equal(
  companyProfile!.logo,
  'https://www.myjobmag.co.ke/company_logo/35570glantix.png'
)
assert.ok(companyProfile!.location?.includes('Nairobi'))

// Method of Application CTA (outside JSON-LD) must yield employer apply URL —
// not the MyJobMag listing.
const psckPage = `
<html><body>
<script type="application/ld+json">
{
  "@type": "JobPosting",
  "title": "Instructor III - Clothing Technology/Textile -2 Posts",
  "description": "&lt;p&gt;Duties and Responsibilities&lt;/p&gt;",
  "hiringOrganization": { "@type": "Organization", "name": "Public Service Commission Kenya (PSCK)" },
  "jobLocation": {
    "@type": "Place",
    "address": { "@type": "PostalAddress", "addressLocality": "Nairobi", "addressCountry": "KE" }
  }
}
</script>
<div class="job-details"><p>Duties and Responsibilities</p></div>
<li id="printable" class="job-description">
  <h2 id="application-method"><b>Method of Application</b></h2>
  <div class="mag-b bm-b-30">
    Interested and qualified? Go to
    <a target="_blank" rel="nofollow" href="/apply-now/1284822">
      Public Service Commission Kenya (PSCK) on pscims.publicservice.go.ke
    </a> to apply
  </div>
</li>
</body></html>
`

const methodHtml = extractMyJobMagMethodOfApplicationHtml(psckPage)
assert.ok(methodHtml.includes('apply-now/1284822'))
assert.ok(methodHtml.includes('pscims.publicservice.go.ke'))

const applyNow = extractMyJobMagApplyNow(psckPage)
assert.equal(applyNow.path, '/apply-now/1284822')
assert.equal(applyNow.hostFromText, 'pscims.publicservice.go.ke')

const psckDetail = parseMyJobMagJobHtml(
  psckPage,
  'https://www.myjobmag.co.ke/job/instructor-iii-clothing-technology-textile-2-posts-public-service-commission-kenya-psck',
  {
    linkoutUrl:
      'https://pscims.publicservice.go.ke/jobs/AdvertDetailsExt.aspx?kpx=138/2026&kpage=ActiveAdverts.aspx',
  }
)
assert.equal(
  psckDetail.applicationUrl,
  'https://pscims.publicservice.go.ke/jobs/AdvertDetailsExt.aspx?kpx=138/2026&kpage=ActiveAdverts.aspx'
)
assert.equal(psckDetail.applyLink, psckDetail.applicationUrl)
assert.ok(!/myjobmag\.co\.ke/i.test(psckDetail.applicationUrl || ''))
assert.ok(
  !/href=["']\/apply-now\//i.test(psckDetail.descriptionHtml),
  'description must not keep relative /apply-now/ links'
)
assert.ok(
  psckDetail.descriptionHtml.includes('pscims.publicservice.go.ke'),
  'employer host should appear in description CTA'
)
assert.ok(
  /href=["']https:\/\/pscims\.publicservice\.go\.ke[^"']*["']/i.test(
    psckDetail.descriptionHtml
  ),
  `apply CTA should point at employer URL, got: ${psckDetail.descriptionHtml}`
)

// Without redirect resolution, host-from-text still beats board fallback
const psckFallbackHost = parseMyJobMagJobHtml(
  psckPage,
  'https://www.myjobmag.co.ke/job/instructor-iii-clothing-technology-textile-2-posts-public-service-commission-kenya-psck'
)
assert.ok(psckFallbackHost.applicationUrl?.includes('pscims.publicservice.go.ke'))
assert.ok(!/myjobmag\.co\.ke\/job\//i.test(psckFallbackHost.applicationUrl || ''))
assert.ok(!/href=["']\/apply-now\//i.test(psckFallbackHost.descriptionHtml))
assert.ok(
  /href=["']https:\/\/www\.myjobmag\.co\.ke\/apply-now\/1284822["']/i.test(
    psckFallbackHost.descriptionHtml
  ),
  `without real redirect, keep absolute MyJobMag apply-now, got: ${psckFallbackHost.descriptionHtml}`
)

// KRA-style CTA: relative apply-now + erecruitment host in label
const kraPage = `<!DOCTYPE html><html><head>
<script type="application/ld+json">
{
  "@type": "JobPosting",
  "title": "Pension Officer - Administration",
  "description": "&lt;p&gt;Role details&lt;/p&gt;",
  "hiringOrganization": { "@type": "Organization", "name": "Kenya Revenue Authority (KRA)" },
  "jobLocation": {
    "@type": "Place",
    "address": { "@type": "PostalAddress", "addressLocality": "Nairobi", "addressCountry": "KE" }
  }
}
</script>
</head><body>
<div class="job-details"><p>Role details</p></div>
<li id="printable" class="job-description">
  <h2 id="application-method"><b>Method of Application</b></h2>
  <div class="mag-b bm-b-30">
    Interested and qualified? Go to
    <a target="_blank" rel="nofollow" href="/apply-now/1284199">
      Kenya Revenue Authority (KRA) on erecruitment.kra.go.ke
    </a> to apply
  </div>
</li>
</body></html>`

const kraDetail = parseMyJobMagJobHtml(
  kraPage,
  'https://www.myjobmag.co.ke/job/pension-officer-administration-kenya-revenue-authority-kra',
  { linkoutUrl: 'https://erecruitment.kra.go.ke/login' }
)
assert.equal(kraDetail.applicationUrl, 'https://erecruitment.kra.go.ke/login')
assert.ok(!/href=["']\/apply-now\//i.test(kraDetail.descriptionHtml))
assert.ok(
  kraDetail.descriptionHtml.includes('href="https://erecruitment.kra.go.ke/login"'),
  `KRA CTA must link to employer portal, got: ${kraDetail.descriptionHtml}`
)
assert.ok(
  /Interested and qualified\? Go to/i.test(kraDetail.descriptionHtml)
)
// Title duty station overrides HQ locality on normalize
const naivashaHtml = sampleHtml
  .replace(/Internal Auditor/g, 'Direct Sales Agent - Naivasha')
  .replace('Association for the Physically Disabled of Kenya', 'HCS Affiliates Group')
const naivashaDetail = parseMyJobMagJobHtml(
  naivashaHtml,
  'https://www.myjobmag.co.ke/job/direct-sales-agent-naivasha-hcs-affiliates-group-1'
)
assert.equal(naivashaDetail.location, 'Naivasha, Nakuru, Kenya')
const naivashaNorm = normalizeMyJobMagJob(naivashaDetail)
assert.equal(naivashaNorm.job_location_city, 'Naivasha')
assert.equal(naivashaNorm.job_location_county, 'Nakuru')

// Removed listings must not parse as empty Untitled jobs
assert.equal(
  isMyJobMagJobNotFound('<html><head><title>Job Not Found |  MyJobMag</title></head><body></body></html>'),
  true
)
assert.throws(
  () =>
    parseMyJobMagJobHtml(
      '<html><head><title>Job Not Found |  MyJobMag</title></head><body><p>Job Not Found</p></body></html>',
      'https://www.myjobmag.co.ke/job/missing-role'
    ),
  /not found/i
)

// Incremental discover: stop after N consecutive already-known pages
{
  const urls = ['https://www.myjobmag.co.ke/job/a', 'https://www.myjobmag.co.ke/job/b']
  const known = new Set(urls)
  const s1 = nextKnownPageStreak(0, urls, known, 2)
  assert.equal(s1.consecutiveKnownPages, 1)
  assert.equal(s1.shouldStop, false)
  const s2 = nextKnownPageStreak(1, urls, known, 2)
  assert.equal(s2.consecutiveKnownPages, 2)
  assert.equal(s2.shouldStop, true)
  const sReset = nextKnownPageStreak(
    1,
    urls,
    new Set(['https://www.myjobmag.co.ke/job/a']),
    2
  )
  assert.equal(sReset.consecutiveKnownPages, 0)
  assert.equal(sReset.shouldStop, false)
}

// Pagination helpers: main listing uses /page/N; date feeds use /N
{
  assert.deepEqual(listingPageUrls('https://www.myjobmag.co.ke', '/jobs', 3), [
    'https://www.myjobmag.co.ke/jobs',
    'https://www.myjobmag.co.ke/jobs/page/2',
    'https://www.myjobmag.co.ke/jobs/page/3',
  ])
  assert.deepEqual(dateFeedPageUrls('https://www.myjobmag.co.ke', '/jobs-by-date/today', 3), [
    'https://www.myjobmag.co.ke/jobs-by-date/today',
    'https://www.myjobmag.co.ke/jobs-by-date/today/2',
    'https://www.myjobmag.co.ke/jobs-by-date/today/3',
  ])
}

console.log('myjobmag-adapter.test.ts: ok')
