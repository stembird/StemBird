/**
 * Backfill jobs.date_posted from scraped_job_sources.raw_data.datePosted
 * for MyJobMag / BrighterMonday / Fuzu rows that still use scrape-time dates.
 *
 * Usage:
 *   npx tsx scripts/backfill-board-date-posted.mts
 *   npx tsx scripts/backfill-board-date-posted.mts --dry-run
 */
import { createClient } from '@supabase/supabase-js'

const DRY_RUN = process.argv.includes('--dry-run')
const PAGE = 500
const SOURCES = ['myjobmag-kenya', 'brightermonday-kenya', 'fuzu-kenya']

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

function coerceDatePosted(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const d = new Date(value.trim())
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

async function main() {
  const supabase = createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  )

  let offset = 0
  let scanned = 0
  let updated = 0
  let skipped = 0

  for (;;) {
    const { data, error } = await supabase
      .from('scraped_job_sources')
      .select('id, source_id, job_id, raw_data, jobs:job_id(id, date_posted, created_at)')
      .in('source_id', SOURCES)
      .eq('status', 'published')
      .not('job_id', 'is', null)
      .range(offset, offset + PAGE - 1)

    if (error) throw error
    if (!data?.length) break

    for (const row of data) {
      scanned += 1
      const raw = row.raw_data as Record<string, unknown> | null
      const datePosted = coerceDatePosted(raw?.datePosted)
      const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs
      if (!datePosted || !job?.id) {
        skipped += 1
        continue
      }

      const current = job.date_posted ? new Date(job.date_posted).getTime() : NaN
      const created = job.created_at ? new Date(job.created_at).getTime() : NaN
      const target = new Date(datePosted).getTime()
      const looksLikeScrapeTime =
        !Number.isFinite(current) ||
        (Number.isFinite(created) && Math.abs(current - created) < 120_000)

      if (!looksLikeScrapeTime && Math.abs(current - target) < 1000) {
        skipped += 1
        continue
      }
      if (!looksLikeScrapeTime) {
        // Already has a distinct board date — leave it.
        skipped += 1
        continue
      }

      if (DRY_RUN) {
        updated += 1
        continue
      }

      const { error: upErr } = await supabase
        .from('jobs')
        .update({ date_posted: datePosted })
        .eq('id', job.id)
      if (upErr) throw upErr
      updated += 1
    }

    offset += data.length
    if (data.length < PAGE) break
  }

  console.log(
    JSON.stringify(
      { dry_run: DRY_RUN, scanned, updated, skipped, sources: SOURCES },
      null,
      2
    )
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
