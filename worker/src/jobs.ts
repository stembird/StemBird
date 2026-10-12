import { runScrapeDiscover } from '../../src/lib/scrapeDiscover'
import { runScrapeProcessBatch } from '../../src/lib/scrapeProcess'
import { enrichJobsNeedingEnrichment } from '../../src/lib/enrichJobById'
import { runReenrichScrapedJobs } from '../../src/lib/reenrichScrapedJobs'
import { autoQueueDailyPosts } from '../../src/lib/social/autoQueueJobs'
import { createServiceRoleClient } from '../../src/lib/supabaseServiceClient'
import { env } from './env'

/**
 * Discover new jobs from all active scraper sources and queue them.
 * Reuses the exact same logic as the Vercel discover route (via the shared
 * src/lib/scrapeDiscover.ts), so behaviour matches the app.
 */
export async function runDiscover(sourceId?: string) {
  const supabase = createServiceRoleClient()
  const result = await runScrapeDiscover(supabase, {
    sourceId,
    // GitHub Actions has no 300s Vercel limit — use a generous sweep budget
    // so one discover run can cover all sources (default 10 min).
    budgetMs: env.discoverBudgetMs,
  })
  return result
}

/**
 * Process up to batch queue items (fetch detail → AI enrich → publish).
 * Reuses the same logic as the Vercel process route via src/lib/scrapeProcess.
 */
export async function runProcess(batch = 10) {
  const supabase = createServiceRoleClient()
  const result = await runScrapeProcessBatch(supabase, {
    maxJobs: batch,
    budgetMs: env.processBudgetMs,
  })
  return result
}

/**
 * Enrich jobs with AI normalize.
 * - mode 'sparse': active jobs missing fields from ANY intake path (the old
 *   Vercel enrich-jobs cron behavior).
 * - mode 'tips': disabled — dedicated career tips backfill is off.
 * - mode 'scraped': re-normalize published scraped jobs from stored raw_data,
 *   optionally limited to one source (the admin "Enrich scraped" behavior).
 */
export async function runEnrich(
  options: {
    mode?: 'scraped' | 'sparse' | 'tips'
    limit?: number
    sourceId?: string
    days?: number
  } = {}
) {
  const { mode = 'scraped', limit = 10, sourceId } = options

  if (mode === 'tips') {
    return {
      days: options.days ?? 7,
      scanned: 0,
      missing: 0,
      examined: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      remaining: 0,
      timed_out: false,
      scan_capped: false,
      disabled: true,
      results: [],
    }
  }

  const supabase = createServiceRoleClient()

  if (mode === 'sparse') {
    return enrichJobsNeedingEnrichment(supabase, { limit, apply: true })
  }

  return runReenrichScrapedJobs(supabase, {
    limit,
    sourceFilter: sourceId || null,
    apply: true,
  })
}

/**
 * Generate exclusive platform posts for recent active jobs and add them to
 * the Buffer queue (3 per channel per Nairobi day, Free-plan queue cap 10).
 */
export async function runSocial(options: { dryRun?: boolean } = {}) {
  const supabase = createServiceRoleClient()
  return autoQueueDailyPosts(supabase, {
    dryRun: options.dryRun === true,
    userId: process.env.SCRAPER_USER_ID ?? null,
  })
}
