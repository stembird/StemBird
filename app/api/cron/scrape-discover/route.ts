import { NextRequest, NextResponse } from 'next/server'
import { runScrapeDiscover } from '@/lib/scrapeDiscover'
import { createServiceRoleClient } from '@/lib/supabaseServiceClient'

/** Pro plan: discover across all active Kenyan sources. */
export const maxDuration = 300

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await runScrapeDiscover(createServiceRoleClient(), {
      budgetMs: 240_000,
    })

    // Do not force success:true — surface external API outages to Vercel/cron monitors.
    const status = result.success ? 200 : 502

    return NextResponse.json(
      {
        ...result,
        timestamp: new Date().toISOString(),
      },
      { status }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[cron/scrape-discover] Error:', message)
    return NextResponse.json({ error: message, success: false }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
