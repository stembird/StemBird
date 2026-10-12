/**
 * Kenya Public Service Commission (PSC) portal adapter
 *
 * Parses the Active Adverts table on psckjobs.go.ke (ASP.NET DataGrid).
 * Detail pages require login/postback, so we publish from listing-row data.
 *
 * Source config:
 * { "type": "psc", "category": "government" }
 */

import * as cheerio from 'cheerio'
import { fetchHtml, NormalizedJob } from './scraper'

/** @deprecated Prefer PSC_ADVERT_PARAM — hash fragments used to be stripped by normalizeJobUrl */
export const PSC_ADVERT_FRAGMENT = '#advert-'
/** Query param that keeps each PSC listing role uniquely dedupable */
export const PSC_ADVERT_PARAM = 'psc_advert'

export interface PscSourceConfig {
  type: 'psc'
  category?: string
}

export interface PscJobRow {
  advertNumber: string
  position: string
  jobScale: string
  ministry: string
  vacancies: string
  experienceYears: string
  category: string
  advertDate: string
  closeDate: string
}

export function buildPscJobUrl(baseUrl: string, advertNumber: string): string {
  const normalized = advertNumber.replace(/\//g, '-')
  try {
    const url = new URL(baseUrl)
    url.hash = ''
    url.searchParams.set(PSC_ADVERT_PARAM, normalized)
    return url.toString()
  } catch {
    const base = baseUrl.replace(/\/$/, '').split('#')[0]
    const join = base.includes('?') ? '&' : '?'
    return `${base}${join}${PSC_ADVERT_PARAM}=${encodeURIComponent(normalized)}`
  }
}

export function extractPscAdvertNumber(jobUrl: string): string | null {
  try {
    const fromQuery = new URL(jobUrl).searchParams.get(PSC_ADVERT_PARAM)
    if (fromQuery) return fromQuery.replace(/-/g, '/')
  } catch {
    /* fall through */
  }
  const match = jobUrl.match(/#advert-(.+)$/)
  if (!match) return null
  return match[1].replace(/-/g, '/')
}

export async function discoverPscJobs(
  baseUrl: string
): Promise<Array<{ job_url: string; partial_data: Record<string, string> }>> {
  const html = await fetchHtml(baseUrl)
  const rows = parsePscTable(html)

  return rows.map(row => ({
    job_url: buildPscJobUrl(baseUrl, row.advertNumber),
    partial_data: {
      title: cleanPositionTitle(row.position),
      location: 'Kenya',
      advertNumber: row.advertNumber,
      ministry: row.ministry,
      jobScale: row.jobScale,
      vacancies: row.vacancies,
      experienceYears: row.experienceYears,
      category: row.category,
      advertDate: row.advertDate,
      closeDate: row.closeDate,
    },
  }))
}

export async function fetchPscJobRow(baseUrl: string, advertNumber: string): Promise<PscJobRow | null> {
  const html = await fetchHtml(baseUrl)
  const rows = parsePscTable(html)
  return rows.find(r => r.advertNumber === advertNumber) ?? null
}

export function normalizePscJob(row: PscJobRow, portalApplyUrl: string): NormalizedJob {
  const title = cleanPositionTitle(row.position)
  const description = buildPscDescriptionHtml(row)

  return {
    title,
    company: row.ministry,
    description,
    responsibilities: '',
    required_qualifications: `<p>Minimum years of experience required: <strong>${row.experienceYears || '0'}</strong></p>`,
    employment_type: 'FULL_TIME',
    job_location_type: 'ON_SITE',
    job_location_country: 'Kenya',
    job_location_county: '',
    job_location_city: '',
    location: 'Kenya',
    apply_link: portalApplyUrl,
    application_url: portalApplyUrl,
    valid_through: parsePscCloseDate(row.closeDate),
    salary_min: null,
    salary_max: null,
    salary_currency: 'KES',
    salary_period: 'MONTH',
    salary_visibility: 'Hide',
    experience_level: parseExperienceLevel(row.experienceYears),
    minimum_experience: parseMinimumExperience(row.experienceYears),
    industry: 'Government',
    status: 'active',
    posted_by: 'admin',
    tags: `PSC,${row.advertNumber},${row.jobScale}`,
  }
}

function parsePscTable(html: string): PscJobRow[] {
  const $ = cheerio.load(html)
  const rows: PscJobRow[] = []

  $('#DataGrid2 tr').each((index, el) => {
    if (index === 0) return

    const cells = $(el)
      .find('td')
      .toArray()
      .map(td => $(td).text().replace(/\s+/g, ' ').trim())

    if (cells.length < 10) return

    const advertNumber = cells[1]
    const position = cells[2]
    if (!advertNumber || !position) return

    rows.push({
      advertNumber,
      position,
      jobScale: cells[3] || '',
      ministry: cells[4] || '',
      vacancies: cells[5] || '',
      experienceYears: cells[6] || '',
      category: cells[7] || '',
      advertDate: cells[8] || '',
      closeDate: cells[9] || '',
    })
  })

  return rows
}

function cleanPositionTitle(position: string): string {
  return position.replace(/\[\d+\]\s*/g, '').trim()
}

function buildPscDescriptionHtml(row: PscJobRow): string {
  return [
    '<p>Vacancy advertised by the <strong>Public Service Commission of Kenya</strong>.</p>',
    '<ul>',
    `<li><strong>Advert number:</strong> ${row.advertNumber}</li>`,
    `<li><strong>Ministry / State Department:</strong> ${row.ministry}</li>`,
    `<li><strong>Job scale:</strong> ${row.jobScale}</li>`,
    `<li><strong>Number of vacancies:</strong> ${row.vacancies}</li>`,
    `<li><strong>Advert category:</strong> ${row.category}</li>`,
    `<li><strong>Advert date:</strong> ${row.advertDate}</li>`,
    `<li><strong>Closing date:</strong> ${row.closeDate}</li>`,
    '</ul>',
    '<p>Apply online through the official PSC recruitment portal. PSC does not charge any application fee.</p>',
  ].join('')
}

function parsePscCloseDate(closeDate: string): string | null {
  // Format: DD-MM-YYYY
  const match = closeDate.match(/(\d{2})-(\d{2})-(\d{4})/)
  if (!match) return null
  const [, dd, mm, yyyy] = match
  return `${yyyy}-${mm}-${dd}`
}

function parseMinimumExperience(years: string): number | null {
  const n = parseInt(years, 10)
  return isNaN(n) ? null : n
}

function parseExperienceLevel(years: string): string {
  const n = parseInt(years, 10)
  if (isNaN(n) || n <= 1) return 'Entry'
  if (n <= 4) return 'Mid'
  return 'Senior'
}
