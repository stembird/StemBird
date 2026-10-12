/**
 * Fuzu Kenya job-board adapter
 *
 * Discovers listing URLs from /kenya/job pages (ItemList JSON-LD + hrefs)
 * and parses schema.org JobPosting JSON-LD on each /kenya/jobs/{slug}
 * detail page.
 *
 * - Company-tab data (logo, about, website, size) from
 *   GET /api/v1/browse/companies/{id|slug}
 * - Recruiter apply emails from
 *   GET /api/v1/browse/jobs/{id}/recruiter_information
 *
 * Source config in scraper_sources.selectors:
 * {
 *   "type": "fuzu",
 *   "category": "other",
 *   "sourceKind": "job_board",
 *   "maxPages": 5
 * }
 */

import { coerceDatePosted, generateContentHash, NormalizedJob } from './scraper'
import { resolveJobBoardApplication } from './jobBoardApply'
import { extractApplicationDeadline } from './scraperDeadline'
import {
  JobBoardCompanyProfile,
  cleanJobBoardCompanyDescription,
  preferFullFuzuLogo,
  sanitizeEmployerWebsite,
} from './jobBoardCompany'
import {
  DISCOVER_FETCH_TIMEOUT_MS,
  DETAIL_FETCH_TIMEOUT_MS,
  abortAfter,
} from './scraperHttp'

const DEFAULT_BASE = 'https://www.fuzu.com'
const LISTING_PATH = '/kenya/job'
const JOB_PATH_RE = /\/kenya\/jobs\/[a-z0-9-]+/gi
const BOARD_HOSTS = ['fuzu.com']

export interface FuzuSourceConfig {
  type: 'fuzu'
  category?: string
  maxPages?: number
  baseHost?: string
}

export interface FuzuJobDetail {
  jobUrl: string
  title: string
  company: string
  location: string
  descriptionHtml: string
  employmentType: string
  industry: string | null
  skills: string | null
  datePosted: string | null
  validThrough: string | null
  salaryCurrency: string
  salaryMin: number | null
  salaryMax: number | null
  salaryPeriod: string
  minimumExperienceYears: number | null
  addressLocality: string | null
  addressRegion: string | null
  addressCountry: string | null
  jobLocationType: string | null
  applicationDeadline: string | null
  externalUrl: string | null
  applyEmail: string | null
  applyLink: string | null
  applicationUrl: string | null
  fuzuJobId: string | null
  companyId: string | null
  companySlug: string | null
  companyLogo: string | null
}

function withTimeout(ms: number): AbortSignal {
  return abortAfter(ms)
}

function originFromBaseUrl(baseUrl?: string, baseHost?: string): string {
  if (baseHost) {
    return baseHost.startsWith('http') ? baseHost.replace(/\/$/, '') : `https://${baseHost}`
  }
  if (baseUrl) {
    try {
      return new URL(baseUrl).origin
    } catch {
      /* fall through */
    }
  }
  return DEFAULT_BASE
}

