/**
 * Wires two Tier-1 Kenyan STEM sources that reuse EXISTING adapters:
 *   - Safaricom  -> oracle_cloud (same adapter as KCB Group)
 *   - One Acre Fund -> greenhouse
 * Idempotent upsert on source_id. Run: npx tsx scripts/wire-tier1-sources.mts
 */
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/i)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const rows = [
  {
    source_id: 'safaricom-oracle-cloud',
    name: 'Safaricom',
    base_url: 'https://egjd.fa.us6.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/jobs',
    is_active: true,
    selectors: {
      type: 'oracle_cloud',
      host: 'egjd.fa.us6.oraclecloud.com',
      siteNumber: 'CX',
      filterCountry: 'KE',
      category: 'employer',
    },
  },
  {
    source_id: 'one-acre-fund-greenhouse',
    name: 'One Acre Fund',
    base_url: 'https://boards.greenhouse.io/oneacrefund',
    is_active: true,
    selectors: {
      type: 'greenhouse',
      slug: 'oneacrefund',
      filterCountry: 'Kenya',
      category: 'ngo',
    },
  },
]

for (const r of rows) {
  const { error } = await sb
    .from('scraper_sources')
    .upsert(r, { onConflict: 'source_id' })
  if (error) {
    console.error(`FAIL ${r.source_id}:`, error.message)
    process.exitCode = 1
  } else {
    console.log(`OK  upserted ${r.source_id} (${r.name})`)
  }
}

const { data } = await sb
  .from('scraper_sources')
  .select('source_id,name,is_active')
  .in('source_id', rows.map(r => r.source_id))
  .order('source_id')
console.log('\nVerified rows in DB:')
for (const s of data || []) console.log(`  ${s.is_active ? 'ACTIVE' : 'paused'} ${s.source_id.padEnd(26)} ${s.name}`)
