/**
 * Run: npx tsx src/lib/scraperDatePosted.test.ts
 */
import assert from 'node:assert/strict'
import { coerceDatePosted, datePostedForInsert } from './scraper'

assert.equal(coerceDatePosted(null), null)
assert.equal(coerceDatePosted(''), null)
assert.equal(coerceDatePosted('   '), null)
assert.equal(
  coerceDatePosted('2026-07-22T10:45:32+01:00'),
  new Date('2026-07-22T10:45:32+01:00').toISOString()
)
assert.equal(coerceDatePosted('2026-07-16'), '2026-07-16T00:00:00.000Z')

const publishedAt = new Date('2026-09-11T02:00:00.000Z')
assert.equal(
  datePostedForInsert('2026-08-20T00:00:00.000Z', publishedAt),
  '2026-08-20T00:00:00.000Z',
  'keeps the board date when present'
)
assert.equal(
  datePostedForInsert(null, publishedAt),
  '2026-09-11T02:00:00.000Z',
  'uses publish time when the board date is missing'
)
assert.equal(
  datePostedForInsert('', publishedAt),
  '2026-09-11T02:00:00.000Z',
  'uses publish time for empty board date'
)

// Spreading a normalized adapter payload that includes date_posted: null
// used to write NULL and skip the DB default. The insert helper must win.
const normalized = { title: 'Lead', date_posted: null as string | null }
const payload = {
  ...normalized,
  date_posted: datePostedForInsert(normalized.date_posted, publishedAt),
}
assert.equal(payload.date_posted, '2026-09-11T02:00:00.000Z')
assert.notEqual(payload.date_posted, null)

console.log('scraperDatePosted.test.ts: all assertions passed')
