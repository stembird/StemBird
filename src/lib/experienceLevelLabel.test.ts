import assert from 'node:assert/strict'
import {
  isExperienceLevelOnlyText,
  isMissingOrLabelOnlyQualifications,
} from './experienceLevelLabel'

assert.equal(isExperienceLevelOnlyText('Mid level'), true)
assert.equal(isExperienceLevelOnlyText('Senior level'), true)
assert.equal(isExperienceLevelOnlyText('Unspecified'), true)
assert.equal(isExperienceLevelOnlyText('Entry'), true)
assert.equal(isExperienceLevelOnlyText('<p>Mid level</p>'), true)
assert.equal(isExperienceLevelOnlyText('Bachelor’s degree in Statistics'), false)
assert.equal(isExperienceLevelOnlyText(''), false)
assert.equal(isMissingOrLabelOnlyQualifications(''), true)
assert.equal(isMissingOrLabelOnlyQualifications('Mid level'), true)
assert.equal(
  isMissingOrLabelOnlyQualifications('<ul><li>Degree required</li></ul>'),
  false
)

console.log('experienceLevelLabel.test.ts: ok')
