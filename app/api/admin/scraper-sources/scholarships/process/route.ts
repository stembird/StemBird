import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { runScholarshipProcessBatch, DUPLICATE_MESSAGE } from '@/lib/scholarshipProcess'
import { resolveProcessQueueBatch } from '@/lib/scrapeProcessBatch'

export const runtime = 'nodejs'
/** Pro plan: process a batch of scholarship queue items in one admin action. */
export const maxDuration = 300

/**
 * POST /api/admin/scraper-sources/scholarships/process
 * Admin-only: process up to `max` pending scholarship queue items in-process.
 * Body: { max?: number } — same knob as the jobs route (>= 10, capped at 15).
 *
 * Sequential + soft time budget so Vercel returns JSON instead of a hard
 * timeout. There is no PDF branch here: scholarships are HTML-only adapters.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const maxItems = resolveProcessQueueBatch(body.max)

    const { processed, results, stopped_early } = await runScholarshipProcessBatch(
      auth.adminClient,
      { maxItems, budgetMs: 270_000 }
    )

    const published = results.filter(r => r.success).length
    const duplicates = results.filter(r => r.message === DUPLICATE_MESSAGE).length
    const offTopic = results.filter(r => r.off_topic).length
    const otherSkips = results.filter(
      r => r.skipped === true && !r.off_topic && r.message !== DUPLICATE_MESSAGE
    ).length
    const errors = results.filter(r => r.error).length

    return NextResponse.json({
      processed,
      published,
      skipped: duplicates + offTopic + otherSkips,
      duplicates,
      off_topic: offTopic,
      errors,
      max_items: maxItems,
      stopped_early: stopped_early || null,
      results,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/scraper-sources/scholarships/process] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
