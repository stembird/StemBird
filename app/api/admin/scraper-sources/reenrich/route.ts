import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { runReenrichScrapedJobs } from '@/lib/reenrichScrapedJobs'

export const runtime = 'nodejs'
/** Pro plan: AI normalize + enrich published scraped jobs using production keys. */
export const maxDuration = 300

/**
 * POST /api/admin/scraper-sources/reenrich
 * Admin-only: re-normalize and AI-enrich published scraped jobs.
 *
 * Body:
 *   source_id?: string  — limit to one scraper source (e.g. kcb-group-oracle-cloud)
 *   job_id?: string     — enrich a single jobs.id
 *   limit?: number      — batch size (default 5, max 15) when job_id not set
 *   missing_only?: boolean
 *   dry_run?: boolean
 *
 * Uses server-side DEEPSEEK / GEMINI keys from Vercel env — never exposed to the browser.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const sourceFilter =
      typeof body.source_id === 'string' && body.source_id.trim()
        ? body.source_id.trim()
        : null
    const jobId =
      typeof body.job_id === 'string' && body.job_id.trim()
        ? body.job_id.trim()
        : null
    const requested = typeof body.limit === 'number' ? body.limit : 5
    const limit = Math.min(Math.max(1, Math.floor(requested)), 15)
    const missingOnly = body.missing_only === true
    const dryRun = body.dry_run === true

    const hasAiKeys = [
      process.env.DEEPSEEK_API_KEY,
      process.env.DEEPSEEK_API_KEY_2,
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
    ].some(v => typeof v === 'string' && v.trim().length > 0)

    const result = await runReenrichScrapedJobs(auth.adminClient, {
      limit: jobId ? 1 : limit,
      sourceFilter,
      jobId,
      missingOnly,
      apply: !dryRun,
    })

    return NextResponse.json({
      success: true,
      ai_keys_configured: hasAiKeys,
      source_id: sourceFilter,
      job_id: jobId,
      dry_run: dryRun,
      ...result,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/scraper-sources/reenrich] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
