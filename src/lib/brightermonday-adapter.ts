/**
 * BrighterMonday Kenya job-board adapter
 *
 * No public API — discovers listing URLs from /jobs pages and parses
 * schema.org JobPosting JSON-LD on each /listings/{slug} detail page.
 *
 * Source config in scraper_sources.selectors:
 * {
 *   "type": "brightermonday",
 *   "category": "other",
 *   "maxPages": 5
 * }
 */

import { coerceDatePosted, generateContentHash, NormalizedJob } from './scraper'
import { resolveJobBoardApplication } from './jobBoardApply'
import { extractApplicationDeadline } from './scraperDeadline'
import { DISCOVER_FETCH_TIMEOUT_MS, abortAfter } from './scraperHttp'

const DEFAULT_BASE = 'https://www.brightermonday.co.ke'
const LISTING_PATH = '/jobs'
const LISTING_PATH_RE = /\/listings\/[a-z0-9-]+/gi

export interface BrighterMondaySourceConfig {
  type: 'brightermonday'
  category?: string
  maxPages?: number
  baseHost?: string
}

export interface BrighterMondayJobDetail {
  jobUrl: string
  title: string
  company: string
  location: string
  descriptionHtml: string
  employmentType: string
  industry: string | null
  occupationalCategory: string | null
  qualifications: string | null
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
  /** BM page_data location_name (often more specific than JSON-LD) */
  locationName: string | null
  /** Employer application deadline from description (not BM listing expiry) */
  applicationDeadline: string | null
  /** BrighterMonday "Linkout" external apply URL when present */
  linkoutUrl: string | null
  applyEmail: string | null
  applyLink: string | null
  applicationUrl: string | null
}

function withTimeout(ms: number = DISCOVER_FETCH_TIMEOUT_MS): AbortSignal {
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
    signal: withTimeout(),
  })

  if (!response.ok) {
    throw new Error(`BrighterMonday HTTP ${response.status} fetching ${url}`)
  }

  return response.text()
}

function listingPageUrls(origin: string, maxPages: number): string[] {
  const pages = Math.max(1, Math.min(maxPages, 10))
  const first = `${origin}${LISTING_PATH}`
  const urls = [first]
  for (let page = 2; page <= pages; page++) {
    urls.push(`${first}?page=${page}`)
  }
  return urls
}

function extractListingUrls(html: string, origin: string): string[] {
  const found = new Set<string>()
  LISTING_PATH_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = LISTING_PATH_RE.exec(html)) !== null) {
    found.add(`${origin}${match[0]}`)
  }
  return [...found]
}

export async function discoverBrighterMondayJobs(
  config: BrighterMondaySourceConfig,
  baseUrl?: string
): Promise<Array<{ job_url: string; partial_data: { title?: string; location?: string } }>> {
  const origin = originFromBaseUrl(baseUrl, config.baseHost)
  const maxPages = typeof config.maxPages === 'number' ? config.maxPages : 5
  const pageUrls = listingPageUrls(origin, maxPages)
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

function findById(graph: Array<Record<string, unknown>>, id: unknown): Record<string, unknown> | null {
  if (typeof id !== 'string' || !Array.isArray(graph)) return null
  return graph.find(node => node && node['@id'] === id) || null
}

function resolveRef(
  graph: Array<Record<string, unknown>>,
  value: unknown
): Record<string, unknown> | null {
  if (!value) return null
  if (typeof value === 'string') return findById(graph, value)
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>
    if (typeof obj['@id'] === 'string' && Object.keys(obj).length === 1) {
      return findById(graph, obj['@id']) || obj
    }
    return obj
  }
  return null
}

function decodeHtmlEntities(value: string): string {
  // Decode &amp; first so &amp;lt; → &lt; before &lt; → <.
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

export function parseBrighterMondayJobHtml(html: string, jobUrl: string): BrighterMondayJobDetail {
  const ldMatch = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  )
  if (!ldMatch) {
    throw new Error(`No JSON-LD found on BrighterMonday page: ${jobUrl}`)
  }

  let payload: unknown
  try {
    payload = JSON.parse(ldMatch[1])
  } catch {
    throw new Error(`Invalid JSON-LD on BrighterMonday page: ${jobUrl}`)
  }

  const graph: Array<Record<string, unknown>> = Array.isArray(
    (payload as { '@graph'?: unknown })?.['@graph']
  )
    ? ((payload as { '@graph': Array<Record<string, unknown>> })['@graph'])
    : Array.isArray(payload)
      ? (payload as Array<Record<string, unknown>>)
      : [payload as Record<string, unknown>]

  const posting = graph.find(node => {
    const type = node?.['@type']
    return type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))
  })

  if (!posting) {
    throw new Error(`No JobPosting JSON-LD on BrighterMonday page: ${jobUrl}`)
  }

  const org = resolveRef(graph, posting.hiringOrganization)
  const place = resolveRef(graph, posting.jobLocation)
  const address = place ? resolveRef(graph, place.address) || (place.address as Record<string, unknown>) || {} : {}
  const salary = (posting.baseSalary as Record<string, unknown>) || {}
  const salaryValue = (salary.value as Record<string, unknown>) || {}
  const experience = (posting.experienceRequirements as Record<string, unknown>) || {}
  const months = toNumber(experience.monthsOfExperience)

  const company =
    cleanText(org?.name) ||
    cleanText(org?.legalName) ||
    'Company Name Not Available'

  const locality = cleanText(address.addressLocality)
  const region = cleanText(address.addressRegion)
  const country = cleanText(address.addressCountry) || 'Kenya'
  const descriptionHtml = typeof posting.description === 'string' ? posting.description : ''

  const locationNameMatch = html.match(/"location_name"\s*:\s*"([^"]*)"/)
  const locationName = locationNameMatch?.[1]
    ? locationNameMatch[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/').trim() || null
    : null

  const location = resolveBrighterMondayLocation({
    locationName,
    locality,
    region,
    country,
  })

  const linkoutMatch = html.match(/"linkout_url"\s*:\s*"([^"]*)"/)
  const linkoutUrl = linkoutMatch?.[1]
    ? linkoutMatch[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/').trim() || null
    : null

  const apply = resolveJobBoardApplication({
    boardJobUrl: jobUrl,
    descriptionHtml,
    linkoutUrl,
    boardHosts: ['brightermonday.co.ke'],
  })

  // Prefer employer "Deadline:" in the description over BM's listing validThrough
  // (validThrough is usually ~90 days of board visibility, not the apply deadline).
  const applicationDeadline = extractApplicationDeadline(descriptionHtml)

  return {
    jobUrl,
    title: cleanText(posting.title) || 'Untitled Position',
    company,
    location: location.display,
    descriptionHtml,
    employmentType: parseEmploymentType(posting.employmentType),
    industry: cleanText(posting.industry),
    occupationalCategory: cleanText(posting.occupationalCategory),
    qualifications: cleanText(posting.qualifications),
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
    locationName,
    applicationDeadline,
    linkoutUrl,
    applyEmail: apply.apply_email,
    applyLink: apply.apply_link,
    applicationUrl: apply.application_url,
  }
}

