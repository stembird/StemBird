import assert from 'node:assert/strict'
import {
  extractJobBoardApplyUrls,
  extractJobBoardEmails,
  isJobBoardSource,
  resolveJobBoardApplication,
  rewriteJobBoardDescriptionLinks,
  sanitizeScrapedJobHtmlForDisplay,
} from './jobBoardApply'

const descWithEmail = `
<p><b>How to Apply</b> Please submit your resume to info@divinecravingske.com
with the subject line "Application: Pastry Chef".</p>
`

const descWithCareer = `
<ul><li>Support the offshore team.</li></ul>
<div>👉 Apply now: https://strategicbureaux.com/career</div>
`

const descWithBoth = `
<p>Email hr@intexafrica.com or apply at https://intexafrica.com/careers/apply</p>
`

assert.deepEqual(extractJobBoardEmails(descWithEmail), ['info@divinecravingske.com'])
assert.equal(extractJobBoardEmails('anonymous@anonymous.com').length, 0)
assert.equal(
  extractJobBoardEmails('jobs@brightermonday.co.ke', ['brightermonday.co.ke']).length,
  0
)

assert.ok(
  extractJobBoardApplyUrls(descWithCareer).some(u => u.includes('strategicbureaux.com/career'))
)
assert.equal(
  extractJobBoardApplyUrls(
    '<a href="https://www.brightermonday.co.ke/listings/x">Apply</a>',
    ['brightermonday.co.ke']
  ).length,
  0
)

const emailOnly = resolveJobBoardApplication({
  boardJobUrl: 'https://www.brightermonday.co.ke/listings/pastry-chef-7j8x8x',
  descriptionHtml: descWithEmail,
  boardHosts: ['brightermonday.co.ke'],
})
assert.equal(emailOnly.apply_email, 'info@divinecravingske.com')
assert.equal(emailOnly.application_url, null)
assert.equal(emailOnly.apply_link, null)
assert.equal(emailOnly.used_board_fallback, false)

const career = resolveJobBoardApplication({
  boardJobUrl: 'https://www.brightermonday.co.ke/listings/x',
  descriptionHtml: descWithCareer,
  boardHosts: ['brightermonday.co.ke'],
})
assert.ok(career.application_url?.includes('strategicbureaux.com'))
assert.equal(career.apply_link, career.application_url)
assert.equal(career.used_board_fallback, false)

const both = resolveJobBoardApplication({
  boardJobUrl: 'https://www.brightermonday.co.ke/listings/x',
  descriptionHtml: descWithBoth,
  boardHosts: ['brightermonday.co.ke'],
})
assert.ok(both.application_url?.includes('intexafrica.com'))
assert.equal(both.apply_email, 'hr@intexafrica.com')

const linkout = resolveJobBoardApplication({
  boardJobUrl: 'https://www.brightermonday.co.ke/listings/x',
  descriptionHtml: '<p>No links here</p>',
  linkoutUrl: 'https://careers.example.com/jobs/123',
  boardHosts: ['brightermonday.co.ke'],
})
assert.equal(linkout.application_url, 'https://careers.example.com/jobs/123')

const fallback = resolveJobBoardApplication({
  boardJobUrl: 'https://www.brightermonday.co.ke/listings/x',
  descriptionHtml: '<p>Join our team.</p>',
  boardHosts: ['brightermonday.co.ke'],
})
assert.equal(fallback.application_url, 'https://www.brightermonday.co.ke/listings/x')
assert.equal(fallback.apply_link, null)
assert.equal(fallback.used_board_fallback, true)

assert.equal(isJobBoardSource({ type: 'brightermonday' }), true)
assert.equal(isJobBoardSource({ type: 'myjobmag' }), true)
assert.equal(isJobBoardSource({ type: 'fuzu' }), true)
assert.equal(isJobBoardSource({ type: 'workable', sourceKind: 'job_board' }), true)
assert.equal(isJobBoardSource({ type: 'workable' }), false)

