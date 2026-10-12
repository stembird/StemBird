/**
 * Social post copy generation.
 *
 * Generates platform-appropriate copy from EXISTING job database fields only.
 * Never invents salary, qualifications, benefits, employer info or deadlines —
 * anything missing is simply omitted.
 *
 * Two tiers:
 *   1. Rule-based templates — always available (no AI keys required).
 *   2. AI-assisted — uses the existing callAI() provider chain (DeepSeek →
 *      Gemini) when keys are configured, following the same no-fabrication rules.
 */

import { callAI, hasAIConfigured } from '@/lib/aiProviders'
import { buildShareOgImageFilePath } from '@/lib/ogTemplateCatalog'
import type { SocialPlatform } from './types'

export interface JobForCopy {
  id: string
  title: string
  company: string
  hiring_organization_name?: string | null
  location: string
  job_location_city?: string | null
  job_location_county?: string | null
  location_town?: string | null
  job_function?: string | null
  job_functions?: string[] | null
  industry?: string | null
  employment_type?: string | null
  experience_level?: string | null
  education_requirements?: string | null
  qualifications?: string | null
  required_qualifications?: unknown
  responsibilities?: string | null
  description?: string
  salary?: string | null
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string | null
  salary_period?: string | null
  salary_is_estimated?: boolean | null
  salary_visibility?: string | null
  application_deadline?: string | null
  job_slug?: string | null
  slug?: string | null
}

export interface PlatformSpec {
  label: string
  /** Soft character guidance used by the composer UI + generators. */
  maxLength: number
  /** Instagram and LinkedIn attach the job OG graphic; Facebook uses a link card. */
  usesMedia: boolean
}

export const PLATFORM_SPECS: Record<SocialPlatform, PlatformSpec> = {
  linkedin: { label: 'LinkedIn', maxLength: 3000, usesMedia: true },
  facebook: { label: 'Facebook', maxLength: 2200, usesMedia: true },
  instagram: { label: 'Instagram', maxLength: 2200, usesMedia: true },
}

export const SITE_URL = 'https://www.careersasa.co.ke'

export function jobUrl(job: { job_slug?: string | null; slug?: string | null; id: string }): string {
  const slug = job.job_slug ?? job.slug ?? job.id
  return `${SITE_URL}/jobs/${encodeURIComponent(slug)}`
}

/** Public PNG URL Buffer and Facebook both fetch (rewritten to the OG generator). */
export function jobOgImageUrl(job: {
  job_slug?: string | null
  slug?: string | null
  id: string
}): string {
  const slug = job.job_slug ?? job.slug ?? job.id
  return `${SITE_URL}${buildShareOgImageFilePath(slug)}`
}

/** Best display name for the employer: hiring org first, else company. */
export function employerName(job: JobForCopy): string {
  return job.hiring_organization_name || job.company
}

export function locationLabel(job: JobForCopy): string {
  const parts = [
    job.location,
    job.location_town,
    job.job_location_city,
    job.job_location_county,
  ].filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
  return parts.length ? parts[0] : 'Kenya'
}

export function jobFunctions(job: JobForCopy): string[] {
  const list: string[] = []
  if (Array.isArray(job.job_functions)) {
    for (const f of job.job_functions) {
      if (typeof f === 'string' && f.trim()) list.push(f.trim())
    }
  }
  if (job.job_function?.trim() && !list.includes(job.job_function.trim())) {
    list.push(job.job_function.trim())
  }
  return list.slice(0, 2)
}

export function employmentTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Human-readable salary string — only when the job DB actually has one. */
export function salaryLabel(job: JobForCopy): string | null {
  if (job.salary_visibility === 'Hide') return null
  if (job.salary_is_estimated) return null // estimates are not facts we repeat
  if (typeof job.salary === 'string' && job.salary.trim()) {
    return job.salary.trim()
  }
  if (job.salary_min != null || job.salary_max != null) {
    const currency = job.salary_currency || 'KES'
    const format = (n: number) => n.toLocaleString()
    if (job.salary_min != null && job.salary_max != null) {
      return `${currency} ${format(job.salary_min)} – ${format(job.salary_max)}`
    }
    if (job.salary_min != null) return `${currency} ${format(job.salary_min)}+`
    if (job.salary_max != null) return `Up to ${currency} ${format(job.salary_max)}`
  }
  return null
}

export function deadlineLabel(job: JobForCopy): string | null {
  if (!job.application_deadline) return null
  const d = new Date(job.application_deadline)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })
}

