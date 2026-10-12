/**
 * PSC PDF Advert Adapter
 *
 * Discovers vacancy PDFs from publicservice.go.ke/jobs/, extracts text,
 * uses AI to split multi-job adverts into individual postings.
 *
 * Config: { "type": "psc_pdf", "category": "government", "maxListingPages": 3 }
 */

import * as cheerio from 'cheerio'
import { fetchHtml, NormalizedJob } from './scraper'
import { callAI } from './aiProviders'

// Intentionally do NOT static-import ./pdfText here.
// Discover only scrapes HTML listing pages; loading pdf-parse/pdfjs at
// import time crashes Vercel (DOMMatrix / @napi-rs/canvas missing).

/** @deprecated Prefer PSC_PDF_JOB_PARAM — hash fragments are stripped by normalizeJobUrl */
export const PSC_PDF_JOB_FRAGMENT = '#psc-job-'
/** Query param that keeps each role in a multi-job PDF uniquely dedupable */
export const PSC_PDF_JOB_PARAM = 'psc_job'

export interface PscPdfSourceConfig {
  type: 'psc_pdf'
  category?: string
  /** How many /jobs/ listing pages to scan (default 3) */
  maxListingPages?: number
}

export interface PscPdfDocument {
  downloadUrl: string
  title: string
}

export interface PscPdfExtractedJob {
  title: string
  advert_number?: string
  ministry?: string
  job_scale?: string
  vacancies?: number | string
  deadline?: string | null
  salary_text?: string
  description?: string
  responsibilities?: string
  required_qualifications?: string
  employment_type?: string
  terms_of_service?: string
  location?: string
}

const EXCLUDE_SLUG_PATTERNS = [
  /shortlisted/i,
  /appointed/i,
  /archived/i,
  /citizen-service-charter/i,
  /interview/i,
  /results/i,
]

const INCLUDE_SLUG_PATTERNS = [
  /advertisement/i,
  /vacant/i,
  /vacancies/i,
  /vacancy/i,
]

const PSC_PDF_EXTRACT_PROMPT = `You are parsing a Kenya Public Service Commission (PSC) job advertisement PDF.
Extract EVERY distinct vacant position described in the document.

Return ONLY valid JSON with this shape:
{
  "document_title": "string",
  "ministry": "string",
  "apply_url": "https://www.psckjobs.go.ke",
  "default_deadline": "YYYY-MM-DD or null",
  "jobs": [
    {
      "title": "Job title only (e.g. Cook III)",
      "advert_number": "e.g. 03/2026 or null",
      "ministry": "Ministry or State Department",
      "job_scale": "e.g. CSG 15 J/G E",
      "vacancies": 1,
      "deadline": "YYYY-MM-DD or null",
      "salary_text": "plain text salary/benefits summary",
      "description": "HTML: terms of service, salary, allowances overview using <p> and <ul>",
      "responsibilities": "HTML <ul><li> duties and responsibilities </li></ul>",
      "required_qualifications": "HTML <ul><li> requirements </li></ul>",
      "employment_type": "FULL_TIME",
      "terms_of_service": "Permanent and Pensionable / Contract / etc",
      "location": "Kenya or specific county if stated"
    }
  ]
}

Rules:
1. One entry per distinct job title/grade (A., B., C. sections count as separate jobs)
2. Use clean HTML only (<p>, <ul>, <li>, <strong>)
3. Parse Kenyan dates like "3rd August, 2026" to YYYY-MM-DD
4. Include salary scale text when present
5. Do not invent jobs not in the PDF
6. If the PDF is a summary table plus detailed sections, merge table + detail for each job`

