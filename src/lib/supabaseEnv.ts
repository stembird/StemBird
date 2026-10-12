/**
 * Shared Supabase env resolution for server routes.
 *
 * Vercel builds sometimes omit NEXT_PUBLIC_* at runtime for server bundles.
 * Public pages already fall back to the project URL/anon key; scrape/admin
 * routes must do the same for the URL (service role still required).
 */

const FALLBACK_SUPABASE_URL = 'https://qhfdjccudtqnlkbtsjgg.supabase.co'
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoZmRqY2N1ZHRxbmxrYnRzamdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NzYwOTcsImV4cCI6MjEwNzM1MjA5N30.JFdPkbqs4dPOahVmBSS8jGcAlHABrGJVeN4ezvquvLs'

export function getSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    FALLBACK_SUPABASE_URL
  )
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    FALLBACK_SUPABASE_ANON_KEY
  )
}

/** Service role — never fall back to anon (scraper tables are service-role only). */
export function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }
  return key
}
