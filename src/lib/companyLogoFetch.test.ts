import assert from 'node:assert/strict'
import { sanitizeLogoCandidateUrl } from './companyLogoFetch'

const wordpress = sanitizeLogoCandidateUrl(
  'https://i0.wp.com/amref.org/wp-content/uploads/2017/09/cropped-favicon.png?fit=180%2C180&#038;ssl=1'
)
assert.equal(
  wordpress,
  'https://i0.wp.com/amref.org/wp-content/uploads/2017/09/cropped-favicon.png?fit=180%2C180&ssl=1'
)

const trailing = sanitizeLogoCandidateUrl(
  'https://example.com/logo.svg&#',
  'example.com'
)
assert.equal(trailing, 'https://example.com/logo.svg')

const relative = sanitizeLogoCandidateUrl('/apple-touch-icon.png', 'equitybank.co.ke')
assert.equal(relative, 'https://equitybank.co.ke/apple-touch-icon.png')

const protocolRelative = sanitizeLogoCandidateUrl('//cdn.example.com/a.png')
assert.equal(protocolRelative, 'https://cdn.example.com/a.png')

assert.equal(sanitizeLogoCandidateUrl(''), null)
assert.equal(sanitizeLogoCandidateUrl('not a url'), null)

console.log('companyLogoFetch.test.ts: all assertions passed')