const HTML_TAG = /<[^>]+>/g
const WHITESPACE = /\s+/g

/** "Looking for… / Looking to…?" — the overused Facebook job-post hook. */
const LOOKING_FOR_HOOK = /\b(?:are\s+you\s+)?(?:still\s+)?looking\s+(?:for|to)\b/i

export function plainText(value: string | null | undefined): string {
  if (!value) return ''
  return value.replace(HTML_TAG, ' ').replace(WHITESPACE, ' ').trim()
}

function hashSeed(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0
  }
  return h
}

/** Strip leading emoji / punctuation so hook detection sees the real words. */
function stripDecorativePrefix(value: string): string {
  return value
    .replace(/^[\s\p{Extended_Pictographic}\uFE0F\u200D]+/u, '')
    .replace(/^[\s¡!?.…~\-–—*•]+/, '')
    .trim()
}

function firstSentence(value: string): { sentence: string; rest: string } {
  const trimmed = value.trimStart()
  const match = trimmed.match(/^(.+?(?:[.!?]+|(?=\n)|$))([\s\S]*)/)
  if (!match) return { sentence: trimmed, rest: '' }
  return { sentence: match[1].trim(), rest: match[2].trim() }
}

export function isLookingForHook(text: string): boolean {
  const core = stripDecorativePrefix(text)
  if (!core) return false
  return LOOKING_FOR_HOOK.test(core)
}

/**
 * Drop leading "looking for / looking to" sentences from job-ad prose so
 * captions are not primed with that boilerplate.
 */
export function dropLookingForLeadSentences(text: string): string {
  let remaining = text.trim()
  for (let i = 0; i < 3 && remaining; i++) {
    const { sentence, rest } = firstSentence(remaining)
    if (!isLookingForHook(sentence)) break
    remaining = rest
  }
  return remaining
}

function restLeadsWithJobFacts(rest: string, job: JobForCopy): boolean {
  const head = rest.slice(0, 220).toLowerCase()
  const title = job.title.trim().toLowerCase()
  const employer = employerName(job).trim().toLowerCase()
  if (title.length >= 4 && head.includes(title)) return true
  if (employer.length >= 3 && head.includes(employer)) return true
  return false
}

/** Stable, fact-led first line — never "Looking for…". */
export function factLedOpening(job: JobForCopy): string {
  const title = job.title.trim()
  const employer = employerName(job)
  const loc = locationLabel(job)
  const options = [
    `${title} — ${loc}.`,
    `${employer} is hiring a ${title} in ${loc}.`,
    `New role: ${title} at ${employer} (${loc}).`,
    `${title} open at ${employer} in ${loc}.`,
    `${employer} · ${title} · ${loc}.`,
  ]
  return options[hashSeed(job.id || title) % options.length]
}

/**
 * Rewrite captions that open with the repetitive "Looking for… / Looking to…?"
 * hook. Prompt bans are not enough — models keep emitting it.
 */
export function rewriteLookingForOpening(text: string, job: JobForCopy): string {
  let remaining = text.replace(/^\uFEFF/, '')
  let dropped = false
  for (let i = 0; i < 4 && remaining.trim(); i++) {
    const { sentence, rest } = firstSentence(remaining)
    if (!stripDecorativePrefix(sentence)) {
      remaining = rest
      continue
    }
    if (!isLookingForHook(sentence)) break
    dropped = true
    remaining = rest
  }
  if (!dropped) return text.trim()
  remaining = remaining.trim()
  if (!remaining || !restLeadsWithJobFacts(remaining, job)) {
    const opening = factLedOpening(job)
    remaining = remaining ? `${opening}\n\n${remaining}` : opening
  }
  return remaining
}

export function hasLookingForOpening(text: string): boolean {
  if (!text.trim()) return false
  const { sentence } = firstSentence(text)
  return isLookingForHook(sentence)
}

function finalizeCopy(text: string, job: JobForCopy, platform: SocialPlatform): string {
  return enforceLimit(rewriteLookingForOpening(text.trim(), job), platform)
}

/** First N chars of the description/responsibilities as a post summary. */
export function summary(job: JobForCopy, maxChars = 240): string {
  const source = [job.description, job.responsibilities].filter(Boolean).join(' ')
  const text = dropLookingForLeadSentences(plainText(source))
  if (!text) return ''
  const cut = text.slice(0, maxChars)
  return cut.length < text.length ? `${cut.trim().replace(/[,.;:\s]+$/, '')}…` : cut
}

