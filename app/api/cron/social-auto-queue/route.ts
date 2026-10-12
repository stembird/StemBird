import { NextRequest, NextResponse } from 'next/server'
import { autoQueueDailyPosts, summarizeAutoQueue } from '@/lib/social/autoQueueJobs'
import { createServiceRoleClient } from '@/lib/supabaseServiceClient'

/** Pro plan: copy generation + Buffer API for up to 9 posts. */
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

/**
 * GET /api/cron/social-auto-queue
 * Vercel Cron: fill Buffer queues (3 exclusive posts per channel per Nairobi day).
 * Runs 06:00 and 10:00 EAT so the 08:00 / 12:30 / 17:00 Buffer slots are still open.
 *
 * Query: dryRun=1 to preview without sending.
 */
export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const dryRun = request.nextUrl.searchParams.get('dryRun') === '1'
    const result = await autoQueueDailyPosts(createServiceRoleClient(), {
      dryRun,
      userId: process.env.SCRAPER_USER_ID ?? null,
    })
    console.log('[cron/social-auto-queue]', summarizeAutoQueue(result))
    return NextResponse.json({
      success: result.ok || Boolean(result.skipped),
      timestamp: new Date().toISOString(),
      ...result,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[cron/social-auto-queue] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
