/**
 * Greenhouse Job Board API Adapter
 *
 * Public API — no authentication required.
 * Docs: https://developers.greenhouse.io/job-board.html
 *
 * Source config in scraper_sources.selectors:
 * {
 *   "type": "greenhouse",
 *   "slug": "oneacrefund",
 *   "filterCountry": "Kenya"
 * }
 */

import { generateContentHash, NormalizedJob } from './scraper'
import {
  DISCOVER_FETCH_TIMEOUT_MS,
  DETAIL_FETCH_TIMEOUT_MS,
  abortAfter,
} from './scraperHttp'

const LIST_API = (slug: string) =>
  `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`

const DETAIL_API = (slug: string, jobId: string | number) =>
  `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs/${jobId}`

export interface GreenhouseSourceConfig {
  type: 'greenhouse'
  slug: string
  filterCountry?: string
  category?: string
}

interface GreenhouseLocation {
  name?: string
}

interface GreenhouseJob {
  id: number
  title: string
  absolute_url?: string
  location?: GreenhouseLocation
  updated_at?: string
  content?: string
  departments?: Array<{ name?: string }>
  offices?: Array<{ name?: string; location?: string }>
  metadata?: Array<{ name?: string; value?: unknown }>
}

interface GreenhouseListResponse {
  jobs?: GreenhouseJob[]
}

function withTimeout(ms: number): AbortSignal {
  return abortAfter(ms)
}

function matchesCountry(job: GreenhouseJob, filterCountry?: string): boolean {
  if (!filterCountry) return true
  const needle = filterCountry.toLowerCase()
  const haystacks = [
    job.location?.name,
    ...(job.offices || []).flatMap(o => [o.name, o.location]),
  ]
    .filter(Boolean)
    .map(s => String(s).toLowerCase())

  if (haystacks.length === 0) return true
  return haystacks.some(h => h.includes(needle) || (needle === 'kenya' && h.includes('ke')))
}

export async function discoverGreenhouseJobs(
  config: GreenhouseSourceConfig
): Promise<Array<{ job_url: string; partial_data: { title: string; location: string } }>> {
  if (!config.slug) {
    throw new Error('Greenhouse source is missing selectors.slug')
  }

  const response = await fetch(LIST_API(config.slug), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; careersasa-scraper/1.0)',
    },
    signal: withTimeout(DISCOVER_FETCH_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Greenhouse API error ${response.status} for slug "${config.slug}"`)
  }

  const data = (await response.json()) as GreenhouseListResponse
  const jobs = (data.jobs || []).filter(job => matchesCountry(job, config.filterCountry))

  return jobs.map(job => ({
    job_url: job.absolute_url || `https://boards.greenhouse.io/${config.slug}/jobs/${job.id}`,
    partial_data: {
      title: job.title,
      location: job.location?.name || '',
    },
  }))
}

export function extractGreenhouseSlug(jobUrl: string): string | null {
  try {
    const url = new URL(jobUrl)
    // boards.greenhouse.io/{slug}/jobs/{id}
    const pathMatch = url.pathname.match(/^\/([^/]+)\/jobs\/\d+/i)
    if (url.hostname.includes('greenhouse.io') && pathMatch) return pathMatch[1]
    return null
  } catch {
    return null
  }
}

export function extractGreenhouseJobId(jobUrl: string): string | null {
  const pathMatch = jobUrl.match(/\/jobs\/(\d+)/i)
  if (pathMatch) return pathMatch[1]
  try {
    const ghJid = new URL(jobUrl).searchParams.get('gh_jid')
    if (ghJid && /^\d+$/.test(ghJid)) return ghJid
  } catch {
    /* ignore */
  }
  return null
}

export async function fetchGreenhouseJobDetails(
  slug: string,
  jobId: string
): Promise<GreenhouseJob> {
  const response = await fetch(DETAIL_API(slug, jobId), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; careersasa-scraper/1.0)',
    },
    signal: withTimeout(DETAIL_FETCH_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Greenhouse detail API error ${response.status} for job ${jobId}`)
  }

  const job = (await response.json()) as GreenhouseJob
  // Greenhouse Job Board API returns content with HTML entities escaped
  // (&lt;p&gt;…&lt;/p&gt;). Decode so section splitters / cheerio see real tags.
  if (job.content) {
    job.content = decodeGreenhouseHtml(job.content)
  }
  return job
}

/**
 * Greenhouse encodes the entire job HTML body as entities in JSON
 * (`&lt;p&gt;…&lt;/p&gt;`). Decode so cheerio / section splitters see real tags.
 */
export function decodeGreenhouseHtml(content: string): string {
  if (!content) return ''
  let html = content.trim()

  // Fully entity-encoded blob (no real tags yet) — decode until tags appear
  for (let i = 0; i < 3 && /&lt;[a-z/]/i.test(html) && !hasHtmlTags(html); i++) {
    html = decodeHtmlEntities(html)
  }

  // Leftover text entities inside real HTML (e.g. R&amp;D, &nbsp;)
  if (/&(?:amp|nbsp|quot|apos|#\d+|#x[0-9a-f]+);/i.test(html)) {
    html = decodeHtmlEntities(html)
  }

  return html
}

function hasHtmlTags(value: string): boolean {
  return /<(p|div|ul|ol|li|h[1-6]|br|span|strong|em|a)\b/i.test(value)
}

function decodeHtmlEntities(value: string): string {
  // Decode &amp; first so &amp;lt; → &lt; before &lt; → <.
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (match, n) => {
      const code = Number(n)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    })
    .replace(/&#x([0-9a-f]+);/gi, (match, h) => {
      const code = parseInt(h, 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    })
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

export function normalizeGreenhouseJob(
  job: GreenhouseJob,
  companyName: string
): NormalizedJob {
  const descriptionHtml = decodeGreenhouseHtml(job.content || '')
  const location = job.location?.name || 'Kenya'

  return {
    title: job.title?.trim() || 'Untitled role',
    company: companyName,
    description: descriptionHtml || `<p>${job.title}</p>`,
    responsibilities: '',
    required_qualifications: '',
    employment_type: 'FULL_TIME',
    job_location_type: /remote/i.test(location) ? 'REMOTE' : 'ON_SITE',
    job_location_country: /kenya/i.test(location) ? 'Kenya' : 'Kenya',
    job_location_county: '',
    job_location_city: location.split(',')[0]?.trim() || '',
    location,
    apply_link: job.absolute_url || '',
    application_url: job.absolute_url || '',
    valid_through: null,
    salary_min: null,
    salary_max: null,
    salary_currency: 'KES',
    salary_period: 'MONTH',
    salary_visibility: 'Hide',
    experience_level: 'Mid',
    minimum_experience: null,
    industry: job.departments?.[0]?.name || null,
    status: 'active',
    posted_by: 'admin',
    tags: [job.departments?.[0]?.name, 'Greenhouse'].filter(Boolean).join(','),
  }
}

export function greenhouseContentHash(job: GreenhouseJob, companyName: string): string {
  return generateContentHash(
    job.title || '',
    companyName,
    job.location?.name || ''
  )
}
