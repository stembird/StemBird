/**
 * Run: npx tsx src/lib/sanitizeStockTipsCopy.test.ts
 */
import assert from 'node:assert/strict'
import {
  hasStockTipBoilerplate,
  sanitizeStockTipsCopy,
} from './sanitizeStockTipsCopy'

const dirty = `<p><strong>How to Apply:</strong> Email hr@x.com</p>
<h3>How to Actually Win This Marketing Assistant Interview</h3>
<p>Marketing assistants get stacked CVs. Here's how to stand out from the crowd.</p>
<p><strong>1. Show campaigns:</strong> Talk numbers.</p>`

assert.equal(hasStockTipBoilerplate(dirty), true)

const clean = sanitizeStockTipsCopy(dirty, 'Marketing Assistant')
assert.ok(clean)
assert.equal(hasStockTipBoilerplate(clean), false)
assert.doesNotMatch(clean!, /How to Actually Win This/i)
assert.doesNotMatch(clean!, /stand out from the crowd/i)
assert.match(clean!, /Marketing Assistant/i)
assert.match(clean!, /<h3>/)

const alreadyClean = `<h3>Show Campaign Proof Before Soft Claims</h3><p>Hiring teams want metrics.</p>`
assert.equal(hasStockTipBoilerplate(alreadyClean), false)
assert.equal(sanitizeStockTipsCopy(alreadyClean), alreadyClean)

const winVariant = `<h3>How to Win This Finance Officer Interview</h3><p>Follow these tips to stand out.</p>`
const fixedWin = sanitizeStockTipsCopy(winVariant, 'Finance Officer')
assert.doesNotMatch(fixedWin || '', /How to Win This/i)
assert.doesNotMatch(fixedWin || '', /stand out/i)

console.log('sanitizeStockTipsCopy.test.ts: all assertions passed')
