import assert from 'node:assert/strict'
import {
  extractGreenhouseJobId,
  extractGreenhouseSlug,
  normalizeGreenhouseJob,
} from './greenhouse-adapter'

assert.equal(
  extractGreenhouseSlug('https://boards.greenhouse.io/oneacrefund/jobs/12345'),
  'oneacrefund'
)
assert.equal(
  extractGreenhouseJobId('https://boards.greenhouse.io/oneacrefund/jobs/12345'),
  '12345'
)
assert.equal(
  extractGreenhouseJobId('https://oneacrefund.org/vacancies/?gh_jid=8066822'),
  '8066822'
)
assert.equal(
  extractGreenhouseSlug('https://oneacrefund.org/vacancies/?gh_jid=8066822'),
  null
)

const normalized = normalizeGreenhouseJob(
  {
    id: 1,
    title: 'Program Associate',
    absolute_url: 'https://boards.greenhouse.io/acumen/jobs/1',
    location: { name: 'Nairobi, Kenya' },
    content: '<p>Build programs across East Africa.</p>',
    departments: [{ name: 'Programs' }],
  },
  'Acumen'
)

assert.equal(normalized.title, 'Program Associate')
assert.equal(normalized.company, 'Acumen')
assert.ok(normalized.location.includes('Kenya'))
assert.ok(normalized.application_url.includes('greenhouse'))

console.log('greenhouse-adapter.test.ts: ok')
