import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import {
  mutateFailedQueueItems,
  listFailedQueueItems,
  parseFailedQueueAction,
  parseFailedQueueListOptions,
  parseFailedQueueScope,
  parseQueueManageStatus,
} from '@/lib/scrapeQueueFailed'

export const runtime = 'nodejs'

/**
 * GET /api/admin/scraper-sources/queue
 * Admin-only: list scrape_queue items by status for review.
 * Query: status=pending|processing|failed, source_id?, limit?, offset?
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const options = parseFailedQueueListOptions(request.nextUrl.searchParams, {
      requireStatus: true,
    })
    if ('error' in options) {
      return NextResponse.json({ error: options.error }, { status: 400 })
    }

    const result = await listFailedQueueItems(auth.adminClient, options)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/scraper-sources/queue] GET failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/admin/scraper-sources/queue
 * Admin-only: requeue (to pending) or delete queue items of one status.
 * Body: { status, action: 'retry' | 'requeue' | 'delete', ids?: string[], source_id?: string, all?: true }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const status = parseQueueManageStatus(body.status)
    if (typeof status === 'object') {
      return NextResponse.json({ error: status.error }, { status: 400 })
    }

    const action = parseFailedQueueAction(body.action)
    if (typeof action === 'object') {
      return NextResponse.json({ error: action.error }, { status: 400 })
    }

    if ((action === 'retry' || action === 'requeue') && status === 'pending') {
      return NextResponse.json({ error: 'Pending jobs are already queued' }, { status: 400 })
    }

    const scope = parseFailedQueueScope(body)
    if ('error' in scope) {
      return NextResponse.json({ error: scope.error }, { status: 400 })
    }

    const result = await mutateFailedQueueItems(auth.adminClient, action, scope, status)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/scraper-sources/queue] POST failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
