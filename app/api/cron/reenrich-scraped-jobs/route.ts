import { NextRequest, NextResponse } from 'next/server'
import { runReenrichScrapedJobs } from '@/lib/reenrichScrapedJobs'
import { createServiceRoleClient } from '@/lib/supabaseServiceClient'

/** Pro plan: AI re-parse batches of already-published scraped jobs. */
export const maxDuration = 300
export const runtime = 'nodejs'

function authorize(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

async function handle(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = request.nextUrl
    const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {}

    const limit = Math.min(
      Math.max(
        1,
        parseInt(
          String(body.limit ?? url.searchParams.get('limit') ?? '15'),
          10
        ) || 15
      ),
      25
    )
    const offset = Math.max(
      0,
      parseInt(String(body.offset ?? url.searchParams.get('offset') ?? '0'), 10) || 0
    )
    const sourceFilter =
      (body.source as string | undefined) || url.searchParams.get('source') || null
    const missingOnly =
      body.missingOnly === true || url.searchParams.get('missingOnly') === '1'
    const dryRun = body.dryRun === true || url.searchParams.get('dryRun') === '1'

    const result = await runReenrichScrapedJobs(createServiceRoleClient(), {
      limit,
      offset,
      sourceFilter,
      missingOnly,
      apply: !dryRun,
    })

    return NextResponse.json({
      success: true,
      ...result,
      limit,
      offset,
      next_offset: offset + result.examined,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[cron/reenrich-scraped-jobs] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
