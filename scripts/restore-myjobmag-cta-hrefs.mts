/**
 * Restore in-text MyJobMag CTAs to the exact employer URL from the live
 * /apply-now/{id} redirect (not CareerSasa apply_link heuristics).
 *
 *   npx tsx scripts/restore-myjobmag-cta-hrefs.mts
 *   npx tsx scripts/restore-myjobmag-cta-hrefs.mts --apply
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local', override: true })

import { createClient } from '@supabase/supabase-js'
import {
  extractMyJobMagApplyNow,
  fetchMyJobMagJobDetails,
  resolveMyJobMagApplyNowRedirect,
} from '../src/lib/myjobmag-adapter'

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

function replaceCtaHref(html: string, href: string): string {
  if (!/Interested and qualified/i.test(html)) return html
  return html.replace(
    /(Interested and qualified[\s\S]*?<a\b[^>]*\bhref=["'])([^"']+)(["'])/i,
    `$1${href}$3`
  )
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env')
  const supabase = createClient(url, key)

  const { data: sources, error } = await supabase
    .from('scraped_job_sources')
    .select('id, job_id, job_url')
    .eq('source_id', 'myjobmag-kenya')
    .not('job_id', 'is', null)
    .order('scraped_at', { ascending: false })
    .limit(80)

  if (error) throw error

  let updated = 0
  for (const row of sources || []) {
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select(
        'id,title,job_slug,description,responsibilities,required_qualifications,additional_info'
      )
      .eq('id', row.job_id)
      .maybeSingle()
    if (jobErr) throw jobErr
    if (!job) continue

    const blob = HTML_FIELDS.map(f => asHtml((job as Record<string, unknown>)[f])).join('\n')
    if (!/Interested and qualified/i.test(blob)) continue

    let destination: string | null = null
    try {
      const detail = await fetchMyJobMagJobDetails(row.job_url as string)
      const fromDesc = detail.descriptionHtml.match(
        /Interested and qualified[\s\S]*?<a\b[^>]*\bhref=["']([^"']+)["']/i
      )?.[1]
      if (fromDesc && !/myjobmag\.co\.ke\/job\//i.test(fromDesc)) {
        destination = fromDesc
      } else {
        const page = await fetch(row.job_url as string).then(r => r.text())
        const applyNow = extractMyJobMagApplyNow(page)
        if (applyNow.path) {
          destination = await resolveMyJobMagApplyNowRedirect(applyNow.path)
          if (!destination && applyNow.path) {
            destination = `https://www.myjobmag.co.ke${applyNow.path}`
          }
        }
      }
    } catch (err) {
      console.log(`skip ${job.title}: ${err instanceof Error ? err.message : err}`)
      continue
    }

    if (!destination) {
      console.log(`skip ${job.title}: no apply-now destination`)
      continue
    }

    const patch: Record<string, string> = {}
    for (const field of HTML_FIELDS) {
      const current = asHtml((job as Record<string, unknown>)[field])
      if (!/Interested and qualified/i.test(current)) continue
      const fixed = replaceCtaHref(current, destination)
      if (fixed !== current) patch[field] = fixed
    }

    if (Object.keys(patch).length === 0) {
      console.log(`ok ${job.title} (already exact or no CTA href)`)
      continue
    }

    console.log(
      `${apply ? 'update' : 'would update'} ${job.title}: ${destination} [${Object.keys(patch).join(', ')}]`
    )
    if (apply) {
      const { error: updErr } = await supabase.from('jobs').update(patch).eq('id', job.id)
      if (updErr) throw updErr
    }
    updated++
    await new Promise(r => setTimeout(r, 800))
  }

  console.log(JSON.stringify({ apply, updated }, null, 2))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
