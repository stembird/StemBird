/**
 * Oracle Cloud HCM Candidate Experience (CE) adapter
 *
 * Public REST — no authentication required for external career sites.
 *
 * List:
 *   GET /hcmRestApi/resources/latest/recruitingCEJobRequisitions
 *     ?finder=findReqs;siteNumber={site},limit=100,sortBy=POSTING_DATES_DESC
 *
 * Detail:
 *   GET /hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails
 *     ?finder=ById;Id={id},siteNumber={site}
 *
 * Apply URL:
 *   /hcmUI/CandidateExperience/en/sites/{site}/job/{id}
 *
 * Source config in scraper_sources.selectors:
 * {
 *   "type": "oracle_cloud",
 *   "host": "eoin.fa.em3.oraclecloud.com",
 *   "siteNumber": "CX_3001",
 *   "filterCountry": "KE",
 *   "category": "employer"
 * }
 */

import { generateContentHash, NormalizedJob } from './scraper'

export interface OracleCloudSourceConfig {
  type: 'oracle_cloud'
  host: string
  siteNumber: string
  /** ISO alpha-2 (e.g. KE) or country name (Kenya) */
  filterCountry?: string
  category?: string
}

export interface OracleCloudJobListing {
  id: string
  title: string
  location: string
  countryCode: string
  shortDescription?: string
  postedDate?: string
  detailUrl: string
}

export interface OracleCloudJobDetail extends OracleCloudJobListing {
  descriptionHtml: string
  qualificationsHtml: string
  responsibilitiesHtml: string
  jobSchedule?: string
  category?: string
  validThrough?: string | null
}

interface OracleCloudListItem {
  Id?: string | number
  Title?: string
  PrimaryLocation?: string
  PrimaryLocationCountry?: string
  ShortDescriptionStr?: string
  PostedDate?: string
  WorkplaceType?: string
}

interface OracleCloudDetailItem extends OracleCloudListItem {
  ExternalDescriptionStr?: string
  ExternalQualificationsStr?: string
  ExternalResponsibilitiesStr?: string
  ShortDescriptionStr?: string
  JobSchedule?: string
  Category?: string
  ExternalPostedEndDate?: string
}

const UA = 'Mozilla/5.0 (compatible; careersasa-scraper/1.0)'
const PAGE_SIZE = 100
const MAX_PAGES = 10

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms)
}

function jobUrl(host: string, siteNumber: string, id: string): string {
  return `https://${host}/hcmUI/CandidateExperience/en/sites/${encodeURIComponent(siteNumber)}/job/${encodeURIComponent(id)}`
}

function listApiUrl(host: string, siteNumber: string, offset: number): string {
  const finder = `findReqs;siteNumber=${siteNumber},limit=${PAGE_SIZE},offset=${offset},sortBy=POSTING_DATES_DESC`
  const params = new URLSearchParams({
    onlyData: 'true',
    expand: 'requisitionList.secondaryLocations',
    finder,
  })
  return `https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?${params}`
}

function detailApiUrl(host: string, siteNumber: string, id: string): string {
  const finder = `ById;Id=${id},siteNumber=${siteNumber}`
  const params = new URLSearchParams({
    onlyData: 'true',
    expand: 'all',
    finder,
  })
  return `https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?${params}`
}

export function parseOracleCloudBoardUrl(
  url: string
): { host: string; siteNumber: string } | null {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes('oraclecloud.com')) return null
    const match = parsed.pathname.match(
      /\/hcmUI\/CandidateExperience\/[^/]+\/sites\/([^/]+)/i
    )
    if (!match) return null
    return { host: parsed.hostname, siteNumber: match[1] }
  } catch {
    return null
  }
}

