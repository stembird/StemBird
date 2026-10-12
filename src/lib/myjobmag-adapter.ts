/**
 * MyJobMag Kenya job-board adapter
 *
 * No public API — discovers listing URLs from /jobs pages (href="/job/...")
 * and parses schema.org JobPosting JSON-LD on each /job/{slug} detail page.
 * MyJobMag embeds raw newlines inside JSON-LD description strings, so LD is
 * sanitized before parse; HTML (.job-details / .job-key-info) is the fallback.
 *
 * Source config in scraper_sources.selectors:
 * {
 *   "type": "myjobmag",
 *   "category": "other",
 *   "sourceKind": "job_board",
 *   "maxPages": 15
 * }
 *
 * Discover prefers /jobs-by-date/today (+ yesterday) so same-day posts are
 * caught even when the main /jobs feed mixes older bumps, then walks
 * /jobs/page/N until maxPages or consecutive already-known pages.
 */

import * as cheerio from 'cheerio'
import { coerceDatePosted, generateContentHash, NormalizedJob } from './scraper'
import {
  resolveJobBoardApplication,
  rewriteJobBoardDescriptionLinks,
  stripBoardTrackingParams,
} from './jobBoardApply'
import { extractApplicationDeadline } from './scraperDeadline'
import {
  JobBoardCompanyProfile,
  cleanJobBoardCompanyDescription,
  preferFullMyJobMagLogo,
  sanitizeEmployerWebsite,
} from './jobBoardCompany'
import {
  DISCOVER_FETCH_TIMEOUT_MS,
  DETAIL_FETCH_TIMEOUT_MS,
  abortAfter,
} from './scraperHttp'

const DEFAULT_BASE = 'https://www.myjobmag.co.ke'
const LISTING_PATH = '/jobs'
/** Date feeds use `/jobs-by-date/today/2` (not `/page/2`). */
const DATE_FEED_PATHS = ['/jobs-by-date/today', '/jobs-by-date/yesterday'] as const
const JOB_PATH_RE = /\/job\/[a-z0-9-]+/gi
const BOARD_HOSTS = ['myjobmag.co.ke']

export interface MyJobMagSourceConfig {
  type: 'myjobmag'
  category?: string
  maxPages?: number
  /** Max pages per /jobs-by-date/{today,yesterday} feed. Default 12. */
  dateFeedMaxPages?: number
  baseHost?: string
}

/** Absolute ceiling so a bad config cannot fan out forever on Vercel. */
export const MYJOBMAG_MAX_PAGES_CAP = 30
/** Default pages for today/yesterday feeds (~20 jobs/page on MyJobMag). */
export const MYJOBMAG_DATE_FEED_DEFAULT_PAGES = 12

export interface DiscoverMyJobMagOptions {
  /**
   * Return the subset of `urls` that are already in scrape_queue or
   * scraped_job_sources. When set, discover stops after
   * `stopAfterKnownPages` consecutive pages with zero unknown URLs.
   */
  findKnownUrls?: (urls: string[]) => Promise<Set<string>>
  /** Default 2 — require two full "already seen" pages before stopping. */
  stopAfterKnownPages?: number
}

/** Pure helper for incremental pagination early-stop (unit-tested). */
export function nextKnownPageStreak(
  consecutiveKnownPages: number,
  pageJobUrls: string[],
  knownOnPage: Set<string>,
  stopAfterKnownPages: number
): { consecutiveKnownPages: number; shouldStop: boolean } {
  if (pageJobUrls.length === 0) {
    return { consecutiveKnownPages: 0, shouldStop: false }
  }
  const unknownOnPage = pageJobUrls.filter(url => !knownOnPage.has(url))
  if (unknownOnPage.length === 0) {
    const next = consecutiveKnownPages + 1
    return {
      consecutiveKnownPages: next,
      shouldStop: next >= stopAfterKnownPages,
    }
  }
  return { consecutiveKnownPages: 0, shouldStop: false }
}

export interface MyJobMagJobDetail {
  jobUrl: string
  title: string
  company: string
  location: string
  descriptionHtml: string
  employmentType: string
  industry: string | null
  occupationalCategory: string | null
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
  applyEmail: string | null
  applyLink: string | null
  applicationUrl: string | null
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
    throw new Error(`MyJobMag HTTP ${response.status} fetching ${url}`)
  }

  return response.text()
}

