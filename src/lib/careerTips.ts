/**
 * Career tips that belong in jobs.additional_info (under Additional Information).
 *
 * The main parse prompt already asks for 8 job-specific tips, but models often
 * omit them: they are generated (not extracted), they sit last in the JSON, and
 * RULE "omit missing fields" conflicts with ALWAYS GENERATE. Detect that gap
 * and fill it with a dedicated tips call so scrape / parse / enrich stay aligned.
 *
 * Numbered How to Apply steps are NOT tips — require a custom <h3> plus numbered
 * advice after it. Scrape publish must not insert until that HTML exists.
 */

import { callAI, hasAIConfigured } from './aiProviders'
import { sanitizeStockTipsCopy } from './sanitizeStockTipsCopy'

const HOW_TO_APPLY_BLOCK_RE =
  /<p>\s*<strong>\s*How to Apply:\s*<\/strong>\s*([\s\S]*?)<\/p>/i

const STOCK_SECTION_H3_RE =
  /^(how to apply|benefits|about us|about the company|equal opportunity|work environment)$/i

const NUMBERED_TIP_RE = /<strong>\s*\d+\s*[.)]/gi

export interface CareerTipsJobContext {
  title?: string | null
  company?: string | null
  description?: string | null
  responsibilities?: string | null
  qualifications?: string | null
}

function plainSnippet(html: string | null | undefined, max = 1400): string {
  const plain = (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plain) return ''
  return plain.length > max ? `${plain.slice(0, max)}…` : plain
}

function headingPlain(inner: string): string {
  return inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function stripHowToApplyBlock(html: string): string {
  return html.replace(HOW_TO_APPLY_BLOCK_RE, '').replace(/\n{3,}/g, '\n\n').trim()
}

function countNumberedTips(html: string): number {
  NUMBERED_TIP_RE.lastIndex = 0
  return (html.match(NUMBERED_TIP_RE) || []).length
}

function firstCustomTipsHeadingIndex(html: string): number {
  for (const match of html.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)) {
    const text = headingPlain(match[1] || '')
    if (text && !STOCK_SECTION_H3_RE.test(text)) {
      return match.index ?? -1
    }
  }
  return -1
}

function htmlFromCustomTipsHeading(html: string): string {
  const idx = firstCustomTipsHeadingIndex(html)
  return idx >= 0 ? html.slice(idx) : ''
}

/** True when additional_info already contains generated career tips (not just How to Apply). */
export function hasGeneratedCareerTips(html: string | null | undefined): boolean {
  if (!html?.trim()) return false
  const fromHeading = htmlFromCustomTipsHeading(html)
  if (!fromHeading) return false
  return countNumberedTips(fromHeading) >= 2
}

export function appendCareerTips(
  existing: string | null | undefined,
  tipsHtml: string | null | undefined
): string {
  const base = (existing || '').trim()
  if (hasGeneratedCareerTips(base)) return base
  const tipsOnly = stripHowToApplyBlock((tipsHtml || '').trim())
  if (!tipsOnly) return base
  return base ? `${base}\n${tipsOnly}` : tipsOnly
}

function extractTipsHtml(parsed: unknown): string | null {
  if (typeof parsed === 'string' && parsed.trim()) return parsed.trim()
  if (!parsed || typeof parsed !== 'object') return null
  const record = parsed as Record<string, unknown>
  const fromTips = record.career_tips
  if (typeof fromTips === 'string' && fromTips.trim()) return fromTips.trim()
  const fromInfo = record.additional_info
  if (typeof fromInfo === 'string' && fromInfo.trim()) return fromInfo.trim()
  return null
}

function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
}

