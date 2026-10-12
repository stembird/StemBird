/**
 * Run: npx tsx src/lib/jobParseNormalization.test.ts
 */
import assert from 'node:assert/strict'
import { buildJobParseSystemPrompt } from './jobParseNormalization'

const prompt = buildJobParseSystemPrompt(
  ['Financial Services'],
  ['Accounting & Finance']
)

assert.match(prompt, /exactly 8 numbered tips/i)
assert.match(prompt, /3 to 5 full explanation sentences/i)
assert.match(prompt, /enticing <h3>/i)
assert.match(prompt, /hook/i)
assert.match(prompt, /robotic AI patterns/i)
assert.match(prompt, /How to Apply/i)
assert.match(prompt, /fill-in-the-blank heading/i)
assert.match(prompt, /standing out from the crowd/i)
assert.match(prompt, /EXCEPT additional_info/i)
assert.match(prompt, /additional_info MAY also use <h3>/i)
assert.match(prompt, /FIRST key in the JSON object/i)
assert.doesNotMatch(prompt, /4 brief tips/)
assert.doesNotMatch(prompt, /Prefer a sharp, human hook such as "How to Actually Win/)
assert.doesNotMatch(prompt, /FORBIDDEN heading patterns/)
assert.doesNotMatch(prompt, /<p>, <ul>, <li>, <strong> only\)/)

console.log('jobParseNormalization.test.ts: all assertions passed')