/** MyJobMag pagination uses `/jobs/page/2`, `/jobs/page/3`, … */
export function listingPageUrls(origin: string, listingPath: string, maxPages: number): string[] {
  const pages = Math.max(1, Math.min(maxPages, MYJOBMAG_MAX_PAGES_CAP))
  const base = `${origin}${listingPath}`
  const urls: string[] = [base]
  for (let page = 2; page <= pages; page++) {
    urls.push(`${base}/page/${page}`)
  }
  return urls
}

/**
 * Date-filtered feeds paginate as `/jobs-by-date/today/2` (no `/page/` segment).
 * Page 1 is the bare feed path.
 */
export function dateFeedPageUrls(origin: string, feedPath: string, maxPages: number): string[] {
  const pages = Math.max(1, Math.min(maxPages, MYJOBMAG_MAX_PAGES_CAP))
  const path = feedPath.startsWith('/') ? feedPath.replace(/\/+$/, '') : `/${feedPath}`
  const base = `${origin.replace(/\/$/, '')}${path}`
  const urls: string[] = [base]
  for (let page = 2; page <= pages; page++) {
    urls.push(`${base}/${page}`)
  }
  return urls
}

function listingPathFromBaseUrl(baseUrl?: string): string {
  if (!baseUrl) return LISTING_PATH
  try {
    const path = new URL(baseUrl).pathname.replace(/\/+$/, '') || LISTING_PATH
    // Seed base_url is /jobs; strip trailing /page/N if present
    const cleaned = path.replace(/\/page\/\d+$/i, '') || LISTING_PATH
    return cleaned.startsWith('/') ? cleaned : `/${cleaned}`
  } catch {
    return LISTING_PATH
  }
}

function extractListingUrls(html: string, origin: string): string[] {
  const found = new Set<string>()
  JOB_PATH_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = JOB_PATH_RE.exec(html)) !== null) {
    // Skip non-job paths that share the /job prefix (e.g. /job-application/)
    if (/^\/job-/.test(match[0])) continue
    found.add(`${origin}${match[0]}`)
  }
  return [...found]
}

interface WalkListingOptions extends DiscoverMyJobMagOptions {
  /**
   * When true, stop after `stopAfterKnownPages` consecutive pages that add
   * no URLs new to this run (date-feed tails repeat/empty). Do not use on the
   * main /jobs crawl — those pages often overlap the date feeds but still
   * hold older not-yet-scraped roles further down.
   */
  stopOnNoNewInRun?: boolean
}

async function walkListingPages(
  pageUrls: string[],
  origin: string,
  seen: Set<string>,
  options?: WalkListingOptions
): Promise<void> {
  const findKnownUrls = options?.findKnownUrls
  const stopAfterKnownPages = Math.max(1, options?.stopAfterKnownPages ?? 2)
  const stopOnNoNewInRun = options?.stopOnNoNewInRun === true
  let consecutiveKnownPages = 0
  let consecutiveNoNewInRun = 0

  for (const pageUrl of pageUrls) {
    let html: string
    try {
      html = await fetchPageHtml(pageUrl)
    } catch (err) {
      // Date-feed tails 404 once exhausted — stop this feed, keep others.
      const message = err instanceof Error ? err.message : String(err)
      if (/HTTP 404/.test(message)) break
      throw err
    }

    const pageJobUrls = extractListingUrls(html, origin)
    const newOnPage = pageJobUrls.filter(url => !seen.has(url))
    for (const jobUrl of pageJobUrls) {
      seen.add(jobUrl)
    }

    if (stopOnNoNewInRun) {
      if (pageJobUrls.length === 0 || newOnPage.length === 0) {
        consecutiveNoNewInRun += 1
        if (consecutiveNoNewInRun >= stopAfterKnownPages) break
        continue
      }
      consecutiveNoNewInRun = 0
    } else if (pageJobUrls.length === 0) {
      // Keep walking the main listing; transient empty shells happen.
      consecutiveKnownPages = 0
      continue
    }

    if (!findKnownUrls) {
      consecutiveKnownPages = 0
      continue
    }

    const known = await findKnownUrls(pageJobUrls)
    const streak = nextKnownPageStreak(
      consecutiveKnownPages,
      pageJobUrls,
      known,
      stopAfterKnownPages
    )
    consecutiveKnownPages = streak.consecutiveKnownPages
    if (streak.shouldStop) break
  }
}

