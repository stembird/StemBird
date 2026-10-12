/**
 * Run: npx tsx src/lib/domainVerification.test.ts
 */
import assert from 'node:assert/strict'
import { normalizeHostname } from './domainVerification'

assert.equal(normalizeHostname('https://www.EquityBank.co.ke/careers'), 'equitybank.co.ke')
assert.equal(normalizeHostname('SAFARICOM.CO.KE.'), 'safaricom.co.ke')
assert.equal(normalizeHostname('not a domain'), null)
assert.equal(normalizeHostname('localhost'), null)
assert.equal(normalizeHostname(''), null)
assert.equal(normalizeHostname(null), null)

console.log('domainVerification.test.ts: all assertions passed')
