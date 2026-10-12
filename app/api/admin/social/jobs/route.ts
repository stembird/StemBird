import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { listEligibleJobs } from '@/lib/social/socialPostService'

export const runtime = 'nodejs'

/**
 * GET /api/admin/social/jobs
 * Admin-only: list jobs eligible for social posting with server-side filters.
 *
 * Query params:
 *   search, job_function, location, employer, date_from, date_to,
 *   featured_only=1, page, page_size
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const sp = request.nextUrl.searchParams
    const featured = sp.get('featured_only')
    const { jobs, total } = await listEligibleJobs(auth.adminClient, {
      search: sp.get('search') ?? undefined,
      job_function: sp.get('job_function') ?? undefined,
      location: sp.get('location') ?? undefined,
      employer: sp.get('employer') ?? undefined,
      date_from: sp.get('date_from') ?? undefined,
      date_to: sp.get('date_to') ?? undefined,
      featured_only: featured === '1' || featured === 'true',
      page: sp.get('page') ? Number(sp.get('page')) : 1,
      page_size: sp.get('page_size') ? Number(sp.get('page_size')) : 50,
    })
    return NextResponse.json({ jobs, total })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load jobs'
    console.error('[admin/social/jobs]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
