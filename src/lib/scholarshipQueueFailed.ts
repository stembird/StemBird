/**
 * Scholarship queue listing/mutation helpers — clone of scrapeQueueFailed.ts
 * pointed at `scholarship_queue` / `scraped_scholarship_sources`.
 *
 * The done-bucket classifier is imported from the jobs module unchanged
 * (`rowMatchesDoneBucket`): scholarship skip messages are deliberately chosen
 * to be caught by the same substrings ('outside chemistry' → screened out,
 * 'expired'/'duplicate' → other), so admins keep one review vocabulary across
 * both pipelines. Pure parsers (status/bucket/scope/action/list options) are
 * reused the same way — they carry no table knowledge.
 */
import { SupabaseClient } from '@supabase/supabase-js'
import {
  FailedQueueAction,
  FailedQueueListOptions,
  FailedQueueMutationResult,
  FailedQueueScope,
  QueueDoneBucket,
  QueueManageStatus,
  rowMatchesDoneBucket,
} from './scrapeQueueFailed'
import { isNonStemSkipMessage } from './scrapeQueueStats'
import { isScholarshipSkipMessage } from './scholarshipQueueStats'

const DEFAULT_PAGE_SIZE = 50
const WRITE_PAGE_SIZE = 500

export interface ScholarshipQueueItem {
  id: string
  source_id: string
  source_name: string | null
  scholarship_url: string
  title: string
  location: string | null
  error_message: string | null
  attempts: number
  queued_at: string | null
  processed_at: string | null
  status: string
  /** Populated on the published bucket via scraped_scholarship_sources → scholarships join. */
  scholarship_slug?: string | null
  scholarship_id?: string | null
  /**
   * Aliases of the fields the shared queue dialog already reads (`job_url`,
   * `job_slug`). The dialog is content-type agnostic; keeping both spellings in
   * the payload means the jobs page payload stays byte-identical.
   */
  job_url: string
  job_slug?: string | null
  job_id?: string | null
}

export interface ScholarshipQueueListResult {
  items: ScholarshipQueueItem[]
  total: number
  limit: number
  offset: number
  status: QueueManageStatus
}

type ScholarshipQueueRow = {
  id: string
  source_id: string
  scholarship_url: string
  status?: string | null
  error_message: string | null
  attempts: number | null
  queued_at: string | null
  processed_at: string | null
  partial_data: unknown
  scraper_sources?: { name?: string | null } | { name?: string | null }[] | null
  published_ref?: {
    scholarship_id?: string | null
    status?: string | null
    scholarships?: { slug?: string | null } | { slug?: string | null }[] | null
  } | null
}

const QUEUE_SELECT =
  'id, source_id, scholarship_url, status, error_message, attempts, queued_at, processed_at, partial_data, scraper_sources(name)'

function scholarshipDisplayTitle(partialData: unknown, scholarshipUrl: string): string {
  if (partialData && typeof partialData === 'object') {
    const title = (partialData as Record<string, unknown>).title
    if (typeof title === 'string' && title.trim()) return title.trim()
  }

  try {
    const last = new URL(scholarshipUrl).pathname.split('/').filter(Boolean).pop()
    if (last) {
      const decoded = decodeURIComponent(last).replace(/[-_]+/g, ' ').trim()
      if (decoded) return decoded
    }
  } catch {
    // keep fallback
  }

  return scholarshipUrl
}

function scholarshipLocation(partialData: unknown): string | null {
  if (!partialData || typeof partialData !== 'object') return null
  const location = (partialData as Record<string, unknown>).location
  if (typeof location === 'string' && location.trim()) return location.trim()
  return null
}

function sourceNameFromJoin(
  joined: ScholarshipQueueRow['scraper_sources']
): string | null {
  if (!joined) return null
  const row = Array.isArray(joined) ? joined[0] : joined
  const name = row?.name
  return typeof name === 'string' && name.trim() ? name : null
}

function rowStatus(row: ScholarshipQueueRow, fallback: QueueManageStatus): string {
  const value = row.status
  if (typeof value === 'string' && ['pending', 'processing', 'done', 'failed'].includes(value)) {
    return value
  }
  return fallback
}

/**
 * scholarship_queue has no FK to scraped_scholarship_sources, so PostgREST
 * cannot embed. For the published bucket, backfill scholarship links with a
 * second keyed query (both tables have scholarship_url UNIQUE).
 */
