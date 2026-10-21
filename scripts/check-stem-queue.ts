/**
 * READ-ONLY triage of the scrape_queue. Does not modify any rows.
 *
 * Because StemBird's filter reads beyond the title, we classify each pending
 * job by fetching its DETAIL PAGE TEXT (no AI, no writes) and running the real
 * two-tier deep gate: title = high-signal, page text = guarded description.
 *
 * Buckets:
 *   STEM            -> passes the deep gate (fetch + AI parse worth it)
 *   NON-STEM        -> fails the deep gate (processing would skip it anyway)
 *   INCONCLUSIVE    -> page text too thin to decide (mostly JS-rendered ATS)
 *
 * Default is DRY RUN (read-only). Pass --apply to act: it marks as `done` ONLY
 * the confidently NON-STEM jobs from fully-readable HTML boards
 * (brightermonday / myjobmag / fuzu). ATS/API sources are never touched here —
 * they go to the real process so their full text (and any buried STEM
 * requirement) is judged with the proper adapter.
 *
 * Run: npx tsx scripts/check-stem-queue.ts            (dry run)
 *      npx tsx scripts/check-stem-queue.ts --apply     (scoped skip)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'
import { fetchHtml } from '../src/lib/scraper'
import { matchesSubjectFocus } from '../src/lib/scrapeSubjectFilter'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Load .env.local manually (tsx does not auto-load it) ──
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

const APPLY = process.argv.includes('--apply')

const CONCURRENCY = 5
/** Below this much readable text, we can't trust the deep gate. */
const MIN_TEXT_CHARS = 200

function titleOf(partial: unknown): string {
  if (partial && typeof partial === 'object') {
    const t = (partial as Record<string, unknown>).title
    if (typeof t === 'string') return t
  }
  return ''
}

/** Extract readable body text + JSON-LD description from a job detail page. */
function pageToText(html: string): string {
  const $ = cheerio.load(html)
  $('script:not([type="application/ld+json"]), style, noscript, svg').remove()

  // Pull any JobPosting / Article JSON-LD description too.
  let ld = ''
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const obj = JSON.parse($(el).text())
      const arr = Array.isArray(obj) ? obj : [obj]
      for (const o of arr) {
        if (o && typeof o.description === 'string') ld += '\n' + o.description
      }
    } catch {
      /* ignore malformed ld+json */
    }
  })

  const body = ($('body').text() || '').replace(/\s+/g, ' ').trim()
  return `${body}\n${ld.replace(/\s+/g, ' ').trim()}`.trim()
}

/**
 * Pull HIGH-SIGNAL fields from the detail page the same spirit as the real
 * pipeline: job title (og:title / JSON-LD / <h1>), plus structured JobPosting
 * fields (occupationalCategory, qualifications, responsibilities). Body text is
 * returned separately as the LOW-signal description so the study-context guard
 * still applies to it.
 */
function extractFields(
  html: string,
  urlSlugTitle: string
): { high: string[]; description: string } {
  const $ = cheerio.load(html)
  const high: string[] = []

  // Title sources, in priority order.
  const jsonLdTitle = (() => {
    let t = ''
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const obj = JSON.parse($(el).text())
        const arr = Array.isArray(obj) ? obj : [obj]
        for (const o of arr) {
          if (!t && o && typeof o.title === 'string') t = o.title
          if (!t && o && typeof o.headline === 'string') t = o.headline
        }
      } catch {
        /* ignore */
      }
    })
    return t
  })()

  const ogTitle = $('meta[property="og:title"]').attr('content') || ''
  const h1 = $('h1').first().text().trim()
  high.push(jsonLdTitle || ogTitle || h1 || urlSlugTitle)

  // Structured JobPosting fields = high-signal (they ARE the requirements).
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const obj = JSON.parse($(el).text())
      const arr = Array.isArray(obj) ? obj : [obj]
      for (const o of arr) {
        if (!o || typeof o !== 'object') continue
        for (const k of ['occupationalCategory', 'industry', 'qualifications', 'experienceRequirements', 'skillsRequired', 'educationRequirements']) {
          const v = (o as Record<string, unknown>)[k]
          if (typeof v === 'string') high.push(v)
          else if (Array.isArray(v)) high.push(v.map(String).join(' '))
        }
      }
    } catch {
      /* ignore */
    }
  })

  // Derive a clean title from the URL slug (e.g. .../data-analyst-9k85xj).
  return { high, description: pageToText(html) }
}

/** Best-effort title from the URL slug when the board gives us nothing. */
function titleFromUrl(u: string): string {
  try {
    const pathName = new URL(u).pathname
    const last = pathName.split('/').filter(Boolean).pop() || ''
    return decodeURIComponent(last)
      .replace(/\.(html?|ftl|aspx)$/i, '')
      .replace(/-\d{3,}[a-z0-9]*$/i, '') // trailing board id like -9k85xj
      .replace(/[-_]+/g, ' ')
      .trim()
  } catch {
    return ''
  }
}


type Row = {
  id: number
  source_id: string
  job_url: string
  title: string
}

