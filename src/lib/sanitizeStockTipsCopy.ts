/**
 * Strip overused AI tip boilerplate from additional_info HTML.
 *
 * Prompt bans alone are not enough — models keep emitting:
 * - "How to Actually Win This [Title] Interview"
 * - "Here's how to stand out from the crowd."
 *
 * This runs deterministically on save and display so those patterns cannot ship.
 */

const STOCK_H3_RE =
  /<h3>\s*((?:How to\s+(?:Actually\s+)?(?:Win|Land|Get|Ace|Nail)\s+This\b[^<]*?\bInterview)|(?:How to\s+Actually\s+(?:Win|Land)\s+This\b[^<]*))<\/h3>/gi

const STOCK_INTRO_CLOSER_RES = [
  /\s*Here'?s how to stand out(?:\s+from the crowd)?\.?/gi,
  /\s*Here is how to stand out(?:\s+from the crowd)?\.?/gi,
  /\s*Follow these tips to stand out(?:\s+from the crowd)?\.?/gi,
  /\s*Use these tips to (?:stand out|beat the competition)\.?/gi,
  /\s*These tips will help you stand out(?:\s+from the crowd)?\.?/gi,
  /\s*Let'?s dive in\.?/gi,
]

function plainText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function cleanRoleLabel(raw: string | null | undefined): string {
  if (!raw?.trim()) return 'This Role'
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b(job|vacancy|position|opening)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'This Role'
}

function extractRoleFromStockHeading(headingText: string): string | null {
  const match = headingText.match(
    /How to\s+(?:Actually\s+)?(?:Win|Land|Get|Ace|Nail)\s+This\s+(.+?)\s+Interview/i
  )
  if (match?.[1]) return cleanRoleLabel(match[1])
  const loose = headingText.match(
    /How to\s+Actually\s+(?:Win|Land)\s+This\s+(.+)$/i
  )
  return loose?.[1] ? cleanRoleLabel(loose[1]) : null
}

function hashSeed(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0
  }
  return h
}

function replacementHeading(role: string, seed: string): string {
  const r = cleanRoleLabel(role)
  const options = [
    `${r}: Proof That Survives A Fast CV Scan`,
    `What ${r} Hiring Managers Quietly Filter For`,
    `Build A ${r} Application That Does Not Sound Copied`,
    `${r} Prep That Matches How The Work Actually Runs`,
    `Signals That Make A ${r} Candidate Look Credible`,
    `Before You Hit Apply On This ${r} Post`,
    `Show The ${r} Craft, Not Just Soft Claims`,
    `${r} Applications That Clear The First Screen`,
  ]
  return options[hashSeed(seed + r) % options.length]
}

function stripStockIntroClosers(html: string): string {
  let out = html
  for (const re of STOCK_INTRO_CLOSER_RES) {
    out = out.replace(re, '')
  }
  // Clean doubled spaces / empty trailing space before </p>
  out = out
    .replace(/ +\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+<\/p>/gi, '</p>')
  return out
}

function rewriteStockHeadings(
  html: string,
  jobTitle?: string | null
): string {
  return html.replace(STOCK_H3_RE, (_full, inner: string) => {
    const fromHeading = extractRoleFromStockHeading(plainText(String(inner)))
    const role = fromHeading || cleanRoleLabel(jobTitle)
    const next = replacementHeading(role, html.slice(0, 120) + role)
    return `<h3>${next}</h3>`
  })
}

/** True when HTML still contains known stock tip boilerplate. */
export function hasStockTipBoilerplate(html: string | null | undefined): boolean {
  if (!html?.trim()) return false
  STOCK_H3_RE.lastIndex = 0
  if (STOCK_H3_RE.test(html)) return true
  return STOCK_INTRO_CLOSER_RES.some((re) => {
    re.lastIndex = 0
    return re.test(html)
  })
}

/**
 * Rewrite stock tip headings and strip stock intro closers.
 * Safe to run repeatedly (idempotent for already-clean HTML).
 */
export function sanitizeStockTipsCopy(
  additionalInfo: string | null | undefined,
  jobTitle?: string | null
): string | null {
  if (!additionalInfo?.trim()) return additionalInfo ?? null
  let html = additionalInfo
  html = rewriteStockHeadings(html, jobTitle)
  html = stripStockIntroClosers(html)
  return html.trim() || null
}
