import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { refreshBufferChannels } from '@/lib/social/socialPostService'

export const runtime = 'nodejs'

/**
 * GET /api/admin/social/buffer/channels
 * Admin-only: fetch the connected Buffer channels live (on demand only — no
 * continuous polling).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  try {
    const channels = await refreshBufferChannels(auth.adminClient)
    return NextResponse.json({ channels })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load Buffer channels'
    console.error('[admin/social/buffer/channels]', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
