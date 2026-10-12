/**
 * One-shot: rewrite relative MyJobMag /apply-now/ anchors in published job HTML
 * fields. Absolutizes to https://www.myjobmag.co.ke/apply-now/{id} so the
 * original employer redirect is preserved. Does not inject apply_link.
 *
 *   npx tsx scripts/fix-myjobmag-apply-now-html.mts
 *   npx tsx scripts/fix-myjobmag-apply-now-html.mts --apply
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local', override: true })

import { createClient } from '@supabase/supabase-js'
import { sanitizeScrapedJobHtmlForDisplay } from '../src/lib/jobBoardApply'

const apply = process.argv.includes('--apply')
const HTML_FIELDS = [
  'description',
  'responsibilities',
  'required_qualifications',
  'additional_info',
] as const

function asHtml(value: unknown): string {
  if (value == null) return ''
  return typeof value === 'string' ? value : String(value)
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env')

  const supabase = createClient(url, key)
  let examined = 0
  let updated = 0
  let from = 0

  while (from < 5000) {
    const { data: rows, error } = await supabase
      .from('jobs')
      .select(
        'id,title,job_slug,status,description,responsibilities,required_qualifications,additional_info'
      )
      .order('created_at', { ascending: false })
      .range(from, from + 199)

    if (error) throw error
    if (!rows?.length) break

    for (const job of rows) {
      examined++
      const patch: Record<string, string> = {}
      for (const field of HTML_FIELDS) {
        const current = asHtml((job as Record<string, unknown>)[field])
        if (!current || !/href\s*=/i.test(current)) continue
        if (!/\/apply-now\//i.test(current) && !/\/jobs-at\//i.test(current)) continue
        const fixed = sanitizeScrapedJobHtmlForDisplay(current)
        if (fixed && fixed !== current) patch[field] = fixed
      }
      if (Object.keys(patch).length === 0) continue

      console.log(
        `${apply ? 'update' : 'would update'} ${job.title} (${job.job_slug}): ${Object.keys(patch).join(', ')}`
      )
      if (apply) {
        const { error: updErr } = await supabase.from('jobs').update(patch).eq('id', job.id)
        if (updErr) throw updErr
      }
      updated++
    }

    from += 200
    if (rows.length < 200) break
  }

  console.log(JSON.stringify({ apply, examined, updated }, null, 2))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
