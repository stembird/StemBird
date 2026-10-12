/**
 * Small authed-fetch helper for the Social Publishing admin UI.
 * All requests go through server-side admin API routes — Buffer credentials
 * and the service-role key never reach the browser.
 */

import { supabase } from '@/integrations/supabase/client'

export class ApiError extends Error {
  status: number
  body: Record<string, unknown>

  constructor(message: string, status: number, body: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export async function authedFetch<T = Record<string, unknown>>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { data } = await supabase.auth.getSession()
  if (!data.session) {
    throw new ApiError('You must be signed in as an admin', 401, {})
  }

  const res = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  const text = await res.text().catch(() => '')
  let body: Record<string, unknown> = {}
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    body = { error: `Server returned a non-JSON response (HTTP ${res.status})` }
  }

  if (!res.ok) {
    const message =
      typeof body.error === 'string' && body.error ? body.error : `Request failed (HTTP ${res.status})`
    throw new ApiError(message, res.status, body)
  }
  return body as T
}
