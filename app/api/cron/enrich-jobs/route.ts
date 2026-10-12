import { NextRequest, NextResponse } from 'next/server'
import { enrichJobsNeedingEnrichment } from '@/lib/enrichJobById'
import { createServiceRoleClient } from '@/lib/supabaseServiceClient'

/** Pro plan: AI-enrich sparse active jobs. Career tips backfill is disabled. */
export const maxDuration = 300
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function authorize(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

function intParam(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = parseInt(String(value ?? ''), 10)
  const n = Number.isFinite(parsed) ? parsed : fallback
  return Math.min(Math.max(min, n), max)
}

async function handle(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = request.nextUrl
    const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {}
    const modeRaw = String(body.mode ?? url.searchParams.get('mode') ?? 'sparse')
      .trim()
      .toLowerCase()
    if (modeRaw === 'tips') {
      return NextResponse.json({
        success: true,
        mode: 'tips',
        disabled: true,
        scanned: 0,
        missing: 0,
        examined: 0,
        updated: 0,
        failed: 0,
        remaining: 0,
        timestamp: new Date().toISOString(),
      })
    }
    const dryRun = body.dryRun === true || url.searchParams.get('dryRun') === '1'
    const supabase = createServiceRoleClient()

    const limit = intParam(body.limit ?? url.searchParams.get('limit'), 10, 1, 25)
    const batch = await enrichJobsNeedingEnrichment(supabase, {
      limit,
      apply: !dryRun,
    })

    return NextResponse.json({
      success: true,
      mode: 'sparse',
      examined: batch.examined,
      updated: batch.results.filter(r => r.status === 'updated').length,
      failed: batch.results.filter(r => r.status === 'failed').length,
      skipped: batch.results.filter(r => r.status === 'skipped').length,
      results: batch.results,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[cron/enrich-jobs] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
