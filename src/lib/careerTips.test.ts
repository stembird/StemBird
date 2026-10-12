/**
 * Run: npx tsx src/lib/careerTips.test.ts
 */
import assert from 'node:assert/strict'
import {
  appendCareerTips,
  ensureCareerTipsHtml,
  extractCareerTipsFromModelText,
  hasGeneratedCareerTips,
  normalizeCareerTipsHtml,
  requireCareerTipsHtml,
  stripHowToApplyBlock,
} from './careerTips'

const applyOnly = `<p><strong>How to Apply:</strong> Visit the application link provided on this page.</p>`
assert.equal(hasGeneratedCareerTips(applyOnly), false)
assert.equal(hasGeneratedCareerTips(null), false)
assert.equal(hasGeneratedCareerTips(''), false)
assert.equal(hasGeneratedCareerTips('<h3>Benefits</h3><p>Medical cover</p>'), false)

const numberedApplySteps = `<p><strong>How to Apply:</strong></p>
<p><strong>1. Download the form</strong> from the careers page.</p>
<p><strong>2. Attach your CV</strong> and certificates.</p>
<p><strong>3. Email hr@agency.go.ke</strong> before the deadline.</p>
<p><strong>4. Quote the advert number</strong> in the subject line.</p>`
assert.equal(
  hasGeneratedCareerTips(numberedApplySteps),
  false,
  'numbered How to Apply steps are not career tips'
)

const benefitsThenApply = `<h3>Benefits</h3>
<p>Medical cover and leave.</p>
<p><strong>1. Send CV</strong></p>
<p><strong>2. Include PIN</strong></p>
<p><strong>3. Include ID</strong></p>
<p><strong>4. Wait for shortlist</strong></p>`
assert.equal(
  hasGeneratedCareerTips(benefitsThenApply),
  false,
  'stock Benefits heading plus numbered apply steps are not career tips'
)

const fullTips = `<p><strong>How to Apply:</strong> Send your CV to hr@acme.com.</p>
<h3>Show ISO Discipline On Paper Before You Walk Into QA</h3>
<p>Hiring teams for this post want proof you can catch defects.</p>
<p><strong>1. Name the standard:</strong> Put ISO 9001 on the CV with a batch you actually audited.</p>
<p><strong>2. Bring a finding:</strong> Prepare one non-conformance story with the corrective action.</p>
<p><strong>3. Tools on paper:</strong> List the QMS software you used, not "attention to detail".</p>
<p><strong>4. First 90 days:</strong> Map the first three inspections you would run on this line.</p>`
assert.equal(hasGeneratedCareerTips(fullTips), true)

const headingPlusTwo = `<h3>What Credit Analysts Get Probed On</h3>
<p><strong>1. Spreadsheet proof:</strong> Walk through a facility you modelled.</p>
<p><strong>2. Sector notes:</strong> Know this bank's SME book.</p>`
assert.equal(hasGeneratedCareerTips(headingPlusTwo), true)

const numberedNoHeading = `<p><strong>1. Name the standard:</strong> Put ISO 9001 on the CV with a batch you audited.</p>
<p><strong>2. Bring a finding:</strong> Prepare one non-conformance story.</p>`
const coerced = normalizeCareerTipsHtml(numberedNoHeading, 'QA Analyst')
assert.ok(coerced && hasGeneratedCareerTips(coerced), 'numbered tips without h3 still count after wrap')
assert.ok(coerced && /QA Analyst/i.test(coerced))

assert.ok(stripHowToApplyBlock(fullTips).startsWith('<h3>'))
assert.ok(!/How to Apply/i.test(stripHowToApplyBlock(fullTips)))

const appended = appendCareerTips(applyOnly, headingPlusTwo)
assert.ok(appended.includes('How to Apply'))
assert.ok(appended.includes('What Credit Analysts Get Probed On'))
assert.equal(appendCareerTips(fullTips, headingPlusTwo), fullTips)
assert.equal(appendCareerTips('', ''), '')
assert.equal(appendCareerTips(null, headingPlusTwo), headingPlusTwo)

const alreadyTips = await ensureCareerTipsHtml(fullTips, { title: 'Analyst', company: 'KCB' })
assert.ok(hasGeneratedCareerTips(alreadyTips))

try {
  await requireCareerTipsHtml(applyOnly, { title: 'Analyst', company: 'KCB' })
  assert.fail('requireCareerTipsHtml must not publish How to Apply only')
} catch (err) {
  assert.match(String(err), /Career tips generation failed/)
}

const fromJson = extractCareerTipsFromModelText(
  JSON.stringify({ career_tips: headingPlusTwo })
)
assert.equal(fromJson, headingPlusTwo)

const fromBrokenJson = extractCareerTipsFromModelText(
  `{"career_tips":"<h3>What Credit Analysts Get Probed On</h3><p>He said "spread the facility".</p><p><strong>1. Spreadsheet proof:</strong> Walk through a facility you modelled.</p><p><strong>2. Sector notes:</strong> Know this bank's SME book.</p>"}`
)
assert.ok(fromBrokenJson && hasGeneratedCareerTips(fromBrokenJson))

console.log('careerTips.test.ts: all assertions passed')