export async function discoverMyJobMagJobs(
  config: MyJobMagSourceConfig,
  baseUrl?: string,
  options?: DiscoverMyJobMagOptions
): Promise<Array<{ job_url: string; partial_data: { title?: string; location?: string } }>> {
  const origin = originFromBaseUrl(baseUrl, config.baseHost)
  const listingPath = listingPathFromBaseUrl(baseUrl)
  const maxPages = typeof config.maxPages === 'number' ? config.maxPages : 15
  const dateFeedMaxPages =
    typeof config.dateFeedMaxPages === 'number'
      ? config.dateFeedMaxPages
      : MYJOBMAG_DATE_FEED_DEFAULT_PAGES
  const seen = new Set<string>()

  // Same-day posts first — MyJobMag's main /jobs feed mixes bumped older roles.
  for (const feedPath of DATE_FEED_PATHS) {
    await walkListingPages(
      dateFeedPageUrls(origin, feedPath, dateFeedMaxPages),
      origin,
      seen,
      { ...options, stopOnNoNewInRun: true }
    )
  }

  await walkListingPages(
    listingPageUrls(origin, listingPath, maxPages),
    origin,
    seen,
    options
  )

  return [...seen].map(job_url => ({
    job_url,
    partial_data: {},
  }))
}

/**
 * MyJobMag puts unescaped newlines (and other controls) inside JSON string
 * values. Replace controls inside strings so JSON.parse can succeed.
 */
export function sanitizeJsonLdText(raw: string): string {
  let out = ''
  let inString = false
  let escaped = false
  for (const ch of raw) {
    if (inString) {
      if (escaped) {
        out += ch
        escaped = false
      } else if (ch === '\\') {
        out += ch
        escaped = true
      } else if (ch === '"') {
        out += ch
        inString = false
      } else if (ch === '\n' || ch === '\r' || ch === '\t' || ch.charCodeAt(0) < 32) {
        out += ' '
      } else {
        out += ch
      }
    } else {
      if (ch === '"') inString = true
      out += ch
    }
  }
  return out
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
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
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

function parseJobLocationType(employmentType: unknown, keyInfoType?: string | null): string | null {
  const hay = `${employmentType || ''} ${keyInfoType || ''}`.toUpperCase()
  if (/REMOTE|TELECOMMUTE|WORK\s*FROM\s*HOME/.test(hay)) return 'TELECOMMUTE'
  if (/HYBRID/.test(hay)) return 'HYBRID'
  if (/ONSITE|ON[_\s-]?SITE/.test(hay)) return 'ON_SITE'
  return null
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
  // Town / city aliases that MyJobMag often uses instead of the county name
  if (/\bnbi\b/.test(haystack) || haystack.includes('nairobi county')) return 'Nairobi'
  if (haystack.includes('eldoret')) return 'Uasin Gishu'
  if (haystack.includes('kitale')) return 'Trans Nzoia'
  if (haystack.includes('naivasha') || haystack.includes('gilgil')) return 'Nakuru'
  if (haystack.includes('thika') || haystack.includes('ruiru') || haystack.includes('kikuyu'))
    return 'Kiambu'
  if (haystack.includes('malindi') || haystack.includes('watamu')) return 'Kilifi'
  if (haystack.includes("athi's river") || haystack.includes('athi river')) return 'Machakos'
  if (haystack.includes('ngong') || haystack.includes('kitengela') || haystack.includes('ongata'))
    return 'Kajiado'
  if (haystack.includes('limuru')) return 'Kiambu'
  return ''
}

/**
 * Known Kenyan places that appear in MyJobMag titles (e.g. "DSA - Naivasha")
 * when the structured Location field still says the employer's HQ city.
 * Longer keys first so "North Rift" wins over bare "Rift".
 */
const TITLE_PLACE_HINTS: Array<{ pattern: RegExp; city: string; county: string }> = [
  { pattern: /\bnorth\s*rift\b/i, city: 'North Rift', county: '' },
  { pattern: /\bcentral\s*rift\b/i, city: 'Central Rift', county: '' },
  { pattern: /\bsouth\s*rift\b/i, city: 'South Rift', county: '' },
  { pattern: /\beldoret\b/i, city: 'Eldoret', county: 'Uasin Gishu' },
  { pattern: /\bkitale\b/i, city: 'Kitale', county: 'Trans Nzoia' },
  { pattern: /\bnaivasha\b/i, city: 'Naivasha', county: 'Nakuru' },
  { pattern: /\bnakuru\b/i, city: 'Nakuru', county: 'Nakuru' },
  { pattern: /\bthika\b/i, city: 'Thika', county: 'Kiambu' },
  { pattern: /\bmalindi\b/i, city: 'Malindi', county: 'Kilifi' },
  { pattern: /\bkisumu\b/i, city: 'Kisumu', county: 'Kisumu' },
  { pattern: /\bmombasa\b/i, city: 'Mombasa', county: 'Mombasa' },
  { pattern: /\bkericho\b/i, city: 'Kericho', county: 'Kericho' },
  { pattern: /\bnyeri\b/i, city: 'Nyeri', county: 'Nyeri' },
  { pattern: /\bkakamega\b/i, city: 'Kakamega', county: 'Kakamega' },
  { pattern: /\bgarissa\b/i, city: 'Garissa', county: 'Garissa' },
  { pattern: /\bmachakos\b/i, city: 'Machakos', county: 'Machakos' },
  { pattern: /\bkajiado\b/i, city: 'Kajiado', county: 'Kajiado' },
  { pattern: /\bkiambu\b/i, city: 'Kiambu', county: 'Kiambu' },
  { pattern: /\bmeru\b/i, city: 'Meru', county: 'Meru' },
  { pattern: /\bkisii\b/i, city: 'Kisii', county: 'Kisii' },
  { pattern: /\bbungoma\b/i, city: 'Bungoma', county: 'Bungoma' },
  { pattern: /\bembu\b/i, city: 'Embu', county: 'Embu' },
  { pattern: /\bnairobi\b/i, city: 'Nairobi', county: 'Nairobi' },
]

export function placeHintFromTitle(title: string | null | undefined): {
  city: string
  county: string
} | null {
  if (!title?.trim()) return null
  for (const hint of TITLE_PLACE_HINTS) {
    if (hint.pattern.test(title)) return { city: hint.city, county: hint.county }
  }
  return null
}

export function resolveMyJobMagLocation(input: {
  locality?: string | null
  region?: string | null
  country?: string | null
  jobLocationType?: string | null
  /** Job title — often carries the real duty station (e.g. "… - Naivasha") */
  title?: string | null
}): { display: string; city: string; county: string } {
  const titlePlace = placeHintFromTitle(input.title)

  // MyJobMag frequently tags the employer's HQ (usually Nairobi) while the
  // title names the actual duty station. When the title carries a place,
  // treat it as authoritative.
  if (titlePlace) {
    const county = titlePlace.county || matchCounty(titlePlace.city)
    const parts = [
      titlePlace.city || null,
      county && county !== titlePlace.city ? county : null,
      'Kenya',
    ].filter(Boolean)
    return {
      display: [...new Set(parts)].join(', ') || 'Kenya',
      city: titlePlace.city,
      county: county || '',
    }
  }

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
  } else if (/remote|telecommute/i.test(String(input.jobLocationType || ''))) {
    city = 'Remote'
  }

  const parts = [city || null, county && county !== city ? county : null, 'Kenya'].filter(Boolean)
  const display = [...new Set(parts)].join(', ') || 'Kenya'

  return { display, city: city || '', county: county || '' }
}

