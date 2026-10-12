/**
 * Detect free-text that is only an experience-level label (or placeholder),
 * not actual job requirements / qualifications content.
 *
 * Board JSON-LD (e.g. BrighterMonday) often puts "Mid level" / "Senior level"
 * in the JobPosting.qualifications field — that belongs in experience_level.
 */
export function stripHtmlToText(value: unknown): string {
  if (value == null) return ''
  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

const EXPERIENCE_LABEL_ONLY =
  /^(unspecified|n\/?a|not\s+(?:specified|applicable)|none|mid(?:\s*[- ]?\s*level)?|senior(?:\s*[- ]?\s*level)?|entry(?:\s*[- ]?\s*level)?|junior(?:\s*[- ]?\s*level)?|associate(?:\s*[- ]?\s*level)?|internship|intern|managerial|executive|experienced|experience\s*level)$/i

export function isExperienceLevelOnlyText(value: unknown): boolean {
  const text = stripHtmlToText(value)
  if (!text) return false
  return EXPERIENCE_LABEL_ONLY.test(text)
}

/** True when qualifications/requirements content is missing or unusable. */
export function isMissingOrLabelOnlyQualifications(value: unknown): boolean {
  const text = stripHtmlToText(value)
  if (!text) return true
  return isExperienceLevelOnlyText(text)
}
