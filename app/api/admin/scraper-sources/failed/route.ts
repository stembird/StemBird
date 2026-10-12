import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import {
  listFailedQueueItems,
  mutateFailedQueueItems,
  parseFailedQueueAction,
  parseFailedQueueListOptions,
  parseFailedQueueScope,
} from '@/lib/scrapeQueueFailed'

export const runtime = 'nodejs'

/**
 * GET /api/admin/scraper-sources/failed
 * Admin-only: list failed scrape_queue items for review.
 * Query: source_id?, limit?, offset?
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const options = parseFailedQueueListOptions(request.nextUrl.searchParams, {
      status: 'failed',
    })
    if ('error' in options) {
      return NextResponse.json({ error: options.error }, { status: 400 })
    }

    const result = await listFailedQueueItems(auth.adminClient, { ...options, status: 'failed' })
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/scraper-sources/failed] GET failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/admin/scraper-sources/failed
 * Admin-only: retry (requeue as pending) or delete failed scrape_queue items.
 * Body: { action: 'retry' | 'delete', ids?: string[], source_id?: string, all?: true }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const action = parseFailedQueueAction(body.action)
    if (typeof action === 'object') {
      return NextResponse.json({ error: action.error }, { status: 400 })
    }

    const scope = parseFailedQueueScope(body)
    if ('error' in scope) {
      return NextResponse.json({ error: scope.error }, { status: 400 })
    }

    const result = await mutateFailedQueueItems(auth.adminClient, action, scope, 'failed')
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/scraper-sources/failed] POST failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
