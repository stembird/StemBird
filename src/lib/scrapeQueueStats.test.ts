import assert from 'node:assert/strict'
import {
  aggregateQueueStats,
  emptyQueueStats,
  EXHAUSTED_SCRAPE_ATTEMPTS_MESSAGE,
  isNonStemSkipMessage,
  isOtherDoneMessage,
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

// Done-row bucket classifiers (published vs non-STEM vs dup/expired).
assert.equal(isNonStemSkipMessage('Skipped: outside STEM focus'), true)
assert.equal(isNonStemSkipMessage('Skipped: pre-check outside STEM (HTML board, fully read)'), true)
assert.equal(isNonStemSkipMessage(null), false)
assert.equal(isOtherDoneMessage('Duplicate job skipped'), true)
assert.equal(isOtherDoneMessage('Skipped: job expired on 2026-10-01T00:00:00Z'), true)
assert.equal(isOtherDoneMessage('Reclaimed from stuck processing'), true)
assert.equal(isOtherDoneMessage('Skipped: posted older than 60 days (2026-05-01)'), true)
assert.equal(isOtherDoneMessage('Skipped: source role closed'), true)
assert.equal(isOtherDoneMessage(null), false)
assert.equal(isOtherDoneMessage('Skipped: outside STEM focus'), false)

const bySource = aggregateQueueStats([
  { source_id: 'a', status: 'pending' },
  { source_id: 'a', status: 'pending' },
  { source_id: 'a', status: 'done' },
  { source_id: 'a', status: 'done', error_message: 'Skipped: outside STEM focus' },
  { source_id: 'a', status: 'done', error_message: 'Duplicate job skipped' },
  { source_id: 'b', status: 'failed' },
  { source_id: 'b', status: 'processing' },
  { source_id: 'c', status: 'unknown' },
])

assert.deepEqual(bySource.a, {
  pending: 2,
  processing: 0,
  done: 3,
  failed: 0,
  skipped_non_stem: 1,
  other_done: 1,
})
assert.deepEqual(bySource.b, {
  pending: 0,
  processing: 1,
  done: 0,
  failed: 1,
  skipped_non_stem: 0,
  other_done: 0,
})
assert.deepEqual(bySource.c, emptyQueueStats())

assert.deepEqual(sumQueueStats(bySource), {
  pending: 2,
  processing: 1,
  done: 3,
  failed: 1,
  skipped_non_stem: 1,
  other_done: 1,
})

console.log('scrapeQueueStats.test.ts: all assertions passed')
