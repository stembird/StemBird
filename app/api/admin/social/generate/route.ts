import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { generatePosts } from '@/lib/social/socialPostService'
import type { SocialPlatform } from '@/lib/social/types'

export const runtime = 'nodejs'
export const maxDuration = 120

const VALID_PLATFORMS: SocialPlatform[] = ['linkedin', 'facebook', 'instagram']

/**
 * POST /api/admin/social/generate
 * Admin-only: generate platform-appropriate copy for the selected jobs and
 * save them as "ready" social posts.
 *
 * Body: { job_ids: string[], platform: 'linkedin' | 'facebook' | 'instagram' }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const platform = body.platform as SocialPlatform
    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
    }
    const jobIds = Array.isArray(body.job_ids)
      ? body.job_ids.map((v: unknown) => String(v)).filter(Boolean)
      : []
    if (jobIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one job first' }, { status: 400 })
    }
    if (jobIds.length > 10) {
      return NextResponse.json({ error: 'Generate posts for up to 10 jobs at a time' }, { status: 400 })
    }

    const posts = await generatePosts(auth.adminClient, auth.user.id, {
      job_ids: jobIds,
      platform,
    })
    return NextResponse.json({ posts })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate posts'
    console.error('[admin/social/generate]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
