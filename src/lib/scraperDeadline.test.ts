import assert from 'node:assert/strict'
import {
  isDeadlineExpired,
  isGenericApplicationUrl,
  normalizeJobUrl,
  parseDeadlineDate,
  extractApplicationDeadline,
  resolveScrapedDeadline,
  expiresAtFromValidThrough,
} from './scraperDeadline'

assert.equal(parseDeadlineDate('2026-08-01'), '2026-08-01')
assert.equal(parseDeadlineDate('2026-08-01T12:00:00Z'), '2026-08-01')
assert.equal(parseDeadlineDate('27th July 2026'), '2026-07-27')
assert.equal(parseDeadlineDate('31st July 2026'), '2026-07-31')
assert.equal(parseDeadlineDate('July 27, 2026'), '2026-07-27')
assert.equal(parseDeadlineDate('27/07/2026'), '2026-07-27')
assert.equal(parseDeadlineDate(null), null)
assert.equal(parseDeadlineDate('not-a-date'), null)

assert.equal(
  extractApplicationDeadline('<p>Deadline: 27th July 2026</p>'),
  '2026-07-27'
)
assert.equal(
  extractApplicationDeadline(
    '<p>Application Deadline: 31st July 2026 Com Twenty One Limited is an equal opportu'
  ),
  '2026-07-31'
)
assert.equal(extractApplicationDeadline('<p>No dates here</p>'), null)

const now = new Date('2026-07-18T12:00:00Z')
assert.equal(isDeadlineExpired('2026-07-17', now), true)
assert.equal(isDeadlineExpired('2026-07-18', now), false)
assert.equal(isDeadlineExpired('2026-07-19', now), false)
assert.equal(isDeadlineExpired(null, now), false)

const missing = resolveScrapedDeadline(null, now)
assert.equal(missing.action, 'use')
if (missing.action === 'use') {
  assert.equal(missing.source, 'default')
  assert.equal(missing.validThrough, '2026-08-17')
}

const future = resolveScrapedDeadline('2026-09-01', now)
assert.equal(future.action, 'use')
if (future.action === 'use') {
  assert.equal(future.source, 'explicit')
  assert.equal(future.validThrough, '2026-09-01')
}

const expired = resolveScrapedDeadline('2025-03-25', now)
assert.equal(expired.action, 'skip_expired')
if (expired.action === 'skip_expired') {
  assert.equal(expired.validThrough, '2025-03-25')
}

// Workable "published" timestamps must not be treated as deadlines when nullish path used
const fromPublishedBug = resolveScrapedDeadline('2025-05-08T10:00:00.000Z', now)
assert.equal(fromPublishedBug.action, 'skip_expired')

assert.equal(expiresAtFromValidThrough('2026-08-17'), '2026-08-17T23:59:59.999Z')

assert.equal(
  normalizeJobUrl('https://Apply.Workable.com/tatucity/j/ABC123/?utm_source=x'),
  'https://apply.workable.com/tatucity/j/ABC123'
)
assert.equal(
  normalizeJobUrl('https://apply.workable.com/tatucity/j/ABC123/'),
  'https://apply.workable.com/tatucity/j/ABC123'
)

// PSC multi-role listings must stay unique (hash or query param)
assert.equal(
  normalizeJobUrl('https://www.psckjobs.go.ke/ActiveJobsAdverts.aspx#advert-158-2025'),
  'https://www.psckjobs.go.ke/ActiveJobsAdverts.aspx#advert-158-2025'
)
assert.equal(
  normalizeJobUrl(
    'https://www.psckjobs.go.ke/ActiveJobsAdverts.aspx?psc_advert=158-2025&utm_source=x'
  ),
  'https://www.psckjobs.go.ke/ActiveJobsAdverts.aspx?psc_advert=158-2025'
)
assert.notEqual(
  normalizeJobUrl('https://www.psckjobs.go.ke/ActiveJobsAdverts.aspx?psc_advert=158-2025'),
  normalizeJobUrl('https://www.psckjobs.go.ke/ActiveJobsAdverts.aspx?psc_advert=159-2025')
)

assert.equal(isGenericApplicationUrl('https://www.psckjobs.go.ke/'), true)
assert.equal(isGenericApplicationUrl('https://www.psckjobs.go.ke'), true)
assert.equal(isGenericApplicationUrl('https://www.psckjobs.go.ke/loginPage.aspx'), true)
assert.equal(
  isGenericApplicationUrl('https://www.psckjobs.go.ke/AdvertDetailsExt.aspx?kpx=158/2025'),
  false
)
assert.equal(
  isGenericApplicationUrl('https://apply.workable.com/tatucity/j/ABC123'),
  false
)
assert.equal(isGenericApplicationUrl(null), true)

// TSC adverts index is shared across many distinct teacher roles
assert.equal(
  isGenericApplicationUrl('https://services.tsc.go.ke/adverts/index?page=1'),
  true
)
assert.equal(isGenericApplicationUrl('https://services.tsc.go.ke/adverts'), true)
assert.equal(isGenericApplicationUrl('https://erecruitment.kra.go.ke/login'), true)
assert.equal(
  isGenericApplicationUrl('https://erecruitment-new.azurewebsites.net/portal'),
  true
)

console.log('scraperDeadline.test.ts: all assertions passed')
