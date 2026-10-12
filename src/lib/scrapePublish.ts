/**
 * Shared logic to publish a scraped job into Supabase.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { NormalizedJob, generateContentHash, datePostedForInsert } from './scraper'
import { mapEducationLevel } from './jobMetadataExtraction'
import { limitTags } from './jobParseNormalization'
import {
  expiresAtFromValidThrough,
  isGenericApplicationUrl,
  normalizeJobUrl,
  resolveScrapedDeadline,
} from './scraperDeadline'
import {
  inferJobFunctionFromTitle,
  parseScrapedJobContent,
  ParsedScrapedJobContent,
  ScrapedJobInput,
} from './scraperJobParsing'
import { ensureCompanyForJob } from './ensureCompanyForJob'
import { inferCompanyIndustry } from './companyIndustryInference'
import { companyProfileToEnsureInput, type JobBoardCompanyProfile } from './jobBoardCompany'
import { sanitizeAdditionalInfoApplyCopy } from './applyInstructionsCopy'
import { requireCareerTipsHtml, hasGeneratedCareerTips } from './careerTips'
import { isMissingOrLabelOnlyQualifications } from './experienceLevelLabel'
import { applyKenyanSalaryEstimateIfMissing, isMissingSalaryEstimatedColumnError, withoutSalaryEstimatedFlag } from './kenyanSalaryEstimate'
import { revalidatePublicJobSurfaces } from './revalidatePublic'
import {
  isMissingListingKindColumnError,
  scholarshipPublishFields,
  withoutScholarshipColumns,
} from './listingKind'

export interface PublishScrapedJobParams {
  supabase: SupabaseClient
  sourceId: string
  jobUrl: string
  normalized: NormalizedJob
  parseInput: ScrapedJobInput
  rawData: unknown
  scraperUserId: string
  dedupCompany: string
  /** @deprecated Prefer AI enrichment; only skip when explicitly necessary */
  skipAi?: boolean
}

export interface PublishScrapedJobResult {
  status: 'published' | 'duplicate' | 'expired' | 'error'
  job_id?: string
  title?: string
  error?: string
  valid_through?: string
}

const EXPERIENCE_LEVELS = new Set(['Entry', 'Mid', 'Senior', 'Managerial', 'Internship'])
const LOCATION_TYPES = new Set(['ON_SITE', 'REMOTE', 'HYBRID'])

function sanitizeExperienceLevel(
  value: unknown
): 'Entry' | 'Mid' | 'Senior' | 'Managerial' | 'Internship' {
  if (typeof value === 'string' && EXPERIENCE_LEVELS.has(value)) {
    return value as 'Entry' | 'Mid' | 'Senior' | 'Managerial' | 'Internship'
  }
  const raw = String(value || '').trim().toLowerCase()
  if (!raw || raw.includes('not applicable') || raw === 'n/a' || raw === 'none') return 'Mid'
  if (raw.includes('intern')) return 'Internship'
  if (raw.includes('entry') || raw.includes('junior') || raw.includes('graduate')) return 'Entry'
  if (raw.includes('senior') || raw.includes('lead') || raw.includes('principal')) return 'Senior'
  if (
    raw.includes('manager') ||
    raw.includes('director') ||
    raw.includes('executive') ||
    raw.includes('head')
  ) {
    return 'Managerial'
  }
  if (raw.includes('associate') || raw.includes('mid') || raw.includes('intermediate')) return 'Mid'
  return 'Mid'
}

function sanitizeJobLocationType(value: unknown): 'ON_SITE' | 'REMOTE' | 'HYBRID' {
  const raw = String(value || '').trim().toUpperCase()
  if (raw === 'TELECOMMUTE' || raw === 'REMOTE') return 'REMOTE'
  if (raw === 'HYBRID') return 'HYBRID'
  if (LOCATION_TYPES.has(raw)) return raw as 'ON_SITE' | 'REMOTE' | 'HYBRID'
  return 'ON_SITE'
}

