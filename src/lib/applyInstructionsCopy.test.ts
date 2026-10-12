import assert from 'node:assert/strict'
import {
  buildHowToApplySentence,
  sanitizeAdditionalInfoApplyCopy,
} from './applyInstructionsCopy'

assert.ok(
  buildHowToApplySentence({ apply_email: 'hr@example.com' }).includes('hr@example.com')
)
assert.ok(
  buildHowToApplySentence({
    application_url: 'https://example.com/jobs/1',
  }).includes('application link')
)

const bad = `<p><strong>How to Apply:</strong> Application instructions were not provided in the job posting. Please refer to the original source or company website for details.</p><h3>Tips:</h3><p>1. Highlight experience.</p>`

const fixedEmail = sanitizeAdditionalInfoApplyCopy(bad, {
  apply_email: 'hr@intexafrica.com',
})
assert.ok(fixedEmail?.includes('hr@intexafrica.com'))
assert.ok(!/instructions were not provided/i.test(fixedEmail || ''))
assert.ok(fixedEmail?.includes('Tips'))

const fixedLink = sanitizeAdditionalInfoApplyCopy(bad, {
  application_url: 'https://job-boards.greenhouse.io/instiglio/jobs/1',
})
assert.ok(fixedLink?.includes('application link'))
assert.ok(!/instructions were not provided/i.test(fixedLink || ''))

const snippetBad = `<p><strong>How to Apply:</strong> Application instructions were not provided in the job posting snippet.</p>`
const fixedSnippet = sanitizeAdditionalInfoApplyCopy(snippetBad, {
  application_url: 'https://example.com/apply',
})
assert.ok(!/not provided/i.test(fixedSnippet || ''))

console.log('applyInstructionsCopy.test.ts: ok')
