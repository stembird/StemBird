import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { runScrapeDiscover } from '@/lib/scrapeDiscover'
import { runScrapeProcessBatch, runScrapeProcessOne } from '@/lib/scrapeProcess'
import { createServiceRoleClient } from '@/lib/supabaseServiceClient'

function getServiceClient(): SupabaseClient {
  return createServiceRoleClient()
}

/**
 * Run discover in-process (no HTTP self-fetch).
 * HTTP loopback via NEXT_PUBLIC_SITE_URL often returns HTML (e.g. CDN/WAF pages),
 * which breaks JSON parsing in admin and cron callers.
 */
export async function triggerScrapeDiscover() {
  return runScrapeDiscover(getServiceClient())
}

export async function triggerScrapeProcess(): Promise<Record<string, unknown>> {
  return runScrapeProcessOne(getServiceClient())
}

/** Process up to maxJobs pending queue items (one per in-process call). */
export async function triggerScrapeProcessBatch(maxJobs: number = 15): Promise<{
  processed: number
  results: Record<string, unknown>[]
  stopped_early?: string
}> {
  return runScrapeProcessBatch(getServiceClient(), { maxJobs, budgetMs: 270_000 })
}
