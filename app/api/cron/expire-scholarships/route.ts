import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabaseServiceClient'

/**
 * Daily: archive scholarships whose application deadline has passed.
 *
 * Unlike jobs (an RPC flips `is_expired`), `scholarships.status` is the single
 * source of truth for listing visibility, so the cron flips it directly. The
 * date is compared as a plain `date` string against UTC today: a deadline
 * falling today is still open (same rule as the process hard rules), so only
 * strictly-past deadlines expire.
 */
const PAGE_SIZE = 500

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()
    const today = new Date().toISOString().slice(0, 10)

    let expired = 0
    for (;;) {
      // Select-then-update in pages: PostgREST has no UPDATE … LIMIT, and a
      // single unbounded update on a large table is one giant transaction.
      const { data: page, error: selectError } = await supabase
        .from('scholarships')
        .select('id')
        .eq('status', 'live')
        .lt('application_deadline', today)
        .limit(PAGE_SIZE)
      if (selectError) throw selectError

      const ids = (page || []).map(row => row.id as string)
      if (ids.length === 0) break

      const { error: updateError } = await supabase
        .from('scholarships')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .in('id', ids)
      if (updateError) throw updateError

      expired += ids.length
      if (ids.length < PAGE_SIZE) break
    }

    return NextResponse.json({
      success: true,
      expired_count: expired,
      deadline_before: today,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[cron/expire-scholarships] Error:', message)
    return NextResponse.json({ error: message, success: false }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
