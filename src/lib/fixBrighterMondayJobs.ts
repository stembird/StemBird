/**
 * Re-fetch published BrighterMonday jobs and patch apply / location / deadline
 * using the current board adapter rules (employer methods + location_name +
 * employer deadline, with publish-date + 30 days fallback).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fetchBrighterMondayJobDetails,
  normalizeBrighterMondayJob,
} from './brightermonday-adapter'
import {
  expiresAtFromValidThrough,
  resolveScrapedDeadline,
} from './scraperDeadline'

export const BRIGHTERMONDAY_SOURCE_ID = 'brightermonday-kenya'

export interface FixBrighterMondayJobResult {
  source_row_id: string
  job_id: string
  job_url: string
  title?: string
  status: 'updated' | 'unchanged' | 'skipped' | 'error' | 'would_update'
  changes?: Record<string, { from: unknown; to: unknown }>
  error?: string
}

export interface FixBrighterMondayJobsOptions {
  limit?: number
  offset?: number
  apply?: boolean
  delayMs?: number
  onProgress?: (line: string) => void
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function extractBmListingUrl(value: unknown): string | null {
  if (!value || typeof value !== 'string') return null
  const match = value.match(
    /https?:\/\/(?:www\.)?brightermonday\.co\.ke\/listings\/[a-z0-9-]+/i
  )
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

export async function runFixBrighterMondayPublishedJobs(
  supabase: SupabaseClient,
  options: FixBrighterMondayJobsOptions = {}
): Promise<{
  examined: number
  updated: number
  unchanged: number
  skipped: number
  errors: number
  results: FixBrighterMondayJobResult[]
}> {
  const limit = options.limit ?? 200
  const offset = options.offset ?? 0
  const apply = options.apply ?? false
  const delayMs = options.delayMs ?? 1200
  const log = options.onProgress || (() => {})

  const { data: rows, error } = await supabase
    .from('scraped_job_sources')
    .select('id, job_id, job_url, status, raw_data')
    .eq('source_id', BRIGHTERMONDAY_SOURCE_ID)
    .not('job_id', 'is', null)
    .order('scraped_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) throw error

  // Also catch BM-linked jobs that were published without a scraper_sources row
  const { data: orphanJobs, error: orphanErr } = await supabase
    .from('jobs')
    .select('id, application_url, apply_link, identifier')
    .or(
      'application_url.ilike.%brightermonday.co.ke/listings/%,apply_link.ilike.%brightermonday.co.ke/listings/%,identifier.ilike.%brightermonday.co.ke/listings/%'
    )
    .limit(500)

  if (orphanErr) throw orphanErr

  const coveredJobIds = new Set((rows || []).map(r => r.job_id as string))
  const syntheticRows = (orphanJobs || [])
    .filter(j => !coveredJobIds.has(j.id))
    .map(j => {
      const url =
        extractBmListingUrl(j.application_url) ||
        extractBmListingUrl(j.apply_link) ||
        extractBmListingUrl(j.identifier)
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

  const results: FixBrighterMondayJobResult[] = []
  let updated = 0
  let unchanged = 0
  let skipped = 0
  let errors = 0

  log(
    `BrighterMonday fix: ${allRows.length} row(s) (scraper=${rows?.length || 0}, orphan=${syntheticRows.length}, apply=${apply})`
  )

  for (const row of allRows) {
    const jobId = row.job_id as string
    const jobUrl = row.job_url as string
    const isOrphan = Boolean((row as { orphan?: boolean }).orphan)
    const base: FixBrighterMondayJobResult = {
      source_row_id: row.id,
      job_id: jobId,
      job_url: jobUrl,
      status: 'unchanged',
    }

    try {
      const { data: job, error: jobErr } = await supabase
        .from('jobs')
        .select(
          'id, title, company, location, job_location_city, job_location_county, job_location_country, application_url, apply_link, apply_email, valid_through, expires_at, date_posted, created_at, hiring_organization_name'
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

      let detail
      let normalized
      try {
        detail = await fetchBrighterMondayJobDetails(jobUrl)
        normalized = normalizeBrighterMondayJob(detail)
      } catch (fetchErr) {
        // Listing removed/expired on BM — still enforce publish+30 if deadline missing
        const publishedAt = new Date(
          (job.date_posted as string) || (job.created_at as string) || Date.now()
        )
        const deadline = resolveScrapedDeadline(null, publishedAt)
        const softPatch: Record<string, unknown> = {}
        if (!asDateOnly(job.valid_through)) {
          softPatch.valid_through = deadline.validThrough
          softPatch.expires_at = expiresAtFromValidThrough(deadline.validThrough)
        }
        const loc = normStr(job.location)
        if (!loc || /^(kenya|ke)(,?\s*ke)?$/i.test(loc)) {
          softPatch.location = 'Kenya'
          softPatch.job_location_country = 'Kenya'
        }

        const softChanges: Record<string, { from: unknown; to: unknown }> = {}
        for (const [field, to] of Object.entries(softPatch)) {
          trackChange(softChanges, field, (job as Record<string, unknown>)[field], to)
        }

        base.title = job.title as string
        if (Object.keys(softChanges).length === 0) {
          skipped++
          results.push({
            ...base,
            status: 'skipped',
            error: `BM listing unavailable: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`,
          })
          log(`skip unavailable ${base.title}`)
        } else if (!apply) {
          updated++
          results.push({ ...base, status: 'would_update', changes: softChanges })
          log(`would soft-fix ${base.title}: ${Object.keys(softChanges).join(', ')}`)
        } else {
          const { error: updErr } = await supabase
            .from('jobs')
            .update(softPatch)
            .eq('id', jobId)
          if (updErr) throw updErr
          updated++
          results.push({ ...base, status: 'updated', changes: softChanges })
          log(`soft-updated unavailable ${base.title}: ${Object.keys(softChanges).join(', ')}`)
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
      const applicationUrl = employerAppUrl || (applyEmail ? null : jobUrl)

      const validThrough = deadline.validThrough
      const expiresAt = expiresAtFromValidThrough(validThrough)

      const patch: Record<string, unknown> = {
        location: normalized.location || 'Kenya',
        job_location_city: normalized.job_location_city || null,
        job_location_county: normalized.job_location_county || null,
        job_location_country: 'Kenya',
        application_url: applicationUrl,
        apply_link: applyLink,
        apply_email: applyEmail,
        valid_through: validThrough,
        expires_at: expiresAt,
      }

      // Prefer real employer name from BM JSON-LD when present
      if (
        normalized.company &&
        !/^brightermonday/i.test(normalized.company) &&
        normalized.company !== 'Company Name Not Available'
      ) {
        patch.hiring_organization_name = normalized.company
        if (
          !job.company ||
          /^brightermonday/i.test(String(job.company)) ||
          String(job.company).toLowerCase() === 'anonymous employer'
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
        log(`would update ${base.title}: ${Object.keys(changes).join(', ')}`)
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