async function attachPublishedRefs(
  supabase: SupabaseClient,
  rows: ScholarshipQueueRow[]
): Promise<ScholarshipQueueRow[]> {
  if (rows.length === 0) return rows
  const urls = rows.map(r => r.scholarship_url)
  const refs = new Map<
    string,
    {
      scholarship_id: string | null
      status: string
      scholarships: { slug?: string | null } | { slug?: string | null }[] | null
    }
  >()
  for (let i = 0; i < urls.length; i += 100) {
    const chunk = urls.slice(i, i + 100)
    const { data, error } = await supabase
      .from('scraped_scholarship_sources')
      .select('scholarship_url, scholarship_id, status, scholarships ( slug )')
      .eq('status', 'published')
      .in('scholarship_url', chunk)
    if (error) throw error
    for (const row of data || []) {
      refs.set(row.scholarship_url, {
        scholarship_id: (row.scholarship_id as string | null) ?? null,
        status: row.status as string,
        scholarships: (row.scholarships as
          | { slug?: string | null }
          | { slug?: string | null }[]
          | null) ?? null,
      })
    }
  }
  return rows.map(row => ({ ...row, published_ref: refs.get(row.scholarship_url) ?? null }))
}

function publishedRefFromJoin(
  joined: ScholarshipQueueRow['published_ref']
): { scholarship_id: string | null; scholarship_slug: string | null; status: string } | null {
  if (!joined) return null
  const row = Array.isArray(joined) ? joined[0] : joined
  if (!row || row.status !== 'published') return null
  const scholarships = Array.isArray(row.scholarships) ? row.scholarships[0] : row.scholarships
  return {
    scholarship_id: row.scholarship_id ?? null,
    scholarship_slug: scholarships?.slug ?? null,
    status: row.status,
  }
}

function mapScholarshipQueueRow(
  row: ScholarshipQueueRow,
  fallbackStatus: QueueManageStatus
): ScholarshipQueueItem {
  const publishedRef = publishedRefFromJoin(row.published_ref)
  return {
    id: row.id,
    source_id: row.source_id,
    source_name: sourceNameFromJoin(row.scraper_sources),
    scholarship_url: row.scholarship_url,
    title: scholarshipDisplayTitle(row.partial_data, row.scholarship_url),
    location: scholarshipLocation(row.partial_data),
    error_message: row.error_message,
    attempts: row.attempts || 0,
    queued_at: row.queued_at,
    processed_at: row.processed_at,
    status: rowStatus(row, fallbackStatus),
    scholarship_slug: publishedRef?.scholarship_slug ?? null,
    scholarship_id: publishedRef?.scholarship_id ?? null,
    job_url: row.scholarship_url,
    job_slug: publishedRef?.scholarship_slug ?? null,
    job_id: publishedRef?.scholarship_id ?? null,
  }
}

export async function listScholarshipQueueItems(
  supabase: SupabaseClient,
  options: FailedQueueListOptions = {}
): Promise<ScholarshipQueueListResult> {
  const status = options.status ?? 'failed'
  const bucket = options.bucket ?? 'published'
  const limit = options.limit ?? DEFAULT_PAGE_SIZE
  const offset = options.offset ?? 0

  let query = supabase
    .from('scholarship_queue')
    .select(QUEUE_SELECT, { count: 'exact' })
    .eq('status', status)

  if (status === 'done') {
    // Coarse PostgREST pre-filter; exact bucket classification happens
    // in-memory below via rowMatchesDoneBucket (mirrors scrapeQueueStats).
    if (bucket === 'non_stem') {
      query = query.or(
        'error_message.ilike.*outside STEM*,error_message.ilike.*outside chemistry*'
      )
    } else if (bucket === 'published') {
      query = query.or('error_message.is.null,error_message.eq.""')
    } else if (bucket === 'other') {
      query = query.not('error_message', 'is', null)
    }
  }

  if (status === 'failed' || status === 'done') {
    query = query
      .order('processed_at', { ascending: false })
      .order('queued_at', { ascending: false })
  } else {
    query = query
      .order('queued_at', { ascending: true })
      .order('attempts', { ascending: true })
  }

  query = query.range(offset, offset + limit - 1)

  if (options.sourceId) {
    query = query.eq('source_id', options.sourceId)
  }

  const { data, error, count } = await query
  if (error) throw error

  let rows = (data || []) as unknown as ScholarshipQueueRow[]
  // PostgREST cannot express the full classifier, so re-filter the page for
  // the two buckets whose predicates are coarse. Scholarship 'other' rows also
  // include the two scholarship-specific skips (not open to Kenyans / no
  // deadline), which is why the published predicate is checked explicitly.
  if (status === 'done' && (bucket === 'other' || bucket === 'published')) {
    rows = rows.filter(row => rowMatchesScholarshipDoneBucket(row.error_message, bucket))
  }
  if (status === 'done' && bucket === 'published') {
    rows = await attachPublishedRefs(supabase, rows)
  }

  return {
    items: rows.map(row => mapScholarshipQueueRow(row, status)),
    total: count ?? 0,
    limit,
    offset,
    status,
  }
}

