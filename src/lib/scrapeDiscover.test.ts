import assert from 'node:assert/strict'
import {
  summarizeDiscoverResults,
  shouldAbortAfterConsecutiveFailures,
  scrapeQueueRowIsKnownToDiscover,
  DiscoverSourceResult,
} from './scrapeDiscover'

function result(
  partial: Partial<DiscoverSourceResult> & { source_id: string }
): DiscoverSourceResult {
  return {
    found: 0,
    queued: 0,
    already_known: 0,
    error: null,
    ...partial,
  }
}

// Empty run is success
{
  const summary = summarizeDiscoverResults([])
  assert.equal(summary.success, true)
  assert.equal(summary.sources_processed, 0)
  assert.equal(summary.error_summary, null)
}

// All sources failed → success false
{
  const summary = summarizeDiscoverResults([
    result({ source_id: 'a', error: 'timeout' }),
    result({ source_id: 'b', error: 'HTTP 503' }),
  ])
  assert.equal(summary.success, false)
  assert.equal(summary.sources_failed, 2)
  assert.equal(summary.sources_ok, 0)
  assert.match(summary.error_summary || '', /a: timeout/)
  assert.match(summary.error_summary || '', /b: HTTP 503/)
}

// Failures with zero yield (no stopped_early) → success false
{
  const summary = summarizeDiscoverResults([
    result({ source_id: 'ok-empty', found: 0, error: null }),
    result({ source_id: 'bad', error: 'ECONNRESET' }),
  ])
  assert.equal(summary.success, false)
  assert.equal(summary.sources_failed, 1)
  assert.equal(summary.total_found, 0)
}

// Partial success with some jobs found → success true
{
  const summary = summarizeDiscoverResults([
    result({ source_id: 'ok', found: 10, queued: 3, already_known: 7 }),
    result({ source_id: 'bad', error: 'timeout' }),
  ])
  assert.equal(summary.success, true)
  assert.equal(summary.sources_ok, 1)
  assert.equal(summary.sources_failed, 1)
  assert.equal(summary.total_queued, 3)
  assert.equal(summary.total_found, 10)
  assert.ok(summary.error_summary)
}

// All known (no new queue) with no errors → success true
{
  const summary = summarizeDiscoverResults([
    result({ source_id: 'ok', found: 5, queued: 0, already_known: 5 }),
  ])
  assert.equal(summary.success, true)
  assert.equal(summary.sources_failed, 0)
}

// Fail-fast consecutive helper
assert.equal(shouldAbortAfterConsecutiveFailures(5, 5, 0), true)
assert.equal(shouldAbortAfterConsecutiveFailures(4, 5, 0), false)
assert.equal(shouldAbortAfterConsecutiveFailures(5, 5, 2), false) // already queued something
assert.equal(shouldAbortAfterConsecutiveFailures(10, 0, 0), false) // disabled

// Error summary truncates after 3
{
  const summary = summarizeDiscoverResults([
    result({ source_id: 'a', error: '1' }),
    result({ source_id: 'b', error: '2' }),
    result({ source_id: 'c', error: '3' }),
    result({ source_id: 'd', error: '4' }),
  ])
  assert.match(summary.error_summary || '', /\+1 more/)
}

assert.equal(
  scrapeQueueRowIsKnownToDiscover('failed'),
  true,
  'failed jobs stay failed — Discover must not reset attempts and retry'
)
assert.equal(scrapeQueueRowIsKnownToDiscover('pending'), true)
assert.equal(scrapeQueueRowIsKnownToDiscover('processing'), true)
assert.equal(scrapeQueueRowIsKnownToDiscover('done'), true)

console.log('scrapeDiscover.test.ts: all assertions passed')
