/**
 * Intelligent parsing of scraped job content into StemBird job fields.
 *
 * Uses the same AI parse + finalize path as manual job parsing
 * (callAIWithRetry → buildJobParseSystemPrompt → finalizeParsedJobData),
 * with rule-based section splitting and taxonomy heuristics as fallbacks.
 */

import * as cheerio from 'cheerio'
import type { AnyNode, Element as DomElement } from 'domhandler'
import { extractJobMetadata } from './jobMetadataExtraction'
import {
  buildJobParseSystemPrompt,
  FALLBACK_INDUSTRIES,
  FALLBACK_JOB_FUNCTIONS,
  fuzzyMatchOption,
  limitTags,
} from './jobParseNormalization'
import { callAIWithRetry, type ParsedJobData } from './jobParsingOptimized'
import { inferCompanyIndustry } from './companyIndustryInference'
import {
  convertHtmlTablesToBulletLists,
  htmlContainsTable,
} from './htmlTablesToBullets'
import { isExperienceLevelOnlyText, isMissingOrLabelOnlyQualifications } from './experienceLevelLabel'
import { appendCareerTips, generateCareerTipsHtml } from './careerTips'

export interface ScrapedJobInput {
  title: string
  company: string
  location?: string
  employmentType?: string
  workplace?: string
  /** HTML from the main description section (company overview / role summary) */
  descriptionSection?: string
  /** HTML that is primarily duties (e.g. SmartRecruiters jobDescription) */
  responsibilitiesSection?: string
  /** HTML from requirements / qualifications section */
  requirementsSection?: string
  /** HTML from benefits / perks section */
  benefitsSection?: string
  /** Unstructured fallback for HTML scrapers */
  rawContent?: string
  /** ATS industry label hint */
  industryHint?: string | null
  /** ATS job-function label hint */
  jobFunctionHint?: string | null
  /** Seed tags (department, etc.) */
  tagsHint?: string | null
}

export interface ParsedScrapedJobContent {
  description: string
  responsibilities: string
  required_qualifications: string
  additional_info: string
  deadline: string | null
  education_level: string | null
  minimum_experience: number | null
  experience_level: string | null
  industry: string | null
  industries: string[] | null
  job_function: string | null
  job_functions: string[] | null
  tags: string
  salary_min: number | null
  salary_max: number | null
  salary_currency: string | null
  salary_period: string | null
  /** Same enrichment fields as manual /api/parse-job */
  area_of_study: string | null
  field_of_study: string | null
  language_requirements: string | null
  apply_email: string | null
  apply_link: string | null
  employment_types: string[] | null
  job_location_types: string[] | null
  job_location_country: string | null
  job_location_county: string | null
  job_location_city: string | null
  additional_locations: Array<{ county: string; city: string }> | null
}

const EMPTY_ENRICHMENT: Pick<
  ParsedScrapedJobContent,
  | 'area_of_study'
  | 'field_of_study'
  | 'language_requirements'
  | 'apply_email'
  | 'apply_link'
  | 'employment_types'
  | 'job_location_types'
  | 'job_location_country'
  | 'job_location_county'
  | 'job_location_city'
  | 'additional_locations'
  | 'industries'
  | 'job_functions'
> = {
  area_of_study: null,
  field_of_study: null,
  language_requirements: null,
  apply_email: null,
  apply_link: null,
  employment_types: null,
  job_location_types: null,
  job_location_country: null,
  job_location_county: null,
  job_location_city: null,
  additional_locations: null,
  industries: null,
  job_functions: null,
}

const EMPTY_METADATA = {
  deadline: null as string | null,
  education_level: null as string | null,
  minimum_experience: null as number | null,
  experience_level: null as string | null,
  industry: null as string | null,
  salary_min: null as number | null,
  salary_max: null as number | null,
  salary_currency: null as string | null,
  salary_period: null as string | null,
}

const SECTION_PATTERNS = {
  responsibilities:
    /responsibilit|accountabilit|duties|what you.{0,20}do|key tasks|your role|role overview|activities|kpis?|deliverables|make an impact|how you will|you will:/i,
  qualifications:
    /qualification|requirement|skills|experience required|education(?:\s+and\s+experience)?|candidate profile|who you are|what we.?re looking|we are looking|must have|nice to have|preferred|you bring|ideal candidate|an ideal|key competencies|person specification|about you|you should have|minimum (?:requirements|qualifications)/i,
  benefits: /benefits|what we offer|perks|why join|compensation package|what.?s in it|how you can grow|grow with us/i,
  additional:
    /how to apply|application process|equal opportunity|about us|about the company|work environment/i,
  overview: /purpose|overview|about the role|the role|summary|introduction|the opportunity/i,
}

function wrapSection(heading: string, html: string): string {
  const trimmed = html.trim()
  if (!trimmed) return ''
  return `<h3>${heading}</h3>${trimmed}`
}

function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

type ContentBucket = 'description' | 'responsibilities' | 'required_qualifications' | 'additional_info'

function bucketForHeading(headingText: string, current: ContentBucket = 'description'): ContentBucket {
  if (SECTION_PATTERNS.overview.test(headingText)) return 'description'
  // Qualifications before responsibilities so "Key Competencies" / "Candidate Profile"
  // are not swallowed by broader duty-section patterns.
  if (SECTION_PATTERNS.qualifications.test(headingText)) return 'required_qualifications'
  if (SECTION_PATTERNS.responsibilities.test(headingText)) return 'responsibilities'
  if (SECTION_PATTERNS.benefits.test(headingText) || SECTION_PATTERNS.additional.test(headingText)) {
    return 'additional_info'
  }
  // Numbered topic sub-headings (e.g. "1. Physical Security…") stay in the
  // current section instead of falling back to description.
  if (
    current === 'responsibilities' ||
    current === 'required_qualifications' ||
    current === 'additional_info'
  ) {
    return current
  }
  return 'description'
}

