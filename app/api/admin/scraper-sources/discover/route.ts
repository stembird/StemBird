import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { runScrapeDiscover } from '@/lib/scrapeDiscover'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * POST /api/admin/scraper-sources/discover
 * Admin-only: run scrape discover for all active sources or one source.
 * Body: { source_id?: string }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const sourceId = typeof body.source_id === 'string' ? body.source_id : undefined

    // Soft budget under maxDuration so Vercel never returns an HTML timeout page
    const result = await runScrapeDiscover(auth.adminClient, {
      sourceId,
      budgetMs: 240_000,
    })

    // 502 when every source failed / zero yield with errors — admin UI treats !ok as failure.
    // Partial success (some sources OK) still returns 200 with sources_failed > 0.
    const status = result.success ? 200 : 502
    return NextResponse.json(result, { status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/scraper-sources/discover] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
