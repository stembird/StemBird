import { SupabaseClient } from '@supabase/supabase-js'
import {
  MAX_SCRAPE_ATTEMPTS,
  STALE_PROCESSING_MS,
  emptyQueueStats,
  isNonStemSkipMessage,
  isOtherDoneMessage,
  isScrapeAttemptsExhausted,
  nextStatusAfterFailedScrapeAttempt,
  type QueueStatusCounts,
} from './scrapeQueueStats'

/**
 * Scholarship-queue twins of the jobs `scrapeQueueStats.ts` helpers. The pure
 * attempt policy, stale threshold and `done`-row bucketing rules are imported
 * from the jobs module unchanged so both pipelines behave identically — only
 * the table name differs (scholarship_queue / scraped_scholarship_sources).
 */

export {
  MAX_SCRAPE_ATTEMPTS as MAX_SCHOLARSHIP_ATTEMPTS,
  STALE_PROCESSING_MS as SCHOLARSHIP_STALE_PROCESSING_MS,
  emptyQueueStats as emptyScholarshipQueueStats,
  isScrapeAttemptsExhausted as isScholarshipAttemptsExhausted,
  nextStatusAfterFailedScrapeAttempt as nextStatusAfterFailedScholarshipAttempt,
}

const EXHAUSTED_MESSAGE = `Failed after ${MAX_SCRAPE_ATTEMPTS} publish attempts`
const RECLAIM_MESSAGE = 'Reclaimed from stuck processing'

/**
 * Scholarship-only hard-rule skips that belong in the "other done" bucket.
 * Expired deadlines already match the shared `isOtherDoneMessage` ("expired");
 * the Kenyan-eligibility and deadline-less skips are new vocabulary, so they
 * are listed here. 'deadline' (not 'no deadline') is deliberate: the permanent
 * fail message reads "No application deadline found …" and no other queue
 * message uses that word, so the bucket stays exact.
 */
export function isScholarshipSkipMessage(message: string | null | undefined): boolean {
  if (typeof message !== 'string') return false
  const m = message.toLowerCase()
  return m.includes('not open to kenyans') || m.includes('deadline')
}

/**
 * Zombie `processing` rows from killed Vercel invocations never get picked
 * again (the picker only reads `pending`). Same five passes as the jobs
 * version: exhausted rows fail for good, the rest go back to `pending`.
 */
export async function reclaimStuckScholarshipQueueItems(
  supabase: SupabaseClient,
  olderThanMs: number = STALE_PROCESSING_MS
): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString()

  const exhaustedUpdates = [
    supabase
      .from('scholarship_queue')
      .update({ status: 'failed', error_message: EXHAUSTED_MESSAGE })
      .eq('status', 'processing')
      .gte('attempts', MAX_SCRAPE_ATTEMPTS)
      .lt('processed_at', cutoff)
      .select('id'),
    supabase
      .from('scholarship_queue')
      .update({ status: 'failed', error_message: EXHAUSTED_MESSAGE })
      .eq('status', 'processing')
      .gte('attempts', MAX_SCRAPE_ATTEMPTS)
      .is('processed_at', null)
      .select('id'),
    supabase
      .from('scholarship_queue')
      .update({ status: 'failed', error_message: EXHAUSTED_MESSAGE })
      .eq('status', 'pending')
      .gte('attempts', MAX_SCRAPE_ATTEMPTS)
      .select('id'),
  ]

  const reclaimUpdates = [
    supabase
      .from('scholarship_queue')
      .update({ status: 'pending', error_message: RECLAIM_MESSAGE })
      .eq('status', 'processing')
      .lt('processed_at', cutoff)
      .select('id'),
    // Rows killed before processed_at was stamped on pick.
    supabase
      .from('scholarship_queue')
      .update({ status: 'pending', error_message: RECLAIM_MESSAGE })
      .eq('status', 'processing')
      .is('processed_at', null)
      .select('id'),
  ]

  let reclaimed = 0
  for (const [index, builder] of exhaustedUpdates.entries()) {
    const { data, error } = await builder
    if (error) {
      console.error(`[scholarship-queue] Failed to fail exhausted items (${index}):`, error.message)
    }
    reclaimed += data?.length || 0
  }
  for (const [index, builder] of reclaimUpdates.entries()) {
    const { data, error } = await builder
    if (error) {
      console.error(`[scholarship-queue] Failed to reclaim stuck items (${index}):`, error.message)
    }
    reclaimed += data?.length || 0
  }
  return reclaimed
}

/** `skipped_non_stem` here also counts scholarship-gate skips ("outside chemistry"). */
export function aggregateScholarshipQueueStats(
  rows: Array<{ source_id: string; status: string; error_message?: string | null }>
): Record<string, QueueStatusCounts> {
  const map: Record<string, QueueStatusCounts> = {}

  for (const row of rows) {
    if (!map[row.source_id]) map[row.source_id] = emptyQueueStats()
    const bucket = map[row.source_id]
    if (row.status === 'pending') bucket.pending++
    else if (row.status === 'processing') bucket.processing++
    else if (row.status === 'done') {
      bucket.done++
      // Same buckets as the jobs queue: the gate message contains
      // "outside chemistry", so isNonStemSkipMessage classifies it for free.
      if (isNonStemSkipMessage(row.error_message)) bucket.skipped_non_stem++
      else if (isOtherDoneMessage(row.error_message) || isScholarshipSkipMessage(row.error_message))
        bucket.other_done++
    } else if (row.status === 'failed') bucket.failed++
  }

  return map
}

/**
 * Page through scholarship_queue (PostgREST caps at 1000 rows/request, which
 * would under-count a large Discover backlog and stick the admin Process
 * button in the disabled state).
 */
export async function fetchAllScholarshipQueueStatusRows(
  supabase: SupabaseClient,
  pageSize: number = 1000
): Promise<Array<{ source_id: string; status: string; error_message: string | null }>> {
  const all: Array<{ source_id: string; status: string; error_message: string | null }> = []
  let from = 0

  for (;;) {
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('scholarship_queue')
      .select('source_id, status, error_message')
      .order('queued_at', { ascending: true })
      .range(from, to)

    if (error) throw error
    if (!data || data.length === 0) break

    all.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }

  return all
}

/** Published scholarships per source — a `done` queue row is not a publish. */
export async function fetchPublishedScholarshipCountsBySource(
  supabase: SupabaseClient,
  pageSize: number = 1000
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  let from = 0

  for (;;) {
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('scraped_scholarship_sources')
      .select('source_id')
      .eq('status', 'published')
      .not('scholarship_id', 'is', null)
      .range(from, to)

    if (error) throw error
    if (!data || data.length === 0) break
    for (const row of data) counts[row.source_id] = (counts[row.source_id] || 0) + 1
    if (data.length < pageSize) break
    from += pageSize
  }

  return counts
}

export function sumScholarshipQueueStats(
  bySource: Record<string, QueueStatusCounts>
): QueueStatusCounts {
  return Object.values(bySource).reduce(
    (acc, stats) => {
      acc.pending += stats.pending
      acc.processing += stats.processing
      acc.done += stats.done
      acc.failed += stats.failed
      acc.skipped_non_stem += stats.skipped_non_stem
      acc.other_done += stats.other_done
      return acc
    },
    emptyQueueStats()
  )
}
