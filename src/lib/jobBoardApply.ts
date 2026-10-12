/**
 * Shared apply-method resolution for job-board / portal sources
 * (BrighterMonday, MyJobMag, and future aggregators).
 *
 * These platforms are not employers. Prefer the real employer's apply
 * link or email from the posting body; only fall back to the board
 * listing URL when neither is present.
 */

export interface JobBoardApplyResolution {
  /** Employer career/apply URL when found; otherwise board listing fallback or null if email-only */
  application_url: string | null
  /** Same as employer URL when found; never the board listing URL */
  apply_link: string | null
  /** Employer apply email when found in the posting */
  apply_email: string | null
  /** True when application_url is the board listing fallback */
  used_board_fallback: boolean
}

export interface ResolveJobBoardApplyInput {
  boardJobUrl: string
  descriptionHtml?: string | null
  /** Explicit external apply URL from the board (e.g. BrighterMonday linkout_url) */
  linkoutUrl?: string | null
  /** Hostnames treated as the board itself (blocked as employer apply targets) */
  boardHosts?: string[]
}

const DEFAULT_BOARD_HOSTS = [
  'brightermonday.co.ke',
  'myjobmag.co.ke',
  'jobberman.com',
  'fuzu.com',
]

const SOCIAL_OR_TRACKING_HOSTS = [
  'facebook.com',
  'fb.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'instagram.com',
  'tiktok.com',
  'youtube.com',
  'youtu.be',
  'whatsapp.com',
  'wa.me',
  't.me',
  'googletagmanager.com',
  'google-analytics.com',
  'cookielaw.org',
  'onetrust.com',
  'i.roamcdn.net',
  'webvitalize.io',
  'sentry.io',
  'hotjar.com',
  'sail-horizon.com',
  'hexagon.build',
]

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const HREF_RE = /href=["'](https?:\/\/[^"']+)["']/gi
const BARE_URL_RE = /https?:\/\/[^\s<>"'\\)]+/gi
/** Bare www.example.com or forms.gle/xyz without a scheme */
const BARE_WWW_OR_FORM_RE =
  /(?:^|[\s("'>(])((?:www\.[a-z0-9.-]+\.[a-z]{2,}|(?:forms\.gle|docs\.google\.com\/forms)\/[^\s"'<>]+|(?:forms\.office\.com)\/[^\s"'<>]+)(?:\/[^\s"'<>]*)?)/gi
/** MyJobMag-style CTA: "Go to Employer on careers.example.com to apply" */
const ON_HOST_RE =
  /\bon\s+([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+)\b/gi
const ANCHOR_RE = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
/** Hostname-ish token inside anchor/link text (e.g. pscims.publicservice.go.ke) */
const HOST_IN_TEXT_RE =
  /\b([a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?){1,})\b/gi

const BLOCKED_EMAIL_LOCAL = new Set([
  'anonymous',
  'example',
  'noreply',
  'no-reply',
  'donotreply',
  'do-not-reply',
])

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return null
  }
}

function isBlockedHost(hostname: string, boardHosts: string[]): boolean {
  const host = hostname.toLowerCase()
  return [...boardHosts, ...SOCIAL_OR_TRACKING_HOSTS].some(
    blocked => host === blocked || host.endsWith(`.${blocked}`)
  )
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function looksLikeHostname(value: string): boolean {
  const host = value.trim().toLowerCase().replace(/^www\./, '')
  if (!host || host.length > 253) return false
  if (!/^[a-z0-9.-]+$/.test(host)) return false
  if (!host.includes('.')) return false
  if (host.startsWith('.') || host.endsWith('.') || host.includes('..')) return false
  // Require a plausible TLD (ke, com, org, go.ke via multi-label already covered)
  const labels = host.split('.')
  const tld = labels[labels.length - 1]
  if (!tld || tld.length < 2 || !/^[a-z]+$/.test(tld)) return false
  // Skip version-like / IP-ish noise
  if (/^\d+(\.\d+)+$/.test(host)) return false
  return true
}

function hostnameToHttpsUrl(hostname: string): string | null {
  if (!looksLikeHostname(hostname)) return null
  return `https://${hostname.replace(/^www\./i, '').toLowerCase()}/`
}

/** Drop common board tracking params from employer destinations. */
export function stripBoardTrackingParams(url: string): string {
  // String surgery avoids URL() re-encoding query values (e.g. kpx=138/2026).
  const stripped = url
    .replace(/([?&])(utm_[^=&#]*|fbclid|gclid)=[^&#]*/gi, '$1')
    .replace(/[?&]+$/, '')
    .replace(/\?&+/g, '?')
    .replace(/&&+/g, '&')
  return stripped.endsWith('?') ? stripped.slice(0, -1) : stripped
}

function normalizeCandidateUrl(raw: string): string | null {
  if (!raw) return null
  let url = raw.trim()
  url = url.replace(/&amp;/gi, '&')
  url = url.replace(/[),.;]+$/g, '')
  if (!/^https?:\/\//i.test(url)) return null
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    return stripBoardTrackingParams(parsed.toString())
  } catch {
    return null
  }
}

function hostsFromPlainText(text: string, boardHosts: string[]): string[] {
  const found: string[] = []
  const seen = new Set<string>()

  ON_HOST_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = ON_HOST_RE.exec(text)) !== null) {
    const host = match[1].toLowerCase()
    if (!looksLikeHostname(host)) continue
    if (isBlockedHost(host, boardHosts)) continue
    if (seen.has(host)) continue
    seen.add(host)
    found.push(host)
  }

  return found
}

function hostsFromAnchorText(descriptionHtml: string, boardHosts: string[]): string[] {
  const found: string[] = []
  const seen = new Set<string>()

  ANCHOR_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = ANCHOR_RE.exec(descriptionHtml)) !== null) {
    const href = match[1] || ''
    const text = stripHtml(match[2] || '')
    if (!text) continue

    // Prefer "on example.com" inside the anchor label
    for (const host of hostsFromPlainText(text, boardHosts)) {
      if (seen.has(host)) continue
      seen.add(host)
      found.push(host)
    }

    // Absolute employer href already handled by HREF_RE; for relative/board
    // redirects, harvest hostnames mentioned in the visible label.
    const hrefHost = hostnameOf(href.startsWith('http') ? href : '')
    if (hrefHost && !isBlockedHost(hrefHost, boardHosts)) continue

    HOST_IN_TEXT_RE.lastIndex = 0
    let hostMatch: RegExpExecArray | null
    while ((hostMatch = HOST_IN_TEXT_RE.exec(text)) !== null) {
      const host = hostMatch[1].toLowerCase()
      if (!looksLikeHostname(host)) continue
      if (isBlockedHost(host, boardHosts)) continue
      if (seen.has(host)) continue
      seen.add(host)
      found.push(host)
    }
  }

  return found
}

/** Exported for tests — higher = more likely a real employer apply destination. */
export function scoreApplyUrl(url: string): number {
  const lower = url.toLowerCase()
  let score = 0
  // Google / Microsoft / Typeform application forms — strong employer signals
  if (
    /forms\.gle|docs\.google\.com\/forms|forms\.office\.com|typeform\.com|airtable\.com/.test(
      lower
    )
  ) {
    score += 80
  }
  if (/\/(apply|application|applications)\b/.test(lower)) score += 50
  if (/\b(careers?|jobs?|vacancies|recruit|hiring)\b/.test(lower)) score += 30
  if (
    /lever\.co|greenhouse\.io|workable\.com|smartrecruiters\.com|taleo\.net|oraclecloud\.com|publicservice\.go\.ke|psckjobs\.go\.ke/.test(
      lower
    )
  ) {
    score += 40
  }
  if (/\b(apply|application)\b/.test(lower)) score += 15
  // Bare homepage roots are weaker than real apply paths
  try {
    const u = new URL(url)
    const pathParts = u.pathname.split('/').filter(Boolean)
    if (pathParts.length === 0) score -= 10
    if (u.searchParams.size === 0) score += 5
    if (pathParts.length > 0 && pathParts.length <= 3) score += 5
    // Promo shorteners without an apply cue are weak candidates
    if (
      /^(bit\.ly|tinyurl\.com|t\.co|ow\.ly)$/i.test(u.hostname.replace(/^www\./, '')) &&
      !/apply|job|career|form/i.test(u.pathname)
    ) {
      score -= 40
    }
  } catch {
    /* ignore */
  }
  return score
}

/**
 * Bare informational homepages (e.g. www.nckenya.com) often appear next to
 * a real "apply by email" CTA. Prefer the email when the URL looks weak.
 */
const WEAK_APPLY_URL_SCORE = 20

export function extractJobBoardEmails(
  descriptionHtml: string | null | undefined,
  boardHosts: string[] = DEFAULT_BOARD_HOSTS
): string[] {
  if (!descriptionHtml) return []
  const text = stripHtml(descriptionHtml)
  const seen = new Set<string>()
  const emails: string[] = []

  EMAIL_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = EMAIL_RE.exec(text)) !== null) {
    const email = match[0].toLowerCase()
    const [local, domain] = email.split('@')
    if (!local || !domain) continue
    if (BLOCKED_EMAIL_LOCAL.has(local)) continue
    if (boardHosts.some(h => domain === h || domain.endsWith(`.${h}`))) continue
    if (seen.has(email)) continue
    seen.add(email)
    emails.push(email)
  }

  return emails
}

