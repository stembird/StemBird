/**
 * Run: npx tsx src/lib/social/socialPostCopy.test.ts
 */
import assert from 'node:assert/strict'
import {
  dropLookingForLeadSentences,
  factLedOpening,
  hasLookingForOpening,
  rewriteLookingForOpening,
  summary,
  systemPromptFor,
  templateFor,
  type JobForCopy,
} from './socialPostCopy'

const job: JobForCopy = {
  id: 'job-sales-1',
  title: 'Sales Executive',
  company: 'Acme Ltd',
  location: 'Nairobi',
  description:
    'We are looking for a talented Sales Executive to join our growing team in Nairobi. You will own a territory and hit monthly targets.',
  job_slug: 'sales-executive-nairobi',
}

assert.equal(
  dropLookingForLeadSentences(
    'We are looking for a talented Sales Executive to join our growing team in Nairobi. You will own a territory and hit monthly targets.'
  ),
  'You will own a territory and hit monthly targets.'
)

assert.equal(
  dropLookingForLeadSentences('Looking to hire a driver. The route covers Nakuru.'),
  'The route covers Nakuru.'
)

assert.equal(
  dropLookingForLeadSentences('Join a busy clinic in Kisumu. Night shifts rotate.'),
  'Join a busy clinic in Kisumu. Night shifts rotate.',
  'leaves copy that is not a looking-for hook'
)

assert.equal(
  summary(job),
  'You will own a territory and hit monthly targets.',
  'Facebook-bound summary skips the looking-for lead sentence'
)

assert.equal(hasLookingForOpening('Looking for a new opportunity?'), true)
assert.equal(hasLookingForOpening('Looking to grow your career?'), true)
assert.equal(hasLookingForOpening('Are you looking for a Sales Executive?'), true)
assert.equal(hasLookingForOpening("We're looking for a Teller in Nairobi."), true)
assert.equal(hasLookingForOpening('🚀 Looking for your next role?'), true)
assert.equal(hasLookingForOpening("🚀 We're hiring at Acme Ltd!"), false)
assert.equal(hasLookingForOpening('Looking forward to your application.'), false)

{
  const rewritten = rewriteLookingForOpening(
    'Looking for a new opportunity?\n\nAcme Ltd is hiring a Sales Executive in Nairobi.\n\nApply: https://www.careersasa.co.ke/jobs/sales-executive-nairobi',
    job
  )
  assert.equal(hasLookingForOpening(rewritten), false)
  assert.match(rewritten, /Acme Ltd is hiring a Sales Executive/)
  assert.doesNotMatch(rewritten, /^looking (?:for|to)/i)
}

{
  const rewritten = rewriteLookingForOpening('Looking to grow your career in Nairobi?', job)
  assert.equal(hasLookingForOpening(rewritten), false)
  assert.equal(rewritten, factLedOpening(job))
  assert.doesNotMatch(factLedOpening(job), /looking (?:for|to)/i)
}

{
  const rewritten = rewriteLookingForOpening(
    "🚀 Are you looking for a Sales Executive role?\n\nKey requirements:\n- 2 years experience\n\nApply now 👉 https://www.careersasa.co.ke/jobs/sales-executive-nairobi",
    job
  )
  assert.equal(hasLookingForOpening(rewritten), false)
  assert.match(rewritten, /Sales Executive/)
  assert.match(rewritten, /2 years experience/)
}

{
  const rewritten = rewriteLookingForOpening(
    "Looking for a change?\nLooking to join a growing team?\n\nAcme Ltd is hiring a Sales Executive in Nairobi.",
    job
  )
  assert.equal(hasLookingForOpening(rewritten), false)
  assert.match(rewritten, /^Acme Ltd is hiring/)
}

{
  const kept = rewriteLookingForOpening(
    "🚀 We're hiring at Acme Ltd!\n\nSales Executive — Nairobi\n\nYou will own a territory and hit monthly targets.",
    job
  )
  assert.match(kept, /We're hiring at Acme Ltd/)
  assert.equal(hasLookingForOpening(kept), false)
}

{
  const facebook = templateFor(job, 'facebook')
  assert.equal(hasLookingForOpening(facebook), false)
  assert.doesNotMatch(facebook, /We are looking for a talented Sales Executive/)
  assert.match(facebook, /You will own a territory and hit monthly targets/)
  assert.match(facebook, /Sales Executive/)
}

{
  const prompt = systemPromptFor('facebook')
  assert.match(prompt, /Never open with "Looking for/i)
  assert.match(prompt, /Never start the post with "Looking for"/)
  assert.match(prompt, /Vary the first line/)
}

console.log('socialPostCopy.test.ts: all assertions passed')
