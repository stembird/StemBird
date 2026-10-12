/**
 * Oracle Taleo Business Edition (TBE) adapter
 *
 * Public career sites live on *.tbe.taleo.net:
 *   /{pod}/ats/careers/v2/jobSearch?org=ORG&cws=N
 *   /{pod}/ats/careers/v2/searchResults?org=ORG&cws=N
 *   /{pod}/ats/careers/v2/viewRequisition?org=ORG&cws=N&rid=ID
 *
 * Discovery paginates searchResults HTML. Detail prefers JSON-LD on the
 * requisition page (includes HTML description + structured location).
 *
 * Source config in scraper_sources.selectors:
 * {
 *   "type": "taleo_be",
 *   "org": "CAREUSA",
 *   "cws": "63",
 *   "hostPath": "phg.tbe.taleo.net/phg02",
 *   "filterCountry": "Kenya",
 *   "category": "ngo"
 * }
 */

import { generateContentHash, NormalizedJob } from './scraper'

export interface TaleoBeSourceConfig {
  type: 'taleo_be'
  org: string
  cws: string
  /** e.g. phg.tbe.taleo.net/phg02 — optional if parseable from base_url */
  hostPath?: string
  filterCountry?: string
  category?: string
}

export interface TaleoBeJobListing {
  rid: string
  title: string
  location: string
  detailUrl: string
  meta: string[]
}

export interface TaleoBeJobDetail extends TaleoBeJobListing {
  descriptionHtml: string
  employmentType?: string
  datePosted?: string
  companyName?: string
}

const UA = 'Mozilla/5.0 (compatible; careersasa-scraper/1.0)'
const MAX_PAGES = 10

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms)
}

export function parseTaleoBeBoardUrl(url: string): {
  hostPath: string
  org: string
  cws: string
} | null {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes('tbe.taleo.net')) return null
    const pathMatch = parsed.pathname.match(/^\/([^/]+)\/ats\/careers\//i)
    if (!pathMatch) return null
    const org = parsed.searchParams.get('org')
    const cws = parsed.searchParams.get('cws')
    if (!org || !cws) return null
    return {
      hostPath: `${parsed.hostname}/${pathMatch[1]}`,
      org,
      cws,
    }
  } catch {
    return null
  }
}

function resolveBoard(
  config: TaleoBeSourceConfig,
  baseUrl?: string
): { hostPath: string; org: string; cws: string } {
  if (config.hostPath && config.org && config.cws) {
    return { hostPath: config.hostPath, org: config.org, cws: config.cws }
  }
  if (baseUrl) {
    const parsed = parseTaleoBeBoardUrl(baseUrl)
    if (parsed) {
      return {
        hostPath: config.hostPath || parsed.hostPath,
        org: config.org || parsed.org,
        cws: config.cws || parsed.cws,
      }
    }
  }
  if (config.org && config.cws && config.hostPath) {
    return { hostPath: config.hostPath, org: config.org, cws: config.cws }
  }
  throw new Error(
    'Taleo BE source is missing selectors.org/cws/hostPath (or a parseable base_url)'
  )
}

function originFromHostPath(hostPath: string): string {
  const host = hostPath.split('/')[0]
  return `https://${host}`
}

function jobSearchUrl(hostPath: string, org: string, cws: string): string {
  return `https://${hostPath}/ats/careers/v2/jobSearch?org=${encodeURIComponent(org)}&cws=${encodeURIComponent(cws)}`
}

function searchResultsUrl(hostPath: string, org: string, cws: string): string {
  return `https://${hostPath}/ats/careers/v2/searchResults?org=${encodeURIComponent(org)}&cws=${encodeURIComponent(cws)}`
}

function viewRequisitionUrl(
  hostPath: string,
  org: string,
  cws: string,
  rid: string
): string {
  return `https://${hostPath}/ats/careers/v2/viewRequisition?org=${encodeURIComponent(org)}&cws=${encodeURIComponent(cws)}&rid=${encodeURIComponent(rid)}`
}