function parseSalaryRange(text: string | null | undefined): {
  min: number | null
  max: number | null
  currency: string
  period: string
} {
  if (!text?.trim()) {
    return { min: null, max: null, currency: 'KES', period: 'MONTH' }
  }
  const currency = /USD|\$/i.test(text) ? 'USD' : 'KES'
  const period = /year|annual|annum/i.test(text)
    ? 'YEAR'
    : /week/i.test(text)
      ? 'WEEK'
      : /day|daily/i.test(text)
        ? 'DAY'
        : 'MONTH'
  const numbers = [...text.matchAll(/\d[\d,]*/g)].map(m => Number(m[0].replace(/,/g, '')))
  const valid = numbers.filter(n => Number.isFinite(n) && n > 0)
  if (valid.length === 0) return { min: null, max: null, currency, period }
  return {
    min: valid[0],
    max: valid[1] ?? valid[0],
    currency,
    period,
  }
}

function experienceYearsFromMonths(value: unknown): number | null {
  const months = toNumber(value)
  if (months == null) return null
  return Math.round(months / 12)
}

function parseExperienceYears(text: string | null | undefined): number | null {
  if (!text?.trim()) return null
  const range = text.match(/(\d+)\s*[-–to]+\s*(\d+)\s*years?/i)
  if (range) return Number(range[1])
  const single = text.match(/(\d+)\s*\+?\s*years?/i)
  if (single) return Number(single[1])
  return null
}

