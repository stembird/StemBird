/**
 * Workable API Adapter
 *
 * Handles discovery and detail fetching for companies using Workable ATS.
 * Uses the undocumented but publicly accessible apply.workable.com API —
 * no authentication required.
 *
 * Source config format in scraper_sources.selectors:
 * {
 *   "type": "workable",
 *   "slug": "inkomoko",          // company slug from apply.workable.com/{slug}
 *   "filterCountry": "Kenya"     // optional: only import jobs with a Kenya location
 * }
 */

import { generateContentHash, NormalizedJob } from './scraper'
import { DISCOVER_FETCH_TIMEOUT_MS, DETAIL_FETCH_TIMEOUT_MS, abortAfter } from './scraperHttp'

const WORKABLE_LIST_API = (slug: string) =>
  `https://apply.workable.com/api/v3/accounts/${slug}/jobs`

/** Hard cap so a runaway nextPage token cannot burn the whole Vercel budget. */
const WORKABLE_MAX_PAGES = 10

const WORKABLE_DETAIL_API = (slug: string, shortcode: string) =>
  `https://apply.workable.com/api/v2/accounts/${slug}/jobs/${shortcode}`

const WORKABLE_JOB_URL = (slug: string, shortcode: string) =>
  `https://apply.workable.com/${slug}/j/${shortcode}/`

export interface WorkableJobListing {
  id: number
  shortcode: string
  title: string
  type: string        // "full", "part", "contract", "temporary", "intern"
  workplace: string   // "on_site", "remote", "hybrid"
  location: {
    country: string
    countryCode: string
    city: string
    region: string
  }
  locations: Array<{
    country: string
    countryCode: string
    city: string
    region: string
  }>
  published: string
  department: string[]
}

export interface WorkableJobDetail extends WorkableJobListing {
  description: string
  requirements: string
  benefits: string
}

export interface WorkableSourceConfig {
  type: 'workable'
  slug: string
  filterCountry?: string  // e.g. "Kenya" — filter to only jobs with this country in locations
}

// ── Discover: fetch all jobs for a company, filter by country ─────────────────

export async function discoverWorkableJobs(
  config: WorkableSourceConfig
): Promise<Array<{ job_url: string; partial_data: { title: string; location: string } }>> {
  const allJobs: WorkableJobListing[] = []
  let nextPageToken: string | null = null
  let pages = 0

  // Paginate through results (hard-capped)
  do {
    pages += 1
    const payload: Record<string, unknown> = {
      query: '',
      token: nextPageToken,
      department: [],
      location: [],
      workplace: [],
      worktype: [],
    }

    const response = await fetch(WORKABLE_LIST_API(config.slug), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://apply.workable.com',
        'Referer': `https://apply.workable.com/${config.slug}/`,
        'User-Agent': 'Mozilla/5.0 (compatible; careersasa-scraper/1.0)',
      },
      body: JSON.stringify(payload),
      signal: abortAfter(DISCOVER_FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(`Workable API error ${response.status} for slug "${config.slug}"`)
    }

    const data = await response.json()
    allJobs.push(...(data.results || []))
    nextPageToken = data.nextPage || null

  } while (nextPageToken && pages < WORKABLE_MAX_PAGES)

  // Filter to jobs that have a Kenya (or specified country) location
  const filtered = config.filterCountry
    ? allJobs.filter(job =>
        job.locations?.some(loc =>
          loc.country.toLowerCase() === config.filterCountry!.toLowerCase()
        )
      )
    : allJobs

  // Map to the queue format
  return filtered.map(job => {
    // Find the Kenya-specific location if filtering
    const targetLoc = config.filterCountry
      ? job.locations?.find(loc =>
          loc.country.toLowerCase() === config.filterCountry!.toLowerCase()
        ) ?? job.location
      : job.location

    const locationStr = [targetLoc?.city, targetLoc?.region, targetLoc?.country]
      .filter(Boolean)
      .join(', ')

    return {
      job_url: WORKABLE_JOB_URL(config.slug, job.shortcode),
      partial_data: {
        title: job.title,
        location: locationStr,
      },
    }
  })
}

