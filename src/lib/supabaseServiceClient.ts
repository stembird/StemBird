import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from '@/lib/supabaseEnv'

/** Service-role client for scrape/enrich cron + admin in-process triggers. */
export function createServiceRoleClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
