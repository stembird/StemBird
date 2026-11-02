/**
 * ChemistryLens brand + copy reconciliation against the LIVE database.
 *
 * Two jobs:
 *   1) Blanket replace StemBird/CareerSasa/Careersasa → ChemistryLens across
 *      every TEXT/VARCHAR column of every exposed table (safety-guarded so
 *      real email addresses / domains like support@careersasa.co.ke stay put).
 *   2) Overwrite the specific page_content rows whose copy talks about
 *      "STEM skills / STEM roles / STEM Interview / STEM Talent" with
 *      chemistry-focused rewrites (mere brand replacement is not enough
 *      because the wording itself is off-brand for ChemistryLens).
 *
 * Dry-run by default. Pass --execute to write.
 *
 * Run:
 *   npx tsx scripts/rebrand-db-to-chemistrylens.ts          # dry-run
 *   npx tsx scripts/rebrand-db-to-chemistrylens.ts --execute
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
for (const line of fs.readFileSync(path.resolve(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/i)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '').trim()
}
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qhfdjccudtqnlkbtsjgg.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const EXECUTE = process.argv.includes('--execute')

/**
 * Discover every table exposed via PostgREST by hitting the OpenAPI root.
 */
async function listTables(): Promise<string[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}` },
  })
  const j = (await res.json()) as { paths?: Record<string, unknown> }
  const paths = Object.keys(j.paths ?? {})
  return paths
    .filter((p) => /^\/[^\/{}]+$/.test(p))
    .map((p) => p.slice(1))
}

/** Replace brand tokens but preserve real functional values. */
function rebrand(s: string): string {
  let out = s
  // Protect genuine email/domain references before the sweep.
  const protect: Array<[RegExp, string, string]> = [
    [/@careersasa\.co\.ke/g, '@careersasa.co.ke', '\u0000EMAIL_CAREERSASA\u0000'],
    [/careersasa\.co\.ke/g, 'careersasa.co.ke', '\u0000DOMAIN_CAREERSASA\u0000'],
    [/stembird\.co\.ke/g, 'stembird.co.ke', '\u0000DOMAIN_STEMBIRD\u0000'],
  ]
  for (const [re, , sentinel] of protect) {
    // Keep as-is (functional). Sentinel substitution allows later restore.
    out = out.replace(new RegExp(re.source, re.flags), (m) => sentinel + m)
  }
  out = out.replace(/StemBird/g, 'ChemistryLens')
  out = out.replace(/STEMBIRD/g, 'CHEMISTRYLENS')
  out = out.replace(/stembird/g, 'chemistrylens')
  out = out.replace(/CareerSasa/g, 'ChemistryLens')
  out = out.replace(/Careersasa/g, 'ChemistryLens')
  // Restore protected functional values.
  for (const [, real, sentinel] of protect) {
    out = out.split(sentinel + real).join(real)
  }
  return out
}

/** Substantive copy rewrites for STEM-flavoured marketing rows. */
const PAGE_COPY_REWRITES: Record<string, Record<string, string>> = {
  home: {
    hero_subtitle:
      "You've sent dozens of applications with zero callbacks. ChemistryLens changes that. We match your chemistry skills (analytical labs, QC/QA, formulation, process engineering and industrial testing) directly to employers who are hiring right now, so you skip the black hole and land your next interview faster.",
    featured_section_subtitle:
      'Hand-picked chemistry roles from top Kenyan employers, with new jobs added daily',
    why_choose_title:
      'Why 95% of Our Chemistry Talent Lands Interviews Within 3 Months',
    cta_title: 'Your Next Chemistry Career Interview Is 60 Seconds Away',
    cta_subtitle:
      "ChemistryLens matches your technical skills directly to employer requirements, not just keywords. That's why our users get 3x more interview callbacks than on generic job boards. Join free today.",
  },
  about: {
    hero_title: 'About ChemistryLens',
    story_title: 'Why We Built ChemistryLens',
    story_p2:
      "ChemistryLens was built to fix that. We use AI-powered matching that connects chemistry candidates to jobs they'll actually get, not just jobs that exist. We give every user free career tools worth KES 10,000+: CV builder, cover letter generator, LinkedIn optimizer. We believe the barrier to getting hired should never be money. And we give employers pre-screened, qualified candidates so they can hire in days, not months.",
    value_fairness_body:
      "Your background shouldn't determine your future. ChemistryLens is free for every job seeker. The best candidate might be someone who can't afford a KES 5,000 CV service.",
    stats_title: 'ChemistryLens by the Numbers',
  },
  'services-cv': {
    what_we_do_title: 'Why ChemistryLens CVs Get 3x More Interview Callbacks',
  },
  companies: {
    eyebrow: 'Employers on ChemistryLens',
  },
}

async function main() {
  const tables = await listTables()
  console.log(`Exposed tables: ${tables.length}`)

  let brandCellsUpdated = 0
  let copyCellsUpdated = 0

  // ─── Pass 1: brand token replacement across every table's text columns ───
  for (const table of tables) {
    // Grab sample row to enumerate columns.
    const { data: sample, error: sErr } = await sb.from(table).select('*').limit(1)
    if (sErr || !sample || sample.length === 0) continue
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const TS_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/
    const isRealText = (v: unknown): v is string =>
      typeof v === 'string' && !UUID_RE.test(v) && !TS_RE.test(v)
    const textCols = Object.keys(sample[0]).filter((k) => isRealText(sample[0][k]))
    if (textCols.length === 0) continue
    const idKey = sample[0].id !== undefined ? 'id' : null
    if (!idKey) continue

    // Find rows where any text column still contains a brand token.
    const orFilters = textCols
      .map((c) => `${c}.ilike.%stembird%,${c}.ilike.%careersasa%`)
      .join(',')
    const { data: rows, error: rErr } = await sb
      .from(table)
      .select('*')
      .or(orFilters)
      .limit(5000)
    if (rErr) { console.log(`  ${table}: filter error ${rErr.message}`); continue }
    if (!rows || rows.length === 0) continue

    const updates: Array<{ id: unknown; patch: Record<string, string> }> = []
    for (const raw of rows as unknown as Array<Record<string, unknown>>) {
      const id = raw[idKey]
      if (id === undefined || id === null) continue
      const patch: Record<string, string> = {}
      for (const col of textCols) {
        const v = raw[col]
        if (typeof v !== 'string') continue
        const nv = rebrand(v)
        if (nv !== v) patch[col] = nv
      }
      if (Object.keys(patch).length > 0) updates.push({ id, patch })
    }

    if (updates.length === 0) continue
    console.log(`\n[${table}] brand rewrite: ${updates.length} row(s)`)
    for (const u of updates.slice(0, 5)) {
      console.log(`   id=${String(u.id).slice(0, 12)}  cols=${Object.keys(u.patch).join(',')}`)
    }
    if (updates.length > 5) console.log(`   ... +${updates.length - 5} more`)

    if (EXECUTE) {
      for (const u of updates) {
        const { error } = await sb.from(table).update(u.patch).eq(idKey, u.id)
        if (error) console.log(`   FAILED id=${u.id}: ${error.message}`)
        else brandCellsUpdated += Object.keys(u.patch).length
      }
    }
  }

  // ─── Pass 2: substantive copy rewrites (STEM wording → chemistry wording) ───
  console.log('\n─── page_content copy rewrites ───')
  for (const [slug, kv] of Object.entries(PAGE_COPY_REWRITES)) {
    for (const [sectionKey, newValue] of Object.entries(kv)) {
      const { data: existing } = await sb
        .from('page_content')
        .select('id, content_value')
        .eq('page_slug', slug)
        .eq('section_key', sectionKey)
        .limit(1)
      const row = (existing ?? [])[0] as unknown as { id: string; content_value: string } | undefined
      if (!row) { console.log(`  [skip] ${slug}/${sectionKey}: not present in DB`); continue }
      if (row.content_value === newValue) { console.log(`  [no-op] ${slug}/${sectionKey}`); continue }
      console.log(`  [rewrite] ${slug}/${sectionKey}  (was: ${row.content_value.slice(0, 60)}…)`)
      if (EXECUTE) {
        const { error } = await sb.from('page_content').update({ content_value: newValue }).eq('id', row.id)
        if (error) console.log(`    FAILED: ${error.message}`); else copyCellsUpdated++
      }
    }
  }

  // Also site_name in site_settings (in case the pass-1 loop missed it because
  // it uses "StemBird" as CamelCase which IS matched — this is belt-and-braces).
  const { data: ss } = await sb.from('site_settings').select('id, site_name').limit(5)
  for (const r of (ss ?? []) as unknown as Array<{ id: string; site_name: string }>) {
    if (r.site_name && /stembird|careersasa/i.test(r.site_name)) {
      console.log(`  [site_settings] id=${r.id} site_name='${r.site_name}' → 'ChemistryLens'`)
      if (EXECUTE) await sb.from('site_settings').update({ site_name: 'ChemistryLens' }).eq('id', r.id)
    }
  }

  console.log(`\nMode: ${EXECUTE ? '*** EXECUTED ***' : 'DRY-RUN (add --execute to write)'}`)
  console.log(`Brand cells updated: ${brandCellsUpdated}`)
  console.log(`Copy rows rewritten: ${copyCellsUpdated}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