/** True when a block is effectively a section title (h1-h4 or bold-only short line). */
function extractPseudoHeading($: cheerio.CheerioAPI, el: DomElement): string | null {
  const tag = el.tagName?.toLowerCase()
  if (tag && /^h[1-6]$/.test(tag)) {
    const text = $(el).text().replace(/[:：]\s*$/, '').trim()
    return text || null
  }

  const $el = $(el as AnyNode)

  // Oracle Cloud / Word-pasted boards sometimes wrap a lone section label in
  // <ol><li><strong>KEY RESPONSIBILITIES:</strong></li></ol> with the real list after.
  // Do not treat single content bullets (tables→lists) as headings.
  if (tag === 'ol' || tag === 'ul') {
    const items = $el.children('li')
    if (items.length === 1) {
      const only = items.first()
      const text = only.text().replace(/\s+/g, ' ').replace(/[:：]\s*$/, '').trim()
      const looksLikeContent =
        !text ||
        text.length > 60 ||
        /—/.test(text) ||
        /\d/.test(text) ||
        /need type/i.test(text)
      if (!looksLikeContent) {
        const boldText = only
          .find('strong, b')
          .text()
          .replace(/\s+/g, ' ')
          .replace(/[:：]\s*$/, '')
          .trim()
        const isSectionKeyword = Object.values(SECTION_PATTERNS).some(re => re.test(text))
        if ((boldText && boldText === text) || isSectionKeyword) return text
      }
    }
    return null
  }

  if (tag !== 'p' && tag !== 'div' && tag !== 'li') return null

  const text = $el.text().replace(/\s+/g, ' ').replace(/[:：]\s*$/, '').trim()
  if (!text || text.length > 80) return null

  const html = ($el.html() || '').trim()
  // <p><strong>Key Responsibilities</strong></p> or <p><strong>Purpose</strong><br>…
  const boldOnly = /^<(strong|b)[^>]*>[\s\S]+?<\/\1>(?:<br\s*\/?>)?$/i.test(html)
  const startsWithBoldTitle =
    /^<(strong|b)[^>]*>([^<]{3,80})<\/\1>(?:<br\s*\/?>|\s*)$/i.test(html)

  if (boldOnly || startsWithBoldTitle) return text

  // All visible text is inside bold/strong (possibly via nested <span>s) — treat as heading.
  // Catches <p><strong><span ...>Title</span></strong></p> (e.g. Instiglio / Word-pasted HTML).
  const boldText = $el.find('strong, b').text().replace(/\s+/g, ' ').replace(/[:：]\s*$/, '').trim()
  if (boldText && boldText === text) return text

  // Plain <p> with no inline markup that looks exactly like a section heading
  // (short, no trailing sentence-ending punctuation, matches a section keyword).
  // Handles ATS boards that use bare <p> for section labels.
  const isPlainText = !/<[a-z]/i.test(html)
  const noTrailingPeriod = !/[.!?]$/.test(text)
  const isSectionKeyword = Object.values(SECTION_PATTERNS).some(re => re.test(text))
  if (isPlainText && noTrailingPeriod && isSectionKeyword && text.length >= 4) return text

  return null
}

/**
 * Split an HTML blob into sections based on h1-h4 and bold pseudo-headings.
 */
export function splitHtmlByHeadings(html: string): {
  description: string
  responsibilities: string
  required_qualifications: string
  additional_info: string
} {
  if (!html?.trim()) {
    return { description: '', responsibilities: '', required_qualifications: '', additional_info: '' }
  }

  const $ = cheerio.load(`<div id="scraper-root">${html}</div>`, null, false)
  const root = $('#scraper-root')
  const children = root.contents().toArray().filter(node => {
    // Keep elements; drop bare whitespace text nodes
    if (node.type === 'text') return String((node as { data?: string }).data || '').trim().length > 0
    return node.type === 'tag'
  })

  if (children.length === 0) {
    return { description: html, responsibilities: '', required_qualifications: '', additional_info: '' }
  }

  const sections: Record<ContentBucket, string[]> = {
    description: [],
    responsibilities: [],
    required_qualifications: [],
    additional_info: [],
  }

  let currentBucket: ContentBucket = 'description'
  let sawNamedSection = false

  for (const el of children) {
    if (el.type === 'text') {
      const text = String((el as { data?: string }).data || '').trim()
      if (text) sections[currentBucket].push(`<p>${text}</p>`)
      continue
    }

    const heading = extractPseudoHeading($, el as DomElement)
    if (heading) {
      currentBucket = bucketForHeading(heading, currentBucket)
      sawNamedSection = true
      // Keep overview headings in description; skip pure section labels for duties/quals
      if (currentBucket === 'description' && SECTION_PATTERNS.overview.test(heading)) {
        sections.description.push($.html(el))
      }
      continue
    }

    // Bold title + body in same paragraph: <p><strong>Purpose</strong><br> body…</p>
    const $el = $(el as AnyNode)
    const inner = ($el.html() || '').trim()
    const splitBold = inner.match(
      /^<(strong|b)[^>]*>([^<]{3,80})<\/\1>\s*(?:<br\s*\/?>)?\s*([\s\S]+)$/i
    )
    if (splitBold) {
      const headingText = splitBold[2].replace(/[:：]\s*$/, '').trim()
      const bodyHtml = splitBold[3].trim()
      currentBucket = bucketForHeading(headingText, currentBucket)
      sawNamedSection = true
      if (bodyHtml) {
        sections[currentBucket].push(`<p>${bodyHtml}</p>`)
      }
      continue
    }

    sections[currentBucket].push($.html(el))
  }

  const description = sections.description.join('')
  const responsibilities = sections.responsibilities.join('')
  const required_qualifications = sections.required_qualifications.join('')
  const additional_info = sections.additional_info.join('')

  // If no named sections were found, keep original HTML as description
  if (!sawNamedSection && !responsibilities && !required_qualifications) {
    return { description: html, responsibilities: '', required_qualifications: '', additional_info: '' }
  }

  return {
    description: description || (responsibilities || required_qualifications ? '' : html),
    responsibilities,
    required_qualifications,
    additional_info,
  }
}

function buildAdditionalInfo(benefitsHtml?: string, extraHtml?: string): string {
  const parts: string[] = []
  if (benefitsHtml?.trim()) parts.push(wrapSection('Benefits', benefitsHtml))
  if (extraHtml?.trim()) parts.push(extraHtml)
  return parts.join('\n')
}