/** Up to maxItems bullet points taken from the job's qualification fields. */
export function requirementBullets(job: JobForCopy, maxItems = 3): string[] {
  const raw: string[] = []

  const pushStrings = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) {
      raw.push(value)
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.trim()) raw.push(item)
        else if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>
          const text = obj.requirement ?? obj.text ?? obj.value ?? obj.description
          if (typeof text === 'string' && text.trim()) raw.push(text)
        }
      }
    }
  }

  pushStrings(job.required_qualifications)
  pushStrings(job.qualifications)
  if (job.education_requirements?.trim()) raw.push(job.education_requirements.trim())

  const bullets: string[] = []
  for (const item of raw) {
    const text = plainText(item)
    if (!text) continue
    for (const piece of text.split(/(?:^|[.;])+/)) {
      const trimmed = piece.trim().replace(/^[-•]+\s*/, '')
      if (trimmed.length >= 8 && trimmed.length <= 160) {
        bullets.push(trimmed)
      }
      if (bullets.length >= maxItems) break
    }
    if (bullets.length >= maxItems) break
  }
  return bullets.slice(0, maxItems)
}

export function hashtag(value: string): string {
  const clean = value.replace(/[^a-zA-Z0-9]+/g, '').trim()
  return clean ? `#${clean}` : ''
}

export function buildHashtags(job: JobForCopy): string[] {
  const tags = new Set<string>()
  tags.add('#CareerSasa')
  tags.add('#JobsInKenya')
  for (const fn of jobFunctions(job)) {
    const h = hashtag(fn.replace(/\s+/g, ''))
    if (h && !tags.has(h)) tags.add(h)
  }
  return Array.from(tags).slice(0, 5)
}

// ---------------------------------------------------------------------------
// Rule-based templates
// ---------------------------------------------------------------------------

function templateLinkedIn(job: JobForCopy): string {
  const lines: string[] = []
  lines.push(`We are hiring: ${job.title}`)
  lines.push('')
  lines.push(`Employer: ${employerName(job)}`)
  lines.push(`Location: ${locationLabel(job)}`)
  const fn = jobFunctions(job)
  if (fn.length) lines.push(`Function: ${fn.join(' / ')}`)
  const type = employmentTypeLabel(job.employment_type)
  if (type) lines.push(`Type: ${type}`)
  const salary = salaryLabel(job)
  if (salary) lines.push(`Salary: ${salary}`)
  const summaryText = summary(job)
  if (summaryText) {
    lines.push('')
    lines.push(summaryText)
  }
  const bullets = requirementBullets(job)
  if (bullets.length) {
    lines.push('')
    lines.push('Key requirements:')
    for (const b of bullets) lines.push(`- ${b}`)
  }
  const deadline = deadlineLabel(job)
  if (deadline) {
    lines.push('')
    lines.push(`Application deadline: ${deadline}`)
  }
  lines.push('')
  lines.push(`Apply on CareerSasa: ${jobUrl(job)}`)
  return lines.join('\n')
}

function templateFacebook(job: JobForCopy): string {
  const lines: string[] = []
  lines.push(`🚀 We're hiring at ${employerName(job)}!`)
  lines.push('')
  lines.push(`${job.title} — ${locationLabel(job)}`)
  const type = employmentTypeLabel(job.employment_type)
  if (type) lines.push(`💼 ${type}`)
  const summaryText = summary(job)
  if (summaryText) {
    lines.push('')
    lines.push(summaryText)
  }
  const bullets = requirementBullets(job)
  if (bullets.length) {
    lines.push('')
    lines.push('What we need:')
    for (const b of bullets) lines.push(`✓ ${b}`)
  }
  const salary = salaryLabel(job)
  if (salary) lines.push('')
  if (salary) lines.push(`💰 ${salary}`)
  const deadline = deadlineLabel(job)
  if (deadline) lines.push(`⏳ Apply by ${deadline}`)
  lines.push('')
  lines.push(`Ready to make a move? Apply now on CareerSasa 👉 ${jobUrl(job)}`)
  lines.push('')
  lines.push(buildHashtags(job).join(' '))
  return lines.join('\n')
}