function extractKeyInfo($: cheerio.CheerioAPI): Record<string, string> {
  const out: Record<string, string> = {}
  $('.job-key-info li').each((_, el) => {
    const title = cleanText($(el).find('.jkey-title').first().text())
    const info = cleanText($(el).find('.jkey-info').first().text())
    if (title && info) out[title.toLowerCase()] = info
  })
  return out
}

function parseJobPostingLd(html: string): Record<string, unknown> | null {
  const blocks = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )
  for (const block of blocks) {
    try {
      const payload = JSON.parse(sanitizeJsonLdText(block[1])) as
        | Record<string, unknown>
        | Array<Record<string, unknown>>
      const candidates = Array.isArray(payload) ? payload : [payload]
      for (const node of candidates) {
        const type = node?.['@type']
        if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) {
          return node
        }
      }
    } catch {
      /* try next block */
    }
  }
  return null
}

function companyFromHtml($: cheerio.CheerioAPI): string | null {
  const jobsAt = cleanText($('a[href*="/jobs-at/"]').first().text())
  if (jobsAt) {
    return jobsAt.replace(/^view\s+jobs\s+at\s+/i, '').trim() || null
  }
  const h1 = cleanText($('h1').first().text())
  if (h1) {
    const at = h1.match(/\bat\s+(.+)$/i)
    if (at?.[1]) return at[1].trim()
  }
  return null
}

