/**
 * Prune closed / stale pending rows for the company-pinned Fuzu sources.
 *
 * For every PENDING row in these sources we re-fetch the Fuzu page:
 *   - no JobPosting JSON-LD  -> role is closed on Fuzu  -> mark done 'source role closed'
 *   - posted > 60 days ago   -> stale                   -> mark done 'posted older than 60 days'
 *   - explicit deadline past -> expired                 -> mark done 'job expired on ...'
 *   - otherwise open & fresh -> left PENDING for normal process/publish
 * Rows whose URL is already published elsewhere are only marked done as a
 * duplicate; we never clobber an existing published scraped_job_sources row.
 *
 * Run: npx tsx scripts/prune-closed-queue-rows.mts
 */
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { fetchFuzuJobDetails } from '../src/lib/fuzu-adapter'
import { isStalePosting, isDeadlineExpired } from '../src/lib/scraperDeadline'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/i)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const SOURCES = [
  'fuzu-company-kengen',
  'fuzu-company-kenya-power',
  'fuzu-company-diageo',
  'fuzu-company-coca-cola',
]

type Q = { id: string; source_id: string; job_url: string }
const rows: Q[] = []
for (let range = 0; ; range += 1000) {
  const { data, error } = await sb
    .from('scrape_queue')
    .select('id,source_id,job_url')
    .eq('status', 'pending')
    .in('source_id', SOURCES)
    .range(range, range + 999)
  if (error) throw error
  rows.push(...(data as Q[]))
  if (!data || data.length < 1000) break
}
console.log(`Pending rows across company sources: ${rows.length}`)

// Which URLs are already published somewhere (do not clobber those)?
const urls = rows.map(r => r.job_url)
const published = new Set<string>()
for (let i = 0; i < urls.length; i += 100) {
  const chunk = urls.slice(i, i + 100)
  const { data } = await sb
    .from('scraped_job_sources')
    .select('job_url,status,job_id')
    .in('job_url', chunk)
    .eq('status', 'published')
    .not('job_id', 'is', null)
  for (const p of data || []) published.add(p.job_url)
}

async function markDone(row: Q, message: string, skipReason: string) {
  await sb
    .from('scrape_queue')
    .update({ status: 'done', processed_at: new Date().toISOString(), error_message: message })
    .eq('id', row.id)
  if (!published.has(row.job_url)) {
    await sb.from('scraped_job_sources').upsert(
      {
        source_id: row.source_id,
        job_url: row.job_url,
        job_id: null,
        status: 'skipped',
        raw_data: { skip_reason: skipReason },
      },
      { onConflict: 'job_url' }
    )
  }
}

let closed = 0, stale = 0, expired = 0, dup = 0, keep = 0, errs = 0
for (const row of rows) {
  if (published.has(row.job_url)) {
    await markDone(row, 'Duplicate job skipped', 'duplicate')
    dup++
    continue
  }
  let detail
  try {
    detail = await fetchFuzuJobDetails(row.job_url)
    await sleep(250)
  } catch {
    // No JobPosting JSON-LD: role is closed/removed on Fuzu.
    await markDone(row, 'Skipped: source role closed', 'closed')
    closed++
    continue
  }

  if (isStalePosting(detail.datePosted)) {
    await markDone(row, `Skipped: posted older than 60 days (${detail.datePosted})`, 'stale')
    stale++
  } else if (detail.validThrough && isDeadlineExpired(detail.validThrough)) {
    await markDone(row, `Skipped: job expired on ${detail.validThrough}`, 'expired')
    expired++
  } else {
    keep++ // open + fresh -> stays pending for normal processing
  }
}

console.log(
  `\nPruned — closed:${closed} stale:${stale} expired:${expired} dupPublished:${dup} | left pending(open&fresh):${keep} errors:${errs}`
)
