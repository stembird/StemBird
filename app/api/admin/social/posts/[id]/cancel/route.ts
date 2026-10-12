import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { cancelPost } from '@/lib/social/socialPostService'

export const runtime = 'nodejs'

/**
 * POST /api/admin/social/posts/:id/cancel
 * Admin-only: cancel a scheduled/queued social post (best-effort removal from
 * Buffer is attempted; local status always flips to cancelled).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  try {
    const { id } = await params
    const post = await cancelPost(auth.adminClient, id)
    return NextResponse.json({ post })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to cancel social post'
    console.error('[admin/social/posts/cancel]', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