async function classify(row: Row): Promise<{
  row: Row
  verdict: 'STEM' | 'NON-STEM' | 'INCONCLUSIVE'
  chars: number
}> {
  let html = ''
  try {
    html = await fetchHtml(row.job_url)
  } catch {
    html = ''
  }

  const urlTitle = titleFromUrl(row.job_url)
  const bestTitle = row.title || urlTitle

  if (!html) {
    // Couldn't fetch: judge on whatever title we have (from queue or URL).
    if (!bestTitle) return { row, verdict: 'INCONCLUSIVE', chars: 0 }
    const ok = matchesSubjectFocus([bestTitle])
    return { row, verdict: ok ? 'STEM' : 'NON-STEM', chars: 0 }
  }

  const { high, description } = extractFields(html, urlTitle)
  // Ensure our known title (queue or URL) is always in the high-signal set.
  const highSignals = [bestTitle, ...high].filter(Boolean)

  if (description.length < MIN_TEXT_CHARS && !highSignals.join(' ').trim()) {
    return { row, verdict: 'INCONCLUSIVE', chars: description.length }
  }

  // Real deep gate: page title + structured fields high-signal, body guarded.
  const ok = matchesSubjectFocus(highSignals, description)
  return { row, verdict: ok ? 'STEM' : 'NON-STEM', chars: description.length }
}

async function main() {
  const { data: all, error } = await supabase
    .from('scrape_queue')
    .select('id, status, source_id, job_url, partial_data')
    .eq('status', 'pending')
  if (error) throw error

  const rows: Row[] = (all || []).map(r => ({
    id: r.id,
    source_id: r.source_id,
    job_url: r.job_url,
    title: titleOf(r.partial_data),
  }))

  console.log(`Pending jobs to check: ${rows.length}. Fetching detail pages (no AI, read-only)...\n`)

  // Simple worker pool over rows.
  const results: Awaited<ReturnType<typeof classify>>[] = []
  let cursor = 0
  async function worker() {
    while (cursor < rows.length) {
      const idx = cursor++
      results.push(await classify(rows[idx]))
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  const stem = results.filter(r => r.verdict === 'STEM')
  const nonStem = results.filter(r => r.verdict === 'NON-STEM')
  const inconclusive = results.filter(r => r.verdict === 'INCONCLUSIVE')

  console.log('=== DEEP-GATE CLASSIFICATION (reads description, no AI) ===')
  console.table({
    STEM: stem.length,
    'NON-STEM': nonStem.length,
    INCONCLUSIVE: inconclusive.length,
    TOTAL: results.length,
  })

  if (nonStem.length) {
    console.log('\n--- NON-STEM (processing would skip these) ---')
    const disp = (r: (typeof nonStem)[number]) =>
      r.row.title || titleFromUrl(r.row.job_url) || '(no title)'
    for (const r of nonStem.sort((a, b) => disp(a).localeCompare(disp(b)))) {
      console.log(`[${r.row.source_id}] ${disp(r)}  ->  ${r.row.job_url}`)
    }
  }

  if (inconclusive.length) {
    console.log('\n--- INCONCLUSIVE (page text too thin — likely JS-rendered; needs real parse) ---')
    for (const r of inconclusive) {
      const t = r.row.title || titleFromUrl(r.row.job_url) || '(no title)'
      console.log(`[${r.row.source_id}] ${t} (${r.chars} chars)  ->  ${r.row.job_url}`)
    }
  }

  // ── Scoped skip: only fully-read HTML-board NON-STEM jobs ──
  const HTML_BOARD = /^(brightermonday|myjobmag|fuzu)/i
  const skipTargets = nonStem.filter(
    r => HTML_BOARD.test(r.row.source_id) && r.chars >= MIN_TEXT_CHARS
  )

  console.log(
    `\n=== SCOPED SKIP CANDIDATES (HTML boards, fully read) : ${skipTargets.length} ===`
  )
  const skippedIds = skipTargets.map(r => r.row.id)

  if (skippedIds.length > 0) {
    for (const r of skipTargets) {
      const t = r.row.title || titleFromUrl(r.row.job_url) || '(no title)'
      console.log(`  [${r.row.source_id}] #${r.row.id} ${t}`)
    }
  }

  if (APPLY) {
    if (skippedIds.length === 0) {
      console.log('\n--apply set but nothing to skip.')
    } else {
      const CHUNK = 50
      let updated = 0
      for (let i = 0; i < skippedIds.length; i += CHUNK) {
        const chunk = skippedIds.slice(i, i + CHUNK)
        const { data, error } = await supabase
          .from('scrape_queue')
          .update({
            status: 'done',
            processed_at: new Date().toISOString(),
            error_message: 'Skipped: pre-check outside STEM (HTML board, fully read)',
          })
          .in('id', chunk)
          .select('id')
        if (error) throw error
        updated += data?.length || 0
      }
      console.log(`\nAPPLIED: marked ${updated} HTML-board non-STEM jobs as done (skipped).`)
      console.log(
        `Remaining pending for real process: ${results.length - updated} ` +
          `(STEM ${stem.length} + non-HTML non-STEM ${nonStem.length - skipTargets.length} for adapter-based re-check).`
      )
    }
  } else {
    console.log(
      '\nDRY RUN — nothing written. Re-run with --apply to mark these as skipped.'
    )
  }

  console.log('\nDone.')
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('check-stem-queue failed:', err)
    process.exit(1)
  })
