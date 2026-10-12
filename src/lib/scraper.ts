import * as cheerio from 'cheerio'
import crypto from 'crypto'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScraperSelectors {
  jobCard: string        // selector for each job listing item on the listing page
  jobLink: string        // selector for the link to the job detail page (within jobCard)
  title: string          // selector for job title on detail page
  description: string    // selector for job description on detail page
  requirements?: string  // selector for requirements section (optional)
  location?: string      // selector for location on detail page
  applyLink?: string     // selector for apply button/link on detail page
  deadline?: string      // selector for application deadline
  employmentType?: string // selector for job type (full-time, etc.)
  salary?: string        // selector for salary info
  // listing page overrides (if title/location appear on listing page too)
  listingTitle?: string
  listingLocation?: string
}

export interface ScraperSource {
  source_id: string
  name: string
  base_url: string
  selectors: ScraperSelectors
}

export interface DiscoveredJob {
  job_url: string
  partial_data: {
    title?: string
    location?: string
  }
}

export interface ScrapedJobDetails {
  title: string
  description: string
  requirements: string
  location: string
  apply_link: string
  deadline: string
  employment_type: string
  salary_text: string
  source_url: string
}

export interface NormalizedJob {
  title: string
  company: string
  description: string
  responsibilities: string
  required_qualifications: string
  employment_type: string
  job_location_type: string
  job_location_country: string
  job_location_county: string
  job_location_city: string
  location: string
  apply_link: string
  application_url: string
  /** Optional — used by job-board scrapers when employer email is the apply method */
  apply_email?: string | null
  valid_through: string | null
  /**
   * Source board publish time (ISO). Written to jobs.date_posted when present.
   * When missing, publish uses the CareerSasa insert time — never NULL, because
   * Google JobPosting requires datePosted.
   */
  date_posted?: string | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  salary_period: string
  salary_visibility: string
  experience_level: string
  minimum_experience: number | null
  industry: string | null
  status: string
  posted_by: string
  tags: string
}

/** Coerce board datePosted strings into a timestamptz-safe ISO value. */
export function coerceDatePosted(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  const trimmed = value.trim()
  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  const day = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
  return day ? `${day[1]}T00:00:00.000Z` : null
}

/**
 * Value to write to jobs.date_posted on insert.
 * Prefer the source board's original datePosted. If that is missing, use the
 * publish timestamp so we never insert NULL — spreading `date_posted: null`
 * from adapters skips the column DEFAULT and omits Google's required field.
 */
export function datePostedForInsert(
  boardDate?: string | null,
  publishedAt: Date = new Date()
): string {
  return coerceDatePosted(boardDate) || publishedAt.toISOString()
}

// ─── Fetch HTML ───────────────────────────────────────────────────────────────

/**
 * Downloads the HTML of a URL with a browser-like user-agent.
 * Throws if the response is not OK or times out after 8 seconds.
 */
