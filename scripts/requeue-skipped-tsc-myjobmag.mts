/**
 * Re-queue MyJobMag TSC roles that were wrongly marked done as application_url
 * duplicates of the shared services.tsc.go.ke/adverts index.
 *
 *   npx tsx scripts/requeue-skipped-tsc-myjobmag.mts
 *   npx tsx scripts/requeue-skipped-tsc-myjobmag.mts --apply
 */
import { createClient } from '@supabase/supabase-js'

const apply = process.argv.includes('--apply')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('missing supabase env')

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: doneTsc, error } = await supabase
  .from('scrape_queue')
  .select('id, job_url, status, processed_at')
  .eq('source_id', 'myjobmag-kenya')
  .eq('status', 'done')
  .ilike('job_url', '%teachers-service-commission%')
  .limit(500)

if (error) throw error

const rows = doneTsc || []
const toRequeue: typeof rows = []

for (let i = 0; i < rows.length; i += 50) {
  const chunk = rows.slice(i, i + 50)
  const urls = chunk.map(r => r.job_url)
  const { data: sjs } = await supabase
    .from('scraped_job_sources')
    .select('job_url')
    .in('job_url', urls)
  const have = new Set((sjs || []).map(r => r.job_url))
  for (const r of chunk) {
    if (!have.has(r.job_url)) toRequeue.push(r)
  }
}

console.log(`Found ${toRequeue.length} TSC queue rows done without scraped_job_sources`)
console.log(toRequeue.slice(0, 10).map(r => r.job_url))

if (!apply) {
  console.log('Dry run. Pass --apply to reset them to pending.')
  process.exit(0)
}

for (let i = 0; i < toRequeue.length; i += 50) {
  const ids = toRequeue.slice(i, i + 50).map(r => r.id)
  const { error: upErr } = await supabase
    .from('scrape_queue')
    .update({
      status: 'pending',
      processed_at: null,
      error_message: 'Requeued after TSC shared application_url dedupe fix',
      attempts: 0,
    })
    .in('id', ids)
  if (upErr) throw upErr
}

console.log(`Requeued ${toRequeue.length} items to pending`)