export function extractTaleoBeRid(jobUrl: string): string | null {
  try {
    const rid = new URL(jobUrl).searchParams.get('rid')
    if (rid && /^\d+$/.test(rid)) return rid
  } catch {
    /* ignore */
  }
  const match = jobUrl.match(/[?&]rid=(\d+)/i)
  return match?.[1] || null
}

export function extractTaleoBeOrg(jobUrl: string): string | null {
  try {
    return new URL(jobUrl).searchParams.get('org')
  } catch {
    return null
  }
}

export function extractTaleoBeCws(jobUrl: string): string | null {
  try {
    return new URL(jobUrl).searchParams.get('cws')
  } catch {
    return null
  }
}

export function extractTaleoBeHostPath(jobUrl: string): string | null {
  try {
    const parsed = new URL(jobUrl)
    const pathMatch = parsed.pathname.match(/^\/([^/]+)\/ats\//i)
    if (!pathMatch || !parsed.hostname.includes('tbe.taleo.net')) return null
    return `${parsed.hostname}/${pathMatch[1]}`
  } catch {
    return null
  }
}

function matchesCountry(location: string, filterCountry?: string): boolean {
  if (!filterCountry) return true
  const needle = filterCountry.toLowerCase()
  const hay = location.toLowerCase()
  if (!hay) return false
  if (needle === 'kenya' || needle === 'ke') {
    return /kenya|nairobi|mombasa|kisumu|nakuru|eldoret|dadaab|kakuma|garissa|narok|turkana|kwale|kilifi|machakos|kiambu/.test(
      hay
    )
  }
  return hay.includes(needle)
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

/**
 * Parse TBE v2 searchResults cards.
 * CARE-style cards expose multiple meta divs (department, work location, country).
 * CI-style cards expose a single location div.
 */
export function parseTaleoBeSearchResults(html: string): TaleoBeJobListing[] {
  const jobs: TaleoBeJobListing[] = []
  const seen = new Set<string>()
  const cardRe =
    /<h4 class="oracletaleocwsv2-head-title"><a href="([^"]+rid=(\d+)[^"]*)"[^>]*>([^<]+)<\/a><\/h4>([\s\S]*?)<\/div>\s*<!--\/\.accordion-head-info/gi

  for (const match of html.matchAll(cardRe)) {
    const detailUrl = decodeBasicEntities(match[1])
    const rid = match[2]
    const title = decodeBasicEntities(match[3]).trim()
    const metaBlock = match[4]
    const meta = [...metaBlock.matchAll(/<div tabindex="0"\s*>([^<]*)<\/div>/gi)].map(m =>
      decodeBasicEntities(m[1]).trim()
    )
    const location = meta.filter(Boolean).join(' | ')
    if (!rid || !title || seen.has(rid)) continue
    seen.add(rid)
    jobs.push({ rid, title, location, detailUrl, meta })
  }

  return jobs
}

function extractNextResultsUrl(
  html: string,
  currentUrl: string,
  org: string,
  cws: string
): string | null {
  const match = html.match(/href="([^"]*searchResults\?next[^"]*)"/i)
  if (!match) return null
  const raw = decodeBasicEntities(match[1]).replace(/&amp;/g, '&')
  try {
    const next = new URL(raw, currentUrl)
    // TBE "next" links often omit org/cws; without them the server 500s.
    if (!next.searchParams.get('org')) next.searchParams.set('org', org)
    if (!next.searchParams.get('cws')) next.searchParams.set('cws', cws)
    return next.toString()
  } catch {
    return null
  }
}

/**
 * Collect Kenya-related location checkbox values from the jobSearch form.
 * Field names vary by tenant (location vs CUSTOM_####).
 */
export function extractKenyaLocationFilters(
  html: string
): Array<{ name: string; value: string; label: string }> {
  const out: Array<{ name: string; value: string; label: string }> = []
  const re =
    /<input([^>]*type=["']checkbox["'][^>]*)>\s*<label>\s*([^<]+)<\/label>/gi
  for (const match of html.matchAll(re)) {
    const attrs = match[1]
    const label = decodeBasicEntities(match[2]).trim()
    if (!matchesCountry(label, 'Kenya')) continue
    const name = attrs.match(/name=["']([^"']+)["']/i)?.[1]
    const value = attrs.match(/value=["']([^"']+)["']/i)?.[1]
    if (!name || value == null) continue
    out.push({ name, value, label })
  }
  return out
}

async function fetchText(
  url: string,
  init?: RequestInit
): Promise<{ html: string; finalUrl: string }> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': UA,
      ...(init?.headers || {}),
    },
    signal: withTimeout(12_000),
  })
  if (!response.ok) {
    throw new Error(`Taleo BE HTTP ${response.status} for ${url}`)
  }
  return { html: await response.text(), finalUrl: response.url || url }
}

