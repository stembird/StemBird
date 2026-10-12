/**
 * Oracle Taleo Enterprise career-section adapter
 *
 * Public, keyless, but session-bound:
 * 1. GET  /careersection/{section}/jobsearch.ftl  → portalNo + cookies
 * 2. POST /careersection/rest/jobboard/searchjobs?portal=…  (tz/tzname required)
 * 3. GET  /careersection/{section}/jobdetail.ftl?job={contestNo}
 *    → description HTML lives in hidden #initialHistory after !*! markers
 *
 * Source config in scraper_sources.selectors:
 * {
 *   "type": "taleo",
 *   "host": "equitybank.taleo.net",
 *   "section": "ext_new",
 *   "filterCountry": "Kenya",
 *   "category": "employer"
 * }
 */

import { generateContentHash, NormalizedJob } from './scraper'

export interface TaleoSourceConfig {
  type: 'taleo'
  host: string
  section: string
  filterCountry?: string
  category?: string
  /** Optional cached portal number; discovered from the jobsearch page when omitted. */
  portal?: string
}

export interface TaleoJobListing {
  jobId: string
  contestNo: string
  title: string
  location: string
  dateColumn?: string
  detailUrl: string
}

export interface TaleoJobDetail extends TaleoJobListing {
  descriptionHtml: string
  qualificationsHtml: string
}

interface TaleoRequisition {
  jobId?: string | number
  contestNo?: string
  column?: string[]
  locationsColumns?: number[]
  linkedColumn?: number
}

interface TaleoSearchResponse {
  requisitionList?: TaleoRequisition[]
  pagingData?: {
    currentPageNo?: number
    pageSize?: number
    totalCount?: number
  }
}

const UA = 'Mozilla/5.0 (compatible; careersasa-scraper/1.0)'
const MAX_PAGES = 10

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms)
}

function jobsearchUrl(host: string, section: string): string {
  return `https://${host}/careersection/${section}/jobsearch.ftl?lang=en`
}

function joblistUrl(host: string, section: string): string {
  return `https://${host}/careersection/${section}/joblist.ftl?lang=en`
}

function jobdetailUrl(host: string, section: string, contestNo: string): string {
  return `https://${host}/careersection/${section}/jobdetail.ftl?lang=en&job=${encodeURIComponent(contestNo)}`
}

function searchJobsUrl(host: string, portal: string): string {
  return `https://${host}/careersection/rest/jobboard/searchjobs?lang=en&portal=${encodeURIComponent(portal)}`
}

