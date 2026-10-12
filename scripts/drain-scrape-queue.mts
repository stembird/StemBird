/**
 * Drain scrape_queue in-process (service role).
 *
 *   npx tsx scripts/drain-scrape-queue.mts
 *   npx tsx scripts/drain-scrape-queue.mts --source=myjobmag-kenya --max=300
 */
import { createClient } from '@supabase/supabase-js'
import { runScrapeProcessOne } from '../src/lib/scrapeProcess'

function arg(name: string, fallback?: string): string | undefined {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : fallback
}

const sourceId = arg('source')
const max = Math.min(Math.max(1, parseInt(arg('max', '300') || '300', 10) || 300), 1000)

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function pendingCount(): Promise<number> {
  let q = supabase
    .from('scrape_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
  if (sourceId) q = q.eq('source_id', sourceId)
  const { count } = await q
  return count || 0
}

/** Prefer a specific source by leaving other pending items alone temporarily. */
async function parkNonTargetPending(): Promise<string[]> {
  if (!sourceId) return []
  const { data } = await supabase
    .from('scrape_queue')
    .select('id')
    .eq('status', 'pending')
    .neq('source_id', sourceId)
  const ids = (data || []).map(r => r.id as string)
  if (ids.length === 0) return []
  // Mark as processing so the picker skips them; restore later.
  await supabase
    .from('scrape_queue')
    .update({ status: 'processing', error_message: 'parked-for-source-drain' })
    .in('id', ids)
  return ids
}

async function unpark(ids: string[]) {
  if (ids.length === 0) return
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100)
    await supabase
      .from('scrape_queue')
      .update({ status: 'pending', error_message: null })
      .in('id', chunk)
      .eq('error_message', 'parked-for-source-drain')
  }
}

const started = Date.now()
let processed = 0
let published = 0
let skipped = 0
let failed = 0
const parked = await parkNonTargetPending()
console.log(`Drain start source=${sourceId || 'all'} max=${max} parkedOther=${parked.length}`)

try {
  while (processed < max) {
    const left = await pendingCount()
    if (left === 0) {
      console.log('No more pending')
      break
    }

    const result = await runScrapeProcessOne(supabase)
    processed++
    const msg = String(result.message || result.error || 'ok')
    if (result.success) published++
    else if (/skip|duplicate|expired/i.test(msg)) skipped++
    else if (result.error || /fail/i.test(msg)) failed++

    console.log(
      `[${processed}] left~${Math.max(0, left - 1)} success=${!!result.success} ` +
        `msg=${msg.slice(0, 100)} title=${String(result.title || '').slice(0, 50)}`
    )

    if (result.message === 'No pending jobs in queue') break
  }
} finally {
  await unpark(parked)
}

console.log(
  JSON.stringify(
    {
      done: true,
      sourceId: sourceId || null,
      processed,
      published,
      skipped,
      failed,
      elapsedMin: ((Date.now() - started) / 60000).toFixed(1),
      pendingRemaining: await pendingCount(),
    },
    null,
    2
  )
)
