/**
 * JobPosting JSON-LD value mappers.
 *
 * Google's JobPosting parser is strict about a few fields:
 *  - jobLocationType only accepts "TELECOMMUTE" (100% remote only)
 *  - experienceRequirements prefers OccupationalExperienceRequirements.monthsOfExperience
 *  - educationRequirements prefers EducationalOccupationalCredential.credentialCategory
 *  - addressCountry should be an ISO 3166-1 alpha-2 code
 *
 * Recommended GSC fields (streetAddress, postalCode, addressLocality,
 * addressRegion, validThrough, employmentType, baseSalary.maxValue) are filled
 * from real job/place data or CareerSasa product defaults (30-day listing
 * window, FULL_TIME). baseSalary uses the same numbers shown on the page
 * (employer pay or Kenyan market estimate). Employer-hidden stated pay is omitted.
 */

import type { Database } from '@/integrations/supabase/types'
import { resolveCountyName } from './counties'
import { resolveJobSalaryValues } from './kenyanSalaryEstimate'
import {
  detectKenyaPlaceInText,
  isKenyaCountryToken,
  kenyaPostalCode,
  lookupKenyaPlace,
} from './kenyaJobLocation'

export type JobForSchema = Database['public']['Tables']['jobs']['Row'] & {
  companies?: Database['public']['Tables']['companies']['Row'] | null
  salary_is_estimated?: boolean | null
}

export const GOOGLE_EMPLOYMENT_TYPES = new Set([
  'FULL_TIME',
  'PART_TIME',
  'CONTRACTOR',
  'TEMPORARY',
  'INTERN',
  'VOLUNTEER',
  'PER_DIEM',
  'OTHER',
])

const GOOGLE_SALARY_PERIODS = new Set(['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'])

const ISO_COUNTRY: Record<string, string> = {
  kenya: 'KE',
  'united states': 'US',
  usa: 'US',
  america: 'US',
  'united kingdom': 'GB',
  uk: 'GB',
  england: 'GB',
  'great britain': 'GB',
  'united arab emirates': 'AE',
  uae: 'AE',
  'south africa': 'ZA',
  tanzania: 'TZ',
  uganda: 'UG',
  rwanda: 'RW',
  burundi: 'BI',
  nigeria: 'NG',
  ghana: 'GH',
  ethiopia: 'ET',
  'south sudan': 'SS',
  sudan: 'SD',
  somalia: 'SO',
  'democratic republic of congo': 'CD',
  congo: 'CD',
  egypt: 'EG',
  india: 'IN',
  china: 'CN',
  germany: 'DE',
  france: 'FR',
  canada: 'CA',
  australia: 'AU',
  ireland: 'IE',
  netherlands: 'NL',
  sweden: 'SE',
  switzerland: 'CH',
  qatar: 'QA',
  'saudi arabia': 'SA',
  oman: 'OM',
  bahrain: 'BH',
  kuwait: 'KW',
  botswana: 'BW',
  zambia: 'ZM',
  zimbabwe: 'ZW',
  malawi: 'MW',
  mozambique: 'MZ',
  mauritius: 'MU',
  madagascar: 'MG',
}

/** Normalize a country value to an ISO 3166-1 alpha-2 code. */
export function isoCountryCode(value?: string | null): string | undefined {
  if (!value) return undefined
  const key = value.trim().toLowerCase()
  if (ISO_COUNTRY[key]) return ISO_COUNTRY[key]
  if (/^[a-z]{2}$/i.test(key)) return value.trim().toUpperCase()
  return undefined
}

const REMOTE_LOCATION_TOKENS =
  /\b(remote|virtual|work from home|work-from-home|wfh|online|anywhere|nationwide|hybrid)\b/i

const STREET_HINTS =
  /\b(road|rd\.?|street|st\.|avenue|ave\.?|lane|drive|dr\.|close|place|way|boulevard|blvd|highway|hwy|building|tower|plaza|house|office|floor|block|plot|suite|wing|park|centre|center|mall|junction|estate|off|along|behind|near|opposite)\b/i

