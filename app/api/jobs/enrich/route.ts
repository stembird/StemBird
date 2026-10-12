import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminServiceClient, userHasAdminRole } from '@/lib/adminAuth'
import { enrichJobById } from '@/lib/enrichJobById'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabaseEnv'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * POST /api/jobs/enrich
 *
 * Auto-enrich a job after it is created/updated via the posting form (or any
 * authenticated client). Uses production AI keys server-side.
 *
 * Auth: Bearer access token. Caller must be admin OR the job's user_id owner.
 * Body: { job_id: string, force?: boolean }
 */
export async function POST(request: NextRequest) {
  const accessToken = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const jobId =
      typeof body.job_id === 'string' && body.job_id.trim()
        ? body.job_id.trim()
        : null
    if (!jobId) {
      return NextResponse.json({ error: 'job_id is required' }, { status: 400 })
    }

    const adminClient = getAdminServiceClient()
    const { data: job, error: jobError } = await adminClient
      .from('jobs')
      .select('id, user_id')
      .eq('id', jobId)
      .maybeSingle()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const isAdmin = await userHasAdminRole(adminClient, user.id)
    const isOwner = job.user_id === user.id
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const force = body.force !== false
    const result = await enrichJobById(adminClient, jobId, {
      force,
      fillGapsOnly: !force,
      apply: true,
    })

    return NextResponse.json({
      success: result.status === 'updated',
      ...result,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[jobs/enrich] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
