import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import {
  connectBuffer,
  disconnectBuffer,
  getBufferStatus,
} from '@/lib/social/socialPostService'

export const runtime = 'nodejs'

/**
 * GET /api/admin/social/buffer — connection status (never includes the key).
 * POST /api/admin/social/buffer — connect with { api_key } (validated against
 *   the Buffer API, then stored in the service-role buffer_config table).
 * DELETE /api/admin/social/buffer — disconnect (clears the stored key).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  try {
    const status = await getBufferStatus(auth.adminClient)
    return NextResponse.json(status)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to read Buffer status'
    console.error('[admin/social/buffer] GET', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  try {
    const body = await request.json().catch(() => ({}))
    const apiKey = typeof body.api_key === 'string' ? body.api_key : ''
    if (!apiKey.trim()) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }
    const status = await connectBuffer(auth.adminClient, apiKey)
    return NextResponse.json(status)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to connect Buffer'
    console.error('[admin/social/buffer] POST', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  try {
    const status = await disconnectBuffer(auth.adminClient)
    return NextResponse.json(status)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to disconnect Buffer'
    console.error('[admin/social/buffer] DELETE', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