// MyJobMag Method of Application: relative /apply-now/ + employer host in anchor text
const mjmMethod = `
<h2 id="application-method"><b>Method of Application</b></h2>
<div>Interested and qualified? Go to
  <a target="_blank" rel="nofollow" href="/apply-now/1284822">
    Public Service Commission Kenya (PSCK) on pscims.publicservice.go.ke
  </a> to apply
</div>
`
const mjmUrls = extractJobBoardApplyUrls(mjmMethod, ['myjobmag.co.ke'])
assert.ok(
  mjmUrls.some(u => /pscims\.publicservice\.go\.ke/i.test(u)),
  `expected PSCK host from anchor text, got ${JSON.stringify(mjmUrls)}`
)
const mjmResolved = resolveJobBoardApplication({
  boardJobUrl: 'https://www.myjobmag.co.ke/job/instructor-iii-clothing-technology-textile-2-posts-public-service-commission-kenya-psck',
  descriptionHtml: mjmMethod,
  boardHosts: ['myjobmag.co.ke'],
})
assert.equal(mjmResolved.used_board_fallback, false)
assert.ok(mjmResolved.application_url?.includes('pscims.publicservice.go.ke'))
assert.equal(mjmResolved.apply_link, mjmResolved.application_url)

// Explicit redirected linkout wins (full employer path)
const mjmLinkout = resolveJobBoardApplication({
  boardJobUrl: 'https://www.myjobmag.co.ke/job/x',
  descriptionHtml: mjmMethod,
  linkoutUrl:
    'https://pscims.publicservice.go.ke/jobs/AdvertDetailsExt.aspx?kpx=138/2026&kpage=ActiveAdverts.aspx&utm_source=MyJobMag',
  boardHosts: ['myjobmag.co.ke'],
})
assert.equal(
  mjmLinkout.application_url,
  'https://pscims.publicservice.go.ke/jobs/AdvertDetailsExt.aspx?kpx=138/2026&kpage=ActiveAdverts.aspx'
)
assert.equal(mjmLinkout.used_board_fallback, false)

// Employer email only → never fall back to MyJobMag listing
const emailOnlyMjm = resolveJobBoardApplication({
  boardJobUrl: 'https://www.myjobmag.co.ke/job/finance-officer',
  descriptionHtml:
    '<h2>Method of Application</h2><p>Send CV only to <strong>recruitment@careeroptionsafricagroup.com</strong></p>',
  boardHosts: ['myjobmag.co.ke'],
})
assert.equal(emailOnlyMjm.apply_email, 'recruitment@careeroptionsafricagroup.com')
assert.equal(emailOnlyMjm.application_url, null)
assert.equal(emailOnlyMjm.apply_link, null)
assert.equal(emailOnlyMjm.used_board_fallback, false)

// Google Form in posting → prefer form over board listing
const googleForm = resolveJobBoardApplication({
  boardJobUrl: 'https://www.myjobmag.co.ke/job/x',
  descriptionHtml:
    '<p>Apply via Google Form: https://forms.gle/abc123XYZ</p>',
  boardHosts: ['myjobmag.co.ke'],
})
assert.ok(googleForm.application_url?.includes('forms.gle'))
assert.equal(googleForm.used_board_fallback, false)

// Bare www. employer site without scheme
const bareWww = resolveJobBoardApplication({
  boardJobUrl: 'https://www.myjobmag.co.ke/job/x',
  descriptionHtml:
    '<p>Apply on the Council website www.nckenya.com before the deadline.</p>',
  boardHosts: ['myjobmag.co.ke'],
})
assert.ok(bareWww.application_url?.includes('nckenya.com'))
assert.equal(bareWww.used_board_fallback, false)

// Informational homepage + explicit apply-by-email → prefer email
const nckEmailOverSite = resolveJobBoardApplication({
  boardJobUrl: 'https://www.myjobmag.co.ke/job/corporate-communications-officer',
  descriptionHtml: `
    <h2 id="application-method">Method of Application</h2>
    <p>Detailed job descriptions can be accessed at <a href="http://www.nckenya.com">www.nckenya.com</a></p>
    <p>Apply through the Council email: <strong>careers@nckenya.go.ke</strong></p>
  `,
  boardHosts: ['myjobmag.co.ke'],
})
assert.equal(nckEmailOverSite.apply_email, 'careers@nckenya.go.ke')
assert.equal(nckEmailOverSite.application_url, null)
assert.equal(nckEmailOverSite.apply_link, null)
assert.equal(nckEmailOverSite.used_board_fallback, false)

// Weak host-only linkout + email → prefer email
const weakLinkoutEmail = resolveJobBoardApplication({
  boardJobUrl: 'https://www.myjobmag.co.ke/job/x',
  descriptionHtml: '<p>Send CV to hr@example.co.ke</p>',
  linkoutUrl: 'https://example.co.ke/',
  boardHosts: ['myjobmag.co.ke'],
})
assert.equal(weakLinkoutEmail.apply_email, 'hr@example.co.ke')
assert.equal(weakLinkoutEmail.application_url, null)

