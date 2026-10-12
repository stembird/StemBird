import assert from 'node:assert/strict'
import {
  aggregateQueueStats,
  emptyQueueStats,
  EXHAUSTED_SCRAPE_ATTEMPTS_MESSAGE,
  isScrapeAttemptsExhausted,
  MAX_SCRAPE_ATTEMPTS,
  nextStatusAfterFailedScrapeAttempt,
  reclaimStuckItemStatus,
  STALE_PROCESSING_MS,
  sumQueueStats,
} from './scrapeQueueStats'

assert.equal(
  STALE_PROCESSING_MS,
  5 * 60 * 1000,
  'reclaim must wait out a full Vercel process isolate, not steal live work at 2 min'
)

assert.equal(MAX_SCRAPE_ATTEMPTS, 3)
assert.equal(EXHAUSTED_SCRAPE_ATTEMPTS_MESSAGE, 'Failed after 3 publish attempts')

assert.equal(isScrapeAttemptsExhausted(0), false)
assert.equal(isScrapeAttemptsExhausted(2), false)
assert.equal(isScrapeAttemptsExhausted(3), true)
assert.equal(isScrapeAttemptsExhausted(4), true)
assert.equal(isScrapeAttemptsExhausted(null), false)

assert.deepEqual(nextStatusAfterFailedScrapeAttempt(0), {
  attempts: 1,
  status: 'pending',
})
assert.deepEqual(nextStatusAfterFailedScrapeAttempt(1), {
  attempts: 2,
  status: 'pending',
})
assert.deepEqual(nextStatusAfterFailedScrapeAttempt(2), {
  attempts: 3,
  status: 'failed',
})
assert.deepEqual(nextStatusAfterFailedScrapeAttempt(2, false), {
  attempts: 3,
  status: 'failed',
})
assert.deepEqual(
  nextStatusAfterFailedScrapeAttempt(0, true),
  { attempts: 1, status: 'failed' },
  'permanent failures fail on the first try'
)

assert.equal(reclaimStuckItemStatus(0), 'pending')
assert.equal(reclaimStuckItemStatus(2), 'pending')
assert.equal(reclaimStuckItemStatus(3), 'failed')
assert.equal(reclaimStuckItemStatus(null), 'pending')

const bySource = aggregateQueueStats([
  { source_id: 'a', status: 'pending' },
  { source_id: 'a', status: 'pending' },
  { source_id: 'a', status: 'done' },
  { source_id: 'b', status: 'failed' },
  { source_id: 'b', status: 'processing' },
  { source_id: 'c', status: 'unknown' },
])

assert.deepEqual(bySource.a, { pending: 2, processing: 0, done: 1, failed: 0 })
assert.deepEqual(bySource.b, { pending: 0, processing: 1, done: 0, failed: 1 })
assert.deepEqual(bySource.c, emptyQueueStats())

assert.deepEqual(sumQueueStats(bySource), {
  pending: 2,
  processing: 1,
  done: 1,
  failed: 1,
})

console.log('scrapeQueueStats.test.ts: all assertions passed')