/** Slug for MyJobMag company tab `/jobs-at/{slug}`. */
export function extractMyJobMagCompanySlug(html: string): string | null {
  const href = html.match(/href=["']\/jobs-at\/([a-z0-9-]+)["']/i)
  if (href?.[1]) return href[1]
  const path = html.match(/\/jobs-at\/([a-z0-9-]+)/i)
  return path?.[1] || null
}

function logoFromMyJobMagHtml($: cheerio.CheerioAPI, origin: string): string | null {
  const img =
    $('img[alt$="logo" i]').first().attr('src') ||
    $('img[src*="/company_logo/"]').first().attr('src') ||
    null
  if (!img?.trim()) return null
  if (/myjobmag-logo/i.test(img)) return null
  const absolute = img.startsWith('http')
    ? img.trim()
    : `${origin.replace(/\/$/, '')}${img.startsWith('/') ? img : `/${img}`}`
  return preferFullMyJobMagLogo(absolute)
}

/**
 * MyJobMag company tab (`/jobs-at/{slug}`) — LocalBusiness JSON-LD + logo img.
 */
export function parseMyJobMagCompanyHtml(
  html: string,
  companyUrl: string
): JobBoardCompanyProfile | null {
  const origin = originFromBaseUrl(companyUrl)
  const $ = cheerio.load(html)

  let ld: Record<string, unknown> | null = null
  const blocks = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )
  for (const block of blocks) {
    try {
      const payload = JSON.parse(block[1]) as Record<string, unknown> | Array<Record<string, unknown>>
      const candidates = Array.isArray(payload) ? payload : [payload]
      for (const node of candidates) {
        const type = node?.['@type']
        if (
          type === 'LocalBusiness' ||
          type === 'Organization' ||
          (Array.isArray(type) &&
            (type.includes('LocalBusiness') || type.includes('Organization')))
        ) {
          ld = node
          break
        }
      }
      if (ld) break
    } catch {
      /* ignore */
    }
  }

  const nameFromTitle = cleanText($('title').first().text())?.replace(/\s+Jobs\b.*$/i, '').trim()
  const name =
    cleanText(ld?.name) ||
    companyFromHtml($) ||
    nameFromTitle ||
    null
  if (!name) return null

  const address = (ld?.address as Record<string, unknown>) || {}
  const street = cleanText(address.streetAddress)
  const logoFromLd = Array.isArray(ld?.image)
    ? preferFullMyJobMagLogo(String(ld?.image[0] || ''))
    : preferFullMyJobMagLogo(typeof ld?.image === 'string' ? ld.image : null)
  const logo = logoFromLd || logoFromMyJobMagHtml($, origin)
  const website = sanitizeEmployerWebsite(
    typeof ld?.url === 'string' ? ld.url : null
  )

  // Meta description is usually "Apply for jobs at X" boilerplate — skip those
  const metaDesc =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    null

  return {
    name,
    logo,
    website,
    description: cleanJobBoardCompanyDescription(metaDesc),
    location: street,
    size: null,
    industry: null,
    source: 'myjobmag',
    sourceUrl: companyUrl,
    externalId: extractMyJobMagCompanySlug(html),
  }
}

export async function fetchMyJobMagCompanyProfile(
  slugOrUrl: string,
  origin = DEFAULT_BASE
): Promise<JobBoardCompanyProfile | null> {
  const raw = String(slugOrUrl || '').trim()
  if (!raw) return null

  let url = raw
  if (!/^https?:\/\//i.test(raw)) {
    const slug = raw.replace(/^\/jobs-at\//i, '').replace(/^\//, '')
    url = `${origin.replace(/\/$/, '')}/jobs-at/${slug}`
  }

  try {
    const html = await fetchPageHtml(url)
    return parseMyJobMagCompanyHtml(html, url)
  } catch {
    return null
  }
}

export async function resolveMyJobMagCompanyProfile(
  detail: MyJobMagJobDetail,
  origin = DEFAULT_BASE
): Promise<JobBoardCompanyProfile | null> {
  if (detail.companySlug) {
    const profile = await fetchMyJobMagCompanyProfile(detail.companySlug, origin)
    if (profile) {
      if (!profile.logo && detail.companyLogo) profile.logo = detail.companyLogo
      return profile
    }
  }
  if (!detail.companyLogo) return null
  return {
    name: detail.company,
    logo: preferFullMyJobMagLogo(detail.companyLogo),
    website: null,
    description: null,
    location: null,
    size: null,
    industry: detail.industry,
    source: 'myjobmag',
    sourceUrl: detail.companySlug
      ? `${origin.replace(/\/$/, '')}/jobs-at/${detail.companySlug}`
      : null,
    externalId: detail.companySlug,
  }
}

/** MyJobMag returns HTTP 200 with an empty shell for removed listings. */
export function isMyJobMagJobNotFound(html: string): boolean {
  if (/<title>\s*Job Not Found\b/i.test(html)) return true
  if (/\bjob\s+not\s+found\b/i.test(html) && !/application\/ld\+json/i.test(html)) {
    const $ = cheerio.load(html)
    if (!$('.subjob-title').length && !$('.job-details').length && !$('.job-key-info').length) {
      return true
    }
  }
  return false
}

/**
 * MyJobMag keeps "Method of Application" outside JobPosting JSON-LD /
 * `.job-details`. That block holds the real employer CTA, usually as
 * `<a href="/apply-now/{id}">Employer on careers.example.com</a>`,
 * an email, or a Google Form — never prefer the MyJobMag listing when
 * any of those exist.
 */
export function extractMyJobMagMethodOfApplicationHtml(html: string): string {
  const $ = cheerio.load(html)
  const heading = $('#application-method').first()
  if (heading.length) {
    const parts: string[] = [$.html(heading) || '']
    let el = heading.next()
    let capturedCta = false
    while (el.length) {
      const id = (el.attr('id') || '').toLowerCase()
      const cls = (el.attr('class') || '').toLowerCase()
      if (el.is('h2') || id === 'apply-sec' || cls.includes('apply-sec')) break
      const chunk = $.html(el) || ''
      parts.push(chunk)
      if (
        /apply-now|mailto:|forms\.gle|docs\.google\.com\/forms|to apply|@|https?:\/\//i.test(
          chunk
        )
      ) {
        capturedCta = true
        break
      }
      // Stop after a couple of siblings if nothing useful — avoid the whole page
      if (parts.length >= 4) break
      el = el.next()
    }
    const joined = parts.join('\n')
    if (capturedCta || /apply-now|to apply|method of application|mailto:|@/i.test(joined)) {
      return joined
    }
  }

  // Fallback: any apply-now CTA on the page
  const applyNow = $('a[href*="/apply-now/"]').first()
  if (applyNow.length) {
    const parent = applyNow.parent()
    return parent.html() || $.html(applyNow) || ''
  }
  return ''
}

export function extractMyJobMagApplyNow(html: string): {
  path: string | null
  hostFromText: string | null
} {
  const $ = cheerio.load(html)
  const anchor =
    $('#application-method').parent().find('a[href*="/apply-now/"]').first().length
      ? $('#application-method').parent().find('a[href*="/apply-now/"]').first()
      : $('a[href*="/apply-now/"]').first()

  if (!anchor.length) return { path: null, hostFromText: null }

  const href = String(anchor.attr('href') || '').trim()
  const pathMatch = href.match(/^(\/apply-now\/\d+)/i)
  const path = pathMatch ? pathMatch[1] : null
  const label = cleanText(anchor.text()) || ''
  const onHost = label.match(/\bon\s+([a-z0-9.-]+\.[a-z0-9.-]+)/i)
  const hostFromText = onHost?.[1]?.toLowerCase().replace(/[),.;]+$/g, '') || null

  return { path, hostFromText }
}

