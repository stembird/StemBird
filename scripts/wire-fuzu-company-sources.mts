/**
 * Company-pinned Fuzu sources so these Kenyan STEM employers are guaranteed
 * coverage even when their roles fall off the general feed's top pages.
 * Reuses the EXISTING `fuzu` adapter (company tab /kenya/company/{slug} is
 * server-rendered and parsed by discoverFuzuJobs). No new adapter code.
 *
 * Idempotent upsert on source_id. Run: npx tsx scripts/wire-fuzu-company-sources.mts
 */
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/i)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const rows = [
  { source_id: 'fuzu-company-kengen', name: 'KenGen (Fuzu company feed)', slug: 'kengen' },
  { source_id: 'fuzu-company-kenya-power', name: 'Kenya Power (Fuzu company feed)', slug: 'kenya-power' },
  { source_id: 'fuzu-company-diageo', name: 'Diageo / EABL (Fuzu company feed)', slug: 'diageo' },
  { source_id: 'fuzu-company-coca-cola', name: 'Coca-Cola (Fuzu company feed)', slug: 'coca-cola' },
].map(r => ({
  source_id: r.source_id,
  name: r.name,
  base_url: `https://www.fuzu.com/kenya/company/${r.slug}`,
  is_active: true,
  selectors: {
    type: 'fuzu',
    category: 'other',
    sourceKind: 'job_board',
    maxPages: 2,
  },
}))

for (const row of rows) {
  const { error } = await sb.from('scraper_sources').upsert(row, { onConflict: 'source_id' })
  console.log(error ? `FAIL ${row.source_id}: ${error.message}` : `OK  upserted ${row.source_id}`)
  if (error) process.exitCode = 1
}

const { data } = await sb
  .from('scraper_sources')
  .select('source_id,name,is_active')
  .in('source_id', rows.map(r => r.source_id))
  .order('source_id')
console.log('\nVerified rows in DB:')
for (const s of data || []) console.log(`  ${s.is_active ? 'ACTIVE' : 'paused'} ${s.source_id.padEnd(28)} ${s.name}`)