function cookieHeaderFromResponse(response: Response): string {
  const getSetCookie = (
    response.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie
  const parts =
    typeof getSetCookie === 'function'
      ? getSetCookie.call(response.headers)
      : (() => {
          const single = response.headers.get('set-cookie')
          return single ? [single] : []
        })()

  return parts
    .map(c => c.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ')
}

export function extractTaleoPortal(html: string): string | null {
  const portalNo = html.match(/portalNo\s*[:=]\s*['"]?(\d+)/i)
  if (portalNo) return portalNo[1]
  const portalParam = html.match(/[?&]portal=(\d+)/i)
  return portalParam?.[1] || null
}

export function parseTaleoBoardUrl(
  url: string
): { host: string; section: string } | null {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes('taleo.net')) return null
    const match = parsed.pathname.match(/\/careersection\/([^/]+)\//i)
    if (!match) return null
    return { host: parsed.hostname, section: match[1] }
  } catch {
    return null
  }
}

export function extractTaleoContestNo(jobUrl: string): string | null {
  try {
    const url = new URL(jobUrl)
    const fromQuery = url.searchParams.get('job')
    if (fromQuery) return fromQuery
  } catch {
    /* ignore */
  }
  const pathMatch = jobUrl.match(/[?&]job=([^&#]+)/i)
  return pathMatch ? decodeURIComponent(pathMatch[1]) : null
}

export function extractTaleoHost(jobUrl: string): string | null {
  try {
    const url = new URL(jobUrl)
    return url.hostname.includes('taleo.net') ? url.hostname : null
  } catch {
    return null
  }
}

export function extractTaleoSection(jobUrl: string): string | null {
  return parseTaleoBoardUrl(jobUrl)?.section || null
}

function resolveBoard(
  config: TaleoSourceConfig,
  baseUrl?: string
): { host: string; section: string } {
  if (config.host && config.section) {
    return { host: config.host, section: config.section }
  }
  if (baseUrl) {
    const parsed = parseTaleoBoardUrl(baseUrl)
    if (parsed) return parsed
  }
  throw new Error(
    'Taleo source is missing selectors.host/section (or a parseable base_url)'
  )
}

function unescapeTaleoText(value: string): string {
  return value
    .replace(/\\:/g, ':')
    .replace(/\\;/g, ';')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\//g, '/')
}

/**
 * Taleo history blobs mix real URI escapes (%3C, %5C) with literal CSS
 * percentages (115%). Node's decodeURIComponent throws on the latter; decode
 * only well-formed %XX runs instead (same tolerance as Python unquote).
 */
function safeDecodeUriComponent(value: string): string {
  return value
    .replace(/\+/g, ' ')
    .replace(/((?:%[0-9A-Fa-f]{2})+)/g, match => {
      try {
        return decodeURIComponent(match)
      } catch {
        return match.replace(/%([0-9A-Fa-f]{2})/g, (_, hex) =>
          String.fromCharCode(parseInt(hex, 16))
        )
      }
    })
}

function decodeRepeatedUri(value: string): string {
  let decoded = value
  for (let i = 0; i < 3; i++) {
    const next = safeDecodeUriComponent(decoded)
    if (next === decoded) break
    decoded = next
  }
  return decoded
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (match, n) => {
      const code = Number(n)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    })
    .replace(/&#x([0-9a-f]+);/gi, (match, h) => {
      const code = parseInt(h, 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    })
}

export function parseLocationColumn(raw: string | undefined): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  if (!trimmed) return ''

  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      return parsed
        .map(v => String(v).replace(/-/g, ', ').trim())
        .filter(Boolean)
        .join('; ')
    }
  } catch {
    /* plain string */
  }

  return trimmed.replace(/^\[|"|\]$/g, '').replace(/-/g, ', ')
}

export function extractTaleoLocation(job: TaleoRequisition): string {
  const columns = job.column || []
  const indexes =
    job.locationsColumns && job.locationsColumns.length > 0
      ? job.locationsColumns
      : [1]

  return indexes
    .map(i => parseLocationColumn(columns[i]))
    .filter(Boolean)
    .join('; ')
}

export function extractTaleoTitle(job: TaleoRequisition): string {
  const linked = job.linkedColumn ?? 0
  const fromLinked = job.column?.[linked]?.trim()
  if (fromLinked) return fromLinked
  return job.column?.[0]?.trim() || 'Untitled role'
}

function matchesCountry(location: string, filterCountry?: string): boolean {
  if (!filterCountry) return true
  const needle = filterCountry.toLowerCase()
  const hay = location.toLowerCase()
  if (!hay) return true
  if (needle === 'kenya' || needle === 'ke') {
    return (
      hay.includes('kenya') ||
      /(^|[\s,;-])ke($|[\s,;-])/i.test(location) ||
      hay.includes('nairobi') ||
      hay.includes('mombasa')
    )
  }
  return hay.includes(needle)
}

async function fetchTaleoHtml(
  url: string,
  cookie?: string,
  referer?: string
): Promise<{ html: string; cookie: string; finalUrl: string }> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': UA,
      ...(referer ? { Referer: referer } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    signal: withTimeout(12_000),
  })

  if (!response.ok) {
    throw new Error(`Taleo page error ${response.status} for ${url}`)
  }

  const html = await response.text()
  const nextCookie = cookieHeaderFromResponse(response) || cookie || ''
  return { html, cookie: nextCookie, finalUrl: response.url || url }
}

async function warmTaleoSession(
  host: string,
  section: string,
  portalHint?: string
): Promise<{ portal: string | null; cookie: string; referer: string; html: string }> {
  const referer = jobsearchUrl(host, section)
  const page = await fetchTaleoHtml(referer)
  const portal = portalHint || extractTaleoPortal(page.html)

  return {
    portal,
    cookie: page.cookie,
    referer,
    html: page.html,
  }
}

/**
 * Legacy Taleo boards (e.g. Aga Khan University) embed the requisition list in
 * #initialHistory on joblist.ftl instead of exposing searchjobs + portalNo.
 *
 * Row shape observed:
 * !|{jobId}|{title}|{jobId}|{jobId}|{jobId}|{jobId}|{jobId}|{contestNo}|{location}|!
 */
export function parseTaleoJoblistHistory(rawValue: string): Array<{
  jobId: string
  contestNo: string
  title: string
  location: string
}> {
  if (!rawValue) return []

  const decoded = unescapeTaleoText(
    decodeHtmlEntities(decodeRepeatedUri(rawValue))
  )
  const rowRe =
    /!\|!(\d+)!\|!([^!|]{3,250})!\|!\1!\|!\1!\|!\1!\|!\1!\|!\1!\|!([A-Z0-9]+)!\|!([^!|]+)!\|!/g

  const jobs: Array<{
    jobId: string
    contestNo: string
    title: string
    location: string
  }> = []
  const seen = new Set<string>()

  for (const match of decoded.matchAll(rowRe)) {
    const jobId = match[1]
    const title = unescapeTaleoText(match[2]).trim()
    const contestNo = match[3].trim()
    const location = parseLocationColumn(match[4])
    if (!contestNo || !title || seen.has(contestNo)) continue
    seen.add(contestNo)
    jobs.push({ jobId, contestNo, title, location })
  }

  return jobs
}

async function discoverTaleoJobsFromJoblist(
  host: string,
  section: string,
  filterCountry: string | undefined,
  cookie: string,
  referer: string
): Promise<TaleoJobListing[]> {
  // Prefer joblist.ftl (All Jobs); fall back to the already-fetched jobsearch HTML path.
  let html = ''
  try {
    const page = await fetchTaleoHtml(joblistUrl(host, section), cookie, referer)
    html = page.html
  } catch {
    const page = await fetchTaleoHtml(jobsearchUrl(host, section), cookie)
    html = page.html
  }

  const history = extractInitialHistoryValue(html)
  if (!history) {
    throw new Error(
      `Taleo legacy joblist missing initialHistory for ${host}/${section}`
    )
  }

  return parseTaleoJoblistHistory(history)
    .filter(job => matchesCountry(job.location, filterCountry))
    .map(job => ({
      ...job,
      detailUrl: jobdetailUrl(host, section, job.contestNo),
    }))
}

function searchPayload(pageNo: number) {
  return {
    multilineEnabled: false,
    sortingSelection: {
      sortBySelectionParam: '3',
      ascendingSortingOrder: 'false',
    },
    fieldData: {
      fields: {
        KEYWORD: '',
        LOCATION: '',
        JOB_NUMBER: '',
      },
      valid: true,
    },
    filterSelectionParam: {
      searchFilterSelections: [
        { id: 'LOCATION', selectedValues: [] },
        { id: 'JOB_FIELD', selectedValues: [] },
      ],
    },
    advancedSearchFiltersSelectionParam: {
      searchFilterSelections: [
        { id: 'ORGANIZATION', selectedValues: [] },
        { id: 'LOCATION', selectedValues: [] },
        { id: 'JOB_FIELD', selectedValues: [] },
        { id: 'JOB_NUMBER', selectedValues: [] },
        { id: 'URGENT_JOB', selectedValues: [] },
        { id: 'EMPLOYEE_STATUS', selectedValues: [] },
      ],
    },
    pageNo,
  }
}

async function searchTaleoPage(
  host: string,
  portal: string,
  cookie: string,
  referer: string,
  pageNo: number
): Promise<TaleoSearchResponse> {
  const response = await fetch(searchJobsUrl(host, portal), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': UA,
      tz: 'GMT+03:00',
      tzname: 'Africa/Nairobi',
      Origin: `https://${host}`,
      Referer: referer,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(searchPayload(pageNo)),
    signal: withTimeout(12_000),
  })

  if (!response.ok) {
    throw new Error(
      `Taleo searchjobs error ${response.status} for ${host} portal ${portal}`
    )
  }

  return (await response.json()) as TaleoSearchResponse
}

export async function discoverTaleoJobs(
  config: TaleoSourceConfig,
  baseUrl?: string
): Promise<Array<{ job_url: string; partial_data: { title: string; location: string } }>> {
  const { host, section } = resolveBoard(config, baseUrl)
  const session = await warmTaleoSession(host, section, config.portal)

  let all: TaleoJobListing[] = []

  if (!session.portal) {
    // Older careersection UIs (AKU) have no portalNo / searchjobs API.
    all = await discoverTaleoJobsFromJoblist(
      host,
      section,
      config.filterCountry,
      session.cookie,
      session.referer
    )
  } else {
    let pageNo = 1
    for (; pageNo <= MAX_PAGES; pageNo++) {
      const data = await searchTaleoPage(
        host,
        session.portal,
        session.cookie,
        session.referer,
        pageNo
      )
      const batch = data.requisitionList || []
      for (const job of batch) {
        const contestNo = String(job.contestNo || '').trim()
        if (!contestNo) continue
        const title = extractTaleoTitle(job)
        const location = extractTaleoLocation(job)
        if (!matchesCountry(location, config.filterCountry)) continue
        all.push({
          jobId: String(job.jobId || ''),
          contestNo,
          title,
          location,
          dateColumn: job.column?.[2],
          detailUrl: jobdetailUrl(host, section, contestNo),
        })
      }

      const total = data.pagingData?.totalCount
      const pageSize = data.pagingData?.pageSize || batch.length || 25
      if (batch.length === 0) break
      if (total != null && pageNo * pageSize >= total) break
      if (batch.length < pageSize) break
    }
  }

  return all.map(job => ({
    job_url: job.detailUrl,
    partial_data: {
      title: job.title,
      location: job.location,
    },
  }))
}

/**
 * Strip leftover Taleo AJAX delimiters that sometimes leak into HTML chunks.
 */
function scrubTaleoHtml(html: string): string {
  return html.replace(/!\|\s*!/g, '').replace(/!\|!/g, '').trim()
}

/**
 * Parse Taleo jobdetail #initialHistory into title + HTML sections.
 * Description chunks are duplicated in the history blob; we dedupe exact copies.
 */
export function parseTaleoInitialHistory(rawValue: string): {
  title: string
  descriptionHtml: string
  qualificationsHtml: string
} {
  if (!rawValue) {
    return { title: '', descriptionHtml: '', qualificationsHtml: '' }
  }

  const decoded = unescapeTaleoText(
    decodeHtmlEntities(decodeRepeatedUri(rawValue))
  )
  const htmlParts = decoded
    .split('!*!')
    .slice(1)
    .map(p => p.trim())
    .filter(Boolean)

  const uniqueHtml: string[] = []
  for (const part of htmlParts) {
    const scrubbed = scrubTaleoHtml(part)
    if (scrubbed && !uniqueHtml.includes(scrubbed)) uniqueHtml.push(scrubbed)
  }

  const descriptionHtml = uniqueHtml[0] || ''
  const qualificationsHtml = uniqueHtml[1] || ''

  const header = decoded.split('!*!')[0] || ''
  let title = ''
  const submission = header.match(
    /Submission for the position\\?:\s*(.+?)\s*-\s*\(Job Number\\?:/i
  )
  if (submission) {
    title = unescapeTaleoText(submission[1]).trim()
  }

  if (!title) {
    const tokens = header.split('!|!').map(t => t.trim()).filter(Boolean)
    for (let i = tokens.length - 1; i >= 0; i--) {
      const token = unescapeTaleoText(tokens[i])
      if (
        token.length >= 3 &&
        token.length < 220 &&
        !/^(true|false|\d+)$/i.test(token) &&
        // Skip contest numbers like 260002SR / 2600009F
        !/^[A-Z]?\d{5,}[A-Z0-9]*$/i.test(token) &&
        !token.includes('Interface') &&
        !token.startsWith('ftl') &&
        !token.startsWith('Submission for the position')
      ) {
        title = token
        break
      }
    }
  }

  return { title, descriptionHtml, qualificationsHtml }
}

export function extractInitialHistoryValue(html: string): string | null {
  const match = html.match(
    /id=["']initialHistory["'][^>]*value=["']([^"']*)["']/i
  )
  if (match) return match[1]
  const alt = html.match(
    /value=["']([^"']*)["'][^>]*id=["']initialHistory["']/i
  )
  return alt?.[1] || null
}

export async function fetchTaleoJobDetails(
  host: string,
  section: string,
  contestNo: string,
  listing?: Partial<TaleoJobListing>
): Promise<TaleoJobDetail> {
  const session = await warmTaleoSession(host, section)
  const detailUrl = jobdetailUrl(host, section, contestNo)
  const page = await fetchTaleoHtml(detailUrl, session.cookie, session.referer)
  const history = extractInitialHistoryValue(page.html)
  const parsed = parseTaleoInitialHistory(history || '')

  const title = parsed.title || listing?.title || 'Untitled role'
  const descriptionHtml = parsed.descriptionHtml
  const qualificationsHtml = parsed.qualificationsHtml

  if (!descriptionHtml && !qualificationsHtml) {
    throw new Error(
      `Taleo jobdetail missing description for ${host}/${section} job ${contestNo}`
    )
  }

  return {
    jobId: listing?.jobId || '',
    contestNo,
    title,
    location: listing?.location || '',
    dateColumn: listing?.dateColumn,
    detailUrl,
    descriptionHtml,
    qualificationsHtml,
  }
}

export function normalizeTaleoJob(
  job: TaleoJobDetail,
  companyName: string
): NormalizedJob {
  const location = job.location || 'Kenya'
  const description =
    job.descriptionHtml ||
    (job.qualificationsHtml
      ? `<p>${job.title}</p>${job.qualificationsHtml}`
      : `<p>${job.title}</p>`)

  return {
    title: job.title?.trim() || 'Untitled role',
    company: companyName,
    description,
    responsibilities: '',
    required_qualifications: job.qualificationsHtml || '',
    employment_type: 'FULL_TIME',
    job_location_type: /remote/i.test(location) ? 'REMOTE' : 'ON_SITE',
    job_location_country: /kenya|\bke\b/i.test(location) ? 'Kenya' : 'Kenya',
    job_location_county: '',
    job_location_city:
      location
        .split(/[;,]/)
        .map(p => p.trim())
        .find(p => p && !/^kenya$/i.test(p) && !/^ke$/i.test(p)) || '',
    location,
    apply_link: job.detailUrl,
    application_url: job.detailUrl,
    valid_through: null,
    salary_min: null,
    salary_max: null,
    salary_currency: 'KES',
    salary_period: 'MONTH',
    salary_visibility: 'Hide',
    experience_level: 'Mid',
    minimum_experience: null,
    industry: null,
    status: 'active',
    posted_by: 'admin',
    tags: 'Taleo',
  }
}

export function taleoContentHash(job: TaleoJobDetail, companyName: string): string {
  return generateContentHash(job.title || '', companyName, job.location || '')
}