const JUNK_PLACE =
  /^(n\/?a|none|null|undefined|tbd|various|multiple|anywhere|worldwide|international|africa|east africa|kenya only)$/i

function splitLocationParts(location: string): string[] {
  return location
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function isCountryToken(value: string): boolean {
  const key = value.trim().toLowerCase().replace(/\.$/, '')
  return ISO_COUNTRY[key] !== undefined || isKenyaCountryToken(value)
}

function looksLikeStreet(value: string): boolean {
  return /\d/.test(value) || STREET_HINTS.test(value)
}

function isRemoteLocation(value: string): boolean {
  return REMOTE_LOCATION_TOKENS.test(value)
}

function usablePlace(value?: string | null): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  if (isCountryToken(trimmed) || isRemoteLocation(trimmed) || JUNK_PLACE.test(trimmed)) {
    return undefined
  }
  return trimmed
}

export type PostalAddress = {
  '@type': 'PostalAddress'
  streetAddress?: string
  addressLocality?: string
  addressRegion?: string
  postalCode?: string
  addressCountry: string
}

export type JobPlace = {
  '@type': 'Place'
  address: PostalAddress
}

function buildPostalAddress(args: {
  country: string
  city?: string | null
  county?: string | null
  town?: string | null
  rawLocation?: string | null
  extraText?: string | null
}): PostalAddress {
  const rawLocation = (args.rawLocation || '').trim()
  const parts = splitLocationParts(rawLocation).filter(
    (p) => !isRemoteLocation(p) && !isCountryToken(p)
  )
  const nonStreetParts = parts.filter((p) => !looksLikeStreet(p))

  const detected =
    detectKenyaPlaceInText(args.town) ||
    detectKenyaPlaceInText(args.city) ||
    detectKenyaPlaceInText(args.county) ||
    detectKenyaPlaceInText(rawLocation) ||
    detectKenyaPlaceInText(args.extraText)

  const city =
    usablePlace(args.city) ||
    usablePlace(detected?.locality) ||
    usablePlace(nonStreetParts[nonStreetParts.length - 1])

  const county =
    resolveCountyName(args.county) ||
    resolveCountyName(city) ||
    detected?.county ||
    undefined

  const town = usablePlace(args.town)
  const locality = city || town || county || undefined
  const region = county || lookupKenyaPlace(locality)?.county || undefined

  const streetFromRaw = looksLikeStreet(rawLocation)
    ? parts.filter((p) => looksLikeStreet(p)).join(', ') || rawLocation
    : undefined
  // GSC "Missing field streetAddress": emit a workplace label that matches the
  // page. Prefer a real street/town/city/county; Kenya-wide listings show
  // "Kenya" on the page, so that is the fallback — never a fabricated HQ.
  const streetAddress =
    streetFromRaw ||
    (town && town.toLowerCase() !== locality?.toLowerCase() ? town : undefined) ||
    locality ||
    region ||
    (args.country === 'KE' ? 'Kenya' : undefined)

  const postalCode = kenyaPostalCode({
    town: town || streetFromRaw,
    city: locality,
    county: region,
  })

  const address: PostalAddress = {
    '@type': 'PostalAddress',
    addressCountry: args.country,
  }
  if (streetAddress) address.streetAddress = streetAddress
  if (locality) address.addressLocality = locality
  if (region) address.addressRegion = region
  if (postalCode) address.postalCode = postalCode
  return address
}

function kenyanEmployerPlaceText(job: JobForSchema): string {
  const companyLocation = job.companies?.location?.trim()
  const companyLocationIsKenyan =
    Boolean(companyLocation) &&
    (Boolean(detectKenyaPlaceInText(companyLocation)) ||
      isKenyaCountryToken(companyLocation))

  return [
    job.company,
    job.companies?.name,
    companyLocationIsKenyan ? companyLocation : undefined,
    job.title,
  ]
    .filter(Boolean)
    .join(' ')
}

function additionalLocationsOf(
  job: JobForSchema
): Array<{ county?: string; city?: string }> {
  const raw = job.additional_locations
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as { county?: unknown; city?: unknown }
      const county = typeof row.county === 'string' ? row.county : ''
      const city = typeof row.city === 'string' ? row.city : ''
      if (!county && !city) return null
      return { county, city }
    })
    .filter((row): row is { county: string; city: string } => Boolean(row))
}

