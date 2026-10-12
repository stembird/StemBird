import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { deletePost, updatePost } from '@/lib/social/socialPostService'
import type { SocialPlatform } from '@/lib/social/types'

export const runtime = 'nodejs'

const VALID_PLATFORMS: SocialPlatform[] = ['linkedin', 'facebook', 'instagram']

/**
 * PATCH /api/admin/social/posts/:id
 * Admin-only: edit post text / media / platform.
 * DELETE /api/admin/social/posts/:id
 * Admin-only: delete a post that has not been sent.
 */
export async function PATCH(
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
    const patch: {
      post_text?: string
      media_url?: string | null
      platform?: SocialPlatform
      scheduled_at?: string | null
    } = {}
    if (typeof body.post_text === 'string' && body.post_text.trim()) {
      patch.post_text = body.post_text
    }
    if (body.platform !== undefined) {
      if (!VALID_PLATFORMS.includes(body.platform)) {
        return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
      }
      patch.platform = body.platform
    }
    if (body.media_url !== undefined) {
      patch.media_url = body.media_url ? String(body.media_url) : null
    }
    if (body.scheduled_at !== undefined) {
      patch.scheduled_at = body.scheduled_at ? String(body.scheduled_at) : null
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }
    const post = await updatePost(auth.adminClient, id, patch)
    return NextResponse.json({ post })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update social post'
    console.error('[admin/social/posts] PATCH', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  try {
    const { id } = await params
    await deletePost(auth.adminClient, id)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete social post'
    console.error('[admin/social/posts] DELETE', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