async function fetchPageHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Mozilla/5.0 (compatible; careersasa-scraper/1.0)',
      'Accept-Language': 'en-KE,en;q=0.9',
    },
    signal: withTimeout(DISCOVER_FETCH_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Fuzu HTTP ${response.status} fetching ${url}`)
  }

  return response.text()
}

function unescapeJsonString(value: string): string {
  return value.replace(/\\u002F/g, '/').replace(/\\\//g, '/').replace(/\\"/g, '"').trim()
}

/** Pull company id/slug/logo from the job-page bootstrap (not always in JSON-LD). */
export function extractFuzuCompanyRef(html: string): {
  companyId: string | null
  companySlug: string | null
  companyLogo: string | null
} {
  const companyId = html.match(/"company_id"\s*:\s*(\d+)/)?.[1] || null
  const slugRaw = html.match(/"company_slug"\s*:\s*"([^"]*)"/)?.[1]
  const companySlug = slugRaw ? unescapeJsonString(slugRaw) || null : null
  const logoRaw = html.match(/"company_logo"\s*:\s*"([^"]*)"/)?.[1]
  const companyLogo = logoRaw
    ? preferFullFuzuLogo(unescapeJsonString(logoRaw))
    : null
  return { companyId, companySlug, companyLogo }
}

function normalizeEmployerEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (!email || !email.includes('@')) return null
  // Never treat Fuzu's own addresses as the employer apply target
  const domain = email.split('@')[1] || ''
  if (domain === 'fuzu.com' || domain.endsWith('.fuzu.com')) return null
  return email
}

/**
 * Fuzu hides recruiter emails from SSR/JSON-LD and loads them via this
 * public browse API (powers "Contact our recruiter" on the job page).
 */
export async function fetchFuzuRecruiterEmail(
  fuzuJobId: string,
  origin = DEFAULT_BASE
): Promise<string | null> {
  const id = String(fuzuJobId || '').trim()
  if (!id) return null

  const url = `${origin.replace(/\/$/, '')}/api/v1/browse/jobs/${encodeURIComponent(id)}/recruiter_information`
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; careersasa-scraper/1.0)',
        'Accept-Language': 'en-KE,en;q=0.9',
      },
      signal: withTimeout(DETAIL_FETCH_TIMEOUT_MS),
    })
    if (!response.ok) return null
    const data = (await response.json()) as { recruiter_email?: unknown }
    return normalizeEmployerEmail(data.recruiter_email)
  } catch {
    return null
  }
}

/** Prefer recruiter email over falling back to the Fuzu listing URL. */
export function applyFuzuRecruiterEmail(
  detail: FuzuJobDetail,
  recruiterEmail: string | null | undefined
): FuzuJobDetail {
  const email = normalizeEmployerEmail(recruiterEmail) || detail.applyEmail
  if (!email) return detail

  const usedBoardFallback =
    !detail.applyLink &&
    (!detail.applicationUrl || detail.applicationUrl === detail.jobUrl)

  if (usedBoardFallback) {
    return {
      ...detail,
      applyEmail: email,
      applyLink: null,
      applicationUrl: null,
    }
  }

  return {
    ...detail,
    applyEmail: email,
  }
}

function extractBootstrapExternalEmail(html: string): string | null {
  const match = html.match(/"external_email_address"\s*:\s*"([^"]*)"/)
  if (!match?.[1]) return null
  return normalizeEmployerEmail(unescapeJsonString(match[1]))
}

/**
 * Fuzu company tab — public browse API (same data as /company/{slug}).
 * Accepts numeric id or slug.
 */
export async function fetchFuzuCompanyProfile(
  companyIdOrSlug: string,
  origin = DEFAULT_BASE
): Promise<JobBoardCompanyProfile | null> {
  const key = String(companyIdOrSlug || '').trim()
  if (!key) return null

  const url = `${origin.replace(/\/$/, '')}/api/v1/browse/companies/${encodeURIComponent(key)}`
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; careersasa-scraper/1.0)',
        'Accept-Language': 'en-KE,en;q=0.9',
      },
      signal: withTimeout(DETAIL_FETCH_TIMEOUT_MS),
    })
    if (!response.ok) return null
    const payload = (await response.json()) as {
      company?: {
        id?: number | string
        name?: string
        slug?: string
        path?: string
        logo?: string | null
        website?: string | null
        description?: string | null
        location?: string | null
        jobs_locations?: string[] | null
        employer_size?: { name?: string } | null
        industries?: Array<{ name?: string }> | null
      }
    }
    const company = payload.company
    if (!company?.name?.trim()) return null

    const industry = company.industries?.find(i => i?.name?.trim())?.name?.trim() || null
    const size = company.employer_size?.name?.trim() || null
    const location =
      (Array.isArray(company.jobs_locations) && company.jobs_locations[0]?.trim()) ||
      company.location?.trim() ||
      null

    return {
      name: company.name.trim(),
      logo: preferFullFuzuLogo(company.logo || null),
      website: sanitizeEmployerWebsite(company.website || null),
      description: cleanJobBoardCompanyDescription(company.description),
      location,
      size,
      industry,
      source: 'fuzu',
      sourceUrl: company.path
        ? `${origin.replace(/\/$/, '')}${company.path}`
        : company.slug
          ? `${origin.replace(/\/$/, '')}/company/${company.slug}`
          : null,
      externalId: company.id != null ? String(company.id) : key,
    }
  } catch {
    return null
  }
}

/** Fuzu pagination is 0-indexed (`?page=0`, `?page=1`, …). */
function listingPageUrls(origin: string, listingPath: string, maxPages: number): string[] {
  const pages = Math.max(1, Math.min(maxPages, 10))
  const base = `${origin}${listingPath}`
  const urls: string[] = []
  for (let page = 0; page < pages; page++) {
    urls.push(page === 0 ? base : `${base}?page=${page}`)
  }
  return urls
}

function listingPathFromBaseUrl(baseUrl?: string): string {
  if (!baseUrl) return LISTING_PATH
  try {
    const path = new URL(baseUrl).pathname.replace(/\/+$/, '') || LISTING_PATH
    return path.startsWith('/') ? path : `/${path}`
  } catch {
    return LISTING_PATH
  }
}

function extractListingUrls(html: string, origin: string): string[] {
  const found = new Set<string>()

  // Prefer ItemList JSON-LD when present
  const ldBlocks = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )
  for (const block of ldBlocks) {
    try {
      const payload = JSON.parse(block[1]) as {
        '@type'?: string
        itemListElement?: Array<{ url?: string }>
      }
      if (payload?.['@type'] === 'ItemList' && Array.isArray(payload.itemListElement)) {
        for (const item of payload.itemListElement) {
          if (typeof item?.url === 'string' && /\/kenya\/jobs\//i.test(item.url)) {
            found.add(item.url.split('?')[0].replace(/\/+$/, ''))
          }
        }
      }
    } catch {
      /* ignore malformed LD */
    }
  }

  JOB_PATH_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = JOB_PATH_RE.exec(html)) !== null) {
    found.add(`${origin}${match[0]}`)
  }

  return [...found]
}

export async function discoverFuzuJobs(
  config: FuzuSourceConfig,
  baseUrl?: string
): Promise<Array<{ job_url: string; partial_data: { title?: string; location?: string } }>> {
  const origin = originFromBaseUrl(baseUrl, config.baseHost)
  const listingPath = listingPathFromBaseUrl(baseUrl)
  const maxPages = typeof config.maxPages === 'number' ? config.maxPages : 5
  const pageUrls = listingPageUrls(origin, listingPath, maxPages)
  const seen = new Set<string>()

  for (const pageUrl of pageUrls) {
    const html = await fetchPageHtml(pageUrl)
    for (const jobUrl of extractListingUrls(html, origin)) {
      seen.add(jobUrl)
    }
  }

  return [...seen].map(job_url => ({
    job_url,
    partial_data: {},
  }))
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function cleanText(value: unknown): string | null {
  if (value == null) return null
  const text = decodeHtmlEntities(String(value))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text || null
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.replace(/,/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function parseEmploymentType(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return 'FULL_TIME'
  const t = String(raw).toUpperCase().replace(/[\s-]+/g, '_')
  if (t.includes('PART')) return 'PART_TIME'
  if (t.includes('CONTRACT')) return 'CONTRACTOR'
  if (t.includes('INTERN')) return 'INTERN'
  if (t.includes('TEMP')) return 'TEMPORARY'
  if (t.includes('VOLUNTEER')) return 'VOLUNTEER'
  if (t.includes('FULL')) return 'FULL_TIME'
  return 'FULL_TIME'
}

function isoDateOnly(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const m = value.trim().match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

const KENYAN_COUNTIES = [
  'Nairobi',
  'Mombasa',
  'Kisumu',
  'Nakuru',
  'Kiambu',
  'Machakos',
  'Kajiado',
  'Kilifi',
  'Kwale',
  'Uasin Gishu',
  'Kisii',
  'Nyeri',
  'Kakamega',
  'Bungoma',
  'Meru',
  'Garissa',
  'Embu',
  'Kericho',
  'Bomet',
  'Narok',
  'Nyandarua',
  "Murang'a",
  'Kirinyaga',
  'Trans Nzoia',
  'Turkana',
  'Isiolo',
  'Laikipia',
  'Kitui',
  'Makueni',
  'Tharaka-Nithi',
  'Vihiga',
  'Siaya',
  'Homa Bay',
  'Migori',
  'Busia',
  'Nandi',
  'Elgeyo-Marakwet',
  'West Pokot',
  'Samburu',
  'Marsabit',
  'Mandera',
  'Wajir',
  'Tana River',
  'Lamu',
  'Taita-Taveta',
  'Nyamira',
]

function isVagueLocationPart(value: string | null | undefined): boolean {
  if (!value?.trim()) return true
  const v = value.trim().toLowerCase()
  return v === 'kenya' || v === 'ke' || v === 'country' || v === 'remote' || v === 'n/a'
}

function matchCounty(value: string | null | undefined): string {
  if (!value?.trim()) return ''
  const haystack = value.toLowerCase()
  for (const county of KENYAN_COUNTIES) {
    if (haystack.includes(county.toLowerCase())) return county
  }
  if (/\bnbi\b/.test(haystack) || haystack.includes('nairobi county')) return 'Nairobi'
  if (haystack.includes('eldoret')) return 'Uasin Gishu'
  return ''
}

export function resolveFuzuLocation(input: {
  locality?: string | null
  region?: string | null
  country?: string | null
  jobLocationType?: string | null
}): { display: string; city: string; county: string } {
  const preferred =
    (!isVagueLocationPart(input.locality) && input.locality?.trim()) ||
    (!isVagueLocationPart(input.region) && input.region?.trim()) ||
    null

  const county =
    matchCounty(input.locality) || matchCounty(input.region) || matchCounty(preferred)

  let city = ''
  if (preferred && !isVagueLocationPart(preferred)) {
    city = preferred.split(',')[0]?.trim() || preferred
  } else if (county) {
    city = county
  } else if (/remote/i.test(String(input.jobLocationType || ''))) {
    city = 'Remote'
  }

  const parts = [city || null, county && county !== city ? county : null, 'Kenya'].filter(Boolean)
  const display = [...new Set(parts)].join(', ') || 'Kenya'

  return { display, city: city || '', county: county || '' }
}

export function parseFuzuJobHtml(
  html: string,
  jobUrl: string,
  options?: { recruiterEmail?: string | null }
): FuzuJobDetail {
  // Prefer the JobPosting block when multiple LD scripts exist
  let posting: Record<string, unknown> | null = null
  let sawLd = false
  const blocks = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )
  for (const block of blocks) {
    sawLd = true
    try {
      const payload = JSON.parse(block[1]) as Record<string, unknown> | Array<Record<string, unknown>>
      const candidates = Array.isArray(payload) ? payload : [payload]
      for (const node of candidates) {
        const type = node?.['@type']
        if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) {
          posting = node
          break
        }
      }
      if (posting) break
    } catch {
      /* ignore */
    }
  }

  if (!sawLd) {
    throw new Error(`No JSON-LD found on Fuzu page: ${jobUrl}`)
  }
  if (!posting) {
    throw new Error(`No JobPosting JSON-LD on Fuzu page: ${jobUrl}`)
  }

  const org = (posting.hiringOrganization as Record<string, unknown>) || {}
  const place = (posting.jobLocation as Record<string, unknown>) || {}
  const address = (place.address as Record<string, unknown>) || {}
  const salary = (posting.baseSalary as Record<string, unknown>) || {}
  const salaryValue = (salary.value as Record<string, unknown>) || {}
  const experience = (posting.experienceRequirements as Record<string, unknown>) || {}
  const months = toNumber(experience.monthsOfExperience)
  const identifier = (posting.identifier as Record<string, unknown>) || {}

  const company =
    cleanText(org.name) || cleanText(org.legalName) || 'Company Name Not Available'

  const locality = cleanText(address.addressLocality)
  const region = cleanText(address.addressRegion)
  const country = cleanText(address.addressCountry) || 'Kenya'
  const descriptionHtml = typeof posting.description === 'string' ? posting.description : ''
  const jobLocationType =
    typeof posting.jobLocationType === 'string' ? posting.jobLocationType : null

  const location = resolveFuzuLocation({
    locality,
    region,
    country,
    jobLocationType,
  })

  const externalMatch = html.match(/"external_url"\s*:\s*"([^"]*)"/)
  const externalUrl = externalMatch?.[1] ? unescapeJsonString(externalMatch[1]) || null : null
  const companyRef = extractFuzuCompanyRef(html)
  const recruiterEmail =
    normalizeEmployerEmail(options?.recruiterEmail) || extractBootstrapExternalEmail(html)

  const apply = resolveJobBoardApplication({
    boardJobUrl: jobUrl,
    descriptionHtml,
    linkoutUrl: externalUrl,
    boardHosts: BOARD_HOSTS,
  })

  // Prefer employer "Deadline:" in the description; fall back to Fuzu validThrough
  // (unlike BrighterMonday, Fuzu's validThrough is typically a short real deadline).
  const fromDescription = extractApplicationDeadline(descriptionHtml)
  const fromValidThrough = isoDateOnly(posting.validThrough)
  const applicationDeadline = fromDescription || fromValidThrough

  const logo =
    preferFullFuzuLogo(
      typeof org.logo === 'string' && org.logo.trim() && !/fuzu\.com\/static/i.test(org.logo)
        ? org.logo.trim()
        : null
    ) || companyRef.companyLogo

  const detail: FuzuJobDetail = {
    jobUrl,
    title: cleanText(posting.title) || 'Untitled Position',
    company,
    location: location.display,
    descriptionHtml,
    employmentType: parseEmploymentType(posting.employmentType),
    industry: cleanText(posting.industry),
    skills: cleanText(posting.skills),
    datePosted: typeof posting.datePosted === 'string' ? posting.datePosted : null,
    validThrough: applicationDeadline,
    salaryCurrency: cleanText(salary.currency) || 'KES',
    salaryMin: toNumber(salaryValue.minValue ?? salaryValue.value),
    salaryMax: toNumber(salaryValue.maxValue ?? salaryValue.value),
    salaryPeriod: cleanText(salaryValue.unitText) || 'MONTH',
    minimumExperienceYears: months != null ? Math.round(months / 12) : null,
    addressLocality: location.city || locality,
    addressRegion: location.county || region,
    addressCountry: 'Kenya',
    jobLocationType,
    applicationDeadline,
    externalUrl,
    applyEmail: apply.apply_email,
    applyLink: apply.apply_link,
    applicationUrl: apply.application_url,
    fuzuJobId: identifier.value != null ? String(identifier.value) : null,
    companyId: companyRef.companyId,
    companySlug: companyRef.companySlug,
    companyLogo: logo,
  }

  return applyFuzuRecruiterEmail(detail, recruiterEmail)
}

export async function fetchFuzuJobDetails(jobUrl: string): Promise<FuzuJobDetail> {
  const html = await fetchPageHtml(jobUrl)
  const parsed = parseFuzuJobHtml(html, jobUrl)
  if (!parsed.fuzuJobId || parsed.applyEmail) return parsed

  const origin = originFromBaseUrl(jobUrl)
  const recruiterEmail = await fetchFuzuRecruiterEmail(parsed.fuzuJobId, origin)
  return applyFuzuRecruiterEmail(parsed, recruiterEmail)
}

/** Resolve portal company-tab profile for a parsed Fuzu job. */
export async function resolveFuzuCompanyProfile(
  detail: FuzuJobDetail,
  origin = DEFAULT_BASE
): Promise<JobBoardCompanyProfile | null> {
  const key = detail.companyId || detail.companySlug
  if (!key) return null
  const profile = await fetchFuzuCompanyProfile(key, origin)
  if (!profile) {
    // Fall back to whatever we already scraped from the job page
    if (!detail.companyLogo) return null
    return {
      name: detail.company,
      logo: detail.companyLogo,
      website: null,
      description: null,
      location: null,
      size: null,
      industry: detail.industry,
      source: 'fuzu',
      sourceUrl: detail.companySlug
        ? `${origin.replace(/\/$/, '')}/company/${detail.companySlug}`
        : null,
      externalId: detail.companyId,
    }
  }
  // Prefer job-page full logo if API returned nothing
  if (!profile.logo && detail.companyLogo) profile.logo = detail.companyLogo
  return profile
}

export function normalizeFuzuJob(detail: FuzuJobDetail): NormalizedJob {
  const hasSalary = detail.salaryMin != null || detail.salaryMax != null
  const resolved = resolveFuzuLocation({
    locality: detail.addressLocality,
    region: detail.addressRegion,
    country: detail.addressCountry,
    jobLocationType: detail.jobLocationType,
  })
  const county = resolved.county || matchCounty(detail.location)
  const city = resolved.city || county
  const remote =
    /remote/i.test(detail.location) || /TELECOMMUTE|REMOTE/i.test(String(detail.jobLocationType || ''))

  return {
    title: detail.title,
    company: detail.company,
    description: detail.descriptionHtml || `<p>${detail.title}</p>`,
    responsibilities: '',
    required_qualifications: '',
    employment_type: detail.employmentType,
    job_location_type: remote ? 'REMOTE' : 'ON_SITE',
    job_location_country: 'Kenya',
    job_location_county: county,
    job_location_city: city || '',
    location: detail.location || resolved.display,
    apply_link: detail.applyLink || '',
    application_url: detail.applicationUrl || '',
    apply_email: detail.applyEmail,
    valid_through: detail.applicationDeadline,
    date_posted: coerceDatePosted(detail.datePosted),
    salary_min: detail.salaryMin,
    salary_max: detail.salaryMax,
    salary_currency: detail.salaryCurrency || 'KES',
    salary_period: detail.salaryPeriod || 'MONTH',
    salary_visibility: hasSalary ? 'Show' : 'Hide',
    experience_level: 'Mid',
    minimum_experience: detail.minimumExperienceYears,
    industry: detail.industry,
    status: 'active',
    posted_by: 'admin',
    tags: [detail.skills, detail.industry, 'Fuzu'].filter(Boolean).join(','),
  }
}

export function fuzuContentHash(detail: FuzuJobDetail): string {
  return generateContentHash(detail.title, detail.company, detail.location)
}