/**
 * Build jobLocation as Place → PostalAddress.
 * 100% remote roles omit jobLocation (TELECOMMUTE + applicantLocationRequirements).
 * Recommended GSC address fields are filled from city/county/town and Kenyan
 * GPO codes when the job is known to be in that place.
 */
export function resolveJobAddress(job: JobForSchema): JobPlace | JobPlace[] | undefined {
  const country = isoCountryCode(job.job_location_country) || 'KE'

  if (job.job_location_type === 'REMOTE') {
    return undefined
  }

  const primary = buildPostalAddress({
    country,
    city: job.job_location_city,
    county: job.job_location_county,
    town: job.location_town,
    rawLocation: job.location,
    extraText: kenyanEmployerPlaceText(job),
  })

  const extras = additionalLocationsOf(job)
    .map((loc) =>
      buildPostalAddress({
        country,
        city: loc.city,
        county: loc.county,
      })
    )
    .filter(
      (addr) =>
        addr.addressLocality !== primary.addressLocality ||
        addr.addressRegion !== primary.addressRegion
    )

  const places: JobPlace[] = [
    { '@type': 'Place', address: primary },
    ...extras.map((address) => ({ '@type': 'Place' as const, address })),
  ]

  return places.length === 1 ? places[0] : places
}

/** Map DB experience data to Google's expected structured form. */
export function resolveExperienceRequirements(job: JobForSchema) {
  // Only emit when we have a genuine numeric experience requirement parsed from
  // the job. Inferring a number from an experience_level label (Mid→24, Senior→48)
  // manufactures a requirement Google says not to guess at — omit instead.
  const minYears = job.minimum_experience
  if (minYears != null && Number.isFinite(minYears) && minYears > 0) {
    const months = Math.round(Math.min(minYears, 50) * 12)
    return {
      '@type': 'OccupationalExperienceRequirements',
      monthsOfExperience: months,
    }
  }
  return undefined
}

const CREDENTIAL_HINTS: Array<{ category: string; pattern: RegExp }> = [
  {
    category: 'postgraduate degree',
    pattern: /\b(masters?|postgraduate|mba|phd|doctorate)\b/i,
  },
  {
    category: 'bachelor degree',
    pattern:
      /\b(bachelor|degree|bsc|b\.?\s?sc|ba\b|b\.?\s?a\b|bcom|b\.?\s?com|llb|beng|b\.?\s?eng|hnd)\b/i,
  },
  { category: 'associate degree', pattern: /\bdiploma\b/i },
  {
    category: 'high school',
    pattern: /\b(kcse|high school|secondary|o.level|form four|school certificate)\b/i,
  },
  {
    category: 'professional certificate',
    pattern: /\b(certificate|certification|trade test|craft certificate)\b/i,
  },
]

const EDUCATION_ORDER = [
  'postgraduate degree',
  'bachelor degree',
  'associate degree',
  'professional certificate',
  'high school',
]

const ADDED_ADVANTAGE = /\b(added advantage|preferred|an advantage|preferable|desirable|plus)\b/i

/**
 * Map free-text education requirements to Google's credentialCategory enum.
 * Emits the MINIMUM level actually required (Google wants the floor, e.g.
 * "Degree or Diploma" → associate degree; "BSc ... MSc an added advantage" → bachelor).
 * Returns undefined when nothing recognizable is present (property omitted).
 */
