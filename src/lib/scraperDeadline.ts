/**
 * Deadline / expiry helpers for scraped jobs.
 *
 * Rules:
 * - No deadline found → default to 30 days after publication
 * - Deadline already in the past → do not publish
 */

import { getDefaultValidThrough } from './jobParseNormalization'

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
}

/** Strip ordinal suffixes: 1st/2nd/3rd/27th → 1/2/3/27 */
function stripOrdinals(value: string): string {
  return value.replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1')
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Parse "27 July 2026" / "July 27, 2026" style dates to YYYY-MM-DD. */
function parseHumanDate(value: string): string | null {
  const cleaned = stripOrdinals(value).replace(/,/g, ' ').replace(/\s+/g, ' ').trim()

  // 27 July 2026 | 27 Jul 2026
  let m = cleaned.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (m) {
    const day = Number(m[1])
    const month = MONTHS[m[2].toLowerCase()]
    const year = Number(m[3])
    if (month && day >= 1 && day <= 31) return `${year}-${pad2(month)}-${pad2(day)}`
  }

  // July 27 2026 | Jul 27 2026
  m = cleaned.match(/^([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})$/)
  if (m) {
    const month = MONTHS[m[1].toLowerCase()]
    const day = Number(m[2])
    const year = Number(m[3])
    if (month && day >= 1 && day <= 31) return `${year}-${pad2(month)}-${pad2(day)}`
  }

  // 27/07/2026 or 27-07-2026 (assume DMY — common in Kenya)
  m = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (m) {
    const day = Number(m[1])
    const month = Number(m[2])
    const year = Number(m[3])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad2(month)}-${pad2(day)}`
    }
  }

  return null
}

/** Normalize a date-ish string to YYYY-MM-DD, or null if unparseable. */
export function parseDeadlineDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  const trimmed = value.trim()

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  // ISO datetime
  const iso = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T\s]/)
  if (iso) return iso[1]

  const human = parseHumanDate(trimmed)
  if (human) return human

  // Last resort: Date.parse on ordinal-stripped text ("27th July 2026" → "27 July 2026")
  const parsed = new Date(stripOrdinals(trimmed))
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().split('T')[0]
}

/**
 * Pull an application deadline from job description HTML/text.
 * Prefers phrases like "Deadline:", "Application Deadline:", "Closing date:".
 */
export function extractApplicationDeadline(
  descriptionHtml: string | null | undefined
): string | null {
  if (!descriptionHtml?.trim()) return null

  const text = descriptionHtml
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')

  const patterns = [
    /application\s+deadline\s*[:-]\s*([^\n<]{5,60})/i,
    /\bdeadline\s*[:-]\s*([^\n<]{5,60})/i,
    /closing\s+date\s*[:-]\s*([^\n<]{5,60})/i,
    /applications?\s+close\s*(?:on)?\s*[:-]?\s*([^\n<]{5,60})/i,
    /apply\s+by\s*[:-]?\s*([^\n<]{5,60})/i,
    /last\s+day\s+(?:to\s+apply|for\s+application)s?\s*[:-]?\s*([^\n<]{5,60})/i,
  ]

  for (const pattern of patterns) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const candidate = match[1].trim()
      // Stop at sentence junk after the date (NBSP / company blurb)
      const clipped = candidate.split(/\s{2,}|\u00a0/)[0]?.trim() || candidate
      const parsed = parseDeadlineDate(clipped)
      if (parsed) return parsed

      const human = clipped.match(
        /(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4}|[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}-\d{2}-\d{2})/i
      )
      if (human) {
        const fromToken = parseDeadlineDate(human[1])
        if (fromToken) return fromToken
      }
    }
  }

  return null
}

/** True when the deadline day is fully in the past (UTC date comparison). */
export function isDeadlineExpired(
  validThrough: string | null | undefined,
  now = new Date()
): boolean {
  const day = parseDeadlineDate(validThrough)
  if (!day) return false
  const today = now.toISOString().split('T')[0]
  return day < today
}

export type ScrapedDeadlineResult =
  | { action: 'use'; validThrough: string; source: 'explicit' | 'default' }
  | { action: 'skip_expired'; validThrough: string }

/**
 * Resolve the deadline for a scraped job.
 * - Missing / unparseable → 30 days from postingDate
 * - Explicit future (or today) → use it
 * - Explicit past → skip_expired (caller must not publish)
 */
export function resolveScrapedDeadline(
  rawDeadline: string | null | undefined,
  postingDate = new Date()
): ScrapedDeadlineResult {
  const parsed = parseDeadlineDate(rawDeadline)
  if (!parsed) {
    return {
      action: 'use',
      validThrough: getDefaultValidThrough(postingDate),
      source: 'default',
    }
  }

  if (isDeadlineExpired(parsed, postingDate)) {
    return { action: 'skip_expired', validThrough: parsed }
  }

  return { action: 'use', validThrough: parsed, source: 'explicit' }
}

/** expires_at timestamptz at end of the valid_through day (UTC). */
export function expiresAtFromValidThrough(validThrough: string): string {
  const day = parseDeadlineDate(validThrough) || validThrough.slice(0, 10)
  return `${day}T23:59:59.999Z`
}

/**
 * Canonical form for scrape URL dedupe.
 * Strips tracking params and trailing slashes. Preserves identity fragments
 * used by PSC adapters (`#advert-…` / `#psc-job-…`) so multi-role listings
 * do not collapse to a single URL.
 */
export function normalizeJobUrl(url: string): string {
  try {
    const u = new URL(url.trim())
    const hash = u.hash || ''
    const keepHash = /^#advert-/i.test(hash) || /^#psc-job-/i.test(hash)
    if (!keepHash) u.hash = ''
    u.hostname = u.hostname.toLowerCase()
    u.pathname = u.pathname.replace(/\/+$/, '') || '/'
    ;['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'].forEach(
      key => u.searchParams.delete(key)
    )
    return u.toString()
  } catch {
    return url.trim().replace(/\/+$/, '')
  }
}

/**
 * Portal-level apply URLs shared by many distinct postings.
 * These must not be used for application_url duplicate detection —
 * e.g. every PSC PDF role applies via psckjobs.go.ke.
 */
export function isGenericApplicationUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return true
  try {
    const u = new URL(url.trim())
    const host = u.hostname.toLowerCase().replace(/^www\./, '')
    const path = (u.pathname || '/').replace(/\/+$/, '') || '/'
    const pathLower = path.toLowerCase()

    if (host === 'psckjobs.go.ke') {
      // Job-specific advert detail pages are fine for dedupe
      if (u.searchParams.has('kpx') || /advertdetails/i.test(pathLower)) return false
      return true
    }

    // Teachers Service Commission — many distinct roles share the adverts index
    // (e.g. https://services.tsc.go.ke/adverts/index?page=1). Treating that as a
    // unique application_url collapses Senior Master / Deputy Principal / etc.
    if (host === 'services.tsc.go.ke' || host === 'tsc.go.ke') {
      if (
        pathLower === '/' ||
        pathLower === '/adverts' ||
        pathLower.startsWith('/adverts/index') ||
        /\/login/i.test(pathLower)
      ) {
        return true
      }
    }

    // Shared e-recruitment portals without a job-specific path segment
    if (
      (host.endsWith('azurewebsites.net') || host === 'erecruitment.kra.go.ke') &&
      (pathLower === '/' ||
        pathLower === '/portal' ||
        pathLower.endsWith('/portal') ||
        /\/login/i.test(pathLower))
    ) {
      return true
    }

    // Bare site roots / login landings are never job-unique
    if (path === '/' || /\/login/i.test(pathLower)) return true

    return false
  } catch {
    return false
  }
}
