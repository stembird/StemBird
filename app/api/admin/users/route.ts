import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'

export type AdminUserDTO = {
  id: string
  email: string | null
  created_at: string | null
  last_sign_in_at: string | null
  full_name: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  avatar_url: string | null
  role: string | null
  candidate_profiles: {
    id: string
    current_title: string | null
    location: string | null
    phone: string | null
    profile_completeness_score: number | null
    profile_visibility: string | null
  }[] | null
}

type CandidateProfileRow = {
  id: string
  user_id: string
  current_title: string | null
  location: string | null
  phone: string | null
  profile_completeness_score: number | null
  profile_visibility: string | null
}

export const runtime = 'nodejs'

/**
 * Admin-only endpoint that returns the real user list with signup details.
 * Uses the service-role admin client so dates come from auth.users.created_at
 * (the true signup date) rather than user_profiles.created_at, which was
 * backfilled on 2026-06-14.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { adminClient } = auth

  const { data: authData, error: usersError } = await adminClient.auth.admin.listUsers({
    perPage: 1000,
  })
  if (usersError) {
    console.error('[admin/users] listUsers error:', usersError)
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  const authUsers = authData?.users ?? []
  const ids = authUsers.map((u) => u.id)

  // Try the extended profile select first. The first_name/last_name/phone
  // columns are added by a migration, so fall back to the base columns if the
  // migration hasn't been applied to the database yet.
  let profileRows: {
    id: string
    full_name: string | null
    first_name?: string | null
    last_name?: string | null
    phone?: string | null
    avatar_url: string | null
    role: string | null
  }[] | null = null
  const extended = await adminClient
    .from('user_profiles')
    .select('id, full_name, first_name, last_name, phone, avatar_url, role')
    .in('id', ids)
  if (!extended.error) {
    profileRows = extended.data
  } else {
    const base = await adminClient
      .from('user_profiles')
      .select('id, full_name, avatar_url, role')
      .in('id', ids)
    profileRows = base.data
  }

  const [{ data: candidateRows }] = await Promise.all([
    adminClient
      .from('candidate_profiles')
      .select(
        'id, user_id, current_title, location, phone, profile_completeness_score, profile_visibility'
      )
      .in('user_id', ids),
  ])

  const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p]))
  const candidateMap = new Map<string, CandidateProfileRow>()
  for (const c of candidateRows ?? []) {
    if (!candidateMap.has(c.user_id)) candidateMap.set(c.user_id, c)
  }

  const users: AdminUserDTO[] = authUsers.map((u) => {
    const profile = profileMap.get(u.id)
    const candidate = candidateMap.get(u.id)
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>
    return {
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at ?? null,
      last_sign_in_at: u.last_sign_in_at ?? null,
      full_name:
        profile?.full_name ??
        (typeof meta.full_name === 'string' ? meta.full_name : null) ??
        null,
      first_name:
        profile?.first_name ??
        (typeof meta.first_name === 'string' ? meta.first_name : null) ??
        null,
      last_name:
        profile?.last_name ??
        (typeof meta.last_name === 'string' ? meta.last_name : null) ??
        null,
      phone:
        profile?.phone ??
        candidate?.phone ??
        (typeof meta.phone === 'string' ? meta.phone : null) ??
        null,
      avatar_url: profile?.avatar_url ?? null,
      role:
        profile?.role ??
        (typeof meta.role === 'string' ? meta.role : null) ??
        'candidate',
      candidate_profiles: candidate ? [candidate] : null,
    }
  })

  // Newest signups first
  users.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))

  return NextResponse.json({ users })
}
