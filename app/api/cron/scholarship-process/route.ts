import { NextRequest, NextResponse } from 'next/server'
import { runScholarshipProcessBatch } from '@/lib/scholarshipProcess'
import { createServiceRoleClient } from '@/lib/supabaseServiceClient'
import { PROCESS_QUEUE_BATCH, resolveProcessQueueBatch } from '@/lib/scrapeProcessBatch'

/** Pro plan: up to 300s for HTML fetch + AI parsing of scholarship pages. */
export const maxDuration = 300

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    // Cheap early-exit: if nothing is pending, skip the full worker boot (an AI
    // parse per item is expensive, so an empty invocation should cost a count).
    const { count } = await supabase
      .from('scholarship_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (typeof count === 'number' && count === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        stopped_early: null,
        queue_empty: true,
        timestamp: new Date().toISOString(),
      })
    }

    const maxItems = resolveProcessQueueBatch(
      parseInt(request.nextUrl.searchParams.get('max') || String(PROCESS_QUEUE_BATCH), 10)
    )
    const { processed, results, stopped_early } = await runScholarshipProcessBatch(supabase, {
      maxItems,
      budgetMs: 270_000,
    })

    return NextResponse.json({
      success: true,
      processed,
      stopped_early: stopped_early || null,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[cron/scholarship-process] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