export function extractJobBoardApplyUrls(
  descriptionHtml: string | null | undefined,
  boardHosts: string[] = DEFAULT_BOARD_HOSTS
): string[] {
  if (!descriptionHtml) return []
  const found = new Set<string>()

  const addUrl = (raw: string) => {
    const url = normalizeCandidateUrl(raw)
    if (!url) return
    const host = hostnameOf(url)
    if (!host || isBlockedHost(host, boardHosts)) return
    found.add(url)
  }

  HREF_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = HREF_RE.exec(descriptionHtml)) !== null) {
    addUrl(match[1])
  }

  const text = stripHtml(descriptionHtml)
  BARE_URL_RE.lastIndex = 0
  while ((match = BARE_URL_RE.exec(text)) !== null) {
    addUrl(match[0])
  }

  // Scheme-less www. / Google Form short links in plain text
  BARE_WWW_OR_FORM_RE.lastIndex = 0
  while ((match = BARE_WWW_OR_FORM_RE.exec(text)) !== null) {
    const raw = match[1].replace(/[),.;]+$/g, '')
    addUrl(raw.startsWith('http') ? raw : `https://${raw}`)
  }

  // Employer hostnames embedded in CTA / anchor text (no absolute href).
  // Example: <a href="/apply-now/123">PSCK on pscims.publicservice.go.ke</a>
  for (const host of [
    ...hostsFromAnchorText(descriptionHtml, boardHosts),
    ...hostsFromPlainText(text, boardHosts),
  ]) {
    const url = hostnameToHttpsUrl(host)
    if (url) found.add(url)
  }

  return [...found].sort((a, b) => scoreApplyUrl(b) - scoreApplyUrl(a))
}

