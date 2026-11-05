import { SupabaseClient } from '@supabase/supabase-js'
import { fetchHtml, extractJobLinks, ScraperSelectors } from './scraper'
import { normalizeJobUrl } from './scraperDeadline'
import {
  DISCOVER_BUDGET_RESERVE_MS,
  DISCOVER_FAIL_FAST_CONSECUTIVE,
  shouldAbortAfterConsecutiveFailures,
  summarizeDiscoverResults,
  scrapeQueueRowIsKnownToDiscover,
  type DiscoverRunOptions,
  type DiscoverRunResult,
  type DiscoverSourceResult,
} from './scrapeDiscover'
import { reclaimStuckScholarshipQueueItems } from './scholarshipQueueStats'

/**
 * Scholarship Discover — the twin of scrapeDiscover.ts for
 * `scraper_sources.content_type = 'scholarship'`.
 *
 * Differences from the jobs version, on purpose:
 *   * HTML listings only. Scholarship boards are plain article lists, so none
 *     of the ATS adapters (Workable/Greenhouse/Taleo/…) apply. A source with
 *     any other `selectors.type` errors out loudly rather than silently
 *     scraping the wrong thing.
 *   * The cheap title filter is the INVERSE question: instead of "is this
 *     STEM?", it asks "is this actually a job and not an award?" — mixed
 *     boards (MyJobMag) list both. Conservative: only an explicit employment
 *     word with no funding word anywhere in the title skips.
 *   * Queue/tombstone tables are scholarship_queue / scraped_scholarship_sources.
 *
 * Env config:
 *   SCHOLARSHIP_DISCOVER_TITLE_FILTER  "true" (default) | "false" to queue
 *                                      every listing link untouched.
 */

export type ScholarshipDiscoverRunResult = DiscoverRunResult

/** Funding words that keep a listing title, whatever else it contains. */
const FUNDING_WORDS_RE =
  /\b(scholarship|scholarships|scholar|bursar|bursary|fellowship|fellow|grant|grants|award|awards|studentship|stipend|funding|fund|loan|sponsorship|tuition|financial aid|competition|call for applications|opportunity|opportunities|vacancy for scholars)\b/i

/** Explicit employment words — only meaningful when no funding word is present. */
const EMPLOYMENT_WORDS_RE =
  /\b(vacancy|vacancies|job|jobs|career|careers|employment|recruitment|recruit|position|positions|post|posts|internship|attachment|staff wanted|hiring|advertis\w*|tender|curriculum vitae|cv)\b/i

export function isObviousJobListing(title: string | null | undefined): boolean {
  const t = (title || '').trim()
  if (!t) return false
  if (FUNDING_WORDS_RE.test(t)) return false
  return EMPLOYMENT_WORDS_RE.test(t)
}

