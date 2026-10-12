import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { enrichJobById, enrichJobsNeedingEnrichment } from '@/lib/enrichJobById'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * POST /api/admin/jobs/enrich
 *
 * Enrich ANY CareerSasa job (manual, scraped, parse-job, n8n, …) using
 * production DeepSeek → Gemini keys on the server.
 *
 * Body:
 *   job_id?: string     — enrich one job
 *   missing_only?: bool — batch enrich sparse active jobs
 *   limit?: number      — batch size (default 10, max 25)
 *   dry_run?: boolean
 *
 * Career tips backfill (`tips_only`) is disabled. Tips still generate at ingest.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const jobId =
      typeof body.job_id === 'string' && body.job_id.trim()
        ? body.job_id.trim()
        : null
    const missingOnly = body.missing_only === true
    const tipsOnly =
      body.tips_only === true || String(body.mode || '').toLowerCase() === 'tips'
    const dryRun = body.dry_run === true
    const limit = Math.min(
      Math.max(1, Math.floor(typeof body.limit === 'number' ? body.limit : 10)),
      25
    )

    if (tipsOnly && !jobId) {
      return NextResponse.json(
        {
          error: 'Career tips backfill is disabled',
          mode: 'tips',
          disabled: true,
        },
        { status: 410 }
      )
    }

    if (jobId) {
      const result = await enrichJobById(auth.adminClient, jobId, {
        force: true,
        apply: !dryRun,
      })
      return NextResponse.json({
        success: result.status === 'updated' || result.status === 'dry_run',
        ...result,
      })
    }

    if (missingOnly) {
      const batch = await enrichJobsNeedingEnrichment(auth.adminClient, {
        limit,
        apply: !dryRun,
      })
      const updated = batch.results.filter(r => r.status === 'updated').length
      const failed = batch.results.filter(r => r.status === 'failed').length
      return NextResponse.json({
        success: true,
        examined: batch.examined,
        updated,
        failed,
        results: batch.results,
      })
    }

    return NextResponse.json(
      {
        error: 'Provide job_id for a single job or missing_only:true for sparse jobs',
      },
      { status: 400 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/jobs/enrich] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
