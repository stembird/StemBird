import { SupabaseClient } from '@supabase/supabase-js'
import { fetchHtml, extractJobLinks, ScraperSelectors } from './scraper'
import { discoverWorkableJobs, WorkableSourceConfig } from './workable-adapter'
import { discoverSmartRecruitersJobs, SmartRecruitersSourceConfig } from './smartrecruiters-adapter'
import { discoverGreenhouseJobs, GreenhouseSourceConfig } from './greenhouse-adapter'
import { discoverTaleoJobs, TaleoSourceConfig } from './taleo-adapter'
import { discoverTaleoBeJobs, TaleoBeSourceConfig } from './taleo-be-adapter'
import {
  discoverOracleCloudJobs,
  OracleCloudSourceConfig,
} from './oracle-cloud-adapter'
import { discoverPscJobs } from './psc-adapter'
import { discoverPscPdfDocuments, PscPdfSourceConfig } from './psc-pdf-adapter'
import {
  discoverBrighterMondayJobs,
  BrighterMondaySourceConfig,
} from './brightermonday-adapter'
import { discoverFuzuJobs, FuzuSourceConfig } from './fuzu-adapter'
import { discoverMyJobMagJobs, MyJobMagSourceConfig } from './myjobmag-adapter'
import { normalizeJobUrl } from './scraperDeadline'
import { reclaimStuckScrapeQueueItems, STALE_PROCESSING_MS } from './scrapeQueueStats'

export interface DiscoverSourceResult {
  source_id: string
  found: number
  queued: number
  /** URLs seen on the board that were already in scrape_queue or scraped_job_sources */
  already_known: number
  error: string | null
}

export interface DiscoverRunResult {
  /**
   * False when every attempted source failed, or when failures left zero jobs
   * queued/found. Partial runs (some OK, some failed) remain success:true with
   * sources_failed > 0 so callers can still surface errors.
   */
  success: boolean
  sources_processed: number
  sources_ok: number
  sources_failed: number
  total_queued: number
  total_found: number
  results: DiscoverSourceResult[]
  /** Short human-readable summary of per-source errors (null when none). */
  error_summary: string | null
  stopped_early?: string
}

export interface DiscoverRunOptions {
  sourceId?: string
  /**
   * Soft time budget in ms. Stop before starting another source once exceeded.
   * Prevents Vercel hard timeouts that return HTML error pages instead of JSON.
   */
  budgetMs?: number
  /**
   * Abort the whole discover run after this many consecutive source failures
   * with nothing queued yet. Cuts CPU spikes during external outages.
   * Default: 5. Set 0 to disable.
   */
  failFastAfterConsecutiveErrors?: number
}

/** Leave headroom so the response can serialize before Vercel kills the isolate. */
export const DISCOVER_BUDGET_RESERVE_MS = 20_000

/** Default consecutive-failure abort threshold for multi-source runs. */
export const DISCOVER_FAIL_FAST_CONSECUTIVE = 5

const SUPPORTED_TYPES = new Set([
  'workable',
  'smartrecruiters',
  'greenhouse',
  'taleo',
  'taleo_be',
  'oracle_cloud',
  'psc',
  'psc_pdf',
  'brightermonday',
  'fuzu',
  'myjobmag',
  'html',
])

export function summarizeDiscoverResults(
  results: DiscoverSourceResult[],
  stoppedEarly?: string
): Pick<
  DiscoverRunResult,
  | 'success'
  | 'sources_processed'
  | 'sources_ok'
  | 'sources_failed'
  | 'total_queued'
  | 'total_found'
  | 'error_summary'
> {
  const sources_ok = results.filter(r => !r.error).length
  const sources_failed = results.filter(r => !!r.error).length
  const total_queued = results.reduce((sum, r) => sum + r.queued, 0)
  const total_found = results.reduce((sum, r) => sum + r.found, 0)
  const errors = results.filter(r => r.error).map(r => `${r.source_id}: ${r.error}`)
  const error_summary =
    errors.length === 0
      ? null
      : errors.length <= 3
        ? errors.join('; ')
        : `${errors.slice(0, 3).join('; ')}; +${errors.length - 3} more`

  // Empty run (no sources) is OK. All attempted sources failed → not OK.
  // Also treat "failures and zero yield" as failure so cron/monitoring notice.
  const attempted = results.length > 0
  const allFailed = attempted && sources_failed === results.length
  const failedWithNoYield =
    attempted && sources_failed > 0 && total_queued === 0 && total_found === 0 && !stoppedEarly

  return {
    success: !allFailed && !failedWithNoYield,
    sources_processed: results.length,
    sources_ok,
    sources_failed,
    total_queued,
    total_found,
    error_summary,
  }
}