export function extractOracleCloudJobId(jobUrl: string): string | null {
  try {
    const parsed = new URL(jobUrl)
    const match = parsed.pathname.match(/\/job\/([^/]+)\/?$/i)
    if (match) return decodeURIComponent(match[1])
  } catch {
    /* ignore */
  }
  const match = jobUrl.match(/\/job\/([^/?#]+)/i)
  return match ? decodeURIComponent(match[1]) : null
}

export function extractOracleCloudHost(jobUrl: string): string | null {
  try {
    const host = new URL(jobUrl).hostname
    return host.includes('oraclecloud.com') ? host : null
  } catch {
    return null
  }
}

export function extractOracleCloudSiteNumber(jobUrl: string): string | null {
  return parseOracleCloudBoardUrl(jobUrl)?.siteNumber || null
}

function resolveBoard(
  config: OracleCloudSourceConfig,
  baseUrl?: string
): { host: string; siteNumber: string } {
  if (config.host && config.siteNumber) {
    return { host: config.host, siteNumber: config.siteNumber }
  }
  if (baseUrl) {
    const parsed = parseOracleCloudBoardUrl(baseUrl)
    if (parsed) {
      return {
        host: config.host || parsed.host,
        siteNumber: config.siteNumber || parsed.siteNumber,
      }
    }
  }
  throw new Error(
    'Oracle Cloud source is missing selectors.host/siteNumber (or a parseable base_url)'
  )
}

function matchesCountry(
  countryCode: string,
  location: string,
  filterCountry?: string
): boolean {
  if (!filterCountry) return true
  const needle = filterCountry.toLowerCase().trim()
  const code = (countryCode || '').toLowerCase()
  const loc = (location || '').toLowerCase()

  if (needle === 'ke' || needle === 'kenya') {
    return code === 'ke' || loc.includes('kenya')
  }
  if (needle.length === 2) return code === needle
  return loc.includes(needle) || code === needle
}

function mapWorkplace(value?: string): 'ON_SITE' | 'REMOTE' | 'HYBRID' {
  const raw = (value || '').toLowerCase()
  if (raw.includes('remote')) return 'REMOTE'
  if (raw.includes('hybrid')) return 'HYBRID'
  return 'ON_SITE'
}

function mapSchedule(value?: string): string {
  const raw = (value || '').toLowerCase()
  if (raw.includes('part')) return 'PART_TIME'
  if (raw.includes('contract') || raw.includes('temporary')) return 'CONTRACTOR'
  if (raw.includes('intern')) return 'INTERN'
  return 'FULL_TIME'
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': UA,
    },
    signal: withTimeout(12_000),
  })
  if (!response.ok) {
    throw new Error(`Oracle Cloud API error ${response.status} for ${url}`)
  }
  return (await response.json()) as T
}

export async function discoverOracleCloudJobs(
  config: OracleCloudSourceConfig,
  baseUrl?: string
): Promise<Array<{ job_url: string; partial_data: { title: string; location: string } }>> {
  const { host, siteNumber } = resolveBoard(config, baseUrl)
  const all: OracleCloudJobListing[] = []
  const seen = new Set<string>()

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE
    const data = await fetchJson<{
      items?: Array<{
        TotalJobsCount?: number
        requisitionList?: OracleCloudListItem[]
      }>
    }>(listApiUrl(host, siteNumber, offset))

    const envelope = data.items?.[0]
    const batch = envelope?.requisitionList || []
    for (const job of batch) {
      const id = String(job.Id || '').trim()
      if (!id || seen.has(id)) continue
      const countryCode = String(job.PrimaryLocationCountry || '')
      const location = String(job.PrimaryLocation || countryCode || '')
      if (!matchesCountry(countryCode, location, config.filterCountry)) continue
      seen.add(id)
      all.push({
        id,
        title: String(job.Title || 'Untitled role').trim(),
        location,
        countryCode,
        shortDescription: job.ShortDescriptionStr,
        postedDate: job.PostedDate,
        detailUrl: jobUrl(host, siteNumber, id),
      })
    }

    const total = envelope?.TotalJobsCount
    if (batch.length === 0) break
    if (total != null && offset + batch.length >= total) break
    if (batch.length < PAGE_SIZE) break
  }

  return all.map(job => ({
    job_url: job.detailUrl,
    partial_data: {
      title: job.title,
      location: job.location,
    },
  }))
}

