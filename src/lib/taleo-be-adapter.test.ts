import assert from 'node:assert/strict'
import {
  extractKenyaLocationFilters,
  extractTaleoBeCws,
  extractTaleoBeHostPath,
  extractTaleoBeJsonLd,
  extractTaleoBeOrg,
  extractTaleoBeRid,
  locationFromTaleoBeJsonLd,
  normalizeTaleoBeJob,
  parseTaleoBeBoardUrl,
  parseTaleoBeSearchResults,
} from './taleo-be-adapter'

assert.deepEqual(
  parseTaleoBeBoardUrl(
    'https://phg.tbe.taleo.net/phg02/ats/careers/v2/jobSearch?org=CAREUSA&cws=63'
  ),
  { hostPath: 'phg.tbe.taleo.net/phg02', org: 'CAREUSA', cws: '63' }
)

assert.equal(
  extractTaleoBeRid(
    'https://phh.tbe.taleo.net/phh04/ats/careers/v2/viewRequisition?org=CONSERVATION&cws=39&rid=2713'
  ),
  '2713'
)
assert.equal(
  extractTaleoBeOrg(
    'https://phh.tbe.taleo.net/phh04/ats/careers/v2/viewRequisition?org=CONSERVATION&cws=39&rid=2713'
  ),
  'CONSERVATION'
)
assert.equal(
  extractTaleoBeCws(
    'https://phh.tbe.taleo.net/phh04/ats/careers/v2/viewRequisition?org=CONSERVATION&cws=39&rid=2713'
  ),
  '39'
)
assert.equal(
  extractTaleoBeHostPath(
    'https://phh.tbe.taleo.net/phh04/ats/careers/v2/viewRequisition?org=CONSERVATION&cws=39&rid=2713'
  ),
  'phh.tbe.taleo.net/phh04'
)

const resultsHtml = `
<h4 class="oracletaleocwsv2-head-title"><a href="https://phg.tbe.taleo.net/phg02/ats/careers/v2/viewRequisition?org=CAREUSA&cws=63&rid=190" class="viewJobLink">Program Manager Kenya</a></h4>
<div tabindex="0" >PROGRAMS</div>
<div tabindex="0" >Kenya - Nairobi</div>
<div tabindex="0" >Kenya</div>
</div>
<!--/.accordion-head-info -->
<h4 class="oracletaleocwsv2-head-title"><a href="https://phg.tbe.taleo.net/phg02/ats/careers/v2/viewRequisition?org=CAREUSA&cws=63&rid=191" class="viewJobLink">Finance Officer</a></h4>
<div tabindex="0" >FINANCE</div>
<div tabindex="0" >US - Atlanta, GA</div>
<div tabindex="0" >United States</div>
</div>
<!--/.accordion-head-info -->
`

const parsed = parseTaleoBeSearchResults(resultsHtml)
assert.equal(parsed.length, 2)
assert.equal(parsed[0].rid, '190')
assert.ok(parsed[0].location.includes('Kenya - Nairobi'))
assert.equal(parsed[1].rid, '191')

const filters = extractKenyaLocationFilters(`
<input type="checkbox" value="190" name="location" >
<label> Kenya - Nairobi </label>
<input type="checkbox" value="10" name="location" >
<label> Uganda - Kampala </label>
<input type="checkbox" value="227" name="location" >
<label> Kenya - Dadaab </label>
`)
assert.equal(filters.length, 2)
assert.deepEqual(
  filters.map(f => f.value).sort(),
  ['190', '227']
)

const jsonLd = extractTaleoBeJsonLd(`
<script type="application/ld+json">{"title":"Director","description":"<p>Build programs in Nairobi.</p>","jobLocation":{"address":{"addressLocality":"Nairobi, Kenya","addressCountry":{"name":"KE"}}}}</script>
`)
assert.equal(jsonLd?.title, 'Director')
assert.equal(locationFromTaleoBeJsonLd(jsonLd!), 'Nairobi, Kenya, KE')

const normalized = normalizeTaleoBeJob(
  {
    rid: '190',
    title: 'Program Manager Kenya',
    location: 'Kenya - Nairobi',
    detailUrl:
      'https://phg.tbe.taleo.net/phg02/ats/careers/v2/viewRequisition?org=CAREUSA&cws=63&rid=190',
    meta: ['PROGRAMS', 'Kenya - Nairobi', 'Kenya'],
    descriptionHtml: '<p>Lead CARE programs in Nairobi.</p>',
  },
  'CARE'
)
assert.equal(normalized.company, 'CARE')
assert.ok(normalized.application_url.includes('CAREUSA'))
assert.ok(normalized.description.includes('Nairobi'))

console.log('taleo-be-adapter.test.ts: ok')