/**
 * Resolve how candidates should apply for a job scraped from a portal.
 *
 * Priority (never prefer the job-board listing when a real method exists):
 * 1. Explicit employer linkout / redirected apply URL from the board
 * 2. Employer apply URL in the posting (career page, Google Form, ATS, etc.)
 * 3. Employer apply email in the posting
 * 4. Board listing URL — last resort only
 */
export function resolveJobBoardApplication(
  input: ResolveJobBoardApplyInput
): JobBoardApplyResolution {
  const boardHosts = (input.boardHosts?.length ? input.boardHosts : DEFAULT_BOARD_HOSTS).map(h =>
    h.replace(/^www\./i, '').toLowerCase()
  )

  const linkout = normalizeCandidateUrl(input.linkoutUrl || '')
  const linkoutHost = linkout ? hostnameOf(linkout) : null
  const explicitExternal =
    linkout && linkoutHost && !isBlockedHost(linkoutHost, boardHosts) ? linkout : null

  const urls = extractJobBoardApplyUrls(input.descriptionHtml, boardHosts)
  const emails = extractJobBoardEmails(input.descriptionHtml, boardHosts)

  const employerUrl = explicitExternal || urls[0] || null
  const applyEmail = emails[0] || null

  if (employerUrl) {
    const urlScore = scoreApplyUrl(employerUrl)
    // Prefer email over weak homepage / host-only linkouts when both exist
    if (applyEmail && urlScore < WEAK_APPLY_URL_SCORE) {
      return {
        application_url: null,
        apply_link: null,
        apply_email: applyEmail,
        used_board_fallback: false,
      }
    }
    return {
      application_url: employerUrl,
      apply_link: employerUrl,
      apply_email: applyEmail,
      used_board_fallback: false,
    }
  }

  if (applyEmail) {
    return {
      application_url: null,
      apply_link: null,
      apply_email: applyEmail,
      used_board_fallback: false,
    }
  }

  return {
    application_url: input.boardJobUrl,
    apply_link: null,
    apply_email: null,
    used_board_fallback: true,
  }
}

