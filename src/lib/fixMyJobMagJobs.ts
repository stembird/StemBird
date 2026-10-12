/**
 * Re-fetch published MyJobMag jobs and patch apply methods using the current
 * board adapter rules: employer link / Google Form / email first; MyJobMag
 * listing URL only as last resort.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fetchMyJobMagJobDetails,
  normalizeMyJobMagJob,
} from './myjobmag-adapter'
import { rewriteJobBoardDescriptionLinks } from './jobBoardApply'
import {
  expiresAtFromValidThrough,
  resolveScrapedDeadline,
} from './scraperDeadline'

export const MYJOBMAG_SOURCE_ID = 'myjobmag-kenya'
const MYJOBMAG_ORIGIN = 'https://www.myjobmag.co.ke'
const MYJOBMAG_HOSTS = ['myjobmag.co.ke']

function asHtmlString(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    // jsonb HTML sometimes stored as a JSON string value
    try {
      return String(value)
    } catch {
      return null
    }
  }
  return String(value)
}

/** True when HTML still has CareerSasa-breaking board-relative anchors. */
export function hasBrokenJobBoardRelativeLinks(html: string | null | undefined): boolean {
  if (!html) return false
  return /<a\b[^>]*\bhref\s*=\s*["']\/(?:apply-now|jobs-at|job)\//i.test(html)
}

function rewriteMyJobMagStoredHtml(html: string | null | undefined): string | null {
  if (!html?.trim()) return html ?? null
  if (!hasBrokenJobBoardRelativeLinks(html)) return html
  // Absolutize relative /apply-now/ only — do not inject apply_link heuristics.
  return rewriteJobBoardDescriptionLinks(html, {
    boardOrigin: MYJOBMAG_ORIGIN,
    boardHosts: MYJOBMAG_HOSTS,
  })
}

function jobHasBrokenBoardLinks(job: Record<string, unknown>): boolean {
  for (const field of [
    'description',
    'additional_info',
    'responsibilities',
    'required_qualifications',
  ]) {
    if (hasBrokenJobBoardRelativeLinks(asHtmlString(job[field]))) return true
  }
  return false
}

export interface FixMyJobMagJobResult {
  source_row_id: string
  job_id: string
  job_url: string
  title?: string
  status: 'updated' | 'unchanged' | 'skipped' | 'error' | 'would_update'
  changes?: Record<string, { from: unknown; to: unknown }>
  error?: string
}

export interface FixMyJobMagJobsOptions {
  limit?: number
  offset?: number
  apply?: boolean
  delayMs?: number
  /** Only jobs whose application_url/apply_link still points at MyJobMag */
  boardApplyOnly?: boolean
  onProgress?: (line: string) => void
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function extractMyJobMagListingUrl(value: unknown): string | null {
  if (!value || typeof value !== 'string') return null
  const match = value.match(/https?:\/\/(?:www\.)?myjobmag\.co\.ke\/job\/[a-z0-9-]+/i)
  return match ? match[0].replace('http://', 'https://') : null
}

function normStr(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s || null
}

function sameStr(a: unknown, b: unknown): boolean {
  return (normStr(a) || '').toLowerCase() === (normStr(b) || '').toLowerCase()
}

function asDateOnly(value: unknown): string | null {
  const s = normStr(value)
  if (!s) return null
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

function trackChange(
  changes: Record<string, { from: unknown; to: unknown }>,
  field: string,
  from: unknown,
  to: unknown
) {
  if (field === 'valid_through' || field === 'expires_at') {
    const fromD = asDateOnly(from)
    const toD = asDateOnly(to)
    if (fromD === toD) return
    changes[field] = { from: fromD, to: toD }
    return
  }
  const fromN = normStr(from)
  const toN = normStr(to)
  if (sameStr(fromN, toN)) return
  if (!fromN && !toN) return
  changes[field] = { from: fromN, to: toN }
}

export async function runFixMyJobMagPublishedJobs(
  supabase: SupabaseClient,
  options: FixMyJobMagJobsOptions = {}
): Promise<{
  examined: number
  updated: number
  unchanged: number
  skipped: number
  errors: number
  results: FixMyJobMagJobResult[]
}> {
  const limit = options.limit ?? 200
  const offset = options.offset ?? 0
  const apply = options.apply ?? false
  const delayMs = options.delayMs ?? 1200
  const boardApplyOnly = options.boardApplyOnly ?? false
  const log = options.onProgress || (() => {})

  const { data: rows, error } = await supabase
    .from('scraped_job_sources')
    .select('id, job_id, job_url, status, raw_data')
    .eq('source_id', MYJOBMAG_SOURCE_ID)
    .not('job_id', 'is', null)
    .order('scraped_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) throw error

  // Also catch MyJobMag-linked jobs published without a scraper_sources row
  const { data: orphanJobs, error: orphanErr } = await supabase
    .from('jobs')
    .select('id, application_url, apply_link, identifier')
    .or(
      'application_url.ilike.%myjobmag.co.ke/job/%,apply_link.ilike.%myjobmag.co.ke/job/%,identifier.ilike.%myjobmag.co.ke/job/%'
    )
    .limit(500)

  if (orphanErr) throw orphanErr

  const coveredJobIds = new Set((rows || []).map(r => r.job_id as string))
  const syntheticRows = (orphanJobs || [])
    .filter(j => !coveredJobIds.has(j.id))
    .map(j => {
      const url =
        extractMyJobMagListingUrl(j.application_url) ||
        extractMyJobMagListingUrl(j.apply_link) ||
        extractMyJobMagListingUrl(j.identifier)
      if (!url) return null
      return {
        id: `orphan:${j.id}`,
        job_id: j.id,
        job_url: url,
        status: 'published',
        raw_data: null,
        orphan: true as const,
      }
    })
    .filter(Boolean) as Array<{
    id: string
    job_id: string
    job_url: string
    status: string
    raw_data: unknown
    orphan?: boolean
  }>

  const allRows = [...(rows || []), ...syntheticRows].slice(0, limit)

  const results: FixMyJobMagJobResult[] = []
  let updated = 0
  let unchanged = 0
  let skipped = 0
  let errors = 0

  log(
    `MyJobMag fix: ${allRows.length} row(s) (scraper=${rows?.length || 0}, orphan=${syntheticRows.length}, apply=${apply}, boardApplyOnly=${boardApplyOnly})`
  )

  for (const row of allRows) {
    const jobId = row.job_id as string
    const jobUrl = row.job_url as string
    const isOrphan = Boolean((row as { orphan?: boolean }).orphan)
    const base: FixMyJobMagJobResult = {
      source_row_id: row.id,
      job_id: jobId,
      job_url: jobUrl,
      status: 'unchanged',
    }

    try {
      const { data: job, error: jobErr } = await supabase
        .from('jobs')
        .select(
          'id, title, company, location, job_location_city, job_location_county, job_location_country, application_url, apply_link, apply_email, valid_through, expires_at, date_posted, created_at, hiring_organization_name, description, additional_info, responsibilities, required_qualifications'
        )
        .eq('id', jobId)
        .maybeSingle()

      if (jobErr) throw jobErr
      if (!job) {
        skipped++
        results.push({ ...base, status: 'skipped', error: 'job row missing' })
        log(`skip ${jobUrl} — job missing`)
        continue
      }

      base.title = job.title as string

      if (boardApplyOnly) {
        const app = `${job.application_url || ''} ${job.apply_link || ''}`
        const stillBoard = /myjobmag\.co\.ke/i.test(app)
        const hasEmail = Boolean(normStr(job.apply_email))
        const brokenDesc = jobHasBrokenBoardLinks(job as Record<string, unknown>)
        // Also fix email-only posts that wrongly still have a board application_url,
        // board-URL posts that need an employer method, and HTML fields with
        // relative /apply-now/ anchors that 404 on CareerSasa.
        if (!stillBoard && hasEmail && !brokenDesc) {
          unchanged++
          results.push({ ...base, status: 'unchanged' })
          log(`ok already employer method ${base.title}`)
          if (delayMs > 0) await sleep(delayMs)
          continue
        }
        if (!stillBoard && !hasEmail && !brokenDesc) {
          // May still need email/link discovery from live page
        }
      }

      let detail
      let normalized
      try {
        detail = await fetchMyJobMagJobDetails(jobUrl)
        normalized = normalizeMyJobMagJob(detail)
      } catch (fetchErr) {
        // Live listing gone — absolutize any remaining relative /apply-now/ anchors.
        const htmlFields = [
          'description',
          'additional_info',
          'responsibilities',
          'required_qualifications',
        ] as const
        const offlinePatch: Record<string, unknown> = {}
        for (const field of htmlFields) {
          const current = asHtmlString((job as Record<string, unknown>)[field])
          const fixed = rewriteMyJobMagStoredHtml(current)
          if (fixed != null && fixed !== current) {
            offlinePatch[field] = fixed
          }
        }
        if (Object.keys(offlinePatch).length === 0) {
          skipped++
          results.push({
            ...base,
            status: 'skipped',
            error: `MyJobMag listing unavailable: ${
              fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
            }`,
          })
          log(`skip unavailable ${base.title}`)
          if (delayMs > 0) await sleep(delayMs)
          continue
        }

        const offlineChanges: Record<string, { from: unknown; to: unknown }> = {}
        for (const [field, to] of Object.entries(offlinePatch)) {
          trackChange(offlineChanges, field, (job as Record<string, unknown>)[field], to)
        }
        if (!apply) {
          updated++
          results.push({ ...base, status: 'would_update', changes: offlineChanges })
          log(`would update offline links ${base.title}: ${Object.keys(offlineChanges).join(', ')}`)
        } else {
          const { error: updErr } = await supabase
            .from('jobs')
            .update(offlinePatch)
            .eq('id', jobId)
          if (updErr) throw updErr
          updated++
          results.push({ ...base, status: 'updated', changes: offlineChanges })
          log(`updated offline links ${base.title}: ${Object.keys(offlineChanges).join(', ')}`)
        }
        if (delayMs > 0) await sleep(delayMs)
        continue
      }

      const publishedAt = new Date(
        (job.date_posted as string) || (job.created_at as string) || Date.now()
      )
      const deadline = resolveScrapedDeadline(normalized.valid_through, publishedAt)

      const employerAppUrl = normalized.application_url?.trim() || null
      const applyEmail = normalized.apply_email?.trim() || null
      const applyLink = normalized.apply_link?.trim() || null
      // Prefer employer URL; email-only leaves application_url null;
      // only fall back to the MyJobMag listing when no employer method exists.
      const applicationUrl = employerAppUrl || (applyEmail ? null : jobUrl)

      const validThrough = deadline.validThrough
      const expiresAt = expiresAtFromValidThrough(validThrough)

      const htmlFields = [
        'description',
        'additional_info',
        'responsibilities',
        'required_qualifications',
      ] as const

      const patch: Record<string, unknown> = {
        location: normalized.location || job.location || 'Kenya',
        job_location_city: normalized.job_location_city || job.job_location_city || null,
        job_location_county:
          normalized.job_location_county || job.job_location_county || null,
        job_location_country: 'Kenya',
        application_url: applicationUrl,
        apply_link: applyLink,
        apply_email: applyEmail,
        valid_through: validThrough,
        expires_at: expiresAt,
      }

      // Prefer the exact apply-now redirect embedded in freshly fetched
      // descriptionHtml; otherwise only absolutize relative /apply-now/.
      const ctaHref =
        detail.descriptionHtml.match(
          /Interested and qualified[\s\S]*?<a\b[^>]*\bhref=["']([^"']+)["']/i
        )?.[1] || null

      for (const field of htmlFields) {
        const current =
          field === 'description'
            ? asHtmlString(job.description) || normalized.description
            : asHtmlString((job as Record<string, unknown>)[field])
        if (!current) continue
        let fixed = current
        if (ctaHref && /Interested and qualified/i.test(current) && /\/apply-now\//i.test(current)) {
          fixed = current.replace(
            /(<a\b[^>]*\bhref=["'])(\/apply-now\/\d+|https?:\/\/(?:www\.)?myjobmag\.co\.ke\/apply-now\/\d+)(["'])/gi,
            `$1${ctaHref}$3`
          )
        }
        fixed = rewriteMyJobMagStoredHtml(fixed) || fixed
        if (fixed !== asHtmlString((job as Record<string, unknown>)[field])) {
          patch[field] = fixed
        }
      }

      if (
        normalized.company &&
        !/^myjobmag/i.test(normalized.company) &&
        normalized.company !== 'Company Name Not Available'
      ) {
        patch.hiring_organization_name = normalized.company
        if (
          !job.company ||
          /^myjobmag/i.test(String(job.company)) ||
          String(job.company).toLowerCase() === 'anonymous employer' ||
          String(job.company).toLowerCase() === 'company name not available'
        ) {
          patch.company = normalized.company
        }
      }

      const changes: Record<string, { from: unknown; to: unknown }> = {}
      for (const [field, to] of Object.entries(patch)) {
        trackChange(changes, field, (job as Record<string, unknown>)[field], to)
      }

      base.title = (job.title as string) || detail.title

      if (Object.keys(changes).length === 0) {
        unchanged++
        if (apply && !isOrphan) {
          await supabase
            .from('scraped_job_sources')
            .update({ raw_data: detail })
            .eq('id', row.id)
        }
        results.push({ ...base, status: 'unchanged' })
        log(`ok unchanged ${base.title}`)
      } else if (!apply) {
        updated++
        results.push({ ...base, status: 'would_update', changes })
        log(
          `would update ${base.title}: ${Object.keys(changes).join(', ')}` +
            (changes.application_url
              ? ` [${changes.application_url.from} → ${changes.application_url.to}]`
              : '') +
            (changes.apply_email
              ? ` [email ${changes.apply_email.from} → ${changes.apply_email.to}]`
              : '') +
            (changes.description ? ' [description links]' : '')
        )
      } else {
        const { error: updErr } = await supabase.from('jobs').update(patch).eq('id', jobId)
        if (updErr) throw updErr
        if (!isOrphan) {
          await supabase
            .from('scraped_job_sources')
            .update({ raw_data: detail, status: 'published' })
            .eq('id', row.id)
        }
        updated++
        results.push({ ...base, status: 'updated', changes })
        log(`updated ${base.title}: ${Object.keys(changes).join(', ')}`)
      }
    } catch (err) {
      errors++
      const message = err instanceof Error ? err.message : String(err)
      results.push({ ...base, status: 'error', error: message })
      log(`error ${jobUrl}: ${message}`)
    }

    if (delayMs > 0) await sleep(delayMs)
  }

  log(
    `Done. examined=${results.length} updated=${updated} unchanged=${unchanged} skipped=${skipped} errors=${errors}`
  )

  return {
    examined: results.length,
    updated,
    unchanged,
    skipped,
    errors,
    results,
  }
}