// Strong career/apply URL still wins over email
const strongUrlKeeps = resolveJobBoardApplication({
  boardJobUrl: 'https://www.myjobmag.co.ke/job/x',
  descriptionHtml: '<p>Email hr@intexafrica.com or apply at https://intexafrica.com/careers/apply</p>',
  boardHosts: ['myjobmag.co.ke'],
})
assert.ok(strongUrlKeeps.application_url?.includes('intexafrica.com'))
assert.equal(strongUrlKeeps.apply_email, 'hr@intexafrica.com')

// No employer email/link/form → board listing is last resort
const boardOnly = resolveJobBoardApplication({
  boardJobUrl: 'https://www.myjobmag.co.ke/job/php-backend-software-developer',
  descriptionHtml:
    '<h2>Method of Application</h2><div>Interested candidates should apply using the Apply Now button below.</div>',
  boardHosts: ['myjobmag.co.ke'],
})
assert.equal(
  boardOnly.application_url,
  'https://www.myjobmag.co.ke/job/php-backend-software-developer'
)
assert.equal(boardOnly.apply_link, null)
assert.equal(boardOnly.used_board_fallback, true)

// Relative /apply-now/ must not stay site-relative (404s on CareerSasa).
// Prefer the exact MyJobMag apply-now redirect target when known.
const kraCta = `
<div>Interested and qualified? Go to
  <a target="_blank" rel="nofollow" href="/apply-now/1284199">
    Kenya Revenue Authority (KRA) on erecruitment.kra.go.ke
  </a> to apply
</div>
<a href="/jobs-at/kenya-revenue-authority-kra">More KRA jobs</a>
`
const kraRewritten = rewriteJobBoardDescriptionLinks(kraCta, {
  applyNowDestinationUrl: 'https://erecruitment.kra.go.ke/login?utm_source=MyJobMag',
  boardOrigin: 'https://www.myjobmag.co.ke',
  boardHosts: ['myjobmag.co.ke'],
})
assert.ok(
  kraRewritten.includes('href="https://erecruitment.kra.go.ke/login"'),
  `expected exact apply-now redirect target, got: ${kraRewritten}`
)
assert.ok(!/href=["']\/apply-now\//i.test(kraRewritten), 'relative apply-now must be gone')
assert.ok(
  kraRewritten.includes(
    'href="https://www.myjobmag.co.ke/jobs-at/kenya-revenue-authority-kra"'
  ),
  'relative /jobs-at/ should be absolutized'
)
assert.ok(kraRewritten.includes('erecruitment.kra.go.ke'), 'anchor text preserved')

// Without redirect target, absolutize apply-now to MyJobMag (original employer route)
const absOnly = rewriteJobBoardDescriptionLinks(
  '<a href="/apply-now/99">Employer on careers.example.com</a>',
  {
    boardOrigin: 'https://www.myjobmag.co.ke',
    boardHosts: ['myjobmag.co.ke'],
  }
)
assert.equal(
  absOnly,
  '<a href="https://www.myjobmag.co.ke/apply-now/99">Employer on careers.example.com</a>'
)

// Display sanitizer must NOT inject apply_link — only absolutize relative apply-now
const qualsWithCta = `
<ul><li>Bachelor's degree</li></ul>
<div class="mag-b bm-b-30">
  Interested and qualified? Go to
  <a target="_blank" rel="nofollow" href="/apply-now/1284192">
    Kenya Revenue Authority (KRA) on erecruitment.kra.go.ke
  </a> to apply
</div>
`
const displaySafe = sanitizeScrapedJobHtmlForDisplay(qualsWithCta)
assert.ok(
  displaySafe.includes('href="https://www.myjobmag.co.ke/apply-now/1284192"'),
  `expected absolute MyJobMag apply-now, got: ${displaySafe}`
)
assert.ok(!/href=["']\/apply-now\//i.test(displaySafe))
assert.ok(!displaySafe.includes('erecruitment.kra.go.ke/login'))

const embeddedJobPosting = `
<p>As an Operations Agent you will handle hotel inquiries.</p>
<script type="application/ld+json">{"@context":"https://schema.org/","@type":"JobPosting","title":"Operation Agent"}</script>
`
const stripped = sanitizeScrapedJobHtmlForDisplay(embeddedJobPosting)
assert.ok(stripped.includes('Operations Agent'))
assert.ok(
  !/application\/ld\+json/i.test(stripped) && !/<script/i.test(stripped),
  'embedded source-board JSON-LD must not reach the page DOM'
)

console.log('jobBoardApply.test.ts: ok')
