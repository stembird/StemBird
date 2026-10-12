import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Vercel process maxDuration is 300s. A healthy item can take a fetch + 60s
 * parse + a short tips call. Reclaiming at 2 minutes stole live work: the
 * next Process/Discover click put the row back to `pending` while the first
 * worker was still running (or about to publish).
 *
 * Only reclaim after an isolate is almost certainly dead.
 */
export const STALE_PROCESSING_MS = 5 * 60 * 1000

/** Process tries per scrape_queue row before it is moved to `failed`. */
export const MAX_SCRAPE_ATTEMPTS = 3

export const EXHAUSTED_SCRAPE_ATTEMPTS_MESSAGE = `Failed after ${MAX_SCRAPE_ATTEMPTS} publish attempts`

export function isScrapeAttemptsExhausted(attempts: number | null | undefined): boolean {
  return (attempts || 0) >= MAX_SCRAPE_ATTEMPTS
}

/**
 * Status after a process try fails. Attempts are incremented on pick, so
 * `previousAttempts` is the value before that increment.
 */
export function nextStatusAfterFailedScrapeAttempt(
  previousAttempts: number | null | undefined,
  permanent = false
): { attempts: number; status: 'pending' | 'failed' } {
  const attempts = (previousAttempts || 0) + 1
  return {
    attempts,
    status: permanent || attempts >= MAX_SCRAPE_ATTEMPTS ? 'failed' : 'pending',
  }
}

/** Stuck `processing` rows that already used their 3 tries go to `failed`. */
export function reclaimStuckItemStatus(
  attempts: number | null | undefined
): 'pending' | 'failed' {
  return isScrapeAttemptsExhausted(attempts) ? 'failed' : 'pending'
}

/**
 * Items left in `processing` after a killed Vercel invocation never get
 * picked again (picker only reads `pending`). Reclaim stale ones that still
 * have tries left; rows that already hit MAX_SCRAPE_ATTEMPTS go to `failed`.
 */
export async function reclaimStuckScrapeQueueItems(
  supabase: SupabaseClient,
  olderThanMs: number = STALE_PROCESSING_MS
): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString()

  const { data: exhaustedStamped, error: exhaustedStampedError } = await supabase
    .from('scrape_queue')
    .update({
      status: 'failed',
      error_message: EXHAUSTED_SCRAPE_ATTEMPTS_MESSAGE,
    })
    .eq('status', 'processing')
    .gte('attempts', MAX_SCRAPE_ATTEMPTS)
    .lt('processed_at', cutoff)
    .select('id')

  if (exhaustedStampedError) {
    console.error(
      '[scrape-queue] Failed to fail exhausted stuck items:',
      exhaustedStampedError.message
    )
  }

  const { data: exhaustedUnstamped, error: exhaustedUnstampedError } = await supabase
    .from('scrape_queue')
    .update({
      status: 'failed',
      error_message: EXHAUSTED_SCRAPE_ATTEMPTS_MESSAGE,
    })
    .eq('status', 'processing')
    .gte('attempts', MAX_SCRAPE_ATTEMPTS)
    .is('processed_at', null)
    .select('id')

  if (exhaustedUnstampedError) {
    console.error(
      '[scrape-queue] Failed to fail exhausted unstamped items:',
      exhaustedUnstampedError.message
    )
  }

  const { data: exhaustedPending, error: exhaustedPendingError } = await supabase
    .from('scrape_queue')
    .update({
      status: 'failed',
      error_message: EXHAUSTED_SCRAPE_ATTEMPTS_MESSAGE,
    })
    .eq('status', 'pending')
    .gte('attempts', MAX_SCRAPE_ATTEMPTS)
    .select('id')

  if (exhaustedPendingError) {
    console.error(
      '[scrape-queue] Failed to fail exhausted pending items:',
      exhaustedPendingError.message
    )
  }

  const { data: stamped, error: stampedError } = await supabase
    .from('scrape_queue')
    .update({
      status: 'pending',
      error_message: 'Reclaimed from stuck processing',
    })
    .eq('status', 'processing')
    .lt('processed_at', cutoff)
    .select('id')

  if (stampedError) {
    console.error('[scrape-queue] Failed to reclaim stuck items:', stampedError.message)
  }

  // Rows killed before processed_at was stamped on pick.
  const { data: unstamped, error: unstampedError } = await supabase
    .from('scrape_queue')
    .update({
      status: 'pending',
      error_message: 'Reclaimed from stuck processing',
    })
    .eq('status', 'processing')
    .is('processed_at', null)
    .select('id')

  if (unstampedError) {
    console.error('[scrape-queue] Failed to reclaim unstamped items:', unstampedError.message)
  }

  return (
    (exhaustedStamped?.length || 0) +
    (exhaustedUnstamped?.length || 0) +
    (exhaustedPending?.length || 0) +
    (stamped?.length || 0) +
    (unstamped?.length || 0)
  )
}

export interface QueueStatusCounts {
  pending: number
  processing: number
  done: number
  failed: number
}

export function emptyQueueStats(): QueueStatusCounts {
  return { pending: 0, processing: 0, done: 0, failed: 0 }
}

export function aggregateQueueStats(
  rows: Array<{ source_id: string; status: string }>
): Record<string, QueueStatusCounts> {
  const map: Record<string, QueueStatusCounts> = {}

  for (const row of rows) {
    if (!map[row.source_id]) map[row.source_id] = emptyQueueStats()
    const bucket = map[row.source_id]
    if (row.status === 'pending') bucket.pending++
    else if (row.status === 'processing') bucket.processing++
    else if (row.status === 'done') bucket.done++
    else if (row.status === 'failed') bucket.failed++
  }

  return map
}

/**
 * Page through scrape_queue — PostgREST/Supabase defaults to max 1000 rows per
 * request, which under-counts pending after a large Discover backlog and leaves
 * the admin "Process queue" button stuck disabled.
 */
export async function fetchAllQueueStatusRows(
  supabase: SupabaseClient,
  pageSize: number = 1000
): Promise<Array<{ source_id: string; status: string }>> {
  const all: Array<{ source_id: string; status: string }> = []
  let from = 0

  for (;;) {
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('scrape_queue')
      .select('source_id, status')
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

export function sumQueueStats(
  bySource: Record<string, QueueStatusCounts>
): QueueStatusCounts {
  return Object.values(bySource).reduce(
    (acc, stats) => {
      acc.pending += stats.pending
      acc.processing += stats.processing
      acc.done += stats.done
      acc.failed += stats.failed
      return acc
    },
    emptyQueueStats()
  )
}