function extractEducationLevel(text: string): string | null {
  const plain = text.replace(/<[^>]+>/g, ' ').replace(/['’]/g, "'")
  if (/ph\.?d|doctorate/i.test(plain)) return "PhD"
  if (/master'?s|mba|msc|m\.a\./i.test(plain)) return "Master's"
  if (/bachelor'?s|bsc|b\.a\.|undergraduate degree/i.test(plain)) return "Bachelor's"
  if (/\bdiploma\b/i.test(plain)) return 'Diploma'
  if (/\bcertificate\b/i.test(plain)) return 'Certificate'
  if (/\bkcse\b/i.test(plain)) return 'KCSE'
  return null
}

function extractMinimumExperience(text: string): number | null {
  const plain = text.replace(/<[^>]+>/g, ' ')
  const patterns = [
    /(\d+)\s*(?:\+|plus)?\s*(?:[-–to]{1,3}\s*\d+\s*)?years?\s+(?:of\s+)?(?:relevant\s+)?experience/i,
    /minimum\s+of\s+(\d+)\s+years?/i,
    // Oracle Cloud / KCB matrices: "Experience … Required — 8 years"
    /experience[^.\d]{0,100}?(\d+)\s*years?/i,
    /(?:minimum|total)\s+no\s+of\s+years[^.\d]{0,40}?(\d+)\s*years?/i,
  ]
  for (const re of patterns) {
    const match = plain.match(re)
    if (!match) continue
    const n = parseInt(match[1], 10)
    if (Number.isFinite(n) && n > 0 && n < 50) return n
  }
  return null
}

function extractExperienceLevelFromText(
  title: string,
  text: string,
  minYears: number | null
): string | null {
  const hay = `${title} ${text}`.toLowerCase()
  if (/\bintern(ship)?\b/.test(hay)) return 'Internship'
  if (/\b(director|head of|chief|vp|vice president|general manager)\b/.test(hay)) return 'Managerial'
  if (/\b(senior|lead|principal|manager)\b/.test(hay)) return 'Senior'
  if (/\b(junior|graduate|entry[- ]level|trainee)\b/.test(hay)) return 'Entry'
  if (minYears != null) {
    if (minYears >= 8) return 'Managerial'
    if (minYears >= 5) return 'Senior'
    if (minYears >= 2) return 'Mid'
    return 'Entry'
  }
  return null
}

function buildTags(input: {
  title: string
  tagsHint?: string | null
  industry?: string | null
  jobFunction?: string | null
  qualifications?: string
}): string {
  const tags: string[] = []
  if (input.jobFunction) tags.push(input.jobFunction)
  // Prefer short industry labels only (avoid stuffing long taxonomy strings into chips)
  if (input.industry && input.industry.length <= 32) tags.push(input.industry)

  if (input.tagsHint) {
    for (const t of input.tagsHint.split(/[,|;]/)) {
      const cleaned = t.trim()
      // Skip raw ATS industry dumps and duplicates of taxonomy labels
      if (!cleaned || cleaned.length > 32) continue
      if (/information technology and services/i.test(cleaned)) continue
      tags.push(cleaned)
    }
  }

  // Significant title tokens (skip fluff)
  const stop = new Set([
    'the', 'and', 'for', 'with', 'of', 'in', 'to', 'a', 'an', 'at', 'on', 'or',
    'senior', 'junior', 'lead', 'head', 'manager', 'officer', 'assistant',
  ])
  for (const part of input.title.split(/[\s/|,–—-]+/)) {
    const cleaned = part.replace(/[^a-zA-Z0-9+.#]/g, '').trim()
    if (cleaned.length >= 3 && !stop.has(cleaned.toLowerCase())) {
      tags.push(cleaned)
    }
  }

  return limitTags(tags, 5)
}

/**
 * Pull trailing section labels out of content paragraphs so the splitter
 * can see them. e.g. "...backlog. Candidate Profile Required </p>"
 */
export function promoteInlineSectionLabels(html: string): string {
  if (!html?.trim()) return html || ''
  const label =
    '(?:Candidate Profile(?:\\s+Required)?|Education and Experience|Key Competencies|Minimum (?:Requirements|Qualifications)|Person Specification|Nice to [Hh]ave|Required Qualifications)'
  return html.replace(
    new RegExp(
      `(<(?:p|div)([^>]*)>)([\\s\\S]*?)([.!?…])\\s+(${label})\\s*(</(?:p|div)>)`,
      'gi'
    ),
    (
      _full,
      _open,
      attrs,
      body,
      punct,
      sectionLabel,
      close
    ) =>
      `<p${attrs || ''}>${body}${punct}</p>\n<p>${sectionLabel}</p>`
  )
}

/** Prepare scraped HTML: convert qualification matrices to bullet lists first. */
export function prepareScrapedHtmlSections(input: ScrapedJobInput): ScrapedJobInput {
  const prep = (value: string) =>
    promoteInlineSectionLabels(convertHtmlTablesToBulletLists(value || ''))
  return {
    ...input,
    descriptionSection: prep(input.descriptionSection || ''),
    responsibilitiesSection: prep(input.responsibilitiesSection || ''),
    requirementsSection: convertHtmlTablesToBulletLists(input.requirementsSection || ''),
    benefitsSection: convertHtmlTablesToBulletLists(input.benefitsSection || ''),
    rawContent: prep(input.rawContent || ''),
  }
}

/**
 * Rule-based parsing — works without AI keys; respects ATS native field splits.
 */
export function parseScrapedJobFallback(input: ScrapedJobInput): ParsedScrapedJobContent {
  const descriptionHadTables = htmlContainsTable(input.descriptionSection)
  const prepared = prepareScrapedHtmlSections(input)
  const descSplit = splitHtmlByHeadings(
    prepared.descriptionSection || prepared.rawContent || ''
  )
  const dutiesSplit = prepared.responsibilitiesSection
    ? splitHtmlByHeadings(prepared.responsibilitiesSection)
    : null

  let description = ''
  let responsibilities = ''

  const descSplitWorked = Boolean(
    descSplit.responsibilities ||
      descSplit.required_qualifications ||
      descSplit.additional_info
  )

  if (prepared.responsibilitiesSection?.trim()) {
    // Dedicated ATS duties block (SmartRecruiters jobDescription)
    if (dutiesSplit?.responsibilities) {
      responsibilities = dutiesSplit.responsibilities
      description = [
        descSplit.description || (!descSplitWorked ? prepared.descriptionSection || '' : ''),
        dutiesSplit.description || '',
      ]
        .filter(Boolean)
        .join('\n')
    } else {
      // No duty headings — entire jobDescription is Key Responsibilities
      responsibilities = prepared.responsibilitiesSection
      // Keep any overview from descriptionSection; don't dump the full blob back
      description = descSplitWorked
        ? descSplit.description
        : descSplit.description || prepared.descriptionSection || ''
    }
  } else if (descSplitWorked) {
    // Oracle Cloud / KCB: sections were found — keep empty description empty so AI
    // can write a short overview instead of reusing the whole posting HTML.
    description = descSplit.description
    responsibilities = descSplit.responsibilities
  } else {
    // Workable / HTML: unsplit blob stays as description
    description = descSplit.description || prepared.descriptionSection || prepared.rawContent || ''
    responsibilities = descSplit.responsibilities
  }

  let required_qualifications = convertHtmlTablesToBulletLists(
    (() => {
      const fromAts = prepared.requirementsSection?.trim() || ''
      // Board JSON-LD often puts "Mid level" / "Senior level" here — ignore those.
      if (fromAts && !isExperienceLevelOnlyText(fromAts)) return fromAts
      return (
        dutiesSplit?.required_qualifications ||
        descSplit.required_qualifications ||
        ''
      )
    })()
  ).replace(/<p\b[^>]*>\s*(?:&nbsp;|\s)*<\/p>/gi, '')

  if (isExperienceLevelOnlyText(required_qualifications)) {
    required_qualifications = ''
  }

  // Some Oracle Cloud postings open with a bare duties <ul> (no "Key Responsibilities"
  // heading) then a Requirements section. Move that list into responsibilities.
  if (
    !responsibilities.trim() &&
    description.trim() &&
    required_qualifications.trim()
  ) {
    const trimmedDesc = description.trim()
    const onlyDutyList =
      /^<ul[\s\S]*<\/ul>\s*$/i.test(trimmedDesc) ||
      (/^<ul[\s\S]*<\/ul>/i.test(trimmedDesc) &&
        !/<p\b[^>]*>\s*[^<&\s]/i.test(trimmedDesc.replace(/<ul[\s\S]*?<\/ul>/gi, '')))
    if (onlyDutyList) {
      responsibilities = trimmedDesc
      description = ''
    }
  }

  // When the description blob contained qualification matrices, prefer those
  // deterministic bullets over a separate short qualifications field.
  if (descriptionHadTables && descSplit.required_qualifications?.trim()) {
    const fromDesc = convertHtmlTablesToBulletLists(descSplit.required_qualifications).replace(
      /<p\b[^>]*>\s*(?:&nbsp;|\s)*<\/p>/gi,
      ''
    )
    if (fromDesc.trim()) required_qualifications = fromDesc
  } else if (
    descSplit.required_qualifications &&
    (/<table[\s>]/i.test(input.requirementsSection || '') || !prepared.requirementsSection?.trim())
  ) {
    const fromDesc = convertHtmlTablesToBulletLists(descSplit.required_qualifications).replace(
      /<p\b[^>]*>\s*(?:&nbsp;|\s)*<\/p>/gi,
      ''
    )
    if (fromDesc.trim() && fromDesc.length >= required_qualifications.trim().length) {
      required_qualifications = fromDesc
    }
  }

  const additional_info = buildAdditionalInfo(
    input.benefitsSection,
    [dutiesSplit?.additional_info, descSplit.additional_info].filter(Boolean).join('\n')
  )

  const metaText = [description, responsibilities, required_qualifications, additional_info]
    .filter(Boolean)
    .join('\n')

  const education_level = extractEducationLevel(metaText)
  const minimum_experience = extractMinimumExperience(metaText)
  const experience_level = extractExperienceLevelFromText(
    input.title,
    metaText,
    minimum_experience
  )

  const industry = input.industryHint?.trim() || null
  const job_function = input.jobFunctionHint?.trim() || null
  const tags = buildTags({
    title: input.title,
    tagsHint: input.tagsHint,
    industry,
    jobFunction: job_function,
    qualifications: required_qualifications,
  })

  return {
    description,
    responsibilities,
    required_qualifications,
    additional_info,
    ...EMPTY_METADATA,
    ...EMPTY_ENRICHMENT,
    education_level,
    minimum_experience,
    experience_level,
    industry,
    job_function,
    tags,
  }
}

function buildAIText(input: ScrapedJobInput): string {
  const lines = [
    `JOB TITLE: ${input.title}`,
    `COMPANY: ${input.company}`,
  ]
  if (input.location) lines.push(`LOCATION: ${input.location}`)
  if (input.employmentType) lines.push(`EMPLOYMENT TYPE: ${input.employmentType}`)
  if (input.workplace) lines.push(`WORKPLACE: ${input.workplace}`)
  if (input.industryHint) lines.push(`INDUSTRY HINT: ${input.industryHint}`)
  if (input.jobFunctionHint) lines.push(`JOB FUNCTION HINT: ${input.jobFunctionHint}`)

  if (input.descriptionSection) {
    lines.push('\n=== DESCRIPTION ===', stripToPlain(input.descriptionSection, 3000))
  } else if (input.responsibilitiesSection || input.requirementsSection) {
    lines.push(
      '\n=== DESCRIPTION ===',
      '(No overview was provided. Write a 2–4 sentence factual role summary from the responsibilities and requirements below. Do not invent facts.)'
    )
  }
  if (input.responsibilitiesSection) {
    lines.push('\n=== RESPONSIBILITIES / ROLE DETAILS ===', stripToPlain(input.responsibilitiesSection, 3000))
  }
  if (input.requirementsSection) {
    lines.push('\n=== REQUIREMENTS ===', stripToPlain(input.requirementsSection, 2000))
  }
  if (input.benefitsSection) {
    lines.push('\n=== BENEFITS ===', stripToPlain(input.benefitsSection, 1500))
  }
  if (input.rawContent && !input.descriptionSection && !input.responsibilitiesSection) {
    lines.push('\n=== FULL JOB POSTING ===', stripToPlain(input.rawContent, 5000))
  }

  return lines.join('\n')
}

function stripToPlain(html: string, maxLen: number): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maxLen)
}

const EMPLOYMENT_TYPES = new Set([
  'FULL_TIME',
  'PART_TIME',
  'CONTRACTOR',
  'INTERN',
  'TEMPORARY',
  'VOLUNTEER',
  'PER_DIEM',
])
const LOCATION_TYPES = new Set(['ON_SITE', 'REMOTE', 'HYBRID'])

function parseNumeric(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  const n = typeof val === 'number' ? val : parseInt(String(val), 10)
  return isNaN(n) ? null : n
}

function asNonEmptyString(val: unknown): string | null {
  if (typeof val !== 'string') return null
  const trimmed = val.trim()
  return trimmed ? trimmed : null
}

function sanitizeEmploymentTypes(val: unknown, fallbackType?: string | null): string[] | null {
  const fromArray = Array.isArray(val)
    ? val.map(v => String(v || '').trim().toUpperCase()).filter(v => EMPLOYMENT_TYPES.has(v))
    : []
  if (fromArray.length > 0) return [...new Set(fromArray)]
  const single = String(fallbackType || '').trim().toUpperCase()
  if (EMPLOYMENT_TYPES.has(single)) return [single]
  return null
}

function sanitizeLocationTypes(val: unknown, fallbackType?: string | null): string[] | null {
  const raw = Array.isArray(val) ? val : []
  const mapped = raw
    .map(v => {
      const u = String(v || '').trim().toUpperCase()
      if (u === 'TELECOMMUTE') return 'REMOTE'
      return u
    })
    .filter(v => LOCATION_TYPES.has(v))
  if (mapped.length > 0) return [...new Set(mapped)]
  const single = String(fallbackType || '').trim().toUpperCase()
  const normalized = single === 'TELECOMMUTE' ? 'REMOTE' : single
  if (LOCATION_TYPES.has(normalized)) return [normalized]
  return null
}

function sanitizeAdditionalLocations(
  val: unknown
): Array<{ county: string; city: string }> | null {
  if (!Array.isArray(val) || val.length === 0) return null
  const cleaned = val
    .map(item => {
      if (!item || typeof item !== 'object') return null
      const county = asNonEmptyString((item as { county?: unknown }).county) || ''
      const city = asNonEmptyString((item as { city?: unknown }).city) || ''
      if (!county && !city) return null
      return { county, city }
    })
    .filter((x): x is { county: string; city: string } => Boolean(x))
  return cleaned.length > 0 ? cleaned : null
}

/** Merge full manual-parse AI output onto rule-based section fallback. */
export function mergeManualParseResult(
  fallback: ParsedScrapedJobContent,
  ai: ParsedJobData | Record<string, unknown>
): ParsedScrapedJobContent {
  const industries = Array.isArray(ai.industries)
    ? (ai.industries as unknown[]).map(String).filter(Boolean)
    : ai.industry
      ? [String(ai.industry)]
      : null
  const jobFunctions = Array.isArray(ai.job_functions)
    ? (ai.job_functions as unknown[]).map(String).filter(Boolean)
    : ai.job_function
      ? [String(ai.job_function)]
      : null

  return {
    description: asNonEmptyString(ai.description) || fallback.description,
    responsibilities: asNonEmptyString(ai.responsibilities) || fallback.responsibilities,
    required_qualifications: (() => {
      const aiQ = asNonEmptyString(ai.required_qualifications)
      if (aiQ && !isMissingOrLabelOnlyQualifications(aiQ)) return aiQ
      const fb = fallback.required_qualifications
      if (fb && !isMissingOrLabelOnlyQualifications(fb)) return fb
      return ''
    })(),
    additional_info: asNonEmptyString(ai.additional_info) || fallback.additional_info,
    deadline:
      asNonEmptyString(ai.valid_through) ||
      asNonEmptyString((ai as { deadline?: unknown }).deadline) ||
      fallback.deadline,
    education_level:
      asNonEmptyString(ai.education_level_name) ||
      asNonEmptyString((ai as { education_level?: unknown }).education_level) ||
      fallback.education_level,
    minimum_experience: parseNumeric(ai.minimum_experience) ?? fallback.minimum_experience,
    experience_level: asNonEmptyString(ai.experience_level) || fallback.experience_level,
    industry: asNonEmptyString(ai.industry) || industries?.[0] || fallback.industry,
    industries: industries?.length ? industries : fallback.industries,
    job_function: asNonEmptyString(ai.job_function) || jobFunctions?.[0] || fallback.job_function,
    job_functions: jobFunctions?.length ? jobFunctions : fallback.job_functions,
    tags: limitTags(asNonEmptyString(ai.tags) || fallback.tags, 5),
    salary_min: parseNumeric(ai.salary_min) ?? fallback.salary_min,
    salary_max: parseNumeric(ai.salary_max) ?? fallback.salary_max,
    salary_currency: asNonEmptyString(ai.salary_currency) || fallback.salary_currency,
    salary_period: asNonEmptyString(ai.salary_period) || fallback.salary_period,
    area_of_study: asNonEmptyString(ai.area_of_study) || fallback.area_of_study,
    field_of_study: asNonEmptyString(ai.field_of_study) || fallback.field_of_study,
    language_requirements:
      asNonEmptyString(ai.language_requirements) || fallback.language_requirements,
    apply_email: asNonEmptyString(ai.apply_email) || fallback.apply_email,
    apply_link: asNonEmptyString(ai.apply_link) || fallback.apply_link,
    employment_types:
      sanitizeEmploymentTypes(ai.employment_types, asNonEmptyString(ai.employment_type)) ||
      fallback.employment_types,
    job_location_types:
      sanitizeLocationTypes(ai.job_location_types, asNonEmptyString(ai.job_location_type)) ||
      fallback.job_location_types,
    job_location_country:
      asNonEmptyString(ai.job_location_country) || fallback.job_location_country,
    job_location_county:
      asNonEmptyString(ai.job_location_county) || fallback.job_location_county,
    job_location_city: asNonEmptyString(ai.job_location_city) || fallback.job_location_city,
    additional_locations:
      sanitizeAdditionalLocations(ai.additional_locations) || fallback.additional_locations,
  }
}

/** Common ATS industry labels → StemBird 20 Canonical STEM industries */
const INDUSTRY_ALIASES: Record<string, string> = {
  // Energy, Oil & Gas
  utilities: 'Energy, Oil & Gas',
  'renewables & environment': 'Energy, Oil & Gas',
  'oil & energy': 'Energy, Oil & Gas',
  'energy and petroleum': 'Energy, Oil & Gas',
  'energy & petroleum': 'Energy, Oil & Gas',
  'oil & gas': 'Energy, Oil & Gas',
  'petroleum & utilities': 'Energy, Oil & Gas',
  // Healthcare & Medical Sciences
  'hospital & health care': 'Healthcare & Medical Sciences',
  'hospital and health care': 'Healthcare & Medical Sciences',
  'health care': 'Healthcare & Medical Sciences',
  healthcare: 'Healthcare & Medical Sciences',
  // Science & Research
  'scientific research': 'Science & Research',
  'research & development': 'Science & Research',
  // Education & STEM Training
  'education management': 'Education & STEM Training',
  'higher education': 'Education & STEM Training',
  education: 'Education & STEM Training',
  // Manufacturing & Industrial Processing
  manufacturing: 'Manufacturing & Industrial Processing',
  'industrial automation': 'Manufacturing & Industrial Processing',
  'paper & forest products': 'Manufacturing & Industrial Processing',
  // Mining, Geology & Earth Sciences
  'mining & metals': 'Mining, Geology & Earth Sciences',
  'mining & minerals': 'Mining, Geology & Earth Sciences',
  mining: 'Mining, Geology & Earth Sciences',
  // Agriculture & Food Science
  'food production': 'Agriculture & Food Science',
  'food and beverages': 'Agriculture & Food Science',
  agriculture: 'Agriculture & Food Science',
  farming: 'Agriculture & Food Science',
  // Chemicals & Chemical Manufacturing
  chemicals: 'Chemicals & Chemical Manufacturing',
  'chemical services': 'Chemicals & Chemical Manufacturing',
  // Pharmaceuticals & Biotechnology
  pharmaceuticals: 'Pharmaceuticals & Biotechnology',
  biotechnology: 'Pharmaceuticals & Biotechnology',
  // Information Technology & Software
  'information technology and services': 'Information Technology & Software',
  'information technology': 'Information Technology & Software',
  software: 'Information Technology & Software',
  internet: 'Information Technology & Software',
  // Telecommunications & Networking
  telecommunications: 'Telecommunications & Networking',
  networking: 'Telecommunications & Networking',
  // Engineering & Construction
  construction: 'Engineering & Construction',
  'civil engineering': 'Engineering & Construction',
  // Architecture & Urban Planning
  architecture: 'Architecture & Urban Planning',
  'architecture & planning': 'Architecture & Urban Planning',
  // Electronics & Electrical Equipment
  'electrical & electronic manufacturing': 'Electronics & Electrical Equipment',
  electronics: 'Electronics & Electrical Equipment',
  // Automotive & Transport Technology
  automotive: 'Automotive & Transport Technology',
  transportation: 'Automotive & Transport Technology',
  // Aerospace & Aviation
  aviation: 'Aerospace & Aviation',
  'airlines/aviation': 'Aerospace & Aviation',
  'aerospace & aviation': 'Aerospace & Aviation',
  // Environmental & Natural Sciences
  environmental: 'Environmental & Natural Sciences',
  'environmental services': 'Environmental & Natural Sciences',
  // Water, Sanitation & Waste Management
  'water supply': 'Water, Sanitation & Waste Management',
  'waste management': 'Water, Sanitation & Waste Management',
  // Mathematics, Statistics & Actuarial Science
  'financial services': 'Mathematics, Statistics & Actuarial Science',
  banking: 'Mathematics, Statistics & Actuarial Science',
  actuarial: 'Mathematics, Statistics & Actuarial Science',
}

const FUNCTION_ALIASES: Record<string, string> = {
  education: 'STEM Education, Training & Instruction',
  teaching: 'STEM Education, Training & Instruction',
  training: 'STEM Education, Training & Instruction',
  engineering: 'Mechanical Engineering',
  'business development': 'Technical Sales & Applications Engineering',
  'project management': 'Technical Project Management',
  'product management': 'Technical Project Management',
  'customer service': 'IT Support & Systems Administration',
  production: 'Production & Manufacturing',
  manufacturing: 'Production & Manufacturing',
  research: 'Research & Development',
  'r&d': 'Research & Development',
  marketing: 'Technical Sales & Applications Engineering',
  sales: 'Technical Sales & Applications Engineering',
  finance: 'Mathematics, Statistics & Actuarial Analysis',
  accounting: 'Mathematics, Statistics & Actuarial Analysis',
  legal: 'Regulatory Affairs & Compliance',
  'regulatory affairs': 'Regulatory Affairs & Compliance',
  'information technology': 'IT Support & Systems Administration',
  'it and software': 'Software Development & Programming',
  'it department': 'IT Support & Systems Administration',
  software: 'Software Development & Programming',
  development: 'Software Development & Programming',
  programming: 'Software Development & Programming',
  utilities: 'Energy & Renewable Energy Engineering',
  energy: 'Energy & Renewable Energy Engineering',
  construction: 'Civil & Structural Engineering',
  maintenance: 'Technical Maintenance & Reliability',
  quality: 'Quality Assurance & Quality Control',
  qa: 'Quality Assurance & Quality Control',
  qc: 'Quality Assurance & Quality Control',
  laboratory: 'Laboratory & Scientific Analysis',
  nursing: 'Nursing & Patient Care',
  medical: 'Clinical & Medical Practice',
  health: 'Clinical & Medical Practice',
  telecom: 'Telecommunications & Network Engineering',
  networking: 'Telecommunications & Network Engineering',
  data: 'Data Science & Analytics',
  analytics: 'Data Science & Analytics',
  ai: 'Artificial Intelligence & Machine Learning',
  safety: 'Occupational Health, Safety & EHS',
  ehs: 'Occupational Health, Safety & EHS',
  environment: 'Environmental Management & Sustainability',
  agriculture: 'Agriculture & Agronomy',
  mining: 'Mining & Mineral Processing',
  water: 'Water Treatment & Wastewater Management',
}

/**
 * Infer a StemBird job function from the job title (+ optional department hint).
 * Sourced directly from the 36 Canonical STEM functions.
 */
export function inferJobFunctionFromTitle(
  title: string,
  allowed: string[],
  tagsHint?: string | null
): string | null {
  if (!title?.trim() || !allowed.length) return null
  const hay = `${title} ${tagsHint || ''}`.toLowerCase()

  const rules: Array<{ re: RegExp; fn: string }> = [
    // Software & IT
    { re: /\b(software (engineer|developer|architect)|full ?stack|frontend|backend|mobile developer|devops|cloud engineer|programmer|web developer)\b/, fn: 'Software Development & Programming' },
    { re: /\b(cyber ?security|information security|infosec|soc analyst|penetration test)\b/, fn: 'Cybersecurity & Information Security' },
    { re: /\b(it (support|officer|specialist|technician)|systems? (admin|administrator|engineer)|network admin|helpdesk)\b/, fn: 'IT Support & Systems Administration' },
    { re: /\b(data (scientist|analyst|engineer)|business intelligence|bi analyst|big data)\b/, fn: 'Data Science & Analytics' },
    { re: /\b(machine learning|artificial intelligence|\bml\b engineer|\bai\b engineer|deep learning|nlp)\b/, fn: 'Artificial Intelligence & Machine Learning' },
    { re: /\b(telecom|telecommunication|network (engineer|specialist)|rf engineer|transmission engineer|fibre|fiber optic)\b/, fn: 'Telecommunications & Network Engineering' },

    // Engineering & Architecture
    { re: /\b(civil (engineer|engineering)|structural (engineer|engineering)|site engineer|construction engineer)\b/, fn: 'Civil & Structural Engineering' },
    { re: /\b(mechanical (engineer|engineering|technician)|mechatronics|hvac)\b/, fn: 'Mechanical Engineering' },
    { re: /\b(electrical (engineer|engineering|technician)|electronics (engineer|engineering)|power systems)\b/, fn: 'Electrical & Electronics Engineering' },
    { re: /\b(chemical (engineer|engineering)|process engineer|petroleum engineer|refinery engineer)\b/, fn: 'Chemical Engineering & Processing' },
    { re: /\b(process (operations|optimisation|optimization|improvement)|plant operator)\b/, fn: 'Process Engineering & Operations' },
    { re: /\b(architect\b|architecture|architectural|urban (planner|planning)|interior design)\b/, fn: 'Architecture & Design' },
    { re: /\b(surveyor|surveying|gis (analyst|specialist|officer)|geospatial|cartograph)\b/, fn: 'Surveying, GIS & Geospatial Analysis' },
    { re: /\b(instrumentation|control engineer|automation engineer|plc|scada|metrolog)\b/, fn: 'Instrumentation, Automation & Control' },
    { re: /\b(maintenance (engineer|technician|officer)|reliability engineer|plant maintenance)\b/, fn: 'Technical Maintenance & Reliability' },
    { re: /\b(solar|wind power|renewable energy|energy engineer|power plant|boiler)\b/, fn: 'Energy & Renewable Energy Engineering' },
    { re: /\b(mining (engineer|technician)|mineral processing|metallurg|geologist|geoscience|assay)\b/, fn: 'Mining & Mineral Processing' },

    // Science & Lab
    { re: /\b(research (scientist|officer|associate|assistant|fellow)|postdoctoral|\br&d\b)\b/, fn: 'Research & Development' },
    { re: /\b(analytical chemist|chemist\b|chemistry|laboratory (analyst|technician|officer|manager)|lab (tech|analyst|manager))\b/, fn: 'Laboratory & Scientific Analysis' },
    { re: /\b(microbiolog|biotechnolog|molecular|molecular biology)\b/, fn: 'Biotechnology & Microbiology' },
    { re: /\b(pharmaceutical|formulation|drug (development|discovery)|pharmacolog)\b/, fn: 'Pharmaceutical & Drug Development' },

    // Healthcare & Medical
    { re: /\b(nurse|nursing|midwife|patient care)\b/, fn: 'Nursing & Patient Care' },
    { re: /\b(medical (officer|doctor)|physician|clinical officer|surgeon|clinical practice)\b/, fn: 'Clinical & Medical Practice' },
    { re: /\b(medical lab|medical laboratory|diagnostic|pathology technician|phlebotom)\b/, fn: 'Medical Laboratory & Diagnostics' },

    // Agriculture, Food & Environment
    { re: /\b(agronom|agriculture|agricultural|crop scientist|soil scientist|horticultur)\b/, fn: 'Agriculture & Agronomy' },
    { re: /\b(food (scientist|technologist|safety|quality)|food technology|brewery|dairy)\b/, fn: 'Food Science & Technology' },
    { re: /\b(environmental (officer|scientist|specialist|consultant)|sustainability|eia|conservation)\b/, fn: 'Environmental Management & Sustainability' },
    { re: /\b(water (treatment|engineer|operator)|wastewater|effluent|sewerage)\b/, fn: 'Water Treatment & Wastewater Management' },

    // Quality, Safety, Reg & Operations
    { re: /\b(quality assurance|quality control|\bqa\b|\bqc\b|qms|iso auditor|quality officer)\b/, fn: 'Quality Assurance & Quality Control' },
    { re: /\b(production (manager|supervisor|engineer|officer)|manufacturing (manager|engineer)|plant manager)\b/, fn: 'Production & Manufacturing' },
    { re: /\b(hse|ehs|health (and|&) safety|safety (officer|engineer)|occupational health)\b/, fn: 'Occupational Health, Safety & EHS' },
    { re: /\b(regulatory (affairs|officer|specialist)|compliance officer|standards compliance)\b/, fn: 'Regulatory Affairs & Compliance' },

    // Math & Stats
    { re: /\b(actuar|statistic|mathematic|quantitative analyst|operations research)\b/, fn: 'Mathematics, Statistics & Actuarial Analysis' },

    // Tech Sales, Project Management & STEM Education
    { re: /\b(technical sales|applications? (engineer|specialist)|field (service|sales) engineer)\b/, fn: 'Technical Sales & Applications Engineering' },
    { re: /\b(technical project|engineering project|it project manager|project engineer)\b/, fn: 'Technical Project Management' },
    { re: /\b(stem (teacher|trainer|instructor)|science teacher|engineering lecturer|math teacher)\b/, fn: 'STEM Education, Training & Instruction' },
  ]

  for (const rule of rules) {
    if (rule.re.test(hay)) {
      const matched = allowed.find(a => a.toLowerCase() === rule.fn.toLowerCase())
      if (matched) return matched
    }
  }

  // Department-only hint (e.g. "Legal Department") when title is generic.
  // Ignore overly broad ATS labels like "Management" that fuzzy-match badly.
  if (tagsHint?.trim()) {
    const hint = tagsHint.split(/[,|;]/)[0].trim()
    if (!isGenericTaxonomyHint(hint)) {
      return matchJobFunctionName(hint, allowed)
    }
  }

  return null
}

/** ATS categories that are too vague to map to StemBird taxonomy. */
export function isGenericTaxonomyHint(hint?: string | null): boolean {
  if (!hint?.trim()) return true
  return /^(management|other|general|various|miscellaneous|n\/?a|none|all|corporate)$/i.test(
    hint.trim()
  )
}

function resolveAlias(hint: string, aliases: Record<string, string>, allowed: string[]): string | null {
  const key = hint.toLowerCase().trim()
  const aliased = aliases[key]
  if (aliased) {
    if (!aliased) return null
    return allowed.find(a => a.toLowerCase() === aliased.toLowerCase()) || fuzzyMatchOption(aliased, allowed)
  }
  // Require stronger fuzzy overlap than a single shared word like "Services"
  const normalized = key
  const parsedWords = normalized.split(/[^a-z0-9]+/).filter(w => w.length > 2)
  let bestMatch: string | null = null
  let bestScore = 0
  for (const dbName of allowed) {
    const dbWords = dbName.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2)
    const overlap = parsedWords.filter(pw => dbWords.includes(pw)).length
    if (overlap > bestScore) {
      bestScore = overlap
      bestMatch = dbName
    }
  }
  if (bestScore >= 2) return bestMatch
  return fuzzyMatchOption(hint, allowed)
}

export function matchIndustryName(
  hint: string | null | undefined,
  allowed: string[]
): string | null {
  if (!hint?.trim() || allowed.length === 0) return null
  return resolveAlias(hint, INDUSTRY_ALIASES, allowed)
}

export function matchJobFunctionName(
  hint: string | null | undefined,
  allowed: string[]
): string | null {
  if (!hint?.trim() || allowed.length === 0) return null
  return resolveAlias(hint, FUNCTION_ALIASES, allowed)
}

/**
 * Parse scraped job content into StemBird fields.
 * Uses the same AI prompt + finalize path as manual job parsing, then applies
 * scraper taxonomy heuristics when the model omits industry/function.
 */
export async function parseScrapedJobContent(
  input: ScrapedJobInput,
  options?: {
    industryNames?: string[]
    jobFunctionNames?: string[]
    /** When true, generate career tips in parallel with the parse JSON call. */
    attachCareerTips?: boolean
  }
): Promise<ParsedScrapedJobContent> {
  const hadTables = htmlContainsTable(
    [input.descriptionSection, input.requirementsSection, input.rawContent]
      .filter(Boolean)
      .join('\n')
  )
  const prepared = prepareScrapedHtmlSections(input)
  const fallback = parseScrapedJobFallback(prepared)
  // Feed AI the already-split, table→bullet sections. Keep description empty when
  // the posting had no overview so the model writes a short factual summary.
  const aiText = buildAIText({
    ...prepared,
    descriptionSection: fallback.description,
    responsibilitiesSection: fallback.responsibilities,
    requirementsSection: fallback.required_qualifications,
  })

  const industryNames =
    options?.industryNames?.length ? options.industryNames : [...FALLBACK_INDUSTRIES]
  const jobFunctionNames =
    options?.jobFunctionNames?.length ? options.jobFunctionNames : [...FALLBACK_JOB_FUNCTIONS]

  const hasAIKeys = [
    process.env.DEEPSEEK_API_KEY,
    process.env.DEEPSEEK_API_KEY_2,
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].some(Boolean)

  let parsed = fallback

  const tipsPromise =
    hasAIKeys && options?.attachCareerTips
      ? generateCareerTipsHtml({
          title: input.title,
          company: input.company,
          description: fallback.description,
          responsibilities: fallback.responsibilities,
          qualifications: fallback.required_qualifications,
        })
      : Promise.resolve(null)

  if (hasAIKeys) {
    try {
      // Same path as /api/parse-job: full schema + finalizeParsedJobData normalization
      const { response } = await callAIWithRetry(
        aiText,
        buildJobParseSystemPrompt(industryNames, jobFunctionNames),
        0,
        // One try per key, two keys max (DeepSeek then Gemini). Walking every
        // key with 60s timeouts was longer than reclaim, so jobs bounced.
        { attachCareerTips: false, maxKeyTries: 2 }
      )
      parsed = mergeManualParseResult(fallback, response)
      // Keep deterministic table→bullet requirements so AI cannot paraphrase facts.
      if (
        hadTables &&
        fallback.required_qualifications.trim() &&
        /<li[\s>]/i.test(fallback.required_qualifications)
      ) {
        parsed.required_qualifications = fallback.required_qualifications
      }
    } catch (err) {
      console.warn(
        '[scraperJobParsing] AI parse failed, using rule-based fallback:',
        err instanceof Error ? err.message : err
      )
    }
  } else {
    const plainText = [
      fallback.description,
      fallback.responsibilities,
      fallback.required_qualifications,
      fallback.additional_info,
    ]
      .filter(Boolean)
      .join('\n\n')

    const meta = await extractJobMetadata(plainText)
    parsed = {
      ...fallback,
      deadline: meta.deadline ?? fallback.deadline,
      education_level: meta.education_level ?? fallback.education_level,
      minimum_experience: meta.minimum_experience ?? fallback.minimum_experience,
      experience_level: meta.experience_level ?? fallback.experience_level,
      industry: meta.industry ?? fallback.industry,
      salary_min: meta.salary_min ?? fallback.salary_min,
      salary_max: meta.salary_max ?? fallback.salary_max,
      salary_currency: meta.salary_currency ?? fallback.salary_currency,
      salary_period: meta.salary_period ?? fallback.salary_period,
    }
  }

  const earlyTips = await tipsPromise
  if (earlyTips) {
    parsed.additional_info = appendCareerTips(parsed.additional_info, earlyTips)
  }

  // When the ATS blob had no overview (common for Oracle Cloud / KCB), keep a
  // short factual stub so we don't leave the old table-heavy HTML in description.
  if (
    !parsed.description?.trim() &&
    (parsed.responsibilities?.trim() || parsed.required_qualifications?.trim())
  ) {
    const loc = input.location?.trim()
    parsed.description = `<p>${escapeHtmlText(input.title)} at ${escapeHtmlText(input.company)}${
      loc ? ` — ${escapeHtmlText(loc)}` : ''
    }.</p>`
  }

  // Prefer known-employer industry, then AI/meta, then ATS hints.
  // Generic labels like Oracle "Management" must not fuzzy-match
  // industry names that contain "Management" (e.g. "Environmental Science & Management").
  const companyIndustry = inferCompanyIndustry(input.company, null, industryNames)
  const hintedIndustry = isGenericTaxonomyHint(input.industryHint)
    ? null
    : matchIndustryName(input.industryHint, industryNames)
  const industry =
    companyIndustry ||
    matchIndustryName(parsed.industry, industryNames) ||
    (parsed.industries || [])
      .map(name => matchIndustryName(name, industryNames))
      .find(Boolean) ||
    hintedIndustry ||
    null

  const hintFunction = isGenericTaxonomyHint(input.jobFunctionHint)
    ? null
    : matchJobFunctionName(input.jobFunctionHint, jobFunctionNames)
  const aiOrFallbackFunction =
    matchJobFunctionName(parsed.job_function, jobFunctionNames) ||
    (parsed.job_functions || [])
      .map(name => matchJobFunctionName(name, jobFunctionNames))
      .find(Boolean) ||
    null
  // Prefer title keywords over raw ATS department dumps (e.g. "City Management"
  // must not beat "Field Service Engineer" → Technical Support & Field Service).
  // Keep AI results when they disagree with the department hint.
  const titleFunction = inferJobFunctionFromTitle(input.title, jobFunctionNames, null)
  const job_function =
    (aiOrFallbackFunction && aiOrFallbackFunction !== hintFunction
      ? aiOrFallbackFunction
      : null) ||
    titleFunction ||
    aiOrFallbackFunction ||
    hintFunction ||
    inferJobFunctionFromTitle(input.title, jobFunctionNames, input.tagsHint) ||
    null

  const industries = industry
    ? [industry, ...(parsed.industries || []).filter(n => n !== industry && industryNames.includes(n))].slice(0, 3)
    : null
  const job_functions = job_function
    ? [
        job_function,
        ...(parsed.job_functions || []).filter(n => n !== job_function && jobFunctionNames.includes(n)),
      ].slice(0, 3)
    : null

  // Prefer skill tags from the full manual parse; fall back to heuristic chips
  const tags = limitTags(
    parsed.tags ||
      buildTags({
        title: input.title,
        tagsHint: input.tagsHint,
        industry,
        jobFunction: job_function,
      }),
    5
  )

  // Seed employment / location types from ATS hints when AI omitted them
  const employment_types =
    parsed.employment_types ||
    sanitizeEmploymentTypes(null, input.employmentType)
  const job_location_types =
    parsed.job_location_types ||
    sanitizeLocationTypes(null, input.workplace)

  return {
    ...parsed,
    industry,
    industries,
    job_function,
    job_functions,
    tags,
    employment_types,
    job_location_types,
  }
}
