import { NextRequest, NextResponse } from 'next/server'
import { runScrapeProcessOne } from '@/lib/scrapeProcess'
import { createServiceRoleClient } from '@/lib/supabaseServiceClient'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-scraper-secret')
  if (secret !== process.env.SCRAPER_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runScrapeProcessOne(createServiceRoleClient())

    if (result.error) {
      return NextResponse.json(result, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[scrape-jobs/process] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
