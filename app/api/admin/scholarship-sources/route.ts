import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import {
  aggregateScholarshipQueueStats,
  emptyScholarshipQueueStats,
  fetchAllScholarshipQueueStatusRows,
  fetchPublishedScholarshipCountsBySource,
  sumScholarshipQueueStats,
} from '@/lib/scholarshipQueueStats'

export const runtime = 'nodejs'

/**
 * GET /api/admin/scholarship-sources
 * Admin-only: list scholarship scraper sources (content_type='scholarship')
 * with scholarship_queue stats. Shape mirrors /api/admin/scraper-sources so
 * the two admin pages can share rendering conventions.
 *
 * Lives outside the `scraper-sources` segment on purpose: that segment already
 * owns a `[sourceId]` catch-all, so a nested list route would be shadowed by it.
 * The action routes (discover/process/queue) stay under
 * `/api/admin/scraper-sources/scholarships/…` as planned.
 *
 * `published` counts come from scraped_scholarship_sources (real published
 * scholarships), not `done` queue rows — those also include gate-skipped,
 * expired and duplicate rows.
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
        adminClient
          .from('scraper_sources')
          .select('*')
          .eq('content_type', 'scholarship')
          .order('name', { ascending: true }),
        fetchAllScholarshipQueueStatusRows(adminClient),
        fetchPublishedScholarshipCountsBySource(adminClient),
      ])

    if (sourcesError) {
      return NextResponse.json({ error: sourcesError.message }, { status: 500 })
    }

    const statsBySource = aggregateScholarshipQueueStats(queueStats)

    const enriched = (sources || []).map(source => ({
      ...source,
      queue_stats: {
        ...(statsBySource[source.source_id] || emptyScholarshipQueueStats()),
        published: publishedBySource[source.source_id] || 0,
      },
    }))

    const totals = {
      ...sumScholarshipQueueStats(
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
    console.error('[admin/scholarship-sources] GET failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
