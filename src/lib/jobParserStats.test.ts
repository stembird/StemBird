import assert from 'node:assert/strict'
import { parserJobTitle } from './jobParserStats'

assert.equal(
  parserJobTitle('ignored', { title: '  Finance Officer  ' }, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  'Finance Officer'
)
assert.equal(
  parserJobTitle('Sales Lead\nNairobi', null, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  'Sales Lead'
)
assert.equal(
  parserJobTitle('', null, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
  'Job aaaaaaaa'
)

console.log('jobParserStats.test.ts: all assertions passed')
