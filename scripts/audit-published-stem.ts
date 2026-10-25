/**
 * READ-ONLY audit after a publish run. Answers two questions:
 *
 *  A) Did the STEM gate wrongly screen out any job that is still ACTIVE
 *     (unexpired)? Re-checks every "outside STEM" skip against the stored
 *     raw parse with the CURRENT 3-tier gate, plus a title-only hard-stem
 *     sweep. Any hit = false negative worth re-processing.
 *
 *  B) Are any active, unexpired STEM jobs sitting in the queue WITHOUT being
 *     published (still pending / processing / failed)? Lists them so Process
 *     can be re-run or items retried.
 *
 * Prints a summary and an "ALL CLEAR" / "ATTENTION" verdict. No writes.
 *
 * Run: npx tsx scripts/audit-published-stem.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { matchesSubjectFocus } from '../src/lib/scrapeSubjectFilter'

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

const NOW = new Date()

/** Strong title-only STEM signals — a title with one of these must never be skipped. */
const HARD_TITLE_STEMS = [
  'engineer', 'laborator', 'scientist', 'chemis', 'biochem', 'microbio',
  'biolog', 'pharmac', 'nursing', 'clinical', 'statistic', 'mathemat',
  'geolog', 'physic', 'software', 'devops', 'cyber', 'data scien',
  'data analy', 'data engine', 'agricultur', 'agronom', 'veterinar',
  'epidemiolog', 'mechanic', 'electron', 'network', 'database',
]

function hasHardTitleStem(title: string): boolean {
  const lower = title.toLowerCase()
  return HARD_TITLE_STEMS.some(stem => lower.includes(stem))
}

async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = []
  let from = 0
  for (;;) {
    const { data, error } = await Promise.resolve(build(from, from + pageSize - 1))
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return all
}

interface SkipRow {
  id: string
  source_id: string
  job_url: string
  error_message: string | null
}

/** scraped_job_sources keyed by job_url (no FK from scrape_queue → no embed). */
async function fetchSourceRowsByUrls(urls: string[]): Promise<Map<string, { raw_data: unknown }>> {
  const map = new Map<string, { raw_data: unknown }>()
  for (let i = 0; i < urls.length; i += 100) {
    const chunk = urls.slice(i, i + 100)
    const { data, error } = await supabase
      .from('scraped_job_sources')
      .select('job_url, raw_data')
      .in('job_url', chunk)
    if (error) throw new Error(error.message)
    for (const row of data || []) map.set(row.job_url, { raw_data: row.raw_data })
  }
  return map
}

function rawFields(raw: unknown): { fields: (string | null | undefined)[]; description: string | null } {
  // raw_data of the skip upsert may store the parsed object directly or under .parsed
  const obj = (raw ?? {}) as Record<string, unknown>
  const parsed = (typeof obj.parsed === 'object' && obj.parsed !== null ? obj.parsed : obj) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v : Array.isArray(v) ? v.map(String).join(' ') : null)
  return {
    fields: [
      str(parsed.title),
      str(parsed.field_of_study),
      str(parsed.area_of_study),
      str(parsed.job_function),
      ...(Array.isArray(parsed.job_functions) ? (parsed.job_functions as unknown[]).map(v => str(v)) : []),
      str(parsed.tags),
    ],
    description: str(parsed.description),
  }
}

async function main() {
  // ── Landed jobs ────────────────────────────────────────────────
  const { count: publishedSources } = await supabase
    .from('scraped_job_sources')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .not('job_id', 'is', null)

  const { count: activeJobs } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .or(`valid_through.is.null,valid_through.gt.${NOW.toISOString()}`)

  console.log(`Published scrape rows (live job linked): ${publishedSources ?? 0}`)
  console.log(`Active unexpired jobs in jobs table:     ${activeJobs ?? 0}`)

  // ── A) False-negative sweep over STEM-screened skips ───────────
  const skipRows = await fetchAll<SkipRow>(from =>
    supabase
      .from('scrape_queue')
      .select('id, source_id, job_url, error_message')
      .eq('status', 'done')
      .ilike('error_message', '%outside STEM%')
      .order('processed_at', { ascending: false })
      .range(from, from + 999)
  )
  console.log(`\nDone rows screened out as non-STEM: ${skipRows.length}`)

  const sourceBy = await fetchSourceRowsByUrls(skipRows.map(r => r.job_url))

  const falseNegatives: string[] = []
  for (const row of skipRows) {
    const raw = sourceBy.get(row.job_url)?.raw_data ?? null
    const title = (raw as { title?: string } | null)?.title || row.job_url
    if (hasHardTitleStem(title)) {
      falseNegatives.push(`HARD TITLE STEM  ${title}  (${row.job_url})`)
      continue
    }
    const { fields, description } = rawFields(raw)
    if (fields.some(f => f && hasHardTitleStem(f))) {
      falseNegatives.push(`HARD STEM FIELD  ${title}  (${row.job_url})`)
      continue
    }
    if (matchesSubjectFocus(fields, description)) {
      falseNegatives.push(`GATE NOW PASSES  ${title}  (${row.job_url})`)
    }
  }

  if (falseNegatives.length === 0) {
    console.log('No screened-out job shows a STEM signal on re-check. ✔')
  } else {
    console.log(`⚠ ${falseNegatives.length} skipped job(s) look STEM on re-check:`)
    for (const line of falseNegatives) console.log('   ' + line)
  }

  // ── B) Active STEM jobs never published ────────────────────────
  const unprocessed = await fetchAll<{
    id: string
    source_id: string
    job_url: string
    status: string
    error_message: string | null
    partial_data: { title?: string } | null
  }>(from =>
    supabase
      .from('scrape_queue')
      .select('id, source_id, job_url, status, error_message, partial_data')
      .in('status', ['pending', 'processing', 'failed'])
      .order('queued_at', { ascending: false })
      .range(from, from + 999)
  )

  const stemNotPublished = unprocessed.filter(row => {
    const title = row.partial_data?.title || ''
    return hasHardTitleStem(title) || matchesSubjectFocus([title])
  })

  console.log(`\nQueue rows still pending/processing/failed: ${unprocessed.length}`)
  if (stemNotPublished.length === 0) {
    console.log('None of them carry a STEM title signal. ✔')
  } else {
    console.log(`⚠ ${stemNotPublished.length} STEM-looking row(s) not published yet:`)
    for (const row of stemNotPublished.slice(0, 30)) {
      console.log(
        `   [${row.status}] ${row.partial_data?.title ?? '(no title)'}  (${row.job_url})` +
          (row.error_message ? `  — ${row.error_message.slice(0, 80)}` : '')
      )
    }
    if (stemNotPublished.length > 30) console.log(`   … +${stemNotPublished.length - 30} more`)
  }

  // ── Verdict ────────────────────────────────────────────────────
  const clean = falseNegatives.length === 0 && stemNotPublished.length === 0
  console.log(
    clean
      ? '\nALL CLEAR — every active job that passed the gate is published; no STEM-looking row was wrongly screened out.'
      : '\nATTENTION — see the ⚠ lists above. False negatives will be caught by the NEW gate once you re-queue those URLs (delete their scraped_job_sources skip rows, then Discover/Process).'
  )
  process.exit(0)
}

main().catch(err => {
  console.error('Audit failed:', err)
  process.exit(1)
})
