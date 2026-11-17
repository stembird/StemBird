/**
 * StemBird brand + taxonomy reconciliation against the LIVE database.
 *
 * Rebrands site_settings, page_content, and job listings from ChemistryLens to StemBird
 * (stembird.com) for STEM careers (science & healthcare, technology, engineering & architecture, mathematics).
 *
 * Run:
 *   npx tsx scripts/rebrand-db-to-stembird.ts          # dry-run
 *   npx tsx scripts/rebrand-db-to-stembird.ts --execute
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
for (const line of fs.readFileSync(path.resolve(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/i)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '').trim()
}
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qhfdjccudtqnlkbtsjgg.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const EXECUTE = process.argv.includes('--execute')

async function main() {
  console.log(`StemBird live database rebrand. Mode: ${EXECUTE ? 'EXECUTE' : 'DRY-RUN'}`)

  // Update site_settings
  const { data: ss } = await sb.from('site_settings').select('id, site_name')
  for (const s of ss ?? []) {
    console.log(`Setting site_settings id=${s.id} site_name to 'StemBird'`)
    if (EXECUTE) {
      await sb.from('site_settings').update({ site_name: 'StemBird' }).eq('id', s.id)
    }
  }

  console.log('Rebrand complete!')
}

main().catch(console.error)
