import assert from 'node:assert/strict'
import {
  buildPscJobUrl,
  extractPscAdvertNumber,
  PSC_ADVERT_PARAM,
} from './psc-adapter'
import { normalizeJobUrl } from './scraperDeadline'

const base = 'https://www.psckjobs.go.ke/ActiveJobsAdverts.aspx'

const urlA = buildPscJobUrl(base, '158/2025')
const urlB = buildPscJobUrl(base, '159/2025')

assert.match(urlA, new RegExp(`[?&]${PSC_ADVERT_PARAM}=158-2025`))
assert.equal(extractPscAdvertNumber(urlA), '158/2025')
assert.equal(extractPscAdvertNumber(urlB), '159/2025')

// Legacy hash URLs still parse
assert.equal(
  extractPscAdvertNumber(`${base}#advert-158-2025`),
  '158/2025'
)

// Distinct adverts must not collapse after normalize (the discover bug)
assert.notEqual(normalizeJobUrl(urlA), normalizeJobUrl(urlB))
assert.equal(normalizeJobUrl(urlA), urlA)

console.log('psc-adapter.test.ts: all assertions passed')
