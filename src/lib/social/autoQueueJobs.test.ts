/**
 * Run: npx tsx src/lib/social/autoQueueJobs.test.ts
 */

import assert from 'node:assert/strict'
import { summarizeAutoQueue, type AutoQueueOutcome } from './autoQueueJobs'

const empty: AutoQueueOutcome['queued'] = { linkedin: [], facebook: [], instagram: [] }
const none: AutoQueueOutcome['selected'] = { linkedin: [], facebook: [], instagram: [] }

assert.match(
  summarizeAutoQueue({
    ok: true,
    dry_run: false,
    skipped: 'Buffer is not connected. Connect it in Social Publishing → Buffer Settings.',
    warnings: [],
    daily_cap: 3,
    queue_cap: 10,
    remaining: { linkedin: 0, facebook: 0, instagram: 0 },
    queued: empty,
    failed: [],
    selected: none,
  }),
  /skipped: Buffer is not connected/,
  'skipped Buffer connection is summarized'
)

{
  const text = summarizeAutoQueue({
    ok: true,
    dry_run: true,
    daily_cap: 3,
    queue_cap: 10,
    remaining: { linkedin: 3, facebook: 2, instagram: 1 },
    queued: empty,
    failed: [],
    warnings: [],
    selected: {
      linkedin: [{ id: '1', title: 'Engineer' }],
      facebook: [{ id: '2', title: 'Sales' }, { id: '3', title: 'Driver' }],
      instagram: [],
    },
  })
  assert.match(text, /queued\[linkedin=0 facebook=0 instagram=0\]/)
  assert.match(text, /selected\[linkedin=1 facebook=2 instagram=0\]/)
  assert.match(text, /remaining\[linkedin=3 facebook=2 instagram=1\]/)
  assert.match(text, /dry_run=true/)
  assert.match(text, /failed=0/)
}

console.log('autoQueueJobs.test.ts: all assertions passed')