async function discoverViaPagination(
  hostPath: string,
  org: string,
  cws: string,
  filterCountry?: string
): Promise<TaleoBeJobListing[]> {
  let url = searchResultsUrl(hostPath, org, cws)
  const all: TaleoBeJobListing[] = []
  const seen = new Set<string>()

  for (let page = 0; page < MAX_PAGES; page++) {
    const { html, finalUrl } = await fetchText(url)
    const batch = parseTaleoBeSearchResults(html)
    for (const job of batch) {
      if (seen.has(job.rid)) continue
      if (!matchesCountry(job.location, filterCountry) && filterCountry) continue
      seen.add(job.rid)
      all.push(job)
    }
    const next = extractNextResultsUrl(html, finalUrl, org, cws)
    if (!next || batch.length === 0) break
    url = next
  }

  return all
}

async function discoverViaLocationFilter(
  hostPath: string,
  org: string,
  cws: string,
  filterCountry?: string
): Promise<TaleoBeJobListing[] | null> {
  if (!filterCountry || !/^kenya|ke$/i.test(filterCountry)) return null

  const searchUrl = jobSearchUrl(hostPath, org, cws)
  const { html: searchHtml } = await fetchText(searchUrl)
  const kenyaFilters = extractKenyaLocationFilters(searchHtml)
  if (kenyaFilters.length === 0) return null

  const formTagMatch = searchHtml.match(
    /<form[^>]*(?:id|name)=["']TBE_theForm["'][^>]*>/i
  )
  const formMatch = searchHtml.match(
    /<form[^>]*(?:id|name)=["']TBE_theForm["'][^>]*>([\s\S]*?)<\/form>/i
  )
  if (!formTagMatch || !formMatch) return null

  const actionMatch = formTagMatch[0].match(/action=["']([^"']+)["']/i)
  if (!actionMatch) return null

  const action = new URL(
    decodeBasicEntities(actionMatch[1]),
    originFromHostPath(hostPath)
  ).toString()

  const params = new URLSearchParams()
  for (const input of formMatch[1].matchAll(/<input[^>]*>/gi)) {
    const tag = input[0]
    const name = tag.match(/name=["']([^"']+)["']/i)?.[1]
    if (!name) continue
    const type = (tag.match(/type=["']([^"']+)["']/i)?.[1] || 'text').toLowerCase()
    if (type === 'checkbox' || type === 'submit' || type === 'button' || type === 'image') {
      continue
    }
    const value = tag.match(/value=["']([^"']*)["']/i)?.[1] || ''
    params.append(name, value)
  }
  for (const filter of kenyaFilters) {
    params.append(filter.name, filter.value)
  }

  const { html } = await fetchText(action, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: originFromHostPath(hostPath),
      Referer: searchUrl,
    },
    body: params.toString(),
  })

  return parseTaleoBeSearchResults(html).filter(job =>
    matchesCountry(job.location, filterCountry)
  )
}

export async function discoverTaleoBeJobs(
  config: TaleoBeSourceConfig,
  baseUrl?: string
): Promise<Array<{ job_url: string; partial_data: { title: string; location: string } }>> {
  const { hostPath, org, cws } = resolveBoard(config, baseUrl)

  let jobs: TaleoBeJobListing[] = []
  try {
    const filtered = await discoverViaLocationFilter(
      hostPath,
      org,
      cws,
      config.filterCountry
    )
    if (filtered && filtered.length > 0) {
      jobs = filtered
    }
  } catch {
    /* fall through to full pagination */
  }

  if (jobs.length === 0) {
    jobs = await discoverViaPagination(hostPath, org, cws, config.filterCountry)
  }

  return jobs.map(job => ({
    job_url: job.detailUrl,
    partial_data: {
      title: job.title,
      location: job.location,
    },
  }))
}

