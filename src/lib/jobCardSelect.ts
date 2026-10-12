import { isMissingListingKindColumnError } from "./listingKind"

/**
 * Card-sized job projections — never SELECT * for lists/related/homepage.
 * Job detail pages keep a full-row select.
 */

export const JOB_CARD_COLUMNS = [
  "id",
  "title",
  "company",
  "location",
  "company_id",
  "industry",
  "job_location_type",
  "employment_type",
  "job_location_city",
  "job_location_county",
  "job_location_country",
  "salary",
  "salary_min",
  "salary_max",
  "salary_currency",
  "salary_period",
  "salary_is_estimated",
  "salary_visibility",
  "experience_level",
  "date_posted",
  "valid_through",
  "created_at",
  "application_url",
  "apply_email",
  "apply_link",
  "job_function",
  "job_slug",
  "is_featured",
  "is_promoted",
  "promotion_tier",
] as const

const COMPANY_EMBED = "companies ( id, name, logo, website )"

/** Prefer the generated excerpt column (tiny). */
export const JOB_CARD_SELECT = `${JOB_CARD_COLUMNS.join(", ")}, description_excerpt, ${COMPANY_EMBED}`

/** Fallback before the description_excerpt migration is applied. */
export const JOB_CARD_SELECT_FALLBACK = `${JOB_CARD_COLUMNS.join(", ")}, description, ${COMPANY_EMBED}`

export const SCHOLARSHIP_CARD_EXTRA =
  "listing_kind, scholarship_level, scholarship_coverage, field_of_study, area_of_study"

export const SCHOLARSHIP_CARD_SELECT = `${JOB_CARD_SELECT}, ${SCHOLARSHIP_CARD_EXTRA}`
export const SCHOLARSHIP_CARD_SELECT_FALLBACK = `${JOB_CARD_SELECT_FALLBACK}, ${SCHOLARSHIP_CARD_EXTRA}`

export type JobCardCompany = {
  id?: string | null
  name?: string | null
  logo?: string | null
  website?: string | null
} | null

export type JobCardRow = {
  id: string
  title: string
  company: string
  location: string | null
  company_id?: string | null
  industry?: string | null
  job_location_type?: string | null
  employment_type?: string | null
  job_location_city?: string | null
  job_location_county?: string | null
  job_location_country?: string | null
  salary?: string | null
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string | null
  salary_period?: string | null
  salary_is_estimated?: boolean | null
  salary_visibility?: string | null
  experience_level?: string | null
  date_posted?: string | null
  valid_through?: string | null
  created_at?: string | null
  application_url?: string | null
  apply_email?: string | null
  apply_link?: string | null
  job_function?: string | null
  job_slug?: string | null
  is_featured?: boolean | null
  is_promoted?: boolean | null
  promotion_tier?: string | null
  listing_kind?: string | null
  scholarship_level?: string | null
  scholarship_coverage?: string | null
  field_of_study?: string | null
  area_of_study?: string | null
  description_excerpt?: string | null
  description?: string | null
  companies?: JobCardCompany | JobCardCompany[]
}

export function jobCardCompany(job: JobCardRow): JobCardCompany {
  const rel = job.companies
  return Array.isArray(rel) ? rel[0] ?? null : rel ?? null
}

/** Teaser text for JobCard (2–3 line clamp). Never needs full HTML. */
export function jobCardDescription(job: JobCardRow): string {
  const excerpt = job.description_excerpt?.trim()
  if (excerpt) return excerpt
  const raw = job.description
  if (!raw) return ""
  return raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400)
}

function isMissingExcerptColumn(message: string): boolean {
  return /description_excerpt/i.test(message)
}

type QueryResult<T> = { data: T | null; error: { message: string } | null }

/**
 * Run a jobs card query, retrying without description_excerpt if the
 * generated column has not been migrated yet.
 */
export async function queryJobCards<T>(
  run: (select: string) => PromiseLike<QueryResult<T>>
): Promise<QueryResult<T>> {
  const first = await run(JOB_CARD_SELECT)
  if (!first.error) return first
  if (isMissingExcerptColumn(first.error.message)) {
    return run(JOB_CARD_SELECT_FALLBACK)
  }
  return first
}

/** Card query for /scholarships — extra labelled-fact columns. */
export async function queryScholarshipCards<T>(
  run: (select: string) => PromiseLike<QueryResult<T>>
): Promise<QueryResult<T>> {
  const first = await run(SCHOLARSHIP_CARD_SELECT)
  if (!first.error) return first
  if (isMissingExcerptColumn(first.error.message)) {
    const fallback = await run(SCHOLARSHIP_CARD_SELECT_FALLBACK)
    if (!fallback.error) return fallback
    if (isMissingListingKindColumnError(fallback.error)) {
      return queryJobCards(run)
    }
    return fallback
  }
  if (isMissingListingKindColumnError(first.error)) {
    return queryJobCards(run)
  }
  return first
}