function scrubOracleCloudHtml(html: string): string {
  return html
    .replace(/\bJob Description Document\b/gi, '')
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<br>')
    .trim()
}

export async function fetchOracleCloudJobDetails(
  host: string,
  siteNumber: string,
  jobId: string,
  listing?: Partial<OracleCloudJobListing>
): Promise<OracleCloudJobDetail> {
  const data = await fetchJson<{ items?: OracleCloudDetailItem[] }>(
    detailApiUrl(host, siteNumber, jobId)
  )
  const detail = data.items?.[0]
  if (!detail) {
    throw new Error(
      `Oracle Cloud detail not found for site ${siteNumber} job ${jobId}`
    )
  }

  const descriptionHtml =
    scrubOracleCloudHtml(
      detail.ExternalDescriptionStr ||
        detail.ShortDescriptionStr ||
        listing?.shortDescription ||
        `<p>${detail.Title || listing?.title || 'Role'}</p>`
    )

  const location =
    detail.PrimaryLocation ||
    listing?.location ||
    detail.PrimaryLocationCountry ||
    ''

  return {
    id: String(detail.Id || jobId),
    title: String(detail.Title || listing?.title || 'Untitled role').trim(),
    location,
    countryCode: String(
      detail.PrimaryLocationCountry || listing?.countryCode || ''
    ),
    shortDescription: detail.ShortDescriptionStr || listing?.shortDescription,
    postedDate: detail.PostedDate || listing?.postedDate,
    detailUrl: jobUrl(host, siteNumber, String(detail.Id || jobId)),
    descriptionHtml,
    qualificationsHtml: detail.ExternalQualificationsStr || '',
    responsibilitiesHtml: detail.ExternalResponsibilitiesStr || '',
    jobSchedule: detail.JobSchedule,
    category: detail.Category,
    validThrough: detail.ExternalPostedEndDate || null,
  }
}

export function normalizeOracleCloudJob(
  job: OracleCloudJobDetail,
  companyName: string
): NormalizedJob {
  const location = job.location || 'Kenya'
  const description =
    job.descriptionHtml ||
    (job.shortDescription
      ? `<p>${job.shortDescription}</p>`
      : `<p>${job.title}</p>`)

  return {
    title: job.title?.trim() || 'Untitled role',
    company: companyName,
    description,
    responsibilities: job.responsibilitiesHtml || '',
    required_qualifications: job.qualificationsHtml || '',
    employment_type: mapSchedule(job.jobSchedule),
    job_location_type: mapWorkplace(),
    job_location_country:
      job.countryCode?.toUpperCase() === 'KE' || /kenya/i.test(location)
        ? 'Kenya'
        : 'Kenya',
    job_location_county: '',
    job_location_city:
      location
        .split(/[|,]/)
        .map(p => p.trim())
        .find(p => p && !/^kenya$/i.test(p) && !/^ke$/i.test(p)) || '',
    location,
    apply_link: job.detailUrl,
    application_url: job.detailUrl,
    valid_through: job.validThrough || null,
    salary_min: null,
    salary_max: null,
    salary_currency: 'KES',
    salary_period: 'MONTH',
    salary_visibility: 'Hide',
    experience_level: 'Mid',
    minimum_experience: null,
    industry: job.category || null,
    status: 'active',
    posted_by: 'admin',
    tags: [job.category, 'Oracle Cloud'].filter(Boolean).join(','),
  }
}

export function oracleCloudContentHash(
  job: OracleCloudJobDetail,
  companyName: string
): string {
  return generateContentHash(job.title || '', companyName, job.location || '')
}
