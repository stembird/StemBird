import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { publishToBuffer } from '@/lib/social/socialPostService'
import type { PublishMode } from '@/lib/social/types'

export const runtime = 'nodejs'

const VALID_MODES: PublishMode[] = ['now', 'schedule', 'queue']

/**
 * POST /api/admin/social/posts/:id/publish
 * Admin-only: send a social post to Buffer (publish now / schedule / queue).
 *
 * Body: { channel_id, mode, dueAt?, is_repost? }
 *
 * Returns 409 with { duplicate } when the same job+platform already has an
 * active post and the admin did not explicitly choose to repost.
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
    const body = await request.json().catch(() => ({}))

    const channelId = typeof body.channel_id === 'string' ? body.channel_id.trim() : ''
    if (!channelId) {
      return NextResponse.json({ error: 'Select a Buffer channel first' }, { status: 400 })
    }
    const mode = body.mode as PublishMode
    if (!VALID_MODES.includes(mode)) {
      return NextResponse.json({ error: 'Invalid publish mode' }, { status: 400 })
    }
    const dueAt =
      mode === 'schedule' && typeof body.dueAt === 'string' && body.dueAt
        ? body.dueAt
        : null
    if (mode === 'schedule' && !dueAt) {
      return NextResponse.json({ error: 'A scheduled time is required' }, { status: 400 })
    }

    const outcome = await publishToBuffer(auth.adminClient, {
      postId: id,
      channelId,
      mode,
      dueAt,
      isRepost: body.is_repost === true,
    })

    if (outcome.duplicate) {
      return NextResponse.json(
        {
          error: 'This job already has an active post for the same platform.',
          duplicate: outcome.duplicate,
        },
        { status: 409 }
      )
    }
    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error ?? 'Publishing failed' }, { status: 400 })
    }
    return NextResponse.json({ post: outcome.post })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send to Buffer'
    console.error('[admin/social/posts/publish]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
