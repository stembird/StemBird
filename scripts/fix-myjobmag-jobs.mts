/**
 * Live-refetch published MyJobMag jobs and correct apply methods
 * (employer email / link / Google Form first; MyJobMag listing last).
 *
 *   npx tsx scripts/fix-myjobmag-jobs.mts
 *   npx tsx scripts/fix-myjobmag-jobs.mts --apply
 *   npx tsx scripts/fix-myjobmag-jobs.mts --apply --limit=50
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local', override: true })

import { createClient } from '@supabase/supabase-js'
import { runFixMyJobMagPublishedJobs } from '../src/lib/fixMyJobMagJobs'

const apply = process.argv.includes('--apply')
const limitArg = process.argv.find(a => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 200
const offsetArg = process.argv.find(a => a.startsWith('--offset='))
const offset = offsetArg ? parseInt(offsetArg.split('=')[1], 10) : 0

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env')

  const supabase = createClient(url, key)
  const result = await runFixMyJobMagPublishedJobs(supabase, {
    apply,
    limit,
    offset,
    onProgress: line => console.log(line),
  })

  console.log(
    JSON.stringify(
      {
        apply,
        examined: result.examined,
        updated: result.updated,
        unchanged: result.unchanged,
        skipped: result.skipped,
        errors: result.errors,
        sample: result.results.slice(0, 15).map(r => ({
          title: r.title,
          status: r.status,
          changes: r.changes
            ? Object.fromEntries(
                Object.entries(r.changes).map(([k, v]) => [k, { from: v.from, to: v.to }])
              )
            : undefined,
          error: r.error,
        })),
      },
      null,
      2
    )
  )

  if (result.errors > 0) process.exitCode = 1
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