/**
 * Same classifier as the jobs pipeline plus the scholarship-only skip notes
 * ('not open to Kenyans', the no-deadline message). Done rows carrying one of
 * those are processed-but-not-published, so they belong in 'other', never in
 * the published bucket. The shared predicates are reused verbatim so both
 * dialogs bucket identical messages identically.
 */
export function rowMatchesScholarshipDoneBucket(
  error_message: string | null | undefined,
  bucket: QueueDoneBucket
): boolean {
  const isSkipNote = scholarshipSkipNote(error_message)
  // Only the 'published' bucket needs widening: the jobs classifier would call
  // a Kenyan-exclusion skip 'published' (it matches no skip keyword).
  if (bucket === 'published') return isSkipNote ? false : rowMatchesDoneBucket(error_message, bucket)
  if (bucket === 'other') {
    return rowMatchesDoneBucket(error_message, 'other') || (!isNonStemSkipMessage(error_message) && isSkipNote)
  }
  return rowMatchesDoneBucket(error_message, bucket)
}

function scholarshipSkipNote(message: string | null | undefined): boolean {
  return isScholarshipSkipMessage(message)
}

function applyScope<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  scope: FailedQueueScope
): T {
  if (scope.kind === 'source') return query.eq('source_id', scope.source_id)
  return query
}

async function updateScopedQueueItems(
  supabase: SupabaseClient,
  status: QueueManageStatus,
  scope: FailedQueueScope,
  patch: Record<string, unknown>
): Promise<number> {
  if (scope.kind === 'ids') {
    const { data, error } = await supabase
      .from('scholarship_queue')
      .update(patch)
      .eq('status', status)
      .in('id', scope.ids)
      .select('id')
    if (error) throw error
    return data?.length || 0
  }

  let affected = 0
  for (;;) {
    const { data, error } = await applyScope(
      supabase.from('scholarship_queue').update(patch).eq('status', status),
      scope
    )
      .select('id')
      .limit(WRITE_PAGE_SIZE)
    if (error) throw error
    const n = data?.length || 0
    affected += n
    if (n < WRITE_PAGE_SIZE) break
  }
  return affected
}

export async function requeueScholarshipQueueItems(
  supabase: SupabaseClient,
  scope: FailedQueueScope,
  status: QueueManageStatus = 'failed'
): Promise<number> {
  if (status === 'pending') throw new Error('Pending scholarships are already queued')
  if (status === 'done') {
    throw new Error('Done scholarships cannot be requeued — delete or run Discover again')
  }
  const patch =
    status === 'processing'
      ? {
          status: 'pending',
          error_message: 'Reclaimed by admin from processing',
          processed_at: null,
        }
      : {
          status: 'pending',
          error_message: 'Requeued by admin after failure',
          attempts: 0,
          processed_at: null,
        }
  return updateScopedQueueItems(supabase, status, scope, patch)
}

export async function deleteScholarshipQueueItems(
  supabase: SupabaseClient,
  scope: FailedQueueScope,
  status: QueueManageStatus = 'failed'
): Promise<number> {
  if (scope.kind === 'ids') {
    const { data, error } = await supabase
      .from('scholarship_queue')
      .delete()
      .eq('status', status)
      .in('id', scope.ids)
      .select('id')
    if (error) throw error
    return data?.length || 0
  }

  let affected = 0
  for (;;) {
    const { data, error } = await applyScope(
      supabase.from('scholarship_queue').delete().eq('status', status),
      scope
    )
      .select('id')
      .limit(WRITE_PAGE_SIZE)
    if (error) throw error
    const n = data?.length || 0
    affected += n
    if (n < WRITE_PAGE_SIZE) break
  }
  return affected
}

export async function mutateScholarshipQueueItems(
  supabase: SupabaseClient,
  action: FailedQueueAction,
  scope: FailedQueueScope,
  status: QueueManageStatus = 'failed'
): Promise<FailedQueueMutationResult> {
  const affected =
    action === 'delete'
      ? await deleteScholarshipQueueItems(supabase, scope, status)
      : await requeueScholarshipQueueItems(supabase, scope, status)
  return { action, status, affected }
}
