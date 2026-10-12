/**
 * Normalize "How to Apply" copy in additional_info.
 *
 * Never tell candidates that instructions were missing when an apply link,
 * external URL, email, or original source is available. Prefer concrete
 * visit-link / send-email guidance instead.
 */

import { sanitizeStockTipsCopy } from './sanitizeStockTipsCopy'

export interface ApplyMethodFields {
  apply_email?: string | null
  apply_link?: string | null
  application_url?: string | null
}

const BAD_APPLY_COPY_RE =
  /application instructions were not provided[^<.]*(?:\.|!)?/gi

const HOW_TO_APPLY_BLOCK_RE =
  /<p>\s*<strong>\s*How to Apply:\s*<\/strong>\s*([\s\S]*?)<\/p>/i

function firstApplyUrl(methods: ApplyMethodFields): string | null {
  const url = methods.apply_link?.trim() || methods.application_url?.trim() || null
  return url || null
}

/** Build a short, actionable How to Apply sentence from available methods. */
export function buildHowToApplySentence(methods: ApplyMethodFields): string {
  const email = methods.apply_email?.trim() || null
  const url = firstApplyUrl(methods)

  if (email && url) {
    return `Send your application to <a href="mailto:${email}">${email}</a>, or visit the application link provided on this page.`
  }
  if (email) {
    return `Send your application to <a href="mailto:${email}">${email}</a>.`
  }
  if (url) {
    return `Visit the application link provided on this page to submit your application.`
  }
  return `Use the apply options on this page to submit your application.`
}

export function buildHowToApplyHtml(methods: ApplyMethodFields): string {
  return `<p><strong>How to Apply:</strong> ${buildHowToApplySentence(methods)}</p>`
}

function looksLikeBadOrEmptyHowToApply(innerHtml: string): boolean {
  const plain = innerHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!plain) return true
  if (/application instructions were not provided/i.test(plain)) return true
  if (/not provided in the job posting/i.test(plain)) return true
  if (/refer to the original source/i.test(plain) && /not provided/i.test(plain)) return true
  return false
}

/**
 * Fix additional_info How to Apply wording when it uses the empty/missing-instructions
 * phrasing, or inject a How to Apply block when missing but apply methods exist.
 */
export function sanitizeAdditionalInfoApplyCopy(
  additionalInfo: string | null | undefined,
  methods: ApplyMethodFields,
  jobTitle?: string | null
): string | null {
  const hasMethod = !!(
    methods.apply_email?.trim() ||
    methods.apply_link?.trim() ||
    methods.application_url?.trim()
  )

  if (!additionalInfo?.trim()) {
    return hasMethod ? buildHowToApplyHtml(methods) : null
  }

  let html = additionalInfo
  const match = html.match(HOW_TO_APPLY_BLOCK_RE)

  if (match) {
    const inner = match[1] || ''
    if (looksLikeBadOrEmptyHowToApply(inner) || hasMethod && BAD_APPLY_COPY_RE.test(inner)) {
      html = html.replace(HOW_TO_APPLY_BLOCK_RE, buildHowToApplyHtml(methods))
    }
  } else if (hasMethod && BAD_APPLY_COPY_RE.test(html)) {
    html = html.replace(BAD_APPLY_COPY_RE, '').trim()
    html = `${buildHowToApplyHtml(methods)}\n${html}`.trim()
  } else if (hasMethod && !/how to apply/i.test(html)) {
    html = `${buildHowToApplyHtml(methods)}\n${html}`.trim()
  }

  // Final sweep for leftover bad sentences outside the How to Apply block
  if (BAD_APPLY_COPY_RE.test(html) || /not provided in the job posting/i.test(html)) {
    html = html
      .replace(BAD_APPLY_COPY_RE, '')
      .replace(/please refer to the original source[^<.]*(?:\.|!)?/gi, '')
      .replace(/please refer to the official channels[^<.]*(?:\.|!)?/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
    if (!/how to apply/i.test(html) && hasMethod) {
      html = `${buildHowToApplyHtml(methods)}\n${html}`.trim()
    }
  }

  // Hard filter: rewrite stock tip headings / strip stock intro closers
  return sanitizeStockTipsCopy(html || null, jobTitle)
}