/** Follow MyJobMag `/apply-now/{id}` 302 to the employer application URL. */
export async function resolveMyJobMagApplyNowRedirect(
  applyNowPath: string,
  origin = DEFAULT_BASE
): Promise<string | null> {
  const path = applyNowPath.startsWith('/') ? applyNowPath : `/${applyNowPath}`
  if (!/^\/apply-now\/\d+/i.test(path)) return null

  const url = `${origin.replace(/\/$/, '')}${path}`
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; careersasa-scraper/1.0)',
        'Accept-Language': 'en-KE,en;q=0.9',
      },
      signal: withTimeout(DETAIL_FETCH_TIMEOUT_MS),
    })

    const location = response.headers.get('location')
    if (!location) return null
    const absolute = location.startsWith('http')
      ? location
      : new URL(location, origin).toString()
    const host = new URL(absolute).hostname.replace(/^www\./i, '').toLowerCase()
    if (BOARD_HOSTS.some(h => host === h || host.endsWith(`.${h}`))) return null
    return stripBoardTrackingParams(absolute)
  } catch {
    return null
  }
}

export function parseMyJobMagJobHtml(
  html: string,
  jobUrl: string,
  options?: { linkoutUrl?: string | null }
): MyJobMagJobDetail {
  if (isMyJobMagJobNotFound(html)) {
    throw new Error(`MyJobMag listing not found: ${jobUrl}`)
  }

  const $ = cheerio.load(html)
  const posting = parseJobPostingLd(html)
  const keyInfo = extractKeyInfo($)

  const org = (posting?.hiringOrganization as Record<string, unknown>) || {}
  const place = (posting?.jobLocation as Record<string, unknown>) || {}
  const address = (place.address as Record<string, unknown>) || {}
  const experience = (posting?.experienceRequirements as Record<string, unknown>) || {}

  const title =
    cleanText(posting?.title) ||
    cleanText($('.subjob-title').first().text()) ||
    cleanText($('h1').first().text()) ||
    'Untitled Position'

  const company =
    cleanText(org.name) || companyFromHtml($) || 'Company Name Not Available'

  let descriptionHtml =
    typeof posting?.description === 'string' ? decodeHtmlEntities(posting.description) : ''
  if (!descriptionHtml.trim()) {
    descriptionHtml = $('.job-details').first().html() || ''
  }

  const methodHtml = extractMyJobMagMethodOfApplicationHtml(html)
  if (methodHtml.trim()) {
    descriptionHtml = descriptionHtml
      ? `${descriptionHtml}\n${methodHtml}`
      : methodHtml
  }

  const locality = cleanText(address.addressLocality) || keyInfo.location || null
  const region = cleanText(address.addressRegion) || null
  const country = cleanText(address.addressCountry) || 'Kenya'
  const employmentRaw = posting?.employmentType || keyInfo['job type'] || null
  const jobLocationType = parseJobLocationType(employmentRaw, keyInfo['job type'])

  const location = resolveMyJobMagLocation({
    locality,
    region,
    country,
    jobLocationType,
    title,
  })

  const salary = parseSalaryRange(keyInfo['salary range'])
  const minimumExperienceYears =
    experienceYearsFromMonths(experience.monthsOfExperience) ||
    parseExperienceYears(keyInfo.experience)

  // Prefer employer deadline in the description; fall back to MyJobMag validThrough
  const fromDescription = extractApplicationDeadline(descriptionHtml)
  const fromValidThrough = isoDateOnly(posting?.validThrough)
  const deadlineLabel = keyInfo.deadline
  const fromKeyInfo =
    deadlineLabel && !/not\s*specified/i.test(deadlineLabel)
      ? extractApplicationDeadline(`Deadline: ${deadlineLabel}`)
      : null
  const applicationDeadline = fromDescription || fromKeyInfo || fromValidThrough

  // Prefer resolved /apply-now/ redirect; else host from CTA text ("on example.com")
  let linkoutUrl = options?.linkoutUrl || null
  if (!linkoutUrl) {
    const applyNow = extractMyJobMagApplyNow(html)
    if (applyNow.hostFromText) {
      linkoutUrl = `https://${applyNow.hostFromText}/`
    }
  }

  const apply = resolveJobBoardApplication({
    boardJobUrl: jobUrl,
    descriptionHtml,
    linkoutUrl,
    boardHosts: BOARD_HOSTS,
  })

  // Relative /apply-now/ hrefs 404 on CareerSasa. Use the exact employer URL
  // from following MyJobMag's apply-now redirect when we have it (options.linkoutUrl
  // from resolveMyJobMagApplyNowRedirect). Otherwise absolutize to
  // myjobmag.co.ke/apply-now/{id}. Never put host-from-text or apply_link guesses
  // into the body HTML.
  const realApplyNowRedirect =
    options?.linkoutUrl &&
    !BOARD_HOSTS.some(h => {
      try {
        const host = new URL(options.linkoutUrl!).hostname.replace(/^www\./i, '').toLowerCase()
        return host === h || host.endsWith(`.${h}`)
      } catch {
        return false
      }
    })
      ? options.linkoutUrl
      : null

  descriptionHtml = rewriteJobBoardDescriptionLinks(descriptionHtml, {
    applyNowDestinationUrl: realApplyNowRedirect,
    boardOrigin: originFromBaseUrl(jobUrl),
    boardHosts: BOARD_HOSTS,
  })

  const logo =
    preferFullMyJobMagLogo(
      typeof org.logo === 'string' && org.logo.trim() && !/myjobmag\.co\.ke\/(?:images\/)?myjobmag/i.test(org.logo)
        ? org.logo.trim()
        : null
    ) ||
    preferFullMyJobMagLogo(
      typeof posting?.image === 'string' &&
        posting.image.trim() &&
        !/myjobmag\.co\.ke\/(?:images\/)?myjobmag/i.test(posting.image)
        ? posting.image.trim()
        : null
    ) ||
    logoFromMyJobMagHtml($, originFromBaseUrl(jobUrl))

  const companySlug = extractMyJobMagCompanySlug(html)

  return {
    jobUrl,
    title,
    company,
    location: location.display,
    descriptionHtml,
    employmentType: parseEmploymentType(employmentRaw),
    industry: cleanText(posting?.industry) || keyInfo['job field'] || null,
    occupationalCategory: cleanText(posting?.occupationalCategory) || keyInfo['job field'] || null,
    datePosted: typeof posting?.datePosted === 'string' ? posting.datePosted : null,
    validThrough: applicationDeadline,
    salaryCurrency: salary.currency,
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryPeriod: salary.period,
    minimumExperienceYears,
    addressLocality: location.city || locality,
    addressRegion: location.county || null,
    addressCountry: 'Kenya',
    jobLocationType,
    applicationDeadline,
    applyEmail: apply.apply_email,
    applyLink: apply.apply_link,
    applicationUrl: apply.application_url,
    companySlug,
    companyLogo: logo,
  }
}

