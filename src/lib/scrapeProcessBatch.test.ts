/**
 * Run: npx tsx src/lib/scrapeProcessBatch.test.ts
 */
import assert from 'node:assert/strict'
import {
  PROCESS_QUEUE_BATCH,
  resolveProcessQueueBatch,
} from './scrapeProcessBatch'

assert.equal(PROCESS_QUEUE_BATCH, 10)
assert.equal(resolveProcessQueueBatch(6), 10, 'stale dashboard max:6 still processes 10')
assert.equal(resolveProcessQueueBatch(10), 10)
assert.equal(resolveProcessQueueBatch(15), 15)
assert.equal(resolveProcessQueueBatch(99), 15)
assert.equal(resolveProcessQueueBatch(undefined), 10)
assert.equal(resolveProcessQueueBatch('10'), 10)

console.log('scrapeProcessBatch.test.ts: all assertions passed')
