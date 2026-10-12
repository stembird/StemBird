/**
 * One-shot: discover active sources + process a batch of the scrape queue.
 * Uses service role against the configured Supabase project.
 *
 *   npx tsx scripts/run-scrape-now.mts
 *   npx tsx scripts/run-scrape-now.mts --discover-only
 *   npx tsx scripts/run-scrape-now.mts --process-only --max=5
 */
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { runScrapeDiscover } from '../src/lib/scrapeDiscover'
import { runScrapeProcessBatch } from '../src/lib/scrapeProcess'

config({ path: '.env' })
config({ path: '.env.local', override: true })

const args = new Set(process.argv.slice(2))
const discoverOnly = args.has('--discover-only')
const processOnly = args.has('--process-only')
const maxArg = process.argv.find(a => a.startsWith('--max='))
const maxJobs = maxArg ? parseInt(maxArg.split('=')[1], 10) : 10

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  if (!process.env.SCRAPER_USER_ID) throw new Error('Missing SCRAPER_USER_ID')

  const supabase = createClient(url, key)

  if (!processOnly) {
    console.log('── Discover (active sources) ──')
    const discover = await runScrapeDiscover(supabase)
    console.log(JSON.stringify(discover, null, 2))
  }

  if (!discoverOnly) {
    console.log(`── Process (max ${maxJobs}) ──`)
    const process = await runScrapeProcessBatch(supabase, {
      maxJobs,
      budgetMs: 240_000,
    })
    console.log(JSON.stringify({
      processed: process.processed,
      stopped_early: process.stopped_early || null,
      results: process.results.map(r => ({
        success: r.success,
        message: r.message,
        error: r.error,
        title: r.title,
        source: r.source,
        job_url: r.job_url,
        published: r.published,
        pdf_document: r.pdf_document,
      })),
    }, null, 2))
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