export function shouldAbortAfterConsecutiveFailures(
  consecutiveFailures: number,
  threshold: number,
  totalQueuedSoFar: number
): boolean {
  if (threshold <= 0) return false
  if (totalQueuedSoFar > 0) return false
  return consecutiveFailures >= threshold
}

/**
 * Every scrape_queue row is known to Discover, including `failed`.
 * Requeueing failed jobs used to reset attempts to 0 and retry forever.
 */
export function scrapeQueueRowIsKnownToDiscover(
  _status?: string | null
): boolean {
  return true
}

async function lookupKnownJobUrls(
  supabase: SupabaseClient,
  urls: string[]
): Promise<Set<string>> {
  const knownUrls = new Set<string>()
  if (urls.length === 0) return knownUrls

  const normalized = [...new Set(urls.map(u => normalizeJobUrl(u)))]
  const chunkSize = 100
  for (let c = 0; c < normalized.length; c += chunkSize) {
    const chunk = normalized.slice(c, c + chunkSize)
    const [{ data: alreadyQueued }, { data: alreadyPublished }] = await Promise.all([
      supabase.from('scrape_queue').select('job_url, status').in('job_url', chunk),
      supabase.from('scraped_job_sources').select('job_url').in('job_url', chunk),
    ])
    for (const r of alreadyQueued || []) {
      if (scrapeQueueRowIsKnownToDiscover(r.status)) {
        knownUrls.add(normalizeJobUrl(r.job_url))
      }
    }
    for (const r of alreadyPublished || []) knownUrls.add(normalizeJobUrl(r.job_url))
  }
  return knownUrls
}