export function resolveEducationRequirements(text?: string | null) {
  if (!text || !text.trim()) return undefined
  const t = text.trim()

  if (/\b(no education|no formal|no specific education)\b/i.test(t)) {
    return { '@type': 'EducationalOccupationalCredential', credentialCategory: 'no requirements' }
  }

  const matched = new Set<string>()
  for (const hint of CREDENTIAL_HINTS) {
    if (hint.pattern.test(t)) matched.add(hint.category)
  }
  if (matched.size === 0) return undefined

  let present = EDUCATION_ORDER.filter((c) => matched.has(c))

  // A Master's mentioned as an "added advantage" is not the minimum requirement.
  if (present.includes('postgraduate degree') && ADDED_ADVANTAGE.test(t)) {
    present = present.filter((c) => c !== 'postgraduate degree')
  }
  // "Certificate / certification / trade test" alongside a degree or diploma is
  // usually a technical add-on ("Certification in Fibre technology"), not the
  // education bar — drop it unless it's the only credential mentioned.
  if (
    present.includes('professional certificate') &&
    present.some((c) => c !== 'professional certificate')
  ) {
    present = present.filter((c) => c !== 'professional certificate')
  }
  if (present.length === 0) return undefined

  // Minimum required level = the lowest-ranked credential present.
  const credentialCategory = present[present.length - 1]
  return { '@type': 'EducationalOccupationalCredential', credentialCategory }
}

/** Only 100%-remote roles may be marked TELECOMMUTE. Never emit ON_SITE/HYBRID. */
export function resolveJobLocationType(job: JobForSchema): string | undefined {
  if (job.job_location_type === 'REMOTE') return 'TELECOMMUTE'
  return undefined
}

/** Remote roles need a country of eligibility. */
export function resolveApplicantLocationRequirements(job: JobForSchema) {
  if (job.job_location_type !== 'REMOTE') return undefined
  return {
    '@type': 'Country',
    name: job.job_location_country?.trim() || 'Kenya',
  }
}

/**
 * Google's JobPosting examples use "2017-01-24" or "2017-01-24T19:33:17+00:00".
 * Normalize to that DateTime form (no milliseconds, explicit UTC offset) so
 * datePosted is always a parseable ISO 8601 value.
 */
export function toGoogleJobPostingDate(value?: string | null): string | undefined {
  if (!value?.trim()) return undefined
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString().replace(/\.\d{3}Z$/, '+00:00')
}

function addUtcDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().replace(/\.\d{3}Z$/, '+00:00')
}

/**
 * Google requires JobPosting.datePosted. Prefer the employer/board posting
 * date; fall back to created_at (when CareerSasa published the listing),
 * posted_date, then updated_at. Never invent the current time at render.
 */
export function resolveDatePosted(job: {
  date_posted?: string | null
  created_at?: string | null
  posted_date?: string | null
  updated_at?: string | null
}): string | undefined {
  return (
    toGoogleJobPostingDate(job.date_posted) ||
    toGoogleJobPostingDate(job.created_at) ||
    toGoogleJobPostingDate(job.posted_date) ||
    toGoogleJobPostingDate(job.updated_at)
  )
}

/**
 * validThrough is required by Google whenever a posting has an expiry.
 * CareerSasa listings expire 30 days after datePosted when no employer
 * deadline was supplied (same default used by scrape + JobPostingForm).
 */
export function resolveValidThrough(job: {
  valid_through?: string | null
  expires_at?: string | null
  application_deadline?: string | null
  date_posted?: string | null
  created_at?: string | null
  posted_date?: string | null
  updated_at?: string | null
}): string | undefined {
  const explicit =
    toGoogleJobPostingDate(job.valid_through) ||
    toGoogleJobPostingDate(job.expires_at) ||
    toGoogleJobPostingDate(job.application_deadline)
  if (explicit) return explicit

  const posted = resolveDatePosted(job)
  if (!posted) return undefined
  return addUtcDays(posted, 30)
}

/**
 * Google employmentType values. Prefer stored types, then infer from title /
 * description, then the product default FULL_TIME (scrapers and the post-job
 * form already use this when the employer does not specify).
 */
export function resolveEmploymentTypes(job: {
  employment_type?: string | null
  employment_types?: string[] | null
  title?: string | null
}): string | string[] | undefined {
  const fromDb: string[] = []
  if (Array.isArray(job.employment_types)) {
    for (const value of job.employment_types) {
      if (value && GOOGLE_EMPLOYMENT_TYPES.has(value) && !fromDb.includes(value)) {
        fromDb.push(value)
      }
    }
  }
  if (
    job.employment_type &&
    GOOGLE_EMPLOYMENT_TYPES.has(job.employment_type) &&
    !fromDb.includes(job.employment_type)
  ) {
    fromDb.unshift(job.employment_type)
  }
  if (fromDb.length === 1) return fromDb[0]
  if (fromDb.length > 1) return fromDb

  // Infer from the title only — descriptions mention "contract" / "intern"
  // in unrelated contexts (employment contract, international, etc.).
  const inferred = inferEmploymentType(job.title || '')
  return inferred || 'FULL_TIME'
}