function templateInstagram(job: JobForCopy): string {
  const lines: string[] = []
  lines.push(`🚀 ${job.title}`)
  lines.push('')
  lines.push(`📍 ${locationLabel(job)}`)
  lines.push(`🏢 ${employerName(job)}`)
  const type = employmentTypeLabel(job.employment_type)
  if (type) lines.push(`💼 ${type}`)
  const summaryText = summary(job, 140)
  if (summaryText) {
    lines.push('')
    lines.push(summaryText)
  }
  const deadline = deadlineLabel(job)
  if (deadline) lines.push(`⏳ Apply by ${deadline}`)
  lines.push('')
  lines.push(`Apply: ${jobUrl(job)}`)
  lines.push('')
  lines.push(buildHashtags(job).join(' '))
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// AI-assisted generation
// ---------------------------------------------------------------------------

function buildFactsBlock(job: JobForCopy): string {
  const facts: Record<string, string | null> = {
    title: job.title,
    employer: employerName(job),
    location: locationLabel(job),
    job_function: jobFunctions(job).join(', ') || null,
    employment_type: employmentTypeLabel(job.employment_type),
    experience_level: job.experience_level || null,
    salary: salaryLabel(job),
    summary: summary(job, 400),
    requirements: requirementBullets(job, 5).join('; ') || null,
    application_deadline: deadlineLabel(job),
    careersasa_url: jobUrl(job),
  }
  return JSON.stringify(facts, null, 2)
}

const PLATFORM_PROMPTS: Record<SocialPlatform, string> = {
  linkedin:
    'Professional, confident tone. Open with the job title (not a question). Then employer, location, a short description, key requirements, clear CTA and the Careersasa URL. No emojis. Under 3000 characters.',
  facebook:
    'Conversational and engaging tone. Use a few relevant emojis sparingly. Open with the job title, employer, or location as the first line. Never open with "Looking for…", "Looking to…?", "Are you looking…", or "We\'re looking for…". Vary the first line from post to post. Include a short description and requirements, and end with a clear CTA to Careersasa. Under 2200 characters.',
  instagram:
    'Short copy. Lead with the job title or employer, not a "Looking for…?" question. A couple of relevant hashtags and the Careersasa URL. Designed to accompany a Careersasa job graphic. Under 2200 characters.',
}

export function systemPromptFor(platform: SocialPlatform): string {
  return [
    'You write social media posts for CareerSasa (careersasa.co.ke), a Kenyan jobs platform.',
    `Platform: ${PLATFORM_SPECS[platform].label}. Style: ${PLATFORM_PROMPTS[platform]}`,
    'STRICT RULES:',
    '- Use ONLY the facts in the JSON block. Never invent salary, qualifications, benefits, employer details, deadlines, or locations.',
    '- If a fact is missing or null, omit it entirely.',
    '- Do not add information that is not present in the JSON block.',
    '- Do not wrap the answer in quotes or markdown. Output plain text only.',
    '- Never start the post with "Looking for", "Looking to", "Are you looking", or "We\'re looking for". Those openings are banned. Lead with a concrete fact from the JSON (title, employer, or location).',
  ].join('\n')
}

export async function generatePostCopyWithAI(
  job: JobForCopy,
  platform: SocialPlatform
): Promise<string> {
  const prompt = `Write the social post now.\n\nJob facts (JSON):\n${buildFactsBlock(job)}`
  const result = await callAI(prompt, {
    systemPrompt: systemPromptFor(platform),
    temperature: 0.5,
    maxTokens: 700,
  })
  const text = result.text.trim()
  if (!text) throw new Error('AI returned an empty post — try again or use the template.')
  return finalizeCopy(text, job, platform)
}

export function enforceLimit(text: string, platform: SocialPlatform): string {
  const max = PLATFORM_SPECS[platform].maxLength
  if (text.length <= max) return text
  return text.slice(0, max).trim()
}

export interface GeneratedCopy {
  text: string
  usedAI: boolean
}

/** Main entry: try AI when configured, otherwise fall back to the template. */
export async function generatePostCopy(
  job: JobForCopy,
  platform: SocialPlatform
): Promise<GeneratedCopy> {
  if (hasAIConfigured()) {
    try {
      const text = await generatePostCopyWithAI(job, platform)
      return { text, usedAI: true }
    } catch (err) {
      console.error(`[socialPostCopy] AI generation failed for ${platform}:`, err)
      // fall through to the template
    }
  }
  const template = templateFor(job, platform)
  return { text: template, usedAI: false }
}

export function templateFor(job: JobForCopy, platform: SocialPlatform): string {
  switch (platform) {
    case 'linkedin':
      return finalizeCopy(templateLinkedIn(job), job, platform)
    case 'facebook':
      return finalizeCopy(templateFacebook(job), job, platform)
    case 'instagram':
      return finalizeCopy(templateInstagram(job), job, platform)
  }
}
