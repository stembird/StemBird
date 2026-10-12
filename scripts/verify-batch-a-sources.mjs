const srCandidates = [
  ['AmaliTech', 'AmaliTech'],
  ['MercyCorps', 'MercyCorps'],
  ['Mercy Corps', 'Mercy-Corps'],
  ['IRC', 'rescueorg'],
  ['IRC2', 'InternationalRescueCommittee'],
  ['WorldVision', 'WorldVisionInternational'],
  ['SaveTheChildren', 'SaveTheChildrenInternational'],
  ['PlanInternational', 'PlanInternational'],
  ['Heifer', 'HeiferInternational'],
  ['Pathfinder', 'PathfinderInternational'],
  ['CRS', 'CatholicReliefServices'],
  ['Oxfam', 'OxfamInternational'],
  ['Komaza', 'Komaza'],
  ['Sanergy', 'Sanergy'],
  ['Copia', 'CopiaGlobal'],
  ['Apollo', 'ApolloAgriculture'],
  ['Flourish', 'FlourishLabs'],
  ['AfricanPopulationHealth', 'APHRC'],
]

const workableCandidates = [
  'm-kopa', 'mkopa', 'twiga', 'tala', 'cellulant', 'wasoko', 'sendy', 'branch', 'komaza',
  'lori', 'sanergy', 'copia', 'apollo', 'equity-bank', 'kcb', 'inkomoko',
]

async function testSR(name, slug) {
  const list = await fetch(`https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=100`)
  if (!list.ok) return `${name}: HTTP ${list.status}`
  const data = await list.json()
  const ke = (data.content || []).filter(j =>
    j.location?.country?.toLowerCase() === 'ke' ||
    j.location?.fullLocation?.toLowerCase().includes('kenya')
  )
  return `${name} (${slug}): total=${data.totalFound ?? 0}, ke=${ke.length}`
}

async function testWorkable(slug) {
  const res = await fetch(`https://apply.workable.com/api/v3/accounts/${slug}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Origin: 'https://apply.workable.com',
      Referer: `https://apply.workable.com/${slug}/`,
    },
    body: JSON.stringify({ query: '', token: null, department: [], location: [], workplace: [], worktype: [] }),
  })
  if (!res.ok) return `${slug}: HTTP ${res.status}`
  const data = await res.json()
  const ke = (data.results || []).filter(j =>
    j.locations?.some(l => l.country?.toLowerCase() === 'kenya')
  )
  return `${slug}: total=${data.results?.length ?? 0}, ke=${ke.length}`
}

console.log('=== SmartRecruiters ===')
for (const [name, slug] of srCandidates) {
  console.log(await testSR(name, slug))
}

console.log('\n=== Workable ===')
for (const slug of workableCandidates) {
  console.log(await testWorkable(slug))
}