export async function runScrapeDiscover(
  supabase: SupabaseClient,
  options?: DiscoverRunOptions
): Promise<DiscoverRunResult> {
  let query = supabase.from('scraper_sources').select('*').eq('is_active', true)

  if (options?.sourceId) {
    query = supabase.from('scraper_sources').select('*').eq('source_id', options.sourceId)
  }

  const { data: sources, error: sourcesError } = await query

  if (sourcesError) throw sourcesError
  if (!sources || sources.length === 0) {
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

  // Kill zombie "processing" rows left by timed-out Vercel invokes so Discover
  // can treat them as pending again and the admin Process button re-enables.
  const reclaimed = await reclaimStuckScrapeQueueItems(supabase, STALE_PROCESSING_MS)
  if (reclaimed > 0) {
    console.warn(`[discover] Reclaimed ${reclaimed} stuck processing queue item(s)`)
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
      stoppedEarly = `Stopped after ${results.length} source(s) to stay within Vercel time limits (${Math.round(elapsed / 1000)}s elapsed). Run Discover again or per-source.`
      break
    }

    const sourceResult: DiscoverSourceResult = {
      source_id: source.source_id,
      found: 0,
      queued: 0,
      already_known: 0,
      error: null,
    }

    try {
      if (!source.is_active && options?.sourceId) {
        throw new Error('Source is not active')
      }

      const config = source.selectors as { type?: string }
      const adapterType = config.type || 'html'

      if (!SUPPORTED_TYPES.has(adapterType)) {
        throw new Error(
          `Unsupported scraper type "${adapterType}". Supported: ${[...SUPPORTED_TYPES].join(', ')}`
        )
      }

      let discovered: Array<{ job_url: string; partial_data: Record<string, unknown> }>

      if (adapterType === 'workable') {
        discovered = await discoverWorkableJobs(source.selectors as WorkableSourceConfig)
      } else if (adapterType === 'smartrecruiters') {
        discovered = await discoverSmartRecruitersJobs(source.selectors as SmartRecruitersSourceConfig)
      } else if (adapterType === 'greenhouse') {
        discovered = await discoverGreenhouseJobs(source.selectors as GreenhouseSourceConfig)
      } else if (adapterType === 'taleo') {
        discovered = await discoverTaleoJobs(
          source.selectors as TaleoSourceConfig,
          source.base_url
        )
      } else if (adapterType === 'taleo_be') {
        discovered = await discoverTaleoBeJobs(
          source.selectors as TaleoBeSourceConfig,
          source.base_url
        )
      } else if (adapterType === 'oracle_cloud') {
        discovered = await discoverOracleCloudJobs(
          source.selectors as OracleCloudSourceConfig,
          source.base_url
        )
      } else if (adapterType === 'psc') {
        discovered = await discoverPscJobs(source.base_url)
      } else if (adapterType === 'psc_pdf') {
        discovered = await discoverPscPdfDocuments(source.base_url, source.selectors as PscPdfSourceConfig)
      } else if (adapterType === 'brightermonday') {
        discovered = await discoverBrighterMondayJobs(
          source.selectors as BrighterMondaySourceConfig,
          source.base_url
        )
      } else if (adapterType === 'fuzu') {
        discovered = await discoverFuzuJobs(
          source.selectors as FuzuSourceConfig,
          source.base_url
        )
      } else if (adapterType === 'myjobmag') {
        discovered = await discoverMyJobMagJobs(
          source.selectors as MyJobMagSourceConfig,
          source.base_url,
          {
            findKnownUrls: async urls => {
              const knownUrls = await lookupKnownJobUrls(supabase, urls)
              const knownAsPassed = new Set<string>()
              for (const url of urls) {
                if (knownUrls.has(normalizeJobUrl(url))) {
                  knownAsPassed.add(url)
                }
              }
              return knownAsPassed
            },
            stopAfterKnownPages: 2,
          }
        )
      } else {
        const html = await fetchHtml(source.base_url)
        discovered = extractJobLinks(html, source.base_url, source.selectors as ScraperSelectors)
      }

      sourceResult.found = discovered.length

      if (discovered.length === 0) {
        results.push(sourceResult)
        consecutiveFailures = 0
        continue
      }

      // Canonicalize URLs so trailing slashes / tracking params don't bypass dedupe
      const discoveredNormalized = discovered.map(j => ({
        ...j,
        job_url: normalizeJobUrl(j.job_url),
      }))
      const urls = [...new Set(discoveredNormalized.map(j => j.job_url))]
      const knownUrls = await lookupKnownJobUrls(supabase, urls)
      sourceResult.already_known = urls.filter(u => knownUrls.has(u)).length

      const newJobsByUrl = new Map<string, (typeof discoveredNormalized)[number]>()
      for (const j of discoveredNormalized) {
        if (knownUrls.has(j.job_url)) continue
        if (!newJobsByUrl.has(j.job_url)) {
          newJobsByUrl.set(j.job_url, j)
        }
      }
      const newJobs = [...newJobsByUrl.values()]

      if (newJobs.length === 0) {
        results.push(sourceResult)
        consecutiveFailures = 0
        await supabase
          .from('scraper_sources')
          .update({ last_discovered_at: new Date().toISOString() })
          .eq('source_id', source.source_id)
        continue
      }

      if (newJobs.length > 0) {
        const { error: insertError } = await supabase.from('scrape_queue').insert(
          newJobs.map(j => ({
            source_id: source.source_id,
            job_url: j.job_url,
            status: 'pending',
            partial_data: j.partial_data,
          }))
        )

        if (insertError) throw insertError
      }

      sourceResult.queued = newJobs.length
      consecutiveFailures = 0

      await supabase
        .from('scraper_sources')
        .update({ last_discovered_at: new Date().toISOString() })
        .eq('source_id', source.source_id)
    } catch (err: unknown) {
      sourceResult.error = err instanceof Error ? err.message : String(err)
      consecutiveFailures += 1
      console.error(`[discover] Error on source ${source.source_id}:`, sourceResult.error)
    }

    results.push(sourceResult)

    const queuedSoFar = results.reduce((sum, r) => sum + r.queued, 0)
    if (shouldAbortAfterConsecutiveFailures(consecutiveFailures, failFastAfter, queuedSoFar)) {
      stoppedEarly = `Stopped after ${consecutiveFailures} consecutive source failures with nothing queued (likely external API outage). ${results.filter(r => r.error).length} source(s) failed.`
      console.error(`[discover] ${stoppedEarly}`)
      break
    }
  }

  const summary = summarizeDiscoverResults(results, stoppedEarly)

  if (!summary.success) {
    console.error(
      `[discover] Run failed: ${summary.sources_failed}/${summary.sources_processed} sources errored.` +
        (summary.error_summary ? ` ${summary.error_summary}` : '')
    )
  } else if (summary.sources_failed > 0) {
    console.warn(
      `[discover] Partial success: ${summary.sources_ok} ok, ${summary.sources_failed} failed, ${summary.total_queued} queued.` +
        (summary.error_summary ? ` ${summary.error_summary}` : '')
    )
  }

  return {
    ...summary,
    results,
    ...(stoppedEarly ? { stopped_early: stoppedEarly } : {}),
  }
}
