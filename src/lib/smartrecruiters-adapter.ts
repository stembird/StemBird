/**
 * SmartRecruiters Posting API Adapter
 *
 * Public API — no authentication required.
 * Docs: https://developers.smartrecruiters.com/docs/endpoints
 *
 * Source config in scraper_sources.selectors:
 * {
 *   "type": "smartrecruiters",
 *   "slug": "AmrefHealthAfrica4",
 *   "filterCountry": "ke"   // ISO 3166-1 alpha-2, lowercase
 * }
 */

import { generateContentHash, NormalizedJob } from './scraper'
import { DETAIL_FETCH_TIMEOUT_MS, abortAfter } from './scraperHttp'

const LIST_API = (slug: string) =>
  `https://api.smartrecruiters.com/v1/companies/${slug}/postings`

const DETAIL_API = (slug: string, postingId: string) =>
  `https://api.smartrecruiters.com/v1/companies/${slug}/postings/${postingId}`

export interface SmartRecruitersSourceConfig {
  type: 'smartrecruiters'
  slug: string
  filterCountry?: string
  category?: string
}

interface SmartRecruitersPosting {
  id: string
  name: string
  uuid: string
  refNumber?: string
  location?: {
    city?: string
    region?: string
    country?: string
    remote?: boolean
    hybrid?: boolean
    fullLocation?: string
  }
  typeOfEmployment?: { id?: string; label?: string }
  experienceLevel?: { label?: string }
  department?: { label?: string }
  industry?: { id?: string; label?: string }
  function?: { id?: string; label?: string }
  postingUrl?: string
  applyUrl?: string
}

export interface SmartRecruitersDetail extends SmartRecruitersPosting {
  jobAd?: {
    sections?: {
      companyDescription?: { text?: string }
      jobDescription?: { text?: string }
      qualifications?: { text?: string }
      additionalInformation?: { text?: string }
    }
  }
}

interface ListResponse {
  content?: SmartRecruitersPosting[]
  totalFound?: number
  offset?: number
  limit?: number
}

export async function discoverSmartRecruitersJobs(
  config: SmartRecruitersSourceConfig
): Promise<Array<{ job_url: string; partial_data: { title: string; location: string } }>> {
  const all: SmartRecruitersPosting[] = []
  let offset = 0
  const limit = 100
  const maxPages = 10

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (config.filterCountry) params.set('country', config.filterCountry.toLowerCase())

    const response = await fetch(`${LIST_API(config.slug)}?${params}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; careersasa-scraper/1.0)',
      },
      signal: AbortSignal.timeout(12_000),
    })

    if (!response.ok) {
      throw new Error(`SmartRecruiters API error ${response.status} for slug "${config.slug}"`)
    }

    const data: ListResponse = await response.json()
    const batch = data.content || []
    all.push(...batch)

    if (batch.length < limit) break
    offset += limit
    if (data.totalFound != null && offset >= data.totalFound) break
  }

  return all.map(job => ({
    job_url: job.postingUrl || job.applyUrl || buildPostingUrl(config.slug, job.id, job.name),
    partial_data: {
      title: job.name,
      location: job.location?.fullLocation || [job.location?.city, job.location?.region, job.location?.country]
        .filter(Boolean)
        .join(', '),
    },
  }))
}

export async function fetchSmartRecruitersJobDetails(
  slug: string,
  postingId: string
): Promise<SmartRecruitersDetail> {
  const response = await fetch(DETAIL_API(slug, postingId), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; careersasa-scraper/1.0)',
    },
    signal: abortAfter(DETAIL_FETCH_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`SmartRecruiters detail API error ${response.status} for posting ${postingId}`)
  }

  return response.json()
}

export function normalizeSmartRecruitersJob(
  detail: SmartRecruitersDetail,
  companyName: string
): NormalizedJob {
  const loc = detail.location
  const county = loc?.region?.replace(/\s+county/i, '').trim() || ''
  const city = loc?.city || ''

  const sections = detail.jobAd?.sections
  // Keep company blurb in description; duties live in responsibilities for the UI.
  const description = sections?.companyDescription?.text || ''
  const responsibilities = sections?.jobDescription?.text || ''
  const industryHint = detail.industry?.label || detail.department?.label || null
  const functionHint = detail.function?.label || null
  const tags = [functionHint, industryHint, detail.department?.label].filter(Boolean).join(', ')

  return {
    title: detail.name,
    company: companyName,
    description,
    responsibilities,
    required_qualifications: sections?.qualifications?.text || '',
    employment_type: normalizeEmploymentType(detail.typeOfEmployment?.id),
    job_location_type: loc?.remote ? 'REMOTE' : loc?.hybrid ? 'HYBRID' : 'ON_SITE',
    job_location_country: loc?.country?.toUpperCase() === 'KE' ? 'Kenya' : (loc?.country || 'Kenya'),
    job_location_county: county,
    job_location_city: city,
    location: loc?.fullLocation || [city, county, 'Kenya'].filter(Boolean).join(', '),
    apply_link: detail.applyUrl || detail.postingUrl || '',
    application_url: detail.applyUrl || detail.postingUrl || '',
    valid_through: null,
    salary_min: null,
    salary_max: null,
    salary_currency: 'KES',
    salary_period: 'MONTH',
    salary_visibility: 'Hide',
    experience_level: normalizeExperienceLevel(detail.experienceLevel?.label),
    minimum_experience: null,
    industry: industryHint,
    status: 'active',
    posted_by: 'admin',
    tags,
  }
}

export function extractSmartRecruitersPostingId(jobUrl: string): string | null {
  const match = jobUrl.match(/\/(\d{10,})(?:-|$|\?)/)
  return match ? match[1] : null
}

export function extractSmartRecruitersSlug(jobUrl: string, fallbackSlug?: string): string | null {
  const match = jobUrl.match(/smartrecruiters\.com\/([^/]+)\//i)
  return match ? match[1] : fallbackSlug ?? null
}

function buildPostingUrl(slug: string, id: string, name: string): string {
  const slugified = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `https://jobs.smartrecruiters.com/${slug}/${id}-${slugified}`
}

/** Map SmartRecruiters labels onto the jobs.experience_level enum. */
function normalizeExperienceLevel(label?: string | null): 'Entry' | 'Mid' | 'Senior' | 'Managerial' | 'Internship' {
  const raw = (label || '').trim().toLowerCase()
  if (!raw || raw === 'not applicable' || raw === 'n/a' || raw === 'none') return 'Mid'
  if (raw.includes('intern')) return 'Internship'
  if (raw.includes('entry') || raw.includes('junior') || raw.includes('graduate')) return 'Entry'
  if (raw.includes('senior') || raw.includes('lead') || raw.includes('principal')) return 'Senior'
  if (
    raw.includes('manager') ||
    raw.includes('director') ||
    raw.includes('executive') ||
    raw.includes('head of')
  ) {
    return 'Managerial'
  }
  if (raw.includes('associate') || raw.includes('mid') || raw.includes('intermediate')) return 'Mid'
  return 'Mid'
}

function normalizeEmploymentType(typeId?: string): string {
  switch (typeId?.toLowerCase()) {
    case 'part_time':
    case 'part-time':
      return 'PART_TIME'
    case 'contract':
    case 'temporary':
      return 'CONTRACTOR'
    case 'intern':
    case 'internship':
      return 'INTERN'
    case 'permanent':
    case 'full_time':
    case 'full-time':
    default:
      return 'FULL_TIME'
  }
}

export { generateContentHash }