/** Discover PDF advert download URLs from the PSC jobs listing page. */
export async function discoverPscPdfDocuments(
  jobsListingUrl: string,
  config: PscPdfSourceConfig = { type: 'psc_pdf' }
): Promise<Array<{ job_url: string; partial_data: Record<string, string> }>> {
  const maxPages = config.maxListingPages ?? 3
  const base = jobsListingUrl.replace(/\?.*$/, '').replace(/\/$/, '')
  const documents = new Map<string, PscPdfDocument>()

  for (let page = 1; page <= maxPages; page++) {
    const pageUrl = page === 1 ? `${base}/` : `${base}/?cp_66=${page}`
    let html: string
    try {
      html = await fetchHtml(pageUrl)
    } catch {
      break
    }

    const found = parsePdfLinksFromListing(html)
    if (found.length === 0 && page > 1) break

    for (const doc of found) {
      documents.set(doc.downloadUrl, doc)
    }
  }

  return [...documents.values()].map(doc => ({
    job_url: doc.downloadUrl,
    partial_data: {
      title: doc.title,
      downloadUrl: doc.downloadUrl,
      documentType: 'psc_pdf',
      location: 'Kenya',
    },
  }))
}

export function parsePdfLinksFromListing(html: string): PscPdfDocument[] {
  const $ = cheerio.load(html)
  // Key by slug so bare /download/slug/ landing pages and ?wpdmdl= direct
  // download links collapse to one document (prefer the wpdmdl URL).
  const bySlug = new Map<string, PscPdfDocument>()

  $('a[data-downloadurl], a[href*="/download/"]').each((_, el) => {
    const rawUrl = $(el).attr('data-downloadurl') || $(el).attr('href') || ''
    if (!rawUrl || rawUrl === '#') return
    const downloadUrl = canonicalPscPdfUrl(rawUrl)
    if (!downloadUrl) return

    const slug = slugFromDownloadUrl(downloadUrl)
    if (!isVacancyAdvertSlug(slug)) return

    const title = humanizeSlug(slug)
    const existing = bySlug.get(slug)
    if (!existing) {
      bySlug.set(slug, { downloadUrl, title })
      return
    }
    // Prefer WordPress Download Manager direct-file URLs over HTML landings
    if (!hasWpdmdlParam(existing.downloadUrl) && hasWpdmdlParam(downloadUrl)) {
      bySlug.set(slug, { downloadUrl, title })
    }
  })

  return [...bySlug.values()]
}

export function buildPscPdfJobUrl(pdfUrl: string, job: PscPdfExtractedJob, index: number): string {
  const slug = [job.advert_number, job.title]
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const suffix = slug || `index-${index}`
  try {
    const url = new URL(canonicalPscPdfUrl(pdfUrl))
    url.searchParams.set(PSC_PDF_JOB_PARAM, suffix)
    return url.toString()
  } catch {
    const base = canonicalPscPdfUrl(pdfUrl)
    const join = base.includes('?') ? '&' : '?'
    return `${base}${join}${PSC_PDF_JOB_PARAM}=${encodeURIComponent(suffix)}`
  }
}

