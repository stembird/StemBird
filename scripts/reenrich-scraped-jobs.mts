/**
 * Re-parse already-published scraped jobs so description / responsibilities /
 * qualifications / tags / industry / education populate like normal posts.
 *
 * Uses scraped_job_sources.raw_data (no live ATS refetch).
 *
 *   npx tsx scripts/reenrich-scraped-jobs.mts           # dry-run
 *   npx tsx scripts/reenrich-scraped-jobs.mts --apply   # write updates
 *   npx tsx scripts/reenrich-scraped-jobs.mts --apply --limit=20
 *   npx tsx scripts/reenrich-scraped-jobs.mts --apply --limit=20 --offset=20
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local', override: true })

import { createClient } from '@supabase/supabase-js'
import { runReenrichScrapedJobs } from '../src/lib/reenrichScrapedJobs'

const apply = process.argv.includes('--apply')
const missingOnly = process.argv.includes('--missing-only')
const limitArg = process.argv.find(a => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 500
const offsetArg = process.argv.find(a => a.startsWith('--offset='))
const offset = offsetArg ? parseInt(offsetArg.split('=')[1], 10) : 0
const sourceArg = process.argv.find(a => a.startsWith('--source='))
const sourceFilter = sourceArg ? sourceArg.split('=').slice(1).join('=') : null

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env')

  const hasAi = [
    process.env.DEEPSEEK_API_KEY,
    process.env.DEEPSEEK_API_KEY_2,
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].some(v => !!v && v.trim().length > 0)

  if (!hasAi) {
    console.warn(
      'WARNING: No AI API keys configured — enrichment will use rule-based fallback only.'
    )
  }

  const supabase = createClient(url, key)
  await runReenrichScrapedJobs(supabase, {
    limit,
    offset,
    sourceFilter,
    missingOnly,
    apply,
    onProgress: line => console.log(line),
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
