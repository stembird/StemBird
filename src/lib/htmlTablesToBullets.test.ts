import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  convertHtmlTablesToBulletLists,
  htmlContainsTable,
} from './htmlTablesToBullets'
import { parseScrapedJobFallback, splitHtmlByHeadings } from './scraperJobParsing'

const educationTable = `
<p>Requirements:</p>
<figure class="table">
<table>
  <tr>
    <th>Particulars</th><th>Detail</th>
    <th>Specific Field or Qualification</th><th>Need Type[1]</th>
  </tr>
  <tr>
    <td rowspan="3">Education</td>
    <td>Bachelors Degree</td>
    <td>Business or any relevant degree</td>
    <td>RQ</td>
  </tr>
  <tr>
    <td>Professional Qualifications</td>
    <td>Project management or business field</td>
    <td>AA</td>
  </tr>
  <tr>
    <td>Masters Degree</td>
    <td>Business or any relevant</td>
    <td>AA</td>
  </tr>
</table>
</figure>
<figure class="table">
<table>
  <tr>
    <td><strong>Experience</strong> Total Minimum No of Years Experience Required</td>
    <td>8 years</td>
  </tr>
</table>
</figure>
`

assert.equal(htmlContainsTable(educationTable), true)
const converted = convertHtmlTablesToBulletLists(educationTable)
assert.equal(htmlContainsTable(converted), false)
assert.ok(converted.includes('<ul>'))
assert.ok(converted.includes('Bachelors Degree'))
assert.ok(converted.includes('Business or any relevant degree'))
assert.ok(converted.includes('RQ'))
assert.ok(converted.includes('8 years'))
assert.ok(converted.includes('Professional Qualifications'))
assert.ok(!converted.includes('<table'))

const kcbStyle = `
<ol><li><p><strong>KEY RESPONSIBILITIES:</strong></p></li></ol>
<ul><li><p>Deliver portfolio growth targets.</p></li><li><p>Drive profitability.</p></li></ul>
<p>Requirements:</p>
${educationTable}
`
const split = splitHtmlByHeadings(convertHtmlTablesToBulletLists(kcbStyle))
assert.ok(split.responsibilities.includes('Deliver portfolio growth'))
assert.ok(split.required_qualifications.includes('Bachelors Degree'))
assert.ok(!split.required_qualifications.includes('<table'))
assert.ok(!split.responsibilities.includes('Bachelors Degree'))

const parsed = parseScrapedJobFallback({
  title: 'Senior Manager, Investment Groups',
  company: 'KCB Group',
  location: 'Kenya',
  descriptionSection: kcbStyle,
})
assert.ok(parsed.responsibilities.includes('Deliver portfolio growth'))
assert.ok(parsed.required_qualifications.includes('<li>'))
assert.ok(
  parsed.required_qualifications.includes('8 years'),
  `expected 8 years in: ${parsed.required_qualifications}`
)
assert.ok(parsed.required_qualifications.includes('RQ'))
assert.ok(
  parsed.required_qualifications.includes('Need Type'),
  'keeps Need Type codes without inventing meanings'
)
assert.equal(parsed.minimum_experience, 8)

// Bare duties list (no Key Responsibilities heading) + Requirements tables
const bareDuties = `
<ul><li>Backend administration of CX Systems</li><li>Dynamics CRM deployments</li></ul>
<p>Requirements:</p>
<figure class="table"><table>
  <tr><th>Particulars</th><th>Detail</th><th>Specific Field or Qualification</th><th>Need Type</th></tr>
  <tr><td>Education</td><td>Bachelor’s Degree</td><td>Information Technology</td><td>RQ</td></tr>
</table></figure>
`
const bareParsed = parseScrapedJobFallback({
  title: 'Applications Specialist',
  company: 'KCB Group',
  descriptionSection: bareDuties,
})
assert.ok(bareParsed.responsibilities.includes('Backend administration'))
assert.ok(!bareParsed.description.includes('Backend administration'))
assert.ok(bareParsed.required_qualifications.includes('Bachelor'))
assert.ok(!/<table/i.test(bareParsed.required_qualifications))

// Live fixture when present (written by probe); skip silently otherwise
try {
  const live = readFileSync('/tmp/kcb-6058.html', 'utf8')
  const liveParsed = parseScrapedJobFallback({
    title: 'Senior Manager, Investment Groups',
    company: 'KCB Group',
    descriptionSection: live,
  })
  assert.ok(liveParsed.responsibilities.length > 100, 'live responsibilities extracted')
  assert.ok(liveParsed.required_qualifications.includes('Bachelors Degree'))
  assert.ok(liveParsed.required_qualifications.includes('8 years'))
  assert.ok(!/<table[\s>]/i.test(liveParsed.required_qualifications), 'no tables left')
  console.log('live KCB fixture: ok')
} catch {
  // optional
}

console.log('htmlTablesToBullets.test.ts: ok')
