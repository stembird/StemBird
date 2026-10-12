/**
 * Resolve an employer's official website domain when the known-brand map misses.
 *
 * HARD RULE: never invent a domain.
 * - Known brand map = curated human list (trusted without inventing)
 * - Website hints / AI suggestions = stored only when positively LIVE
 * - Dead hints (NXDOMAIN) are flagged for clearing; unreachable is inconclusive
 *
 * Never generates logos — logos go through fetchCompanyLogoUrl() image checks.
 */

import { callAI, hasAIConfigured } from './aiProviders'
import { extractDomain, lookupBrand } from './companyLogo'
import { checkDomainLiveness, normalizeHostname } from './domainVerification'

export type DomainLookupResult = {
  domain: string | null
  source: 'known_brand' | 'website_hint' | 'ai' | 'none'
  confidence?: 'high' | 'medium' | 'low'
  /** True when a website hint was NXDOMAIN / clearly dead (safe to clear). */
  deadHint?: boolean
  /** True when returned domain was positively live-checked (known brands may be false). */
  verified?: boolean
}

const memoryCache = new Map<string, DomainLookupResult>()

const DOMAIN_LOOKUP_PROMPT = `You find the official public website domain for an employer/organization.
Return ONLY valid JSON (no markdown).

Rules:
1. Prefer the organization's primary official website (not LinkedIn, Facebook, Wikipedia, Glassdoor, or job boards).
2. Prefer country-specific domains when the org is clearly Kenyan/East African (.co.ke, .or.ke, .go.ke, .ac.ke).
3. domain must be hostname only, lowercase, no protocol, no path, no www. (e.g. "amref.org")
4. If you are not reasonably sure, return domain null.
5. Never invent a domain that does not exist. If unsure, domain MUST be null.
6. Never guess by slugifying the company name (e.g. do NOT turn "Acme Kenya Ltd" into "acmekenya.co.ke").

JSON shape:
{"domain":"example.com"|null,"confidence":"high"|"medium"|"low","reason":"short"}`

function cacheKey(name: string, hint?: string | null): string {
  return `${name.trim().toLowerCase().replace(/\s+/g, ' ')}|${(hint || '').trim().toLowerCase()}`
}

function sanitizeDomain(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  const value = normalizeHostname(raw)
  if (!value) return null
  const blocked = [
    'linkedin.com',
    'facebook.com',
    'twitter.com',
    'x.com',
    'instagram.com',
    'wikipedia.org',
    'glassdoor.com',
    'indeed.com',
    'brightermonday.co.ke',
    'myjobmag.co.ke',
    'fuzu.com',
    'smartrecruiters.com',
    'workable.com',
    'greenhouse.io',
    'lever.co',
  ]
  if (blocked.some(b => value === b || value.endsWith(`.${b}`))) return null
  return value
}

/**
 * Resolve domain without AI and WITHOUT live verification.
 * Prefer known brands over raw website hints (hints are often wrong/dead).
 */
export function resolveDomainLocally(
  companyName: string,
  websiteHint?: string | null
): DomainLookupResult {
  const brand = lookupBrand(companyName)
  if (brand?.domain) return { domain: brand.domain, source: 'known_brand' }

  const fromHint = extractDomain(websiteHint || null)
  if (fromHint) return { domain: fromHint, source: 'website_hint' }

  return { domain: null, source: 'none' }
}

/**
 * Resolve a domain we are willing to persist.
 *
 * Priority:
 * 1. Known brand map (curated — not invented)
 * 2. Website hint — only if positively alive
 * 3. AI suggestion — only if medium/high confidence AND positively alive
 * 4. none (leave empty rather than invent)
 */
export async function resolveCompanyDomainSmart(
  companyName: string,
  options?: { websiteHint?: string | null; allowAI?: boolean }
): Promise<DomainLookupResult> {
  const name = companyName?.trim()
  if (!name) return { domain: null, source: 'none' }

  const hint = options?.websiteHint ?? null
  const key = cacheKey(name, hint)
  const cached = memoryCache.get(key)
  if (cached) return cached

  const hintDomain = sanitizeDomain(extractDomain(hint) || hint)
  let deadHint = false
  let hintLiveness: Awaited<ReturnType<typeof checkDomainLiveness>> | null = null

  if (hintDomain) {
    hintLiveness = await checkDomainLiveness(hintDomain)
    if (hintLiveness === 'dead') deadHint = true
  }

  // 1. Known brand first — curated list, never invent by slugifying names
  const brand = lookupBrand(name)
  if (brand?.domain) {
    const result: DomainLookupResult = {
      domain: brand.domain,
      source: 'known_brand',
      confidence: 'high',
      verified: false,
      deadHint,
    }
    memoryCache.set(key, result)
    return result
  }

  // 2. Website hint — only when positively alive (not unreachable)
  if (hintDomain && hintLiveness === 'alive') {
    const result: DomainLookupResult = {
      domain: hintDomain,
      source: 'website_hint',
      confidence: 'medium',
      verified: true,
    }
    memoryCache.set(key, result)
    return result
  }

  // 3. AI — suggest then prove LIVE. Never accept unverified AI guesses.
  const allowAI = options?.allowAI !== false
  if (allowAI && hasAIConfigured()) {
    try {
      const result = await callAI(
        `COMPANY / ORGANIZATION NAME: ${name}\nCOUNTRY CONTEXT: Kenya / East Africa (prefer local official site when applicable)\nIf unsure, return {"domain":null,"confidence":"low","reason":"uncertain"}`,
        {
          systemPrompt: DOMAIN_LOOKUP_PROMPT,
          json: true,
          temperature: 0,
          maxTokens: 200,
        }
      )

      const parsed = (result.parsed || {}) as {
        domain?: string | null
        confidence?: 'high' | 'medium' | 'low'
      }
      const domain = sanitizeDomain(parsed.domain)
      const confidence = parsed.confidence || 'low'

      if (domain && (confidence === 'high' || confidence === 'medium')) {
        const live = await checkDomainLiveness(domain)
        if (live === 'alive') {
          const aiResult: DomainLookupResult = {
            domain,
            source: 'ai',
            confidence,
            verified: true,
            deadHint,
          }
          memoryCache.set(key, aiResult)
          return aiResult
        }
        console.warn(
          '[companyDomainLookup] Rejected AI domain (not live):',
          name,
          domain,
          live
        )
      }
    } catch (err) {
      console.warn(
        '[companyDomainLookup] AI domain lookup failed for',
        name,
        err instanceof Error ? err.message : err
      )
    }
  }

  const none: DomainLookupResult = {
    domain: null,
    source: 'none',
    deadHint,
    verified: false,
  }
  memoryCache.set(key, none)
  return none
}
