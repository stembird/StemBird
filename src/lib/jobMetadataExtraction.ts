/**
 * AI-powered job metadata extraction.
 * Uses DeepSeek → Gemini via callAI (same stack as the rest of CareerSasa).
 *
 * Sends the complete job text (description + requirements + benefits)
 * and extracts structured fields that are not available directly from the source API.
 */

import { callAI, hasAIConfigured } from './aiProviders'

export interface ExtractedJobMetadata {
  deadline: string | null           // YYYY-MM-DD format, e.g. "2026-06-16"
  education_level: string | null    // e.g. "Bachelor's", "Master's", "Diploma", "PhD"
  minimum_experience: number | null // integer years, e.g. 5
  experience_level: string | null   // "Entry", "Mid", "Senior", "Executive"
  industry: string | null           // e.g. "Financial Services", "Healthcare", "NGO"
  salary_min: number | null         // numeric, only if explicitly stated
  salary_max: number | null         // numeric, only if explicitly stated
  salary_currency: string | null    // e.g. "KES", "USD"
  salary_period: string | null      // "MONTH", "YEAR", "DAY"
}

const EXTRACTION_PROMPT = `You are a precise job posting data extractor. Read the job posting text carefully and extract the following fields.

CRITICAL RULES:
1. Only extract information that is EXPLICITLY stated in the text. Do NOT infer or guess.
2. For deadline/closing date: search the ENTIRE text for phrases like "DEADLINE:", "closing date", "apply by", "applications close", "last date". Extract the EXACT date mentioned.
3. For dates: return in YYYY-MM-DD format. If the year is not mentioned but context makes it clear (e.g. near future), infer from the posting context.
4. For education: return exactly one of: "Diploma", "Bachelor's", "Master's", "PhD", "Certificate", or null if not specified.
5. For experience years: return the MINIMUM years mentioned (e.g. "5-7 years" → 5).
6. For experience level: return one of: "Entry", "Mid", "Senior", "Executive", or null.
7. For salary: only return values if a specific number is stated. Do NOT guess.
8. Return ONLY valid JSON, no markdown, no explanation.

Return this exact JSON structure:
{
  "deadline": "YYYY-MM-DD or null",
  "education_level": "Diploma|Bachelor's|Master's|PhD|Certificate|null",
  "minimum_experience": number_or_null,
  "experience_level": "Entry|Mid|Senior|Executive|null",
  "industry": "string or null",
  "salary_min": number_or_null,
  "salary_max": number_or_null,
  "salary_currency": "KES|USD|EUR|GBP|null",
  "salary_period": "MONTH|YEAR|DAY|HOUR|null"
}`

/**
 * Extract job metadata from the full job text.
 * Falls back gracefully — if AI fails for any reason, returns all nulls
 * so the job still gets published without blocking.
 */
export async function extractJobMetadata(
  fullJobText: string
): Promise<ExtractedJobMetadata> {
  const fallback: ExtractedJobMetadata = {
    deadline: null,
    education_level: null,
    minimum_experience: null,
    experience_level: null,
    industry: null,
    salary_min: null,
    salary_max: null,
    salary_currency: null,
    salary_period: null,
  }

  if (!hasAIConfigured()) return fallback

  // Strip HTML tags from the text before sending — cleaner input = better output
  const plainText = fullJobText
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    // Limit to 6000 chars — enough context, avoids hitting token limits
    .slice(0, 6000)

  try {
    const result = await callAI(`JOB POSTING TEXT:\n${plainText}`, {
      systemPrompt: EXTRACTION_PROMPT,
      json: true,
      temperature: 0,
      maxTokens: 512,
    })
    return (result.parsed || fallback) as ExtractedJobMetadata
  } catch (err) {
    console.warn(
      '[jobMetadata] AI extraction failed, using fallback nulls:',
      err instanceof Error ? err.message : err
    )
    return fallback
  }
}

/**
 * Map education level string to careersasa's education_levels table ID.
 * Returns null if no match — job will be published without education filter.
 */
export function mapEducationLevel(
  level: string | null,
  educationLevels: Array<{ id: number; name: string }>
): number | null {
  if (!level) return null

  const normalize = (s: string) => s.toLowerCase().replace(/['’]/g, "'").trim()
  const normalized = normalize(level)

  // Prefer more specific matches (Master's before bare "Degree")
  const ranked = [...educationLevels].sort(
    (a, b) => normalize(b.name).length - normalize(a.name).length
  )

  const exact = ranked.find(e => normalize(e.name) === normalized)
  if (exact) return exact.id

  const partial = ranked.find(e => {
    const name = normalize(e.name)
    return name.includes(normalized) || normalized.includes(name.split('(')[0].trim())
  })
  if (partial) return partial.id

  // Keyword fallbacks
  if (normalized.includes('phd') || normalized.includes('doctorate')) {
    return ranked.find(e => /phd|doctorate/i.test(e.name))?.id ?? null
  }
  if (normalized.includes('master')) {
    return ranked.find(e => /master/i.test(e.name))?.id ?? null
  }
  if (normalized.includes('bachelor')) {
    return ranked.find(e => /bachelor/i.test(e.name))?.id ?? null
  }
  if (normalized.includes('diploma')) {
    return ranked.find(e => /^diploma$/i.test(normalize(e.name)))?.id ?? null
  }
  if (normalized.includes('kcse')) {
    return ranked.find(e => /kcse/i.test(e.name))?.id ?? null
  }

  return null
}