// ── Process: fetch full details for a single job ──────────────────────────────

export async function fetchWorkableJobDetails(
  slug: string,
  shortcode: string
): Promise<WorkableJobDetail> {
  const response = await fetch(WORKABLE_DETAIL_API(slug, shortcode), {
    headers: {
      'Accept': 'application/json',
      'Referer': `https://apply.workable.com/${slug}/j/${shortcode}/`,
      'User-Agent': 'Mozilla/5.0 (compatible; careersasa-scraper/1.0)',
    },
    signal: abortAfter(DETAIL_FETCH_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Workable detail API error ${response.status} for ${shortcode}`)
  }

  return response.json()
}

// ── Normalize Workable job to careersasa schema ─────────────────────────────

export function normalizeWorkableJob(
  detail: WorkableJobDetail,
  companyName: string,
  filterCountry?: string
): NormalizedJob {
  // Pick the Kenya location if available, otherwise use primary
  const targetLoc = filterCountry
    ? detail.locations?.find(loc =>
        loc.country.toLowerCase() === filterCountry.toLowerCase()
      ) ?? detail.location
    : detail.location

  const county = targetLoc?.region?.replace(/\s+county/i, '').trim() || ''
  const city = targetLoc?.city || ''

  return {
    title: detail.title,
    company: companyName,
    description: detail.description || '',
    responsibilities: '',
    required_qualifications: detail.requirements || '',
    employment_type: normalizeWorkableEmploymentType(detail.type),
    job_location_type: normalizeWorkplace(detail.workplace),
    job_location_country: targetLoc?.country || 'Kenya',
    job_location_county: county,
    job_location_city: city,
    location: [city, county, targetLoc?.country].filter(Boolean).join(', '),
    apply_link: '',   // Workable uses direct apply via their platform
    application_url: WORKABLE_JOB_URL('__SLUG__', detail.shortcode), // slug injected by caller
    // Workable exposes `published` (posting date), NOT a closing deadline.
    // Leave null so resolveScrapedDeadline defaults to publication + 30 days.
    valid_through: null,
    salary_min: null,
    salary_max: null,
    salary_currency: 'KES',
    salary_period: 'MONTH',
    salary_visibility: 'Hide',  // Workable jobs don't expose salary
    experience_level: 'Mid',
    minimum_experience: null,
    industry: null,
    status: 'active',
    posted_by: 'admin',  // scraper posts as admin
    tags: detail.department?.join(', ') || '',
  }
}

// ── Extract shortcode from Workable job URL ───────────────────────────────────

export function extractWorkableShortcode(jobUrl: string): string | null {
  // URL format: https://apply.workable.com/{slug}/j/{shortcode}/
  const match = jobUrl.match(/\/j\/([A-Za-z0-9]+)\/?$/i)
  return match ? match[1] : null
}

export function extractWorkableSlug(jobUrl: string): string | null {
  // URL format: https://apply.workable.com/{slug}/j/{shortcode}/
  const match = jobUrl.match(/apply\.workable\.com\/([^/]+)\/j\//)
  return match ? match[1] : null
}

// ── Re-export hash helper for convenience ────────────────────────────────────
export { generateContentHash }

// ── Employment type mapping ───────────────────────────────────────────────────

function normalizeWorkableEmploymentType(type: string): string {
  switch (type?.toLowerCase()) {
    case 'part': return 'PART_TIME'
    case 'contract': return 'CONTRACTOR'
    case 'temporary': return 'TEMPORARY'
    case 'intern': return 'INTERN'
    case 'full':
    default: return 'FULL_TIME'
  }
}

function normalizeWorkplace(workplace: string): string {
  switch (workplace?.toLowerCase()) {
    case 'remote': return 'REMOTE'
    case 'hybrid': return 'HYBRID'
    case 'on_site':
    default: return 'ON_SITE'
  }
}