interface TaleoBeJsonLd {
  title?: string
  description?: string
  datePosted?: string
  employmentType?: string
  url?: string
  hiringOrganization?: { name?: string }
  jobLocation?: {
    address?: {
      addressLocality?: string
      addressRegion?: string
      addressCountry?: { name?: string } | string
    }
  }
}

export function extractTaleoBeJsonLd(html: string): TaleoBeJsonLd | null {
  const match = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  )
  if (!match) return null
  try {
    return JSON.parse(match[1]) as TaleoBeJsonLd
  } catch {
    return null
  }
}

export function locationFromTaleoBeJsonLd(data: TaleoBeJsonLd): string {
  const address = data.jobLocation?.address
  if (!address) return ''
  const country =
    typeof address.addressCountry === 'string'
      ? address.addressCountry
      : address.addressCountry?.name || ''
  return [address.addressLocality, address.addressRegion, country]
    .filter(Boolean)
    .join(', ')
}

export async function fetchTaleoBeJobDetails(
  hostPath: string,
  org: string,
  cws: string,
  rid: string,
  listing?: Partial<TaleoBeJobListing>
): Promise<TaleoBeJobDetail> {
  const detailUrl = viewRequisitionUrl(hostPath, org, cws, rid)
  const { html } = await fetchText(detailUrl, {
    headers: { Referer: jobSearchUrl(hostPath, org, cws) },
  })

  const jsonLd = extractTaleoBeJsonLd(html)
  const descriptionHtml = (jsonLd?.description || '').trim()
  const title =
    jsonLd?.title?.trim() ||
    listing?.title ||
    html.match(/<strong>\s*([^<]{3,200})\s*<\/strong>/i)?.[1]?.trim() ||
    'Untitled role'
  const location =
    locationFromTaleoBeJsonLd(jsonLd || {}) || listing?.location || ''

  if (!descriptionHtml) {
    throw new Error(
      `Taleo BE jobdetail missing JSON-LD description for ${org} rid=${rid}`
    )
  }

  return {
    rid,
    title: decodeBasicEntities(title),
    location,
    detailUrl,
    meta: listing?.meta || [],
    descriptionHtml,
    employmentType: jsonLd?.employmentType,
    datePosted: jsonLd?.datePosted,
    companyName: jsonLd?.hiringOrganization?.name,
  }
}

function mapEmploymentType(value?: string): string {
  const raw = (value || '').toLowerCase()
  if (raw.includes('part')) return 'PART_TIME'
  if (raw.includes('contract') || raw.includes('temporary')) return 'CONTRACTOR'
  if (raw.includes('intern')) return 'INTERN'
  return 'FULL_TIME'
}

export function normalizeTaleoBeJob(
  job: TaleoBeJobDetail,
  companyName: string
): NormalizedJob {
  const location = job.location || 'Kenya'
  return {
    title: job.title?.trim() || 'Untitled role',
    company: companyName,
    description: job.descriptionHtml || `<p>${job.title}</p>`,
    responsibilities: '',
    required_qualifications: '',
    employment_type: mapEmploymentType(job.employmentType),
    job_location_type: /remote/i.test(location) ? 'REMOTE' : 'ON_SITE',
    job_location_country: /kenya|\bke\b/i.test(location) ? 'Kenya' : 'Kenya',
    job_location_county: '',
    job_location_city:
      location
        .split(/[|,]/)
        .map(p => p.trim())
        .find(
          p =>
            p &&
            !/^kenya$/i.test(p) &&
            !/^ke$/i.test(p) &&
            !/^united states$/i.test(p) &&
            p.length > 1
        ) || '',
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
    tags: 'Taleo BE',
  }
}

export function taleoBeContentHash(
  job: TaleoBeJobDetail,
  companyName: string
): string {
  return generateContentHash(job.title || '', companyName, job.location || '')
}
