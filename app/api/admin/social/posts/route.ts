import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { createPost, listPosts } from '@/lib/social/socialPostService'
import type { SocialPlatform, SocialPostStatus } from '@/lib/social/types'

export const runtime = 'nodejs'

const VALID_PLATFORMS: SocialPlatform[] = ['linkedin', 'facebook', 'instagram']
const VALID_STATUSES: SocialPostStatus[] = [
  'draft',
  'ready',
  'scheduled',
  'publishing',
  'published',
  'failed',
  'cancelled',
]

/**
 * GET /api/admin/social/posts
 * Admin-only: list social posts (optionally filtered by status).
 * Query params: status, limit
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  try {
    const sp = request.nextUrl.searchParams
    const rawStatus = sp.get('status')
    const statuses = rawStatus
      ? rawStatus.split(',').map((s) => s.trim()).filter((s): s is SocialPostStatus =>
          (VALID_STATUSES as string[]).includes(s)
        )
      : undefined
    const limit = sp.get('limit') ? Number(sp.get('limit')) : undefined
    const result = await listPosts(auth.adminClient, { statuses, limit })
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load social posts'
    console.error('[admin/social/posts] GET', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/admin/social/posts
 * Admin-only: create a social post manually.
 * Body: { job_id?, platform, post_text, media_url?, status? }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  try {
    const body = await request.json().catch(() => ({}))
    if (!VALID_PLATFORMS.includes(body.platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
    }
    if (typeof body.post_text !== 'string' || !body.post_text.trim()) {
      return NextResponse.json({ error: 'Post text is required' }, { status: 400 })
    }
    if (body.status !== undefined && !(VALID_STATUSES as string[]).includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    const post = await createPost(auth.adminClient, auth.user.id, {
      job_id: body.job_id ? String(body.job_id) : null,
      platform: body.platform,
      post_text: body.post_text,
      media_url: body.media_url ? String(body.media_url) : null,
      status: body.status,
      is_repost: body.is_repost === true,
    })
    return NextResponse.json({ post }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create social post'
    console.error('[admin/social/posts] POST', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