function emptyParsedFromNormalized(normalized: NormalizedJob): ParsedScrapedJobContent {
  return {
    description: normalized.description,
    responsibilities: normalized.responsibilities,
    required_qualifications: normalized.required_qualifications,
    additional_info: '',
    deadline: normalized.valid_through,
    education_level: null,
    minimum_experience: normalized.minimum_experience,
    experience_level: normalized.experience_level,
    industry: normalized.industry,
    industries: normalized.industry ? [normalized.industry] : null,
    job_function: null,
    job_functions: null,
    tags: normalized.tags || '',
    salary_min: normalized.salary_min,
    salary_max: normalized.salary_max,
    salary_currency: normalized.salary_currency,
    salary_period: normalized.salary_period,
    area_of_study: null,
    field_of_study: null,
    language_requirements: null,
    apply_email: null,
    apply_link: normalized.apply_link || null,
    employment_types: normalized.employment_type ? [normalized.employment_type] : null,
    job_location_types: normalized.job_location_type
      ? [sanitizeJobLocationType(normalized.job_location_type)]
      : null,
    job_location_country: normalized.job_location_country || 'Kenya',
    job_location_county: normalized.job_location_county || null,
    job_location_city: normalized.job_location_city || null,
    additional_locations: null,
  }
}

export async function publishScrapedJob(
  params: PublishScrapedJobParams
): Promise<PublishScrapedJobResult> {
  const {
    supabase,
    sourceId,
    jobUrl,
    normalized,
    parseInput,
    rawData,
    scraperUserId,
    dedupCompany,
    skipAi = false,
  } = params

  const contentHash = generateContentHash(
    normalized.title,
    dedupCompany,
    normalized.job_location_city || normalized.job_location_county || ''
  )
  const canonicalUrl = normalizeJobUrl(jobUrl)
  const employerApplicationUrl = normalized.application_url?.trim()
    ? normalizeJobUrl(normalized.application_url)
    : null
  // Job-board adapters leave application_url empty when email-only; don't force board URL.
  const applicationUrl =
    employerApplicationUrl ||
    (normalized.apply_email?.trim() ? null : normalizeJobUrl(jobUrl))

  const dedupeByAppUrl =
    applicationUrl && !isGenericApplicationUrl(applicationUrl) ? applicationUrl : null

  const [{ data: existingByHash }, { data: existingByUrl }, { data: existingByAppUrl }] =
    await Promise.all([
      supabase.from('scraped_job_sources').select('id').eq('content_hash', contentHash).maybeSingle(),
      supabase.from('scraped_job_sources').select('id').eq('job_url', canonicalUrl).maybeSingle(),
      dedupeByAppUrl
        ? supabase
            .from('jobs')
            .select('id')
            .eq('source', 'Scraper')
            .eq('application_url', dedupeByAppUrl)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

  if (existingByHash || existingByUrl || existingByAppUrl) {
    return { status: 'duplicate', title: normalized.title }
  }

  try {
    const [{ data: educationLevels }, { data: industries }, { data: jobFunctions }] =
      await Promise.all([
        supabase.from('education_levels').select('id, name'),
        supabase.from('industries').select('id, name'),
        supabase.from('job_functions').select('id, name'),
      ])

    const industryNames = (industries || []).map(i => i.name)
    const jobFunctionNames = (jobFunctions || []).map(j => j.name)

    const parsed = skipAi
      ? emptyParsedFromNormalized(normalized)
      : await parseScrapedJobContent(parseInput, {
          industryNames,
          jobFunctionNames,
          attachCareerTips: true,
        })

    const deadline = resolveScrapedDeadline(
      // Prefer adapter/structured deadline when present (e.g. BM "Deadline: 27th July 2026")
      normalized.valid_through || parsed.deadline || null
    )
    if (deadline.action === 'skip_expired') {
      await supabase.from('scraped_job_sources').upsert(
        {
          source_id: sourceId,
          job_url: canonicalUrl,
          content_hash: contentHash,
          job_id: null,
          status: 'skipped',
          raw_data: {
            ...(typeof rawData === 'object' && rawData ? (rawData as object) : {}),
            skip_reason: 'expired',
            expired_on: deadline.validThrough,
          },
        },
        { onConflict: 'job_url' }
      )
      return {
        status: 'expired',
        title: normalized.title,
        valid_through: deadline.validThrough,
      }
    }

    const educationLevelId = mapEducationLevel(parsed.education_level, educationLevels || [])

    const industryNamesResolved =
      (parsed.industries?.length ? parsed.industries : null) ||
      (parsed.industry ? [parsed.industry] : null) ||
      (() => {
        const inferred = inferCompanyIndustry(dedupCompany, null, industryNames)
        return inferred ? [inferred] : null
      })()
    const inferredTitleFunction = inferJobFunctionFromTitle(
      normalized.title || parseInput.title,
      jobFunctionNames,
      parseInput.tagsHint
    )
    const jobFunctionNamesResolved =
      (parsed.job_functions?.length ? parsed.job_functions : null) ||
      (parsed.job_function ? [parsed.job_function] : null) ||
      (inferredTitleFunction ? [inferredTitleFunction] : null)
    const industryName = industryNamesResolved?.[0] || null
    const jobFunctionName = jobFunctionNamesResolved?.[0] || null
    const industryRows = (industries || []).filter(i =>
      industryNamesResolved?.includes(i.name)
    )
    const jobFunctionRows = (jobFunctions || []).filter(j =>
      jobFunctionNamesResolved?.includes(j.name)
    )

    const ensured = await ensureCompanyForJob(supabase, {
      name: dedupCompany,
      userId: scraperUserId,
      ...companyProfileToEnsureInput(
        (rawData as { companyProfile?: JobBoardCompanyProfile | null } | null)?.companyProfile
      ),
    })
    const companyId = ensured.companyId

    const employmentTypes =
      parsed.employment_types?.length
        ? parsed.employment_types
        : normalized.employment_type
          ? [normalized.employment_type]
          : ['FULL_TIME']
    const jobLocationTypes =
      parsed.job_location_types?.length
        ? parsed.job_location_types
        : [sanitizeJobLocationType(normalized.job_location_type)]

    // date_posted: keep the source board's original publication date when the
    // adapter parsed one (Google requires the original employer posting date).
    // When the board date is missing, write publish time — never NULL. Spreading
    // `date_posted: null` from adapters would skip the column DEFAULT.
    const jobPayload = {
      ...normalized,
      date_posted: datePostedForInsert(normalized.date_posted),
      description: parsed.description || normalized.description,
      responsibilities: parsed.responsibilities || normalized.responsibilities || null,
      required_qualifications: (() => {
        const parsedQ = parsed.required_qualifications
        if (parsedQ && !isMissingOrLabelOnlyQualifications(parsedQ)) return parsedQ
        const normQ = normalized.required_qualifications
        if (normQ && !isMissingOrLabelOnlyQualifications(normQ)) return normQ
        return null
      })(),
      additional_info: await (async () => {
        const withTips = await requireCareerTipsHtml(
          sanitizeAdditionalInfoApplyCopy(parsed.additional_info || null, {
            apply_email: normalized.apply_email || parsed.apply_email || null,
            apply_link: normalized.apply_link?.trim() || parsed.apply_link || null,
            application_url: applicationUrl,
          }),
          {
            title: normalized.title,
            company: dedupCompany,
            description: parsed.description || normalized.description,
            responsibilities: parsed.responsibilities || normalized.responsibilities,
            qualifications:
              parsed.required_qualifications || normalized.required_qualifications,
          }
        )
        if (!hasGeneratedCareerTips(withTips)) {
          throw new Error('Career tips generation failed; will retry')
        }
        return withTips
      })(),
      company_id: companyId,
      user_id: scraperUserId,
      hiring_organization_name: dedupCompany,
      hiring_organization_logo: ensured.logo,
      hiring_organization_url: ensured.website,
      source: 'Scraper',
      direct_apply: false,
      application_url: applicationUrl,
      apply_email: normalized.apply_email || parsed.apply_email || null,
      apply_link: normalized.apply_link?.trim() || parsed.apply_link || null,
      valid_through: deadline.validThrough,
      expires_at: expiresAtFromValidThrough(deadline.validThrough),
      education_level_id: educationLevelId,
      area_of_study: parsed.area_of_study || null,
      field_of_study: parsed.field_of_study || null,
      language_requirements: parsed.language_requirements || null,
      minimum_experience: parsed.minimum_experience ?? normalized.minimum_experience,
      experience_level: sanitizeExperienceLevel(
        parsed.experience_level || normalized.experience_level
      ),
      employment_type: employmentTypes[0],
      employment_types: employmentTypes,
      job_location_type: sanitizeJobLocationType(
        jobLocationTypes[0] || normalized.job_location_type
      ),
      job_location_types: jobLocationTypes.map(sanitizeJobLocationType),
      job_location_country:
        parsed.job_location_country || normalized.job_location_country || 'Kenya',
      job_location_county:
        parsed.job_location_county || normalized.job_location_county || null,
      job_location_city:
        parsed.job_location_city || normalized.job_location_city || null,
      additional_locations: parsed.additional_locations || [],
      industry: industryName,
      industries: industryNamesResolved,
      industry_id: industryRows[0]?.id ?? null,
      industry_ids: industryRows.map(r => r.id),
      job_function: jobFunctionName,
      job_functions: jobFunctionNamesResolved,
      job_function_id: jobFunctionRows[0]?.id ?? null,
      job_function_ids: jobFunctionRows.map(r => r.id),
      tags: limitTags(parsed.tags || normalized.tags || '', 5),
      salary_min: normalized.salary_min ?? parsed.salary_min ?? null,
      salary_max: normalized.salary_max ?? parsed.salary_max ?? null,
      salary_currency: normalized.salary_currency || parsed.salary_currency || 'KES',
      salary_period: normalized.salary_period || parsed.salary_period || 'MONTH',
      ...scholarshipPublishFields({
        title: normalized.title,
        occupationalCategory:
          rawData && typeof rawData === 'object' && 'occupationalCategory' in rawData
            ? (rawData as { occupationalCategory?: string | null }).occupationalCategory
            : null,
        jobFunctionHint: parseInput.jobFunctionHint,
        tags: limitTags(parsed.tags || normalized.tags || '', 5),
        description: parsed.description || normalized.description,
        html: [
          parsed.description || normalized.description,
          parsed.required_qualifications,
          parsed.responsibilities,
        ]
          .filter(Boolean)
          .join('\n'),
      }),
    }

    const jobPayloadWithSalary = applyKenyanSalaryEstimateIfMissing(jobPayload, {
      title: jobPayload.title,
      experienceLevel: jobPayload.experience_level,
      locationCountry: jobPayload.job_location_country,
    })

    let { data: insertedJob, error: jobError } = await supabase
      .from('jobs')
      .insert(jobPayloadWithSalary)
      .select('id, job_slug')
      .single()

    if (jobError && isMissingSalaryEstimatedColumnError(jobError)) {
      ;({ data: insertedJob, error: jobError } = await supabase
        .from('jobs')
        .insert(withoutSalaryEstimatedFlag(jobPayloadWithSalary))
        .select('id, job_slug')
        .single())
    }

    if (jobError && isMissingListingKindColumnError(jobError)) {
      ;({ data: insertedJob, error: jobError } = await supabase
        .from('jobs')
        .insert(withoutScholarshipColumns(jobPayloadWithSalary as Record<string, unknown>))
        .select('id, job_slug')
        .single())
    }

    if (jobError) throw jobError

    await revalidatePublicJobSurfaces({
      id: insertedJob.id,
      job_slug: insertedJob.job_slug,
    })

    await supabase.from('scraped_job_sources').insert({
      source_id: sourceId,
      job_url: canonicalUrl,
      content_hash: contentHash,
      job_id: insertedJob.id,
      status: 'published',
      raw_data: rawData,
    })

    return {
      status: 'published',
      job_id: insertedJob.id,
      title: normalized.title,
      valid_through: deadline.validThrough,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return { status: 'error', error: message, title: normalized.title }
  }
}