export async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${url}`)
    }

    return await response.text()
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Extract job links from listing page ─────────────────────────────────────

/**
 * Parses the listing page HTML and returns all job URLs found,
 * along with any partial data (title, location) visible on the listing.
 */
export function extractJobLinks(
  html: string,
  baseUrl: string,
  selectors: ScraperSelectors
): DiscoveredJob[] {
  const $ = cheerio.load(html)
  const jobs: DiscoveredJob[] = []
  const base = new URL(baseUrl)

  $(selectors.jobCard).each((_, el) => {
    const card = $(el)

    // Get the link href
    const linkEl = card.find(selectors.jobLink).first()
    const href = linkEl.attr('href') || card.filter(selectors.jobLink).attr('href') || ''

    if (!href) return

    // Resolve relative URLs to absolute
    try {
      const absoluteUrl = href.startsWith('http')
        ? href
        : new URL(href, base.origin).toString()

      // Grab partial data from listing page if selectors are defined
      const title = selectors.listingTitle
        ? card.find(selectors.listingTitle).text().trim()
        : linkEl.text().trim()

      const location = selectors.listingLocation
        ? card.find(selectors.listingLocation).text().trim()
        : ''

      jobs.push({
        job_url: absoluteUrl,
        partial_data: { title, location },
      })
    } catch {
      // skip malformed URLs
    }
  })

  return jobs
}

// ─── Extract full job details from detail page ───────────────────────────────

/**
 * Parses a job detail page and extracts all available fields.
 */
export function extractJobDetails(
  html: string,
  sourceUrl: string,
  selectors: ScraperSelectors
): ScrapedJobDetails {
  const $ = cheerio.load(html)

  const text = (selector: string) =>
    selector ? $(selector).first().text().trim() : ''

  const href = (selector: string) => {
    if (!selector) return ''
    const el = $(selector).first()
    return el.attr('href') || el.text().trim()
  }

  return {
    title: text(selectors.title),
    description: $(selectors.description).first().html()?.trim() || text(selectors.description),
    requirements: selectors.requirements ? text(selectors.requirements) : '',
    location: selectors.location ? text(selectors.location) : '',
    apply_link: selectors.applyLink ? href(selectors.applyLink) : sourceUrl,
    deadline: selectors.deadline ? text(selectors.deadline) : '',
    employment_type: selectors.employmentType ? text(selectors.employmentType) : '',
    salary_text: selectors.salary ? text(selectors.salary) : '',
    source_url: sourceUrl,
  }
}

// ─── Normalize to careersasa schema ─────────────────────────────────────────

/**
 * Maps raw scraped data to the careersasa jobs table schema.
 * Handles employment type enum, location splitting, salary parsing, etc.
 */
export function normalizeJob(
  raw: ScrapedJobDetails,
  companyName: string
): NormalizedJob {
  return {
    title: raw.title,
    company: companyName,
    description: raw.description || '',
    responsibilities: '',          // rarely available from scraping
    required_qualifications: raw.requirements || '',
    employment_type: normalizeEmploymentType(raw.employment_type),
    job_location_type: 'ON_SITE',  // default; most scraped jobs don't specify
    job_location_country: 'Kenya',
    job_location_county: extractCounty(raw.location),
    job_location_city: extractCity(raw.location),
    location: raw.location || 'Kenya',
    apply_link: raw.apply_link || '',
    application_url: raw.apply_link || '',
    valid_through: parseDateString(raw.deadline),
    ...parseSalary(raw.salary_text),
    salary_visibility: 'Show',
    experience_level: 'Mid',
    minimum_experience: null,
    industry: null,
    status: 'active',
    posted_by: 'scraper',
    tags: '',
  }
}

// ─── Content hash for deduplication ──────────────────────────────────────────

/**
 * Generates a hash from title + company + location.
 * Used to detect duplicate jobs across runs.
 */
export function generateContentHash(title: string, company: string, location: string): string {
  const content = `${title.toLowerCase().trim()}|${company.toLowerCase().trim()}|${location.toLowerCase().trim()}`
  return crypto.createHash('md5').update(content).digest('hex')
}

// ─── Helper normalizers ───────────────────────────────────────────────────────

function normalizeEmploymentType(raw: string): string {
  const val = raw.toLowerCase()
  if (val.includes('part')) return 'PART_TIME'
  if (val.includes('contract')) return 'CONTRACTOR'
  if (val.includes('intern')) return 'INTERN'
  if (val.includes('temporary') || val.includes('temp')) return 'TEMPORARY'
  return 'FULL_TIME' // default
}

function extractCounty(location: string): string {
  if (!location) return ''
  // Common pattern: "Nairobi, Kenya" or "Nairobi County" or just "Nairobi"
  const cleaned = location.replace(/county/i, '').replace(/,?\s*kenya/i, '').trim()
  // Take the first part before any comma
  return cleaned.split(',')[0].trim()
}

function extractCity(location: string): string {
  if (!location) return ''
  const parts = location.split(',')
  // If there are multiple parts, the second part is usually the city/town
  if (parts.length >= 2) return parts[1].trim().replace(/kenya/i, '').trim()
  return ''
}

function parseDateString(raw: string): string | null {
  if (!raw) return null
  const date = new Date(raw)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }
  return null
}

function parseSalary(raw: string): {
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  salary_period: string
} {
  if (!raw) {
    return { salary_min: null, salary_max: null, salary_currency: 'KES', salary_period: 'MONTH' }
  }

  const currency = raw.includes('USD') || raw.includes('$') ? 'USD'
    : raw.includes('KES') || raw.includes('Ksh') || raw.includes('KSh') ? 'KES'
    : 'KES'

  const period = raw.toLowerCase().includes('year') || raw.toLowerCase().includes('annual') ? 'YEAR'
    : raw.toLowerCase().includes('day') ? 'DAY'
    : raw.toLowerCase().includes('hour') ? 'HOUR'
    : 'MONTH'

  // Extract numbers — handles formats like "80,000 - 120,000" or "80k - 120k"
  const numbers = raw.replace(/,/g, '').match(/\d+(\.\d+)?k?/gi) || []
  const parsed = numbers.map(n => {
    const val = parseFloat(n.replace(/k$/i, ''))
    return n.toLowerCase().endsWith('k') ? val * 1000 : val
  }).filter(n => n > 0)

  return {
    salary_min: parsed[0] ?? null,
    salary_max: parsed[1] ?? parsed[0] ?? null,
    salary_currency: currency,
    salary_period: period,
  }
}
