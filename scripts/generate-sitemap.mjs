#!/usr/bin/env node
/**
 * Regenerates public/sitemap.xml + public/sitemap-0.xml from live Supabase data.
 *
 * The old sitemap was a static snapshot from 2026-03-11 — it listed none of the
 * jobs published after March, so Google had no lastmod signal to recrawl corrected
 * pages or discover new jobs. Run this after bulk changes or wire it into the
 * scraping/publishing workflow:
 *
 *   node scripts/generate-sitemap.mjs
 *
 * Environment: SUPABASE_URL / SUPABASE_ANON_KEY (public creds are fine; falls back
 * to the published project values).
 */
import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://www.careersasa.co.ke'

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://qxuvqrfqkdpfjfwkqatf.supabase.co'
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dXZxcmZxa2RwZmpmd2txYXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjcxNTIsImV4cCI6MjA3NTAwMzE1Mn0.mAiL1p6YqlSaSFOIDW_G-3e_Mqck0cFqLl74_jyNpk8'

const STATIC_PAGES = [
  { loc: `${SITE}/`, lastmod: today(), changefreq: 'daily', priority: '0.7' },
  { loc: `${SITE}/jobs`, lastmod: today(), changefreq: 'daily', priority: '0.7' },
  { loc: `${SITE}/auth`, lastmod: today(), changefreq: 'daily', priority: '0.7' },
  { loc: `${SITE}/blog`, lastmod: today(), changefreq: 'daily', priority: '0.7' },
  { loc: `${SITE}/blog/create`, lastmod: today(), changefreq: 'daily', priority: '0.7' },
  { loc: `${SITE}/advertise`, lastmod: today(), changefreq: 'daily', priority: '0.7' },
  { loc: `${SITE}/contact`, lastmod: today(), changefreq: 'daily', priority: '0.7' },
  { loc: `${SITE}/about`, lastmod: today(), changefreq: 'daily', priority: '0.7' },
  { loc: `${SITE}/mission`, lastmod: today(), changefreq: 'daily', priority: '0.7' },
  { loc: `${SITE}/privacy`, lastmod: today(), changefreq: 'daily', priority: '0.7' },
  { loc: `${SITE}/terms`, lastmod: today(), changefreq: 'daily', priority: '0.7' },
  { loc: `${SITE}/cookies`, lastmod: today(), changefreq: 'daily', priority: '0.7' },
  { loc: `${SITE}/post-job`, lastmod: today(), changefreq: 'daily', priority: '0.7' },
  { loc: `${SITE}/job-alerts`, lastmod: today(), changefreq: 'daily', priority: '0.7' },
  { loc: `${SITE}/dashboard`, lastmod: today(), changefreq: 'daily', priority: '0.7' },
  { loc: `${SITE}/dashboard/manage-jobs`, lastmod: today(), changefreq: 'daily', priority: '0.7' },
  { loc: `${SITE}/services/cv`, lastmod: today(), changefreq: 'daily', priority: '0.7' },
  { loc: `${SITE}/services/linkedin`, lastmod: today(), changefreq: 'daily', priority: '0.7' },
  { loc: `${SITE}/services/cover-letter`, lastmod: today(), changefreq: 'daily', priority: '0.7' },
]

function today() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function fetchActiveJobs() {
  const jobs = []
  let offset = 0
  const pageSize = 1000

  for (;;) {
    const qs = new URLSearchParams({
      select: 'id,job_slug,updated_at,created_at,valid_through,status',
      status: 'eq.active',
      order: 'updated_at.desc',
      limit: String(pageSize),
      offset: String(offset),
    })
    const res = await fetch(`${SUPABASE_URL}/rest/v1/jobs?${qs}`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    })
    if (!res.ok) throw new Error(`fetch jobs -> ${res.status} ${await res.text()}`)
    const rows = await res.json()
    if (!Array.isArray(rows) || rows.length === 0) break
    jobs.push(...rows)
    if (rows.length < pageSize) break
    offset += pageSize
  }

  return jobs.map((job) => {
    const slug = job.job_slug || job.id
    const lastmod = (job.updated_at || job.created_at || today()).replace(/\.\d{3}Z$/, 'Z')
    return {
      loc: `${SITE}/jobs/${encodeURIComponent(slug)}`,
      lastmod,
      changefreq: 'daily',
      priority: '0.8',
    }
  })
}

async function fetchCompanyEntries() {
  const companies = []
  let offset = 0
  const pageSize = 1000

  for (;;) {
    const qs = new URLSearchParams({
      select: 'id,updated_at',
      order: 'updated_at.desc',
      limit: String(pageSize),
      offset: String(offset),
    })
    const res = await fetch(`${SUPABASE_URL}/rest/v1/companies?${qs}`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    })
    if (!res.ok) throw new Error(`fetch companies -> ${res.status} ${await res.text()}`)
    const rows = await res.json()
    if (!Array.isArray(rows) || rows.length === 0) break
    companies.push(...rows)
    if (rows.length < pageSize) break
    offset += pageSize
  }

  return companies.map((company) => ({
    loc: `${SITE}/companies/${encodeURIComponent(company.id)}`,
    lastmod: (company.updated_at || today()).replace(/\.\d{3}Z$/, 'Z'),
    changefreq: 'weekly',
    priority: '0.7',
  }))
}

function toSlug(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function fetchIndustryEntries() {
  const qs = new URLSearchParams({
    select: 'name',
    order: 'name',
    limit: '1000',
  })
  const res = await fetch(`${SUPABASE_URL}/rest/v1/industries?${qs}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  })
  if (!res.ok) throw new Error(`fetch industries -> ${res.status} ${await res.text()}`)
  const rows = await res.json()
  return (rows || []).map((industry) => ({
    loc: `${SITE}/companies/industry/${encodeURIComponent(toSlug(industry.name))}`,
    lastmod: today(),
    changefreq: 'daily',
    priority: '0.7',
  }))
}

function urlsetXml(entries) {
  const body = entries
    .map(
      (u) =>
        `<url><loc>${esc(u.loc)}</loc><lastmod>${esc(u.lastmod)}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
    )
    .join('\n')
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
  )
}

async function main() {
  console.log('Fetching active jobs / companies / industries from Supabase…')
  const [jobEntries, companyEntries, industryEntries] = await Promise.all([
    fetchActiveJobs(),
    fetchCompanyEntries(),
    fetchIndustryEntries(),
  ])
  console.log(
    `Found ${jobEntries.length} job URLs, ${companyEntries.length} company URLs, ${industryEntries.length} industry URLs`
  )

  const baseCompanyPages = [
    { loc: `${SITE}/companies`, lastmod: today(), changefreq: 'daily', priority: '0.8' },
    { loc: `${SITE}/companies/industry/all`, lastmod: today(), changefreq: 'daily', priority: '0.75' },
  ]

  const all = [
    ...STATIC_PAGES,
    ...baseCompanyPages,
    ...companyEntries,
    ...industryEntries,
    ...jobEntries,
  ]
  const xml = urlsetXml(all)
  const index = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<sitemap><loc>${SITE}/sitemap-0.xml</loc></sitemap>\n</sitemapindex>\n`

  await writeFile(resolve(ROOT, 'public', 'sitemap-0.xml'), xml, 'utf8')
  await writeFile(resolve(ROOT, 'public', 'sitemap.xml'), index, 'utf8')
  console.log(`Wrote public/sitemap-0.xml (${all.length} URLs) and public/sitemap.xml`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
