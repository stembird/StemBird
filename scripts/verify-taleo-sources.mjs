/**
 * Live probe for Kenyan Taleo Enterprise + Business Edition boards.
 * Usage: node scripts/verify-taleo-sources.mjs
 */

const enterpriseBoards = [
  ['Equity Bank', 'equitybank.taleo.net', 'ext_new'],
  ['Britam', 'britam.taleo.net', 'ke'],
  ['Aga Khan University', 'aku.taleo.net', 'ex'],
]

const beBoards = [
  ['CARE', 'phg.tbe.taleo.net/phg02', 'CAREUSA', '63'],
  ['Conservation International', 'phh.tbe.taleo.net/phh04', 'CONSERVATION', '39'],
]

async function probeEnterprise(name, host, section) {
  const listUrl = `https://${host}/careersection/${section}/jobsearch.ftl?lang=en`
  const listRes = await fetch(listUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; careersasa-probe/1.0)' },
  })
  if (!listRes.ok) return `${name}: jobsearch HTTP ${listRes.status}`
  const html = await listRes.text()
  const portal = html.match(/portalNo\s*[:=]\s*['"]?(\d+)/i)?.[1]
  if (!portal) {
    const joblistUrl = `https://${host}/careersection/${section}/joblist.ftl?lang=en`
    const joblistRes = await fetch(joblistUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; careersasa-probe/1.0)' },
    })
    if (!joblistRes.ok) return `${name}: no portal; joblist HTTP ${joblistRes.status}`
    const listHtml = await joblistRes.text()
    const history =
      listHtml.match(/id=["']initialHistory["'][^>]*value=["']([^"']*)["']/i)?.[1] || ''
    const decoded = decodeURIComponent(history.replace(/\+/g, ' '))
    const ke = (decoded.match(/Kenya/gi) || []).length
    return `${name} (${host}/${section}): legacy-joblist kenya_mentions=${ke}`
  }
  const cookie = (listRes.headers.getSetCookie?.() || [])
    .map(c => c.split(';')[0])
    .join('; ')

  const searchRes = await fetch(
    `https://${host}/careersection/rest/jobboard/searchjobs?lang=en&portal=${portal}`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; careersasa-probe/1.0)',
        tz: 'GMT+03:00',
        tzname: 'Africa/Nairobi',
        Origin: `https://${host}`,
        Referer: listUrl,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify({
        multilineEnabled: false,
        sortingSelection: {
          sortBySelectionParam: '3',
          ascendingSortingOrder: 'false',
        },
        fieldData: { fields: { KEYWORD: '', LOCATION: '' }, valid: true },
        filterSelectionParam: {
          searchFilterSelections: [
            { id: 'LOCATION', selectedValues: [] },
            { id: 'JOB_FIELD', selectedValues: [] },
          ],
        },
        advancedSearchFiltersSelectionParam: {
          searchFilterSelections: [{ id: 'LOCATION', selectedValues: [] }],
        },
        pageNo: 1,
      }),
    }
  )
  if (!searchRes.ok) return `${name}: searchjobs HTTP ${searchRes.status}`
  const data = await searchRes.json()
  const jobs = data.requisitionList || []
  const ke = jobs.filter(j =>
    String(j.column?.[1] || '')
      .toLowerCase()
      .includes('kenya')
  )
  return `${name} (${host}/${section}): total=${data.pagingData?.totalCount ?? jobs.length}, page=${jobs.length}, ke=${ke.length}, portal=${portal}`
}

function isKenyaLocation(text) {
  return /kenya|nairobi|mombasa|dadaab|kakuma|narok/i.test(text || '')
}

async function probeBusinessEdition(name, hostPath, org, cws) {
  const searchUrl = `https://${hostPath}/ats/careers/v2/jobSearch?org=${org}&cws=${cws}`
  const searchRes = await fetch(searchUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; careersasa-probe/1.0)' },
  })
  if (!searchRes.ok) return `${name}: jobSearch HTTP ${searchRes.status}`
  const searchHtml = await searchRes.text()
  const kenyaFilters = [
    ...searchHtml.matchAll(
      /<input([^>]*type=["']checkbox["'][^>]*)>\s*<label>\s*([^<]+)<\/label>/gi
    ),
  ]
    .map(m => {
      const label = m[2].trim()
      const field = m[1].match(/name=["']([^"']+)["']/i)?.[1]
      const value = m[1].match(/value=["']([^"']+)["']/i)?.[1]
      return isKenyaLocation(label) ? { field, value, label } : null
    })
    .filter(Boolean)

  const resultsUrl = `https://${hostPath}/ats/careers/v2/searchResults?org=${org}&cws=${cws}`
  const resultsRes = await fetch(resultsUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; careersasa-probe/1.0)',
      Referer: searchUrl,
    },
  })
  if (!resultsRes.ok) return `${name}: searchResults HTTP ${resultsRes.status}`
  const resultsHtml = await resultsRes.text()
  const cards = [
    ...resultsHtml.matchAll(
      /<h4 class="oracletaleocwsv2-head-title"><a href="([^"]+rid=(\d+)[^"]*)"[^>]*>([^<]+)<\/a><\/h4>([\s\S]*?)<\/div>\s*<!--\/\.accordion-head-info/gi
    ),
  ]
  const ke = cards.filter(m => {
    const meta = [...m[4].matchAll(/<div tabindex="0"\s*>([^<]*)<\/div>/gi)]
      .map(x => x[1])
      .join(' ')
    return isKenyaLocation(meta) || isKenyaLocation(m[3])
  })

  return `${name} (${hostPath} org=${org} cws=${cws}): page_jobs=${cards.length}, ke=${ke.length}, kenya_filters=${kenyaFilters.length}`
}

console.log('=== Taleo Enterprise (Kenya) ===')
for (const [name, host, section] of enterpriseBoards) {
  console.log(await probeEnterprise(name, host, section))
}

console.log('\n=== Taleo Business Edition (Kenya) ===')
for (const [name, hostPath, org, cws] of beBoards) {
  console.log(await probeBusinessEdition(name, hostPath, org, cws))
}
