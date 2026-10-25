import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import {
  aggregateQueueStats,
  emptyQueueStats,
  fetchAllQueueStatusRows,
  fetchPublishedCountsBySource,
  sumQueueStats,
} from '@/lib/scrapeQueueStats'

export const runtime = 'nodejs'

/**
 * GET /api/admin/scraper-sources
 * Admin-only: list scraper sources with queue stats.
 * `published` counts come from scraped_job_sources (real published jobs),
 * not from `done` queue rows which also include STEM-skipped and duplicate rows.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.ok === false) {
      return NextResponse.json({ error: auth.message }, { status: auth.status })
    }

    const { adminClient } = auth

    const [{ data: sources, error: sourcesError }, queueStats, publishedBySource] =
      await Promise.all([
        adminClient.from('scraper_sources').select('*').order('name', { ascending: true }),
        fetchAllQueueStatusRows(adminClient),
        fetchPublishedCountsBySource(adminClient),
      ])

    if (sourcesError) {
      return NextResponse.json({ error: sourcesError.message }, { status: 500 })
    }

    const statsBySource = aggregateQueueStats(queueStats)

    const enriched = (sources || []).map(source => ({
      ...source,
      queue_stats: {
        ...(statsBySource[source.source_id] || emptyQueueStats()),
        published: publishedBySource[source.source_id] || 0,
      },
    }))

    const totals = {
      ...sumQueueStats(
        Object.fromEntries(enriched.map(s => [s.source_id, s.queue_stats]))
      ),
      published: Object.values(publishedBySource).reduce((a, b) => a + b, 0),
    }

    return NextResponse.json({
      sources: enriched,
      totals,
      active_count: enriched.filter(s => s.is_active).length,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/scraper-sources] GET failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
