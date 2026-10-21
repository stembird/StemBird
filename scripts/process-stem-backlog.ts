import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { runScrapeProcessBatch } from '../src/lib/scrapeProcess'

/**
 * Drain the scrape_queue through the REAL process pipeline until it is empty.
 * Each pending job is fetched with its source adapter (Workable / SmartRecruiters /
 * Greenhouse / Taleo / Oracle / HTML), then run through the deep STEM gate:
 *   - STEM      -> published live (jobs row 'available' + company + career tips)
 *   - non-STEM  -> recorded skipped (off_topic), never published, never re-queued
 *
 * Writes straight to the configured Supabase (production). Revalidation no-ops
 * outside Next, so live ISR pages refresh on their own schedule.
 * Resumable: only touches 'pending' rows, so re-run if it stops early.
 */

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

function client(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY || ''
  if (!url || !key) throw new Error('Missing Supabase URL or service key in .env.local')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function pendingCount(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from('scrape_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
  return typeof count === 'number' ? count : 0
}

function classify(r: Awaited<ReturnType<typeof runScrapeProcessBatch>>['results'][number]): string {
  if (r.error) return `ERROR: ${String(r.error).slice(0, 80)}`
  if (r.off_topic) return 'SKIP (not STEM)'
  if (r.pdf_document) return `PSC PDF published=${r.published ?? 0}`
  if (r.message === 'Duplicate job skipped') return 'SKIP (duplicate)'
  if (r.message === 'Expired job skipped' || String(r.message).includes('expired')) return 'SKIP (expired)'
  if (r.success) return `PUBLISHED -> ${r.job_title || r.title || ''}`
  return `OTHER: ${String(r.message || '')}`
}

async function main() {
  loadEnv()
  const supabase = client()

  let start = await pendingCount(supabase)
  console.log(`[process] pending at start: ${start}`)
  if (start === 0) {
    console.log('Nothing pending. Done.')
    return
  }

  let published = 0
  let skippedNonStem = 0
  let skippedOther = 0
  let errors = 0

  // Drain in bounded batches. Local run has no Vercel limit, so give a large
  // time budget; maxJobs is clamped to 25 inside runScrapeProcessBatch.
  while (true) {
    const { processed, results } = await runScrapeProcessBatch(supabase, {
      maxJobs: 25,
      budgetMs: 3_600_000,
    })

    for (const r of results) {
      const label = classify(r)
      const title = r.job_title || r.title || r.job_url || ''
      console.log(`  - [${r.source || '?'}] ${title} :: ${label}`)
      if (r.error) errors++
      else if (r.off_topic) skippedNonStem++
      else if (r.success) published++
      else skippedOther++
    }

    const remaining = await pendingCount(supabase)
    console.log(`[process] ran ${processed} this round, pending now: ${remaining}`)
    if (processed === 0 || remaining === 0 || remaining >= start) {
      start = remaining
      if (remaining === 0) break
      // No progress guard
      if (processed === 0) break
    }
    start = remaining
    if (remaining === 0) break
  }

  console.log('\n===== SUMMARY =====')
  console.log(`published (live STEM) : ${published}`)
  console.log(`skipped (not STEM)    : ${skippedNonStem}`)
  console.log(`skipped (dup/expire)  : ${skippedOther}`)
  console.log(`errors                : ${errors}`)
  console.log(`pending remaining     : ${await pendingCount(supabase)}`)
}

main().catch(err => {
  console.error('process failed:', err instanceof Error ? err.stack || err.message : String(err))
  process.exitCode = 1
})
