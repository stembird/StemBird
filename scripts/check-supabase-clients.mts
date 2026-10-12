#!/usr/bin/env node
/**
 * CI gate: fail if server code creates Supabase clients from raw env
 * instead of shared helpers (supabaseEnv / supabaseServiceClient / adminAuth).
 *
 * Allowed files may still reference process.env for documentation or
 * the single source of truth in supabaseEnv.ts.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const ALLOWLIST = new Set([
  'src/lib/supabaseEnv.ts',
  'src/lib/supabaseServiceClient.ts',
  'src/lib/adminAuth.ts',
  'src/integrations/supabase/client.ts',
  'src/lib/supabase-clients.guard.test.ts',
  'scripts/check-supabase-clients.mts',
])

const FORBIDDEN = [
  {
    name: 'createClient(process.env.NEXT_PUBLIC_SUPABASE…)',
    re: /createClient\(\s*process\.env\.NEXT_PUBLIC_SUPABASE/,
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL!',
    re: /process\.env\.NEXT_PUBLIC_SUPABASE_URL!/,
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY! outside helpers',
    re: /process\.env\.SUPABASE_SERVICE_ROLE_KEY!/,
  },
]

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (
      name === 'node_modules' ||
      name === '.next' ||
      name === '.git' ||
      name === 'dist'
    ) {
      continue
    }
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx|js|jsx|mts|cts)$/.test(name)) out.push(p)
  }
  return out
}

const files = walk(ROOT)
const violations: string[] = []

for (const file of files) {
  const rel = relative(ROOT, file).replaceAll('\\', '/')
  if (ALLOWLIST.has(rel)) continue
  // Ignore generated types and local one-off root scripts / ops scripts
  if (rel === 'src/integrations/supabase/types.ts') continue
  if (rel.startsWith('scripts/') || /^(apply-|check-|test-|gen-)/.test(rel)) continue

  const text = readFileSync(file, 'utf8')
  for (const rule of FORBIDDEN) {
    if (rule.re.test(text)) {
      violations.push(`${rel}: ${rule.name}`)
    }
  }
}

if (violations.length) {
  console.error('Forbidden raw Supabase env client usage:\n')
  for (const v of violations) console.error(`  - ${v}`)
  console.error(
    '\nUse getSupabaseUrl / getSupabaseAnonKey / createServiceRoleClient / getAdminServiceClient instead.'
  )
  process.exit(1)
}

console.log('supabase-clients guard: ok')
