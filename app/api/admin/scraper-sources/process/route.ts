import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { runScrapeProcessBatch } from '@/lib/scrapeProcess'
import { resolveProcessQueueBatch } from '@/lib/scrapeProcessBatch'

export const runtime = 'nodejs'
/** Pro plan: process a batch of queue items in one admin action. */
export const maxDuration = 300

/**
 * POST /api/admin/scraper-sources/process
 * Admin-only: process up to max pending queue items in-process.
 * Body: { max?: number } — at least 10, capped at 15 (stale `{ max: 6 }` still runs 10).
 *
 * Sequential + soft time budget so Vercel returns JSON instead of a hard timeout.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const maxJobs = resolveProcessQueueBatch(body.max)

    const { processed, results, stopped_early } = await runScrapeProcessBatch(auth.adminClient, {
      maxJobs,
      budgetMs: 270_000,
    })

    const published = results.filter(r => r.success && !r.pdf_document).length
    const pdfBatches = results.filter(r => r.pdf_document)
    const pdfPublished = pdfBatches.reduce(
      (sum, r) => sum + (typeof r.published === 'number' ? r.published : 0),
      0
    )
    const skipped = results.filter(r => r.message === 'Duplicate job skipped').length
    const errors = results.filter(r => r.error).length

    return NextResponse.json({
      processed,
      published: published + pdfPublished,
      skipped,
      errors,
      max_jobs: maxJobs,
      stopped_early: stopped_early || null,
      results,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/scraper-sources/process] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
