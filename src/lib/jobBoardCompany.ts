/**
 * Shared hiring-company profile shape for job-board / portal scrapers.
 *
 * Boards often expose a company tab (Fuzu /company/{slug}, MyJobMag
 * /jobs-at/{slug}, …) with logo, about, website, size, and location.
 * Adapters fetch that into this shape; scrape publish passes it to
 * ensureCompanyForJob so CareerSasa company pages get real portal data
 * instead of only a name + favicon guess.
 */

export type JobBoardCompanySource = 'fuzu' | 'myjobmag' | 'brightermonday' | string

export interface JobBoardCompanyProfile {
  name: string
  logo?: string | null
  website?: string | null
  description?: string | null
  location?: string | null
  size?: string | null
  industry?: string | null
  source: JobBoardCompanySource
  sourceUrl?: string | null
  externalId?: string | null
}

/** Hosts that must never be stored as the employer's website. */
export const JOB_BOARD_WEBSITE_HOSTS = [
  'fuzu.com',
  'myjobmag.co.ke',
  'myjobmag.com',
  'brightermonday.co.ke',
  'jobberman.com',
]

export function isJobBoardWebsite(url: string | null | undefined): boolean {
  if (!url?.trim()) return false
  try {
    const host = new URL(url.trim()).hostname.replace(/^www\./i, '').toLowerCase()
    return JOB_BOARD_WEBSITE_HOSTS.some(h => host === h || host.endsWith(`.${h}`))
  } catch {
    return false
  }
}

/** Prefer employer career sites; drop board URLs. */
export function sanitizeEmployerWebsite(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  let cleaned = url.trim()
  if (!/^https?:\/\//i.test(cleaned)) cleaned = `https://${cleaned}`
  try {
    const parsed = new URL(cleaned)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    if (isJobBoardWebsite(parsed.toString())) return null
    return parsed.toString()
  } catch {
    return null
  }
}

/** Fuzu serves medium_ and full logos; full path is higher-res. */
export function preferFullFuzuLogo(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  return url.trim().replace(/\/employers\/medium_/i, '/employers/')
}

/** MyJobMag /company_logo/86/x.png is a thumb; /company_logo/x.png is fuller. */
export function preferFullMyJobMagLogo(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  let cleaned = url.trim()
  if (cleaned.startsWith('/')) cleaned = `https://www.myjobmag.co.ke${cleaned}`
  return cleaned.replace(/\/company_logo\/\d+\//i, '/company_logo/')
}

/**
 * Clean portal about text for companies.description.
 * Shorter blurbs than the offline enricher are OK (portals often ship 1–2 sentences).
 */
export function cleanJobBoardCompanyDescription(
  raw: string | null | undefined,
  maxChars = 600
): string | null {
  if (!raw?.trim()) return null
  let text = raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCharCode(Number(n))
      } catch {
        return ' '
      }
    })
    .replace(/\s+/g, ' ')
    .trim()

  if (!text || text.length < 24) return null
  if (
    /^(welcome to|home page|login|sign in|find the latest job|apply for the latest job|browse current vacanc)/i.test(
      text
    )
  ) {
    return null
  }
  if (/\bsubmit your application today on myjobmag\b/i.test(text)) return null

  if (text.length > maxChars) {
    const sliced = text.slice(0, maxChars)
    const lastStop = Math.max(
      sliced.lastIndexOf('. '),
      sliced.lastIndexOf('! '),
      sliced.lastIndexOf('? ')
    )
    text =
      lastStop > 60
        ? sliced.slice(0, lastStop + 1).trim()
        : sliced.slice(0, sliced.lastIndexOf(' ') || maxChars).trim()
  }

  return text || null
}

/** Map a board profile into ensureCompanyForJob input fields (nulls omitted). */
export function companyProfileToEnsureInput(profile: JobBoardCompanyProfile | null | undefined): {
  logo?: string | null
  website?: string | null
  description?: string | null
  location?: string | null
  size?: string | null
  industry?: string | null
} {
  if (!profile) return {}
  return {
    logo: profile.logo || null,
    website: sanitizeEmployerWebsite(profile.website) || null,
    description: cleanJobBoardCompanyDescription(profile.description) || null,
    location: profile.location?.trim() || null,
    size: profile.size?.trim() || null,
    industry: profile.industry?.trim() || null,
  }
}