export function extractPscPdfJobSuffix(jobUrl: string): string | null {
  try {
    const fromQuery = new URL(jobUrl).searchParams.get(PSC_PDF_JOB_PARAM)
    if (fromQuery) return fromQuery
  } catch {
    /* fall through */
  }
  const match = jobUrl.match(/#psc-job-(.+)$/)
  return match ? match[1] : null
}

export async function downloadAndExtractPscPdfText(downloadUrl: string): Promise<string> {
  const { downloadPdfBuffer, extractTextFromPdfBuffer } = await import('./pdfText')
  let buffer = await downloadPdfBuffer(downloadUrl)

  // Listing/canonical URLs often hit a WordPress Download Manager HTML page
  // instead of the PDF bytes. Resolve the real ?wpdmdl= link and retry.
  if (!isPdfMagic(buffer)) {
    const resolved = resolvePdfDownloadUrlFromHtml(buffer.toString('utf8'), downloadUrl)
    if (!resolved) {
      throw new Error(
        `PSC download URL returned HTML, not a PDF (no wpdmdl link found): ${downloadUrl}`
      )
    }
    buffer = await downloadPdfBuffer(resolved)
  }

  if (!isPdfMagic(buffer)) {
    throw new Error(`PSC download did not return PDF bytes: ${downloadUrl}`)
  }

  const text = await extractTextFromPdfBuffer(buffer)
  if (!text || text.length < 100) {
    throw new Error('PSC PDF contained insufficient extractable text')
  }
  return text
}

export async function extractJobsFromPscPdfText(
  pdfText: string,
  documentTitle?: string
): Promise<{ jobs: PscPdfExtractedJob[]; apply_url: string; default_deadline: string | null }> {
  const trimmed = pdfText.slice(0, 45000)
  const prompt = [
    documentTitle ? `DOCUMENT TITLE: ${documentTitle}` : '',
    'PDF TEXT:',
    trimmed,
  ].filter(Boolean).join('\n\n')

  const result = await callAI(prompt, {
    systemPrompt: PSC_PDF_EXTRACT_PROMPT,
    json: true,
    maxTokens: 8000,
    temperature: 0.1,
  })

  const parsed = result.parsed as {
    jobs?: PscPdfExtractedJob[]
    apply_url?: string
    default_deadline?: string | null
  }

  const jobs = (parsed?.jobs || []).filter(j => j?.title?.trim())
  if (jobs.length === 0) {
    throw new Error('AI could not extract any jobs from PSC PDF')
  }

  return {
    jobs,
    apply_url: parsed.apply_url || 'https://www.psckjobs.go.ke/loginPage.aspx',
    default_deadline: parsed.default_deadline ?? null,
  }
}

export function normalizePscPdfJob(
  job: PscPdfExtractedJob,
  applyUrl: string,
  defaultDeadline: string | null
): NormalizedJob {
  const title = job.title.trim()
  const company = job.ministry?.trim() || 'Public Service Commission of Kenya'
  const salaryBlock = job.salary_text
    ? `<p><strong>Salary &amp; benefits:</strong> ${job.salary_text}</p>`
    : ''
  const termsBlock = job.terms_of_service
    ? `<p><strong>Terms of service:</strong> ${job.terms_of_service}</p>`
    : ''

  // Keep candidate apply landing on the PSC portal, but make the stored URL
  // unique per role so application_url dedupe cannot collapse a whole PDF.
  let uniqueApply = applyUrl
  try {
    const u = new URL(applyUrl)
    if (job.advert_number) u.searchParams.set('advert', job.advert_number)
    u.searchParams.set('role', title.slice(0, 80))
    uniqueApply = u.toString()
  } catch {
    /* keep applyUrl */
  }

  return {
    title,
    company,
    description: [job.description || `<p>${title} — ${company}</p>`, salaryBlock, termsBlock].join(''),
    responsibilities: job.responsibilities || '',
    required_qualifications: job.required_qualifications || '',
    employment_type: job.employment_type || 'FULL_TIME',
    job_location_type: 'ON_SITE',
    job_location_country: 'Kenya',
    job_location_county: '',
    job_location_city: '',
    location: job.location || 'Kenya',
    apply_link: uniqueApply,
    application_url: uniqueApply,
    valid_through: job.deadline || defaultDeadline,
    salary_min: null,
    salary_max: null,
    salary_currency: 'KES',
    salary_period: 'MONTH',
    salary_visibility: job.salary_text ? 'Show' : 'Hide',
    experience_level: 'Mid',
    minimum_experience: null,
    industry: 'Government',
    status: 'active',
    posted_by: 'admin',
    tags: ['PSC', job.advert_number, job.job_scale].filter(Boolean).join(','),
  }
}

export async function processPscPdfQueueItem(
  queueItem: {
    job_url: string
    partial_data?: Record<string, unknown> | null
  },
  source: { source_id: string; name: string },
  supabase: import('@supabase/supabase-js').SupabaseClient,
  scraperUserId: string
): Promise<{
  published: number
  duplicates: number
  errors: string[]
  jobs: Array<{ title: string; status: string; job_id?: string }>
}> {
  const downloadUrl = (queueItem.partial_data?.downloadUrl as string) || queueItem.job_url
  const documentTitle = (queueItem.partial_data?.title as string) || undefined

  const pdfText = await downloadAndExtractPscPdfText(downloadUrl)
  const { jobs, apply_url, default_deadline } = await extractJobsFromPscPdfText(pdfText, documentTitle)

  let published = 0
  let duplicates = 0
  const errors: string[] = []
  const results: Array<{ title: string; status: string; job_id?: string }> = []

  const { publishScrapedJob } = await import('./scrapePublish')

  for (let i = 0; i < jobs.length; i++) {
    const extracted = jobs[i]
    const normalized = normalizePscPdfJob(extracted, apply_url, default_deadline)
    const jobUrl = buildPscPdfJobUrl(downloadUrl, extracted, i)
    const dedupCompany = normalized.company

    const parseInput = {
      title: normalized.title,
      company: dedupCompany,
      location: normalized.location,
      employmentType: normalized.employment_type,
      descriptionSection: normalized.description,
      requirementsSection: normalized.required_qualifications,
      rawContent: [normalized.description, normalized.responsibilities, normalized.required_qualifications]
        .filter(Boolean)
        .join('\n\n'),
    }

    const outcome = await publishScrapedJob({
      supabase,
      sourceId: source.source_id,
      jobUrl,
      normalized,
      parseInput,
      rawData: { pdfUrl: downloadUrl, extracted, pdfExcerpt: pdfText.slice(0, 2000) },
      scraperUserId,
      dedupCompany,
    })

    if (outcome.status === 'published') {
      published++
      results.push({ title: outcome.title || normalized.title, status: 'published', job_id: outcome.job_id })
    } else if (outcome.status === 'duplicate') {
      duplicates++
      results.push({ title: outcome.title || normalized.title, status: 'duplicate' })
    } else if (outcome.status === 'expired') {
      results.push({
        title: outcome.title || normalized.title,
        status: 'expired',
      })
    } else {
      errors.push(`${extracted.title}: ${outcome.error}`)
      results.push({ title: extracted.title, status: 'error' })
    }
  }

  return { published, duplicates, errors, jobs: results }
}

function canonicalPscPdfUrl(raw: string): string {
  try {
    const url = new URL(raw, 'https://www.publicservice.go.ke')
    url.searchParams.delete('refresh')
    // Drop transient cache-busters; keep wpdmdl (required for direct PDF bytes)
    url.searchParams.delete('ind')
    return url.toString()
  } catch {
    return raw.split('?refresh=')[0]
  }
}

function hasWpdmdlParam(url: string): boolean {
  try {
    return new URL(url).searchParams.has('wpdmdl')
  } catch {
    return /[?&]wpdmdl=/.test(url)
  }
}

function isPdfMagic(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString('utf8') === '%PDF-'
}

/** Pull a WordPress Download Manager direct URL out of an HTML landing page. */
export function resolvePdfDownloadUrlFromHtml(html: string, baseUrl: string): string | null {
  const $ = cheerio.load(html)
  const candidates: string[] = []

  $('a[data-downloadurl]').each((_, el) => {
    const u = $(el).attr('data-downloadurl')
    if (u) candidates.push(u)
  })
  $('a[href*="wpdmdl="]').each((_, el) => {
    const u = $(el).attr('href')
    if (u && u !== '#') candidates.push(u)
  })

  // Fallback: any .pdf href (encoded filename query params)
  if (candidates.length === 0) {
    const m = html.match(/https?:\/\/[^"'<\s]+wpdmdl=\d[^"'<\s]*/i)
    if (m) candidates.push(m[0].replace(/&amp;/g, '&'))
  }

  for (const raw of candidates) {
    const canonical = canonicalPscPdfUrl(raw.startsWith('http') ? raw : new URL(raw, baseUrl).toString())
    if (hasWpdmdlParam(canonical)) return canonical
  }
  return null
}

function slugFromDownloadUrl(url: string): string {
  try {
    const path = new URL(url).pathname
    const parts = path.split('/').filter(Boolean)
    return parts[parts.length - 1] || ''
  } catch {
    return url
  }
}

function isVacancyAdvertSlug(slug: string): boolean {
  if (!slug) return false
  if (EXCLUDE_SLUG_PATTERNS.some(p => p.test(slug))) return false
  return INCLUDE_SLUG_PATTERNS.some(p => p.test(slug))
}

function humanizeSlug(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}