/** Adapter types / selector flag for portal scrapers (not employer ATS). */
export function isJobBoardSource(selectors: unknown): boolean {
  const config = (selectors || {}) as { type?: string; sourceKind?: string }
  if (config.sourceKind === 'job_board') return true
  return (
    config.type === 'brightermonday' ||
    config.type === 'myjobmag' ||
    config.type === 'fuzu'
  )
}

function isBoardApplyNowHref(
  href: string,
  boardHosts: string[],
  boardOrigin: string
): boolean {
  const raw = href.trim()
  if (/^\/apply-now\/\d+/i.test(raw)) return true
  try {
    const absolute = /^https?:\/\//i.test(raw)
      ? raw
      : new URL(raw, boardOrigin.endsWith('/') ? boardOrigin : `${boardOrigin}/`).toString()
    const parsed = new URL(absolute)
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase()
    if (!boardHosts.some(h => host === h || host.endsWith(`.${h}`))) return false
    return /^\/apply-now\/\d+/i.test(parsed.pathname)
  } catch {
    return false
  }
}

function absolutizeBoardHref(href: string, boardOrigin: string): string | null {
  const raw = href.trim()
  if (!raw || raw.startsWith('#') || /^mailto:/i.test(raw) || /^tel:/i.test(raw)) {
    return null
  }
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('//')) return `https:${raw}`
  if (!raw.startsWith('/')) return null
  try {
    return new URL(raw, boardOrigin.endsWith('/') ? boardOrigin : `${boardOrigin}/`).toString()
  } catch {
    return `${boardOrigin.replace(/\/$/, '')}${raw}`
  }
}

export interface RewriteJobBoardDescriptionLinksOptions {
  /**
   * Exact employer destination from following MyJobMag `/apply-now/{id}`
   * (the Location redirect). When set, relative apply-now anchors use this URL.
   * Do not pass CareerSasa apply_link / application_url heuristics here.
   */
  applyNowDestinationUrl?: string | null
  /** @deprecated Use applyNowDestinationUrl — same meaning. */
  employerApplyUrl?: string | null
  /** Origin used to absolutize board-relative paths (e.g. https://www.myjobmag.co.ke). */
  boardOrigin: string
  boardHosts?: string[]
}

/**
 * Fix board-relative anchors in scraped HTML so they do not 404 on CareerSasa.
 *
 * MyJobMag CTAs look like:
 *   Go to <a href="/apply-now/1284199">KRA on erecruitment.kra.go.ke</a> to apply
 *
 * Prefer the exact `/apply-now/{id}` redirect target when known; otherwise
 * absolutize to https://www.myjobmag.co.ke/apply-now/{id} so MyJobMag still
 * routes to the employer-provided link. Never invent a different apply URL.
 */
