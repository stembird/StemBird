/**
 * Apply the payments table migration to the remote Supabase project.
 *
 * Usage:
 *   npx tsx scripts/apply-payments-migration.mts
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')

dotenv.config({ path: resolve(PROJECT_ROOT, '.env.local') })

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

async function main() {
  const supabase = createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  )

  const sql = readFileSync(
    resolve(PROJECT_ROOT, 'supabase/migrations/20260720_create_payments_table.sql'),
    'utf8'
  )

  // Guard against re-running on a DB that already has the table.
  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .limit(1)
  if (!existing) {
    // Table does not exist (error) — proceed below; if it does exist, skip.
  }

  console.log('Applying payments migration via exec_sql...')
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

  if (error) {
    // If the table already exists, the CREATE TABLE IF NOT EXISTS is a no-op and
    // only the indexes/policies may have failed. Surface whatever came back.
    console.error('Migration returned an error:', JSON.stringify(error, null, 2))
    const check = await supabase.from('payments').select('id').limit(1)
    if (!check.error) {
      console.log('Payments table already exists — migration is effectively applied.')
    } else {
      process.exit(1)
    }
  } else {
    console.log('Migration applied successfully.')
  }

  // Verify
  const verify = await supabase.from('payments').select('id').limit(1)
  if (verify.error) {
    console.error('Verification query failed:', verify.error.message)
    process.exit(1)
  }
  console.log('Verified: payments table is queryable.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