export async function fetchMyJobMagJobDetails(jobUrl: string): Promise<MyJobMagJobDetail> {
  const html = await fetchPageHtml(jobUrl)
  const origin = originFromBaseUrl(jobUrl)
  const applyNow = extractMyJobMagApplyNow(html)

  let linkoutUrl: string | null = null
  if (applyNow.path) {
    linkoutUrl = await resolveMyJobMagApplyNowRedirect(applyNow.path, origin)
  }
  if (!linkoutUrl && applyNow.hostFromText) {
    linkoutUrl = `https://${applyNow.hostFromText}/`
  }

  return parseMyJobMagJobHtml(html, jobUrl, { linkoutUrl })
}

export function normalizeMyJobMagJob(detail: MyJobMagJobDetail): NormalizedJob {
  const hasSalary = detail.salaryMin != null || detail.salaryMax != null
  const resolved = resolveMyJobMagLocation({
    locality: detail.addressLocality,
    region: detail.addressRegion,
    country: detail.addressCountry,
    jobLocationType: detail.jobLocationType,
    title: detail.title,
  })
  const county = resolved.county || matchCounty(detail.location) || matchCounty(detail.title)
  const city = resolved.city || county
  const remote =
    /remote/i.test(detail.location) ||
    /TELECOMMUTE|REMOTE/i.test(String(detail.jobLocationType || ''))

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
    // Prefer MyJobMag's publish time so day buckets match the board UI.
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
    tags: [detail.occupationalCategory, detail.industry, 'MyJobMag'].filter(Boolean).join(','),
  }
}

export function myjobmagContentHash(detail: MyJobMagJobDetail): string {
  return generateContentHash(detail.title, detail.company, detail.location)
}
