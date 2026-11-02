/**
 * Bulk-purge jobs whose stored fields no longer satisfy the Chemistry Lens
 * publication gate. Run this ONCE after applying the 20261102 taxonomy
 * migration to strip out the pre-Chemistry-Lens backlog (banking, ICT,
 * telecoms, general HR, pure-biology, clinical care, etc.).
 *
 * Safety:
 *   - DEFAULT IS DRY RUN. Nothing is deleted until you pass --execute.
 *   - Only rows in `jobs` with the columns we care about are evaluated.
 *   - Related rows (applications, saved_jobs, job_alerts, scraped_job_sources
 *     linkage, etc.) cascade via FKs declared in the schema.
 *
 * Deletion scope (default): every row in `jobs` regardless of status.
 *   --active-only     Limit to status='active' AND unexpired rows.
 *   --include-expired Include expired/closed rows (default: everything).
 *
 * Reporting:
 *   --sample N        Print N example rejected titles with the reason
 *                     (default N=25 in dry-run, 10 in execute mode).
 *   --quiet           Suppress the per-job sample list; keep only the summary.
 *
 * Run:
 *   npx tsx scripts/purge-non-chemistry-jobs.ts                # dry-run
 *   npx tsx scripts/purge-non-chemistry-jobs.ts --execute      # actually delete
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  evaluateChemistryRelevance,
  type ChemistryGateInput,
} from '../src/lib/chemistryRelevance'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnvLocal() {
  const envPath = path.resolve(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) throw new Error(`Missing ${envPath}`)
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/i)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^"|"$/g, '').trim()
    }
  }
}
loadEnvLocal()

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://qhfdjccudtqnlkbtsjgg.supabase.co'
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing in .env.local')

const supabase = createClient(url, serviceKey)

// ─── CLI flags ───────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const EXECUTE = argv.includes('--execute')
const ACTIVE_ONLY = argv.includes('--active-only')
const QUIET = argv.includes('--quiet')
const sampleIdx = argv.indexOf('--sample')
const SAMPLE_N = sampleIdx >= 0 ? Number(argv[sampleIdx + 1] ?? 0) : (EXECUTE ? 10 : 25)

// ─── Types ────────────────────────────────────────────────────────────────
interface JobRow {
  id: string
  title: string
  company: string | null
  status: string | null
  valid_through: string | null
  description: string | null
  responsibilities: string | null
  required_qualifications: string | null
  tags: string | null
  field_of_study: string | null
  area_of_study: string | null
  industry: string | null
  industries: string[] | null
  job_function: string | null
  job_functions: string[] | null
}

interface RejectedRow {
  job: JobRow
  reason: string
  vetoed: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function toGateInput(j: JobRow): ChemistryGateInput {
  const fnList: string[] = []
  if (typeof j.job_function === 'string' && j.job_function) fnList.push(j.job_function)
  if (Array.isArray(j.job_functions)) {
    for (const f of j.job_functions) if (typeof f === 'string' && f) fnList.push(f)
  }
  const indList: string[] = []
  if (typeof j.industry === 'string' && j.industry) indList.push(j.industry)
  if (Array.isArray(j.industries)) {
    for (const i of j.industries) if (typeof i === 'string' && i) indList.push(i)
  }
  return {
    title: j.title ?? '',
    jobFunctions: fnList,
    industries: indList,
    description: j.description,
    requiredQualifications: j.required_qualifications,
    responsibilities: j.responsibilities,
    tags: j.tags,
    fieldOfStudy: j.field_of_study,
    areaOfStudy: j.area_of_study,
  }
}

async function fetchAllActive(): Promise<JobRow[]> {
  const cols =
    'id, title, company, status, valid_through, description, responsibilities, ' +
    'required_qualifications, tags, field_of_study, area_of_study, ' +
    'industry, industries, job_function, job_functions'

  const all: JobRow[] = []
  const PAGE = 500
  let from = 0
  for (;;) {
    let q = supabase.from('jobs').select(cols).order('id').range(from, from + PAGE - 1)
    if (ACTIVE_ONLY) {
      const nowIso = new Date().toISOString()
      q = q
        .eq('status', 'active')
        .or(`valid_through.is.null,valid_through.gt.${nowIso}`)
    }
    const { data, error } = await q
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as unknown as JobRow[]
    if (rows.length === 0) break
    all.push(...rows)
    if (rows.length < PAGE) break
    from += PAGE
  }
  return all
}

async function deleteBatch(ids: string[]): Promise<void> {
  const { error } = await supabase.from('jobs').delete().in('id', ids)
  if (error) throw new Error(error.message)
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const modeTag = EXECUTE ? '*** EXECUTE MODE — WILL DELETE ***' : 'DRY RUN (nothing will be deleted)'
  console.log(`\n=== Chemistry Lens bulk purge ===`)
  console.log(`Mode:         ${modeTag}`)
  console.log(`Scope:        ${ACTIVE_ONLY ? 'active + unexpired only' : 'every jobs row'}`)
  console.log(`Sample size:  ${QUIET ? 0 : SAMPLE_N}\n`)

  const jobs = await fetchAllActive()
  console.log(`Scanned rows: ${jobs.length}`)

  const keep: JobRow[] = []
  const rejected: RejectedRow[] = []
  for (const j of jobs) {
    const v = evaluateChemistryRelevance(toGateInput(j))
    if (v.publish) keep.push(j)
    else rejected.push({ job: j, reason: v.reason, vetoed: v.vetoed })
  }
  const vetoedCount = rejected.filter(r => r.vetoed).length
  console.log(`Retain:       ${keep.length}`)
  console.log(`Reject:       ${rejected.length}  (${vetoedCount} hard-vetoed titles, ${rejected.length - vetoedCount} no-chemistry-signal)\n`)

  if (!QUIET && rejected.length > 0) {
    console.log(`Sample rejected jobs (up to ${SAMPLE_N}):`)
    for (const r of rejected.slice(0, SAMPLE_N)) {
      const fn = r.job.job_function || (r.job.job_functions?.[0] ?? '(untagged)')
      console.log(
        `   - [${r.job.status ?? '?'}] ${truncate(r.job.title, 70)}  ·  ${r.job.company ?? '(no company)'}  · fn=${fn}  ·  ${r.reason}`
      )
    }
    if (rejected.length > SAMPLE_N) console.log(`   … +${rejected.length - SAMPLE_N} more`)
    console.log('')
  }

  if (!EXECUTE) {
    console.log(`Dry-run complete. To delete ${rejected.length} row(s), re-run with --execute:`)
    console.log(`   npx tsx scripts/purge-non-chemistry-jobs.ts --execute`)
    return
  }

  if (rejected.length === 0) {
    console.log('Nothing to delete. ✔')
    return
  }

  console.log(`Deleting ${rejected.length} row(s) in chunks of 200 …`)
  const ids = rejected.map(r => r.job.id)
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200)
    await deleteBatch(chunk)
    process.stdout.write(`  deleted ${Math.min(i + 200, ids.length)}/${ids.length}\r`)
  }
  process.stdout.write('\n')

  // Verify
  const { count: remaining } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
  console.log(`\nDeletion complete. Remaining rows in jobs table: ${remaining ?? 0}`)
  console.log(`Retained ${keep.length} chemistry-relevant job(s). ✔`)
}

function truncate(s: string, n: number): string {
  if (!s) return ''
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\nPurge failed:', err)
    process.exit(1)
  })