export function rewriteJobBoardDescriptionLinks(
  html: string | null | undefined,
  options: RewriteJobBoardDescriptionLinksOptions
): string {
  if (!html) return ''
  if (!html.includes('<a') && !html.includes('<A')) return html

  const boardHosts = (options.boardHosts?.length ? options.boardHosts : DEFAULT_BOARD_HOSTS).map(
    h => h.replace(/^www\./i, '').toLowerCase()
  )
  const boardOrigin = options.boardOrigin.replace(/\/$/, '') || 'https://www.myjobmag.co.ke'

  const destinationRaw =
    options.applyNowDestinationUrl?.trim() || options.employerApplyUrl?.trim() || null
  const destination = destinationRaw ? normalizeCandidateUrl(destinationRaw) : null
  const destinationHost = destination ? hostnameOf(destination) : null
  const destinationIsExternal = Boolean(
    destination && destinationHost && !isBlockedHost(destinationHost, boardHosts)
  )

  return html.replace(
    /<a\b([^>]*?)\bhref\s*=\s*(["'])([^"']*)\2([^>]*)>/gi,
    (full, preAttrs: string, quote: string, href: string, postAttrs: string) => {
      const raw = String(href || '').trim()
      if (!raw) return full

      if (isBoardApplyNowHref(raw, boardHosts, boardOrigin)) {
        // Keep the original MyJobMag apply-now route unless we have its exact
        // employer redirect target from following that same apply-now link.
        const applyNowPath =
          raw.match(/(\/apply-now\/\d+)/i)?.[1] ||
          ( /^https?:\/\//i.test(raw)
            ? (() => {
                try {
                  return new URL(raw).pathname.match(/(\/apply-now\/\d+)/i)?.[1] || null
                } catch {
                  return null
                }
              })()
            : null)
        const target = destinationIsExternal
          ? destination!
          : applyNowPath
            ? absolutizeBoardHref(applyNowPath, boardOrigin)
            : absolutizeBoardHref(raw, boardOrigin)
        if (!target || target === raw) return full
        return `<a${preAttrs}href=${quote}${target}${quote}${postAttrs}>`
      }

      // Only absolutize other known MyJobMag board paths that would 404 here
      if (/^\/(?:jobs-at|job)\//i.test(raw)) {
        const absolute = absolutizeBoardHref(raw, boardOrigin)
        if (!absolute || absolute === raw) return full
        return `<a${preAttrs}href=${quote}${absolute}${quote}${postAttrs}>`
      }

      return full
    }
  )
}

/**
 * Strip &lt;script&gt; blocks (including JSON-LD) from scraped HTML before it
 * is rendered. A leftover source-board JobPosting in the body is parsed by
 * Google as a second item — often without datePosted — which GSC flags as
 * invalid even when CareerSasa's own JSON-LD is correct.
 */
export function stripEmbeddedScripts(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*\/?\s*>/gi, '')
}

/**
 * Display-time fix for scraped job HTML: rewrite relative MyJobMag `/apply-now/`
 * anchors to absolute MyJobMag URLs so they keep the original employer redirect.
 * Does not substitute CareerSasa apply_link / application_url.
 */
export function sanitizeScrapedJobHtmlForDisplay(
  html: string | null | undefined
): string {
  if (html == null) return ''
  const asString = typeof html === 'string' ? html : String(html)
  if (!asString) return ''
  const withoutScripts = stripEmbeddedScripts(asString)
  if (!withoutScripts) return ''
  if (!/href\s*=/i.test(withoutScripts)) return withoutScripts
  if (!/\/apply-now\//i.test(withoutScripts) && !/\/(?:jobs-at|job)\//i.test(withoutScripts)) {
    return withoutScripts
  }

  return rewriteJobBoardDescriptionLinks(withoutScripts, {
    boardOrigin: 'https://www.myjobmag.co.ke',
    boardHosts: ['myjobmag.co.ke'],
  })
}