function isTitleFilterEnabled(): boolean {
  const raw = (
    (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process
      ?.env?.SCHOLARSHIP_DISCOVER_TITLE_FILTER || 'true'
  )
    .trim()
    .toLowerCase()
  return raw !== 'false' && raw !== 'off' && raw !== '0'
}

export type ScholarshipTitleFilterInput = {
  job_url: string
  partial_data?: { title?: string } | Record<string, unknown>
}

export type ScholarshipTitleFilterResult<T> = {
  kept: T[]
  /** Listing URLs that were clearly employment posts, so never queued. */
  skippedUrls: string[]
}

/**
 * Discover-time title pre-filter (listing title only — no fetch, no AI).
 * Titles with no title text at all are kept: the publish-time gate on the full
 * page decides those, and dropping on thin signal is how real awards get lost.
 */
export function filterDiscoveredScholarshipsByTitle<T extends ScholarshipTitleFilterInput>(
  discovered: T[]
): ScholarshipTitleFilterResult<T> {
  if (!isTitleFilterEnabled()) {
    return { kept: discovered, skippedUrls: [] }
  }

  const kept: T[] = []
  const skippedUrls: string[] = []

  for (const item of discovered) {
    const title = typeof item.partial_data?.title === 'string' ? item.partial_data.title : ''
    if (!title.trim()) {
      kept.push(item)
      continue
    }
    if (isObviousJobListing(title)) {
      skippedUrls.push(item.job_url)
      continue
    }
    kept.push(item)
  }

  return { kept, skippedUrls }
}

/**
 * Every scholarship_queue row is known to Discover, `failed` included — same
 * rule as the jobs pipeline: re-queueing a failed row used to reset attempts
 * and retry forever. Imported predicate so both pipelines cannot drift.
 */
export function scholarshipQueueRowIsKnownToDiscover(status?: string | null): boolean {
  return scrapeQueueRowIsKnownToDiscover(status)
}

export type KnownScholarshipUrlLookup = (
  supabase: SupabaseClient,
  urls: string[]
) => Promise<Set<string>>

/**
 * Tombstone check: URLs already queued (any status) or already recorded in
 * scraped_scholarship_sources (published, duplicate, failed or skipped).
 * Chunked `.in()` queries because PostgREST caps URL list sizes.
 */
export async function lookupKnownScholarshipUrls(
  supabase: SupabaseClient,
  urls: string[]
): Promise<Set<string>> {
  const knownUrls = new Set<string>()
  if (urls.length === 0) return knownUrls

  const normalized = [...new Set(urls.map(u => normalizeJobUrl(u)))]
  const chunkSize = 100
  for (let c = 0; c < normalized.length; c += chunkSize) {
    const chunk = normalized.slice(c, c + chunkSize)
    const [{ data: alreadyQueued }, { data: alreadyRecorded }] = await Promise.all([
      supabase.from('scholarship_queue').select('scholarship_url, status').in('scholarship_url', chunk),
      supabase.from('scraped_scholarship_sources').select('scholarship_url').in('scholarship_url', chunk),
    ])
    for (const r of alreadyQueued || []) {
      if (scholarshipQueueRowIsKnownToDiscover(r.status)) {
        knownUrls.add(normalizeJobUrl(r.scholarship_url))
      }
    }
    for (const r of alreadyRecorded || []) knownUrls.add(normalizeJobUrl(r.scholarship_url))
  }
  return knownUrls
}

function emptyRunResult(): DiscoverRunResult {
  return {
    success: true,
    sources_processed: 0,
    sources_ok: 0,
    sources_failed: 0,
    total_queued: 0,
    total_found: 0,
    results: [],
    error_summary: null,
  }
}

export async function runScholarshipDiscover(
  supabase: SupabaseClient,
  options?: DiscoverRunOptions
): Promise<DiscoverRunResult> {
  let query = supabase
    .from('scraper_sources')
    .select('*')
    .eq('is_active', true)
    .eq('content_type', 'scholarship')

  if (options?.sourceId) {
    query = supabase
      .from('scraper_sources')
      .select('*')
      .eq('source_id', options.sourceId)
      .eq('content_type', 'scholarship')
  }

  const { data: sources, error: sourcesError } = await query
  if (sourcesError) throw sourcesError
  if (!sources || sources.length === 0) return emptyRunResult()

  // Kill zombie "processing" rows left by timed-out invokes so Discover sees
  // them as pending again and the admin Process button re-enables.
  const reclaimed = await reclaimStuckScholarshipQueueItems(supabase)
  if (reclaimed > 0) {
    console.warn(`[scholarship-discover] Reclaimed ${reclaimed} stuck processing queue item(s)`)
  }

  const budgetMs = options?.budgetMs ?? 240_000
  const failFastAfter =
    options?.failFastAfterConsecutiveErrors ??
    (options?.sourceId ? 0 : DISCOVER_FAIL_FAST_CONSECUTIVE)
  const startedAt = Date.now()
  const results: DiscoverSourceResult[] = []
  let stoppedEarly: string | undefined
  let consecutiveFailures = 0

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i]
    const elapsed = Date.now() - startedAt
    if (elapsed >= budgetMs - DISCOVER_BUDGET_RESERVE_MS) {
      stoppedEarly = `Stopped after ${results.length} source(s) to stay within Vercel time limits (${Math.round(
        elapsed / 1000
      )}s elapsed). Run Discover again or per-source.`
      break
    }

    const sourceResult: DiscoverSourceResult = {
      source_id: source.source_id,
      found: 0,
      queued: 0,
      already_known: 0,
      skipped_off_topic: 0,
      error: null,
    }

    try {
      if (!source.is_active && options?.sourceId) {
        throw new Error('Source is not active')
      }

      const config = source.selectors as { type?: string }
      const adapterType = config.type || 'html'
      if (adapterType !== 'html') {
        throw new Error(
          `Unsupported scholarship scraper type "${adapterType}". Scholarship sources use the HTML listing adapter ("html").`
        )
      }

      const html = await fetchHtml(source.base_url)
      let discovered = extractJobLinks(html, source.base_url, source.selectors as ScraperSelectors)

      // Cheap employment-post skip for mixed boards. Skipped URLs are recorded
      // as tombstones so the next run counts them as known (no repeat work).
      const titleFilter = filterDiscoveredScholarshipsByTitle(discovered)
      sourceResult.skipped_off_topic = titleFilter.skippedUrls.length
      discovered = titleFilter.kept

      if (titleFilter.skippedUrls.length > 0) {
        // content_hash is NOT NULL/UNIQUE but carries no meaning for these
        // rows — they never become publications. A URL-derived hash keeps them
        // distinct and stable across runs.
        const skippedRows = [...new Set(titleFilter.skippedUrls.map(u => normalizeJobUrl(u)))].map(
          url => ({
            source_id: source.source_id,
            scholarship_url: url,
            scholarship_id: null,
            content_hash: `skip-${simpleHash(url)}`,
            status: 'skipped',
            raw_data: { skip_reason: 'not_a_scholarship_title' },
          })
        )
        const { error: skipError } = await supabase
          .from('scraped_scholarship_sources')
          .upsert(skippedRows, { onConflict: 'scholarship_url' })
        // Bookkeeping only — never fail the run because skips weren't recorded.
        if (skipError) {
          console.warn(
            `[scholarship-discover] Failed to record non-scholarship skips for ${source.source_id}: ${skipError.message}`
          )
        }
      }

      sourceResult.found = discovered.length
      if (discovered.length === 0) {
        results.push(sourceResult)
        consecutiveFailures = 0
        continue
      }

      // Canonicalize so trailing slashes / tracking params don't bypass dedupe.
      const normalizedItems = discovered.map(item => ({
        ...item,
        job_url: normalizeJobUrl(item.job_url),
      }))
      const urls = [...new Set(normalizedItems.map(item => item.job_url))]
      const knownUrls = await lookupKnownScholarshipUrls(supabase, urls)
      sourceResult.already_known = urls.filter(u => knownUrls.has(u)).length

      const newItemsByUrl = new Map<string, (typeof normalizedItems)[number]>()
      for (const item of normalizedItems) {
        if (knownUrls.has(item.job_url)) continue
        if (!newItemsByUrl.has(item.job_url)) newItemsByUrl.set(item.job_url, item)
      }
      const newItems = [...newItemsByUrl.values()]

      if (newItems.length > 0) {
        const { error: insertError } = await supabase.from('scholarship_queue').insert(
          newItems.map(item => ({
            source_id: source.source_id,
            scholarship_url: item.job_url,
            status: 'pending',
            partial_data: item.partial_data,
          }))
        )
        if (insertError) throw insertError
        sourceResult.queued = newItems.length
      }

      consecutiveFailures = 0
      await supabase
        .from('scraper_sources')
        .update({ last_discovered_at: new Date().toISOString() })
        .eq('source_id', source.source_id)
    } catch (err: unknown) {
      sourceResult.error = err instanceof Error ? err.message : String(err)
      consecutiveFailures += 1
      console.error(`[scholarship-discover] Error on source ${source.source_id}:`, sourceResult.error)
    }

    results.push(sourceResult)

    const queuedSoFar = results.reduce((sum, r) => sum + r.queued, 0)
    if (shouldAbortAfterConsecutiveFailures(consecutiveFailures, failFastAfter, queuedSoFar)) {
      stoppedEarly = `Stopped after ${consecutiveFailures} consecutive source failures with nothing queued (likely external outage). ${
        results.filter(r => r.error).length
      } source(s) failed.`
      console.error(`[scholarship-discover] ${stoppedEarly}`)
      break
    }
  }

  const summary = summarizeDiscoverResults(results, stoppedEarly)

  if (!summary.success) {
    console.error(
      `[scholarship-discover] Run failed: ${summary.sources_failed}/${summary.sources_processed} sources errored.` +
        (summary.error_summary ? ` ${summary.error_summary}` : '')
    )
  } else if (summary.sources_failed > 0) {
    console.warn(
      `[scholarship-discover] Partial success: ${summary.sources_ok} ok, ${summary.sources_failed} failed, ${summary.total_queued} queued.` +
        (summary.error_summary ? ` ${summary.error_summary}` : '')
    )
  }

  return {
    ...summary,
    results,
    ...(stoppedEarly ? { stopped_early: stoppedEarly } : {}),
  }
}

/**
 * FNV-1a hex — used only for throwaway tombstone hashes for skipped URLs (no
 * publication semantics). Same ES2017-safe arithmetic as everywhere else here.
 */
function simpleHash(value: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16)
}
