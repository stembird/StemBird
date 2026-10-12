/**
 * Re-enrich recent jobs whose required_qualifications are empty or
 * experience-level labels only (Mid level / Unspecified / etc.).
 *
 *   npx tsx scripts/reenrich-bad-quals-recent.mts
 *   npx tsx scripts/reenrich-bad-quals-recent.mts --apply --hours=12
 */
import { config } from 'dotenv'
config({ path: '.env', quiet: true })
config({ path: '.env.local', override: true, quiet: true })

import { createClient } from '@supabase/supabase-js'
import { runReenrichScrapedJobs } from '../src/lib/reenrichScrapedJobs'
import { isMissingOrLabelOnlyQualifications } from '../src/lib/experienceLevelLabel'

const apply = process.argv.includes('--apply')
const hoursArg = process.argv.find(a => a.startsWith('--hours='))
const hours = hoursArg ? parseInt(hoursArg.split('=')[1], 10) : 12

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )

  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
  const { data: queue, error } = await sb
    .from('scrape_queue')
    .select('job_url, error_message, processed_at')
    .gte('processed_at', since)
  if (error) throw error

  const urls = (queue || []).filter(q => !q.error_message).map(q => q.job_url)
  const { data: srcs } = await sb
    .from('scraped_job_sources')
    .select('job_id, job_url, source_id')
    .in('job_url', urls)
    .not('job_id', 'is', null)

  const ids = [...new Set((srcs || []).map(s => s.job_id as string))]
  const { data: jobs } = await sb
    .from('jobs')
    .select('id, title, company, required_qualifications, responsibilities')
    .in('id', ids)

  const bad = (jobs || []).filter(j =>
    isMissingOrLabelOnlyQualifications(j.required_qualifications)
  )

  console.log(
    JSON.stringify(
      {
        hours,
        since,
        apply,
        examined: jobs?.length || 0,
        bad: bad.length,
        titles: bad.map(j => `${j.company} | ${j.title} | ${String(j.required_qualifications || '').slice(0, 40)}`),
      },
      null,
      2
    )
  )

  let updated = 0
  let failed = 0
  let skipped = 0

  for (const job of bad) {
    const result = await runReenrichScrapedJobs(sb, {
      jobId: job.id,
      apply,
      onProgress: line => console.log(line),
    })
    updated += result.updated
    failed += result.failed
    skipped += result.skipped
  }

  // Re-check
  const { data: after } = await sb
    .from('jobs')
    .select('id, title, company, required_qualifications')
    .in(
      'id',
      bad.map(j => j.id)
    )

  const stillBad = (after || []).filter(j =>
    isMissingOrLabelOnlyQualifications(j.required_qualifications)
  )

  console.log(
    JSON.stringify(
      {
        summary: { updated, failed, skipped, still_bad: stillBad.length },
        still_bad: stillBad.map(j => ({
          title: j.title,
          company: j.company,
          quals: String(j.required_qualifications || '').slice(0, 80),
        })),
        fixed_sample: (after || [])
          .filter(j => !isMissingOrLabelOnlyQualifications(j.required_qualifications))
          .slice(0, 8)
          .map(j => ({
            title: j.title,
            quals: String(j.required_qualifications || '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 120),
          })),
      },
      null,
      2
    )
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