export async function fetchBrighterMondayJobDetails(jobUrl: string): Promise<BrighterMondayJobDetail> {
  const html = await fetchPageHtml(jobUrl)
  return parseBrighterMondayJobHtml(html, jobUrl)
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
  // Common aliases
  if (/\bnbi\b/.test(haystack) || haystack.includes('nairobi county')) return 'Nairobi'
  if (haystack.includes('eldoret')) return 'Uasin Gishu'
  return ''
}

export function resolveBrighterMondayLocation(input: {
  locationName?: string | null
  locality?: string | null
  region?: string | null
  country?: string | null
}): { display: string; city: string; county: string } {
  // Prefer BM's location_name (e.g. "Nairobi") over weak JSON-LD ("Kenya"/"KE")
  const preferred =
    (!isVagueLocationPart(input.locationName) && input.locationName?.trim()) ||
    (!isVagueLocationPart(input.locality) && input.locality?.trim()) ||
    (!isVagueLocationPart(input.region) && input.region?.trim()) ||
    null

  const county =
    matchCounty(input.locationName) ||
    matchCounty(input.locality) ||
    matchCounty(input.region) ||
    matchCounty(preferred)

  let city = ''
  if (preferred && !isVagueLocationPart(preferred)) {
    // "Nairobi" / "Westlands, Nairobi" → city from preferred label
    city = preferred.split(',')[0]?.trim() || preferred
  } else if (county) {
    city = county
  }

  const parts = [city || null, county && county !== city ? county : null, 'Kenya'].filter(Boolean)
  const display = [...new Set(parts)].join(', ') || 'Kenya'

  return { display, city: city || '', county: county || '' }
}

function inferCounty(detail: BrighterMondayJobDetail): string {
  return (
    matchCounty(detail.locationName) ||
    matchCounty(detail.addressLocality) ||
    matchCounty(detail.addressRegion) ||
    matchCounty(detail.location)
  )
}

export function normalizeBrighterMondayJob(detail: BrighterMondayJobDetail): NormalizedJob {
  const hasSalary = detail.salaryMin != null || detail.salaryMax != null
  const resolved = resolveBrighterMondayLocation({
    locationName: detail.locationName,
    locality: detail.addressLocality,
    region: detail.addressRegion,
    country: detail.addressCountry,
  })
  const county = resolved.county || inferCounty(detail)
  const city = resolved.city || county

  return {
    title: detail.title,
    company: detail.company,
    description: detail.descriptionHtml || `<p>${detail.title}</p>`,
    responsibilities: '',
    // BM JSON-LD "qualifications" is usually an experience label ("Mid level"),
    // not real requirements — leave empty so parse extracts from descriptionHtml.
    required_qualifications: '',
    employment_type: detail.employmentType,
    job_location_type: /remote/i.test(detail.location) ? 'REMOTE' : 'ON_SITE',
    job_location_country: 'Kenya',
    job_location_county: county,
    job_location_city: city || '',
    location: detail.location || resolved.display,
    // Empty string when email-only; board URL only when no employer method exists
    apply_link: detail.applyLink || '',
    application_url: detail.applicationUrl || '',
    apply_email: detail.applyEmail,
    // Employer application deadline only — never BM's ~90-day listing validThrough
    valid_through: detail.applicationDeadline,
    date_posted: coerceDatePosted(detail.datePosted),
    salary_min: detail.salaryMin,
    salary_max: detail.salaryMax,
    salary_currency: detail.salaryCurrency || 'KES',
    salary_period: detail.salaryPeriod || 'MONTH',
    salary_visibility: hasSalary ? 'Show' : 'Hide',
    experience_level: detail.qualifications || 'Mid',
    minimum_experience: detail.minimumExperienceYears,
    industry: detail.industry,
    status: 'active',
    posted_by: 'admin',
    tags: [detail.occupationalCategory, detail.industry, 'BrighterMonday']
      .filter(Boolean)
      .join(','),
  }
}

export function brighterMondayContentHash(detail: BrighterMondayJobDetail): string {
  return generateContentHash(detail.title, detail.company, detail.location)
}
