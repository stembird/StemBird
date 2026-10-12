import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'

export const runtime = 'nodejs'

/**
 * PATCH /api/admin/scraper-sources/[sourceId]
 * Admin-only: toggle is_active or update source metadata.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { sourceId } = await params
  const body = await request.json()
  const updates: Record<string, unknown> = {}

  if (typeof body.is_active === 'boolean') {
    updates.is_active = body.is_active
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await auth.adminClient
    .from('scraper_sources')
    .update(updates)
    .eq('source_id', sourceId)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, source: data })
}