function unescapeLooseHtml(html: string): string {
  return html
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\')
    .replace(/"\s*}\s*$/, '')
    .trim()
}

/** Pull tips HTML from a JSON object, fence-wrapped JSON, or a raw <h3> fragment. */
export function extractCareerTipsFromModelText(text: string): string | null {
  const cleaned = stripFences(text)
  if (!cleaned) return null

  try {
    const fromJson = extractTipsHtml(JSON.parse(cleaned))
    if (fromJson?.trim()) return fromJson.trim()
  } catch {
    // Unescaped quotes inside HTML often break JSON.parse — fall through.
  }

  const h3 = cleaned.match(/<h3\b[\s\S]*/i)
  if (!h3?.[0]) return null
  const html = unescapeLooseHtml(h3[0])
  return html || null
}

const TIPS_SYSTEM_PROMPT = `You write job-specific career advice for Kenyan job seekers on CareerSasa.
Return ONLY valid JSON: {"career_tips":"<h3>...</h3><p>intro</p><p><strong>1. ...</strong>...</p>"}.
Do not include a How to Apply block — that already exists. Produce only the tips HTML.`

function buildTipsUserPrompt(job: CareerTipsJobContext): string {
  const title = job.title?.trim() || 'This role'
  const company = job.company?.trim() || 'the hiring company'
  return `Write career tips for this CareerSasa job posting.

Title: ${title}
Company: ${company}

Role overview:
${plainSnippet(job.description) || '(not provided)'}

Responsibilities:
${plainSnippet(job.responsibilities) || '(not provided)'}

Requirements:
${plainSnippet(job.qualifications) || '(not provided)'}

RULES:
- After How to Apply (already written), add an enticing <h3> subtopic customized to THIS posting's duties, tools, industry, and seniority.
- Do NOT use bland headings: "Tips", "Application Tips", "Interview Tips", "Career Tips".
- Never use a fill-in-the-blank heading that only swaps the job title into a fixed interview-win template. Ground the title in a concrete duty, tool, stakeholder, or screen from THIS posting.
- Vary angle by role: CV proof for this craft, first 90 days, what hiring managers probe, portfolio/demo prep, field realities, stakeholder communication, etc.
- Immediately under the <h3>, write one short intro <p> with a hook (2–3 sentences). Speak like a sharp Kenyan career coach: warm, direct, specific. No fluff.
- Do not end the intro with a generic teaser about standing out from the crowd or beating the competition.
- Then exactly 8 numbered tips, customized to this role's duties, tools, seniority, and hiring context. Do not reuse generic advice that could fit any job.
- Each tip format:
  <p><strong>N. Short tip title:</strong> Then 3 to 5 full explanation sentences. Make them practical and concrete (what to put on the CV, what to prepare, what managers for this role usually probe). Optional one brief concrete example in the same paragraph — do not invent employer policies or benefits.</p>
- Tip titles stay short. Vary tip openings. Sound naturally human — no "leverage", "utilize", "delve into", "in today's competitive landscape".
- Allowed tags: <p>, <ul>, <li>, <strong>, <em>, <h3>, <a>, <br>.
- Return JSON only.`
}

function defaultTipsHeading(jobTitle?: string | null): string {
  const role =
    (jobTitle || 'This role').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ||
    'This role'
  return `${role}: What Hiring Teams Probe Before They Shortlist`
}

/**
 * Accept model tips HTML even when the custom <h3> was omitted — wrap
 * numbered tips so hasGeneratedCareerTips passes instead of dropping them.
 */
export function normalizeCareerTipsHtml(
  raw: string | null | undefined,
  jobTitle?: string | null
): string | null {
  if (!raw?.trim()) return null
  const stripped = stripHowToApplyBlock(raw)
  const sanitized = sanitizeStockTipsCopy(stripped, jobTitle)
  if (!sanitized) return null
  if (hasGeneratedCareerTips(sanitized)) return sanitized
  if (countNumberedTips(sanitized) >= 2 && firstCustomTipsHeadingIndex(sanitized) < 0) {
    const wrapped = `<h3>${defaultTipsHeading(jobTitle)}</h3>\n${sanitized}`
    if (hasGeneratedCareerTips(wrapped)) return wrapped
  }
  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '')
  return /(?:\b429\b|rate.?limit|too many requests|resource.?exhausted|quota)/i.test(msg)
}

/** Dedicated tips generation. Returns HTML fragment (h3 + intro + 8 tips) or null. */
export async function generateCareerTipsHtml(
  job: CareerTipsJobContext
): Promise<string | null> {
  if (!hasAIConfigured()) return null

  let lastError: unknown = null
  // Two tries, 40s, two keys. 15s was aborting 8-tip completions; 3×60s
  // across every key hung Process. Parallel with parse so wall-clock stays ~1 job parse.
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await sleep(isRateLimitError(lastError) ? 1200 : 400)
    }
    try {
      const result = await callAI(buildTipsUserPrompt(job), {
        systemPrompt: TIPS_SYSTEM_PROMPT,
        json: true,
        temperature: 0.35,
        maxTokens: 4096,
        timeoutMs: 40_000,
        maxKeyTries: 2,
      })
      const raw =
        extractTipsHtml(result.parsed) || extractCareerTipsFromModelText(result.text)
      const cleaned = normalizeCareerTipsHtml(raw, job.title || null)
      if (cleaned) return cleaned
      lastError = 'model output did not contain numbered career tips'
    } catch (err) {
      lastError = err
    }
  }

  console.warn(
    '[careerTips] generation failed:',
    lastError instanceof Error ? lastError.message : lastError
  )
  return null
}

/** Append generated tips when additional_info is only How to Apply / benefits. */
export async function ensureCareerTipsHtml(
  existing: string | null | undefined,
  job: CareerTipsJobContext
): Promise<string> {
  const current = (existing || '').trim()
  if (hasGeneratedCareerTips(current)) return current
  const generated = await generateCareerTipsHtml(job)
  return appendCareerTips(current, generated)
}

/**
 * Generate tips if missing. Throws when the output still has no career tips.
 * Scrape publish must call this — a job is not posted until tips exist.
 */
export async function requireCareerTipsHtml(
  existing: string | null | undefined,
  job: CareerTipsJobContext
): Promise<string> {
  const next = await ensureCareerTipsHtml(existing, job)
  if (hasGeneratedCareerTips(next)) return next
  if (!hasAIConfigured()) {
    throw new Error('Career tips generation failed: no AI API keys configured')
  }
  throw new Error('Career tips generation failed; will retry')
}