export function inferEmploymentType(text: string): string | undefined {
  if (!text.trim()) return undefined
  const t = text.toLowerCase()
  if (/\binternational\b/.test(t)) {
    // fall through; "international intern" still matches intern below
  }
  if (/\b(intern(ship)?s?|attaché|attache|industrial attachment|graduate trainee)\b/.test(t)) {
    return 'INTERN'
  }
  if (
    /\bvolunteer(ing)?\b/.test(t) &&
    !/\b(coordinator|manager|officer|lead|head|director)\b/.test(t)
  ) {
    return 'VOLUNTEER'
  }
  if (/\bpart[\s-]?time\b/.test(t)) return 'PART_TIME'
  if (/\b(contractor|consultancy|freelance|fixed[\s-]?term)\b/.test(t)) {
    return 'CONTRACTOR'
  }
  if (/\b(temporary|casual|locum)\b/.test(t)) return 'TEMPORARY'
  if (/\bper[\s-]?diem\b/.test(t)) return 'PER_DIEM'
  if (/\bfull[\s-]?time\b/.test(t)) return 'FULL_TIME'
  return undefined
}

export function resolveSalaryPeriod(value?: string | null): string {
  if (!value) return 'MONTH'
  const key = value.trim().toUpperCase()
  if (GOOGLE_SALARY_PERIODS.has(key)) return key
  if (key === 'ANNUAL' || key === 'ANNUALLY' || key === 'YEARLY') return 'YEAR'
  if (key === 'MONTHLY') return 'MONTH'
  if (key === 'WEEKLY') return 'WEEK'
  if (key === 'DAILY') return 'DAY'
  if (key === 'HOURLY') return 'HOUR'
  return 'MONTH'
}

/**
 * Same numbers as the job page. GSC "Missing field baseSalary" (426 items)
 * were listings with no employer pay: scrapers stored Hide + a market estimate
 * (or computed one at render). Those figures are now emitted so markup matches
 * the visible "Estimated Salary Range".
 *
 * Employer-stated pay with salary_visibility = Hide is still omitted.
 * Ranges use minValue + maxValue; a single bound uses QuantitativeValue.value.
 */
export function resolveBaseSalary(job: JobForSchema) {
  const resolved = resolveJobSalaryValues({
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
    salary: job.salary,
    salaryCurrency: job.salary_currency,
    salaryPeriod: job.salary_period,
    salaryIsEstimated: job.salary_is_estimated,
    salaryVisibility: job.salary_visibility,
    title: job.title,
    experienceLevel: job.experience_level,
    locationCountry: job.job_location_country || 'Kenya',
  })
  if (!resolved) return undefined

  const unitText = resolveSalaryPeriod(resolved.period)
  const value =
    resolved.min !== resolved.max
      ? {
          '@type': 'QuantitativeValue' as const,
          minValue: resolved.min,
          maxValue: resolved.max,
          unitText,
        }
      : {
          '@type': 'QuantitativeValue' as const,
          value: resolved.min,
          unitText,
        }

  return {
    '@type': 'MonetaryAmount' as const,
    currency: resolved.currency,
    value,
  }
}

/**
 * A logo is only safe to emit when it's a curated/verified company logo.
 * Favicon-CDN placeholders (gstatic, logo.dev, clearbit) are not company logos
 * and fail Google's logo guidelines, so they're omitted from markup.
 */
export function isSchemaLogoPlaceholder(url?: string | null): boolean {
  if (!url) return true
  return /gstatic\.com\/faviconV2|img\.logo\.dev|logo\.clearbit\.com|unavatar\.io|website-thumbnail/i.test(
    url
  )
}
