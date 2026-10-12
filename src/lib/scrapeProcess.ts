/**
 * Shared scrape-queue processing (discover → queue → process → publish).
 * Called in-process by admin/cron/API routes — avoids HTTP self-fetch that
 * can return HTML (DOCTYPE) instead of JSON when hitting the public site URL.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { fetchHtml, extractJobDetails, normalizeJob, ScraperSelectors, datePostedForInsert } from '@/lib/scraper'
import {
  fetchWorkableJobDetails,
  normalizeWorkableJob,
  extractWorkableShortcode,
  extractWorkableSlug,
  generateContentHash as workableHash,
} from '@/lib/workable-adapter'
import {
  fetchSmartRecruitersJobDetails,
  normalizeSmartRecruitersJob,
  extractSmartRecruitersPostingId,
  extractSmartRecruitersSlug,
} from '@/lib/smartrecruiters-adapter'
import {
  fetchGreenhouseJobDetails,
  normalizeGreenhouseJob,
  extractGreenhouseJobId,
  extractGreenhouseSlug,
} from '@/lib/greenhouse-adapter'
import {
  fetchTaleoJobDetails,
  normalizeTaleoJob,
  extractTaleoContestNo,
  extractTaleoHost,
  extractTaleoSection,
} from '@/lib/taleo-adapter'
import {
  fetchTaleoBeJobDetails,
  normalizeTaleoBeJob,
  extractTaleoBeRid,
  extractTaleoBeOrg,
  extractTaleoBeCws,
  extractTaleoBeHostPath,
} from '@/lib/taleo-be-adapter'
import {
  fetchOracleCloudJobDetails,
  normalizeOracleCloudJob,
  extractOracleCloudJobId,
  extractOracleCloudHost,
  extractOracleCloudSiteNumber,
} from '@/lib/oracle-cloud-adapter'
import {
  fetchPscJobRow,
  normalizePscJob,
  extractPscAdvertNumber,
} from '@/lib/psc-adapter'
import { processPscPdfQueueItem } from '@/lib/psc-pdf-adapter'
import {
  fetchBrighterMondayJobDetails,
  normalizeBrighterMondayJob,
} from '@/lib/brightermonday-adapter'
import { fetchFuzuJobDetails, normalizeFuzuJob, resolveFuzuCompanyProfile } from '@/lib/fuzu-adapter'
import {
  fetchMyJobMagJobDetails,
  normalizeMyJobMagJob,
  resolveMyJobMagCompanyProfile,
} from '@/lib/myjobmag-adapter'
import { companyProfileToEnsureInput, type JobBoardCompanyProfile } from '@/lib/jobBoardCompany'
import { mapEducationLevel } from '@/lib/jobMetadataExtraction'
import { limitTags } from '@/lib/jobParseNormalization'
import {
  expiresAtFromValidThrough,
  isGenericApplicationUrl,
  normalizeJobUrl,
  resolveScrapedDeadline,
} from '@/lib/scraperDeadline'
import {
  inferJobFunctionFromTitle,
  parseScrapedJobContent,
  ScrapedJobInput,
} from '@/lib/scraperJobParsing'
import { ensureCompanyForJob } from '@/lib/ensureCompanyForJob'
import { inferCompanyIndustry } from '@/lib/companyIndustryInference'
import { isJobBoardSource, rewriteJobBoardDescriptionLinks } from '@/lib/jobBoardApply'
import { sanitizeAdditionalInfoApplyCopy } from '@/lib/applyInstructionsCopy'
import { requireCareerTipsHtml, hasGeneratedCareerTips } from '@/lib/careerTips'
import { isMissingOrLabelOnlyQualifications } from '@/lib/experienceLevelLabel'
import { applyKenyanSalaryEstimateIfMissing, isMissingSalaryEstimatedColumnError, withoutSalaryEstimatedFlag } from '@/lib/kenyanSalaryEstimate'
import { revalidatePublicJobSurfaces } from '@/lib/revalidatePublic'
import {
  isMissingListingKindColumnError,
  scholarshipPublishFields,
  withoutScholarshipColumns,
} from '@/lib/listingKind'
import type { WorkableJobDetail } from '@/lib/workable-adapter'
import {
  EXHAUSTED_SCRAPE_ATTEMPTS_MESSAGE,
  isScrapeAttemptsExhausted,
  MAX_SCRAPE_ATTEMPTS,
  nextStatusAfterFailedScrapeAttempt,
  reclaimStuckScrapeQueueItems,
  STALE_PROCESSING_MS,
} from '@/lib/scrapeQueueStats'

export { reclaimStuckScrapeQueueItems, MAX_SCRAPE_ATTEMPTS }

export type ScrapeProcessResult = Record<string, unknown>

export async function runScrapeProcessOne(
  supabase: SupabaseClient
): Promise<ScrapeProcessResult> {
  // Prefer never-tried items over retries so one broken adapter (e.g. PSC PDF
  // worker) cannot monopolize every process slot at the head of the FIFO.
  const { data: queueItem, error: pickError } = await supabase
    .from('scrape_queue')
    .select('*, scraper_sources(*)')
    .eq('status', 'pending')
    .order('attempts', { ascending: true })
    .order('queued_at', { ascending: true })
    .limit(1)
    .single()

  if (pickError) {
    // Surface DB errors instead of pretending the queue is empty — a false
    // "No pending jobs" here masks broken Supabase connectivity on the runner.
    throw new Error(`Failed to pick queue item: ${pickError.message}`)
  }

  if (!queueItem) {
    return { message: 'No pending jobs in queue', processed: 0 }
  }

  if (isScrapeAttemptsExhausted(queueItem.attempts)) {
    await supabase
      .from('scrape_queue')
      .update({
        status: 'failed',
        processed_at: new Date().toISOString(),
        error_message: queueItem.error_message || EXHAUSTED_SCRAPE_ATTEMPTS_MESSAGE,
      })
      .eq('id', queueItem.id)
    return {
      success: false,
      processed: 1,
      error: EXHAUSTED_SCRAPE_ATTEMPTS_MESSAGE,
      failed_permanent: true,
      job_url: queueItem.job_url,
    }
  }

  await supabase
    .from('scrape_queue')
    .update({
      status: 'processing',
      attempts: (queueItem.attempts || 0) + 1,
      processed_at: new Date().toISOString(),
    })
    .eq('id', queueItem.id)

  const source = queueItem.scraper_sources
  if (!source || typeof source !== 'object') {
    const message = `Scraper source not found for queue item ${queueItem.id} (source_id=${queueItem.source_id})`
    console.error('[process]', message)
    await supabase
      .from('scrape_queue')
      .update({
        status: 'failed',
        processed_at: new Date().toISOString(),
        error_message: message.slice(0, 500),
      })
      .eq('id', queueItem.id)
    return { success: false, processed: 1, error: message, job_url: queueItem.job_url }
  }

  const adapterType = (source.selectors as { type?: string })?.type || 'html'
  const hiringCompany = resolveHiringCompany(source.name, adapterType, queueItem.partial_data)
  let boardCompanyProfile: JobBoardCompanyProfile | null = null

  try {
    if (adapterType === 'psc_pdf') {
      const scraperUserId = await getScraperUserId()
      const pdfResult = await processPscPdfQueueItem(queueItem, source, supabase, scraperUserId)

      const noPosts =
        pdfResult.published === 0 &&
        pdfResult.duplicates === 0 &&
        pdfResult.jobs.length === 0
      const onlyDupes =
        pdfResult.published === 0 && pdfResult.duplicates > 0 && pdfResult.errors.length === 0

      await supabase
        .from('scrape_queue')
        .update({
          status: pdfResult.errors.length > 0 && pdfResult.published === 0 ? 'failed' : 'done',
          processed_at: new Date().toISOString(),
          error_message:
            pdfResult.errors.length > 0
              ? pdfResult.errors.slice(0, 3).join('; ').slice(0, 500)
              : onlyDupes
                ? `All ${pdfResult.duplicates} extracted role(s) were duplicates`
                : noPosts
                  ? 'PSC PDF processed but no roles were extracted/published'
                  : null,
        })
        .eq('id', queueItem.id)

      return {
        success: true,
        processed: 1,
        source: source.source_id,
        job_url: queueItem.job_url,
        pdf_document: true,
        published: pdfResult.published,
        duplicates: pdfResult.duplicates,
        errors: pdfResult.errors,
        jobs: pdfResult.jobs,
      }
    }

    let normalized: ReturnType<typeof normalizeJob>
    let rawData: unknown
    let parseInput: ScrapedJobInput

    if (adapterType === 'workable') {
      const slug = extractWorkableSlug(queueItem.job_url)
      const shortcode = extractWorkableShortcode(queueItem.job_url)

      if (!slug || !shortcode) {
        throw new Error(`Cannot parse Workable slug/shortcode from URL: ${queueItem.job_url}`)
      }

      const detail: WorkableJobDetail = await fetchWorkableJobDetails(slug, shortcode)
      const filterCountry = (source.selectors as { filterCountry?: string }).filterCountry

      normalized = normalizeWorkableJob(detail, hiringCompany, filterCountry)
      normalized.application_url = queueItem.job_url
      rawData = detail

      const deptHint = Array.isArray(detail.department)
        ? detail.department.filter(Boolean).join(', ')
        : normalized.tags
      parseInput = {
        title: normalized.title,
        company: hiringCompany,
        location: normalized.location,
        employmentType: normalized.employment_type,
        workplace: normalized.job_location_type,
        descriptionSection: detail.description,
        requirementsSection: detail.requirements,
        benefitsSection: detail.benefits,
        // Workable has no industry/function taxonomy — department + title heuristics fill gaps
        jobFunctionHint: detail.department?.[0] || null,
        tagsHint: deptHint,
      }
    } else if (adapterType === 'smartrecruiters') {
      const config = source.selectors as { slug?: string }
      const postingId = extractSmartRecruitersPostingId(queueItem.job_url)
      const slug = extractSmartRecruitersSlug(queueItem.job_url, config.slug)

      if (!slug || !postingId) {
        throw new Error(`Cannot parse SmartRecruiters slug/posting ID from URL: ${queueItem.job_url}`)
      }

      const detail = await fetchSmartRecruitersJobDetails(slug, postingId)
      normalized = normalizeSmartRecruitersJob(detail, hiringCompany)
      normalized.application_url = detail.applyUrl || detail.postingUrl || queueItem.job_url
      rawData = detail

      const sections = detail.jobAd?.sections
      parseInput = {
        title: normalized.title,
        company: hiringCompany,
        location: normalized.location,
        employmentType: normalized.employment_type,
        workplace: normalized.job_location_type,
        // Keep company blurb separate from duties so UI sections populate correctly
        descriptionSection: sections?.companyDescription?.text || '',
        responsibilitiesSection: sections?.jobDescription?.text || '',
        requirementsSection: sections?.qualifications?.text,
        benefitsSection: sections?.additionalInformation?.text,
        industryHint: detail.industry?.label || detail.department?.label || null,
        jobFunctionHint: detail.function?.label || null,
        tagsHint: normalized.tags,
      }
    } else if (adapterType === 'greenhouse') {
      const config = source.selectors as { slug?: string }
      const jobId = extractGreenhouseJobId(queueItem.job_url)
      // Embedded board URLs often use custom domains (?gh_jid=) — prefer configured slug
      const slug = config.slug || extractGreenhouseSlug(queueItem.job_url)

      if (!slug || !jobId) {
        throw new Error(`Cannot parse Greenhouse slug/job ID from URL: ${queueItem.job_url}`)
      }

      const detail = await fetchGreenhouseJobDetails(slug, jobId)
      normalized = normalizeGreenhouseJob(detail, hiringCompany)
      normalized.application_url = detail.absolute_url || queueItem.job_url
      rawData = detail

      // detail.content is decoded in fetchGreenhouseJobDetails; use the same
      // HTML for section splitting so requirements/responsibilities populate.
      parseInput = {
        title: normalized.title,
        company: hiringCompany,
        location: normalized.location,
        employmentType: normalized.employment_type,
        workplace: normalized.job_location_type,
        descriptionSection: detail.content || normalized.description || '',
        requirementsSection: '',
        industryHint: detail.departments?.[0]?.name || null,
        jobFunctionHint: detail.departments?.[0]?.name || null,
        tagsHint: normalized.tags,
      }
    } else if (adapterType === 'taleo') {
      const config = source.selectors as { host?: string; section?: string }
      const contestNo = extractTaleoContestNo(queueItem.job_url)
      const host =
        config.host || extractTaleoHost(queueItem.job_url) || undefined
      const section =
        config.section || extractTaleoSection(queueItem.job_url) || undefined

      if (!host || !section || !contestNo) {
        throw new Error(
          `Cannot parse Taleo host/section/contest from URL: ${queueItem.job_url}`
        )
      }

      const detail = await fetchTaleoJobDetails(host, section, contestNo, {
        title: String(queueItem.partial_data?.title || ''),
        location: String(queueItem.partial_data?.location || ''),
        contestNo,
        detailUrl: queueItem.job_url,
      })
      normalized = normalizeTaleoJob(detail, hiringCompany)
      normalized.application_url = detail.detailUrl || queueItem.job_url
      rawData = detail

      parseInput = {
        title: normalized.title,
        company: hiringCompany,
        location: normalized.location || detail.location,
        employmentType: normalized.employment_type,
        workplace: normalized.job_location_type,
        descriptionSection: detail.descriptionHtml || normalized.description || '',
        requirementsSection: detail.qualificationsHtml || '',
        tagsHint: normalized.tags,
      }
    } else if (adapterType === 'taleo_be') {
      const config = source.selectors as {
        org?: string
        cws?: string
        hostPath?: string
      }
      const rid = extractTaleoBeRid(queueItem.job_url)
      const org = config.org || extractTaleoBeOrg(queueItem.job_url) || undefined
      const cws = config.cws || extractTaleoBeCws(queueItem.job_url) || undefined
      const hostPath =
        config.hostPath || extractTaleoBeHostPath(queueItem.job_url) || undefined

      if (!hostPath || !org || !cws || !rid) {
        throw new Error(
          `Cannot parse Taleo BE hostPath/org/cws/rid from URL: ${queueItem.job_url}`
        )
      }

      const detail = await fetchTaleoBeJobDetails(hostPath, org, cws, rid, {
        title: String(queueItem.partial_data?.title || ''),
        location: String(queueItem.partial_data?.location || ''),
        rid,
        detailUrl: queueItem.job_url,
        meta: [],
      })
      normalized = normalizeTaleoBeJob(detail, hiringCompany)
      normalized.application_url = detail.detailUrl || queueItem.job_url
      rawData = detail

      parseInput = {
        title: normalized.title,
        company: hiringCompany,
        location: normalized.location || detail.location,
        employmentType: normalized.employment_type,
        workplace: normalized.job_location_type,
        descriptionSection: detail.descriptionHtml || normalized.description || '',
        requirementsSection: '',
        tagsHint: normalized.tags,
      }
    } else if (adapterType === 'oracle_cloud') {
      const config = source.selectors as { host?: string; siteNumber?: string }
      const jobId = extractOracleCloudJobId(queueItem.job_url)
      const host =
        config.host || extractOracleCloudHost(queueItem.job_url) || undefined
      const siteNumber =
        config.siteNumber ||
        extractOracleCloudSiteNumber(queueItem.job_url) ||
        undefined

      if (!host || !siteNumber || !jobId) {
        throw new Error(
          `Cannot parse Oracle Cloud host/site/job from URL: ${queueItem.job_url}`
        )
      }

      const detail = await fetchOracleCloudJobDetails(host, siteNumber, jobId, {
        title: String(queueItem.partial_data?.title || ''),
        location: String(queueItem.partial_data?.location || ''),
        id: jobId,
        detailUrl: queueItem.job_url,
        countryCode: '',
      })
      normalized = normalizeOracleCloudJob(detail, hiringCompany)
      normalized.application_url = detail.detailUrl || queueItem.job_url
      rawData = detail

      parseInput = {
        title: normalized.title,
        company: hiringCompany,
        location: normalized.location || detail.location,
        employmentType: normalized.employment_type,
        workplace: normalized.job_location_type,
        descriptionSection: detail.descriptionHtml || normalized.description || '',
        responsibilitiesSection: detail.responsibilitiesHtml || '',
        requirementsSection: detail.qualificationsHtml || '',
        industryHint:
          detail.category && !/^(management|other|general)$/i.test(detail.category)
            ? detail.category
            : null,
        tagsHint: normalized.tags,
      }
    } else if (adapterType === 'brightermonday') {
      const detail = await fetchBrighterMondayJobDetails(queueItem.job_url)
      normalized = normalizeBrighterMondayJob(detail)
      rawData = detail

      parseInput = {
        title: normalized.title,
        company: normalized.company,
        location: normalized.location,
        employmentType: normalized.employment_type,
        workplace: normalized.job_location_type,
        // Full posting HTML — section splitter extracts real Requirements /
        // Qualifications. Do NOT pass JSON-LD qualifications (often "Mid level").
        descriptionSection: detail.descriptionHtml,
        requirementsSection: '',
        industryHint: detail.industry,
        jobFunctionHint: detail.occupationalCategory,
        tagsHint: normalized.tags,
        rawContent: detail.descriptionHtml || '',
      }
    } else if (adapterType === 'fuzu') {
      const detail = await fetchFuzuJobDetails(queueItem.job_url)
      normalized = normalizeFuzuJob(detail)
      boardCompanyProfile = await resolveFuzuCompanyProfile(detail)
      rawData = { ...detail, companyProfile: boardCompanyProfile }

      parseInput = {
        title: normalized.title,
        company: normalized.company,
        location: normalized.location,
        employmentType: normalized.employment_type,
        workplace: normalized.job_location_type,
        descriptionSection: detail.descriptionHtml,
        requirementsSection: '',
        industryHint: detail.industry,
        tagsHint: normalized.tags,
        rawContent: detail.descriptionHtml || '',
      }
    } else if (adapterType === 'myjobmag') {
      const detail = await fetchMyJobMagJobDetails(queueItem.job_url)
      normalized = normalizeMyJobMagJob(detail)
      boardCompanyProfile = await resolveMyJobMagCompanyProfile(detail)
      rawData = { ...detail, companyProfile: boardCompanyProfile }

      parseInput = {
        title: normalized.title,
        company: normalized.company,
        location: normalized.location,
        employmentType: normalized.employment_type,
        workplace: normalized.job_location_type,
        descriptionSection: detail.descriptionHtml,
        requirementsSection: '',
        industryHint: detail.industry,
        jobFunctionHint: detail.occupationalCategory,
        tagsHint: normalized.tags,
        rawContent: detail.descriptionHtml || '',
      }
    } else if (adapterType === 'psc') {
      const advertNumber =
        extractPscAdvertNumber(queueItem.job_url) ||
        (queueItem.partial_data?.advertNumber as string | undefined)

      if (!advertNumber) {
        throw new Error(`Cannot parse PSC advert number from URL: ${queueItem.job_url}`)
      }

      const row = await fetchPscJobRow(source.base_url, advertNumber)
      if (!row) {
        throw new Error(`PSC advert ${advertNumber} not found on listing page`)
      }

      const applyUrl = 'https://www.psckjobs.go.ke/loginPage.aspx'
      normalized = normalizePscJob(row, applyUrl)
      rawData = row

      parseInput = {
        title: normalized.title,
        company: normalized.company,
        location: normalized.location,
        employmentType: normalized.employment_type,
        descriptionSection: normalized.description,
        requirementsSection: normalized.required_qualifications,
        rawContent: [
          normalized.description,
          normalized.required_qualifications,
          `Apply via PSC portal: ${applyUrl}`,
        ].join('\n\n'),
      }
    } else {
      const html = await fetchHtml(queueItem.job_url)
      const raw = extractJobDetails(html, queueItem.job_url, source.selectors as ScraperSelectors)

      if (!raw.title && queueItem.partial_data?.title) raw.title = queueItem.partial_data.title
      if (!raw.location && queueItem.partial_data?.location) {
        raw.location = queueItem.partial_data.location
      }
      if (!raw.title) throw new Error('Could not extract job title from detail page')

      normalized = normalizeJob(raw, hiringCompany)
      rawData = raw

      parseInput = {
        title: normalized.title,
        company: hiringCompany,
        location: normalized.location,
        employmentType: normalized.employment_type,
        descriptionSection: raw.description,
        requirementsSection: raw.requirements,
        rawContent: [raw.description, raw.requirements].filter(Boolean).join('\n\n'),
      }
    }

    if (!normalized.title) throw new Error('Job title is empty after normalization')

    const dedupCompany =
      adapterType === 'psc' ||
      adapterType === 'brightermonday' ||
      adapterType === 'fuzu' ||
      adapterType === 'myjobmag'
        ? normalized.company
        : hiringCompany
    const contentHash = workableHash(
      normalized.title,
      dedupCompany,
      normalized.job_location_city || normalized.job_location_county || ''
    )
    const canonicalUrl = normalizeJobUrl(queueItem.job_url)
    const jobBoard = isJobBoardSource(source.selectors)
    const employerApplicationUrl = normalized.application_url?.trim()
      ? normalizeJobUrl(normalized.application_url)
      : null
    // Job boards: prefer employer URL; email-only leaves application_url null;
    // only fall back to the board listing URL when no employer method exists.
    const boardApplyEmail = normalized.apply_email?.trim() || null
    const publishedApplicationUrl = jobBoard
      ? employerApplicationUrl ||
        (boardApplyEmail ? null : normalizeJobUrl(queueItem.job_url))
      : normalizeJobUrl(normalized.application_url || queueItem.job_url)
    const applicationUrl = publishedApplicationUrl

    // Deduplicate by content hash, canonical source URL, or application URL
    const { data: existingByHash } = await supabase
      .from('scraped_job_sources')
      .select('id, job_url')
      .eq('content_hash', contentHash)
      .maybeSingle()

    const { data: existingByUrl } = await supabase
      .from('scraped_job_sources')
      .select('id, job_url')
      .eq('job_url', canonicalUrl)
      .maybeSingle()

    const { data: existingByAppUrl } =
      applicationUrl && !isGenericApplicationUrl(applicationUrl)
        ? await supabase
            .from('jobs')
            .select('id')
            .eq('source', 'Scraper')
            .eq('application_url', applicationUrl)
            .maybeSingle()
        : { data: null }

    if (existingByHash || existingByUrl || existingByAppUrl) {
      await supabase
        .from('scrape_queue')
        .update({ status: 'done', processed_at: new Date().toISOString() })
        .eq('id', queueItem.id)
      return {
        message: 'Duplicate job skipped',
        processed: 1,
        job_url: queueItem.job_url,
        duplicate_reason: existingByHash
          ? 'content_hash'
          : existingByUrl
            ? 'job_url'
            : 'application_url',
      }
    }

    const [{ data: educationLevels }, { data: industries }, { data: jobFunctions }] =
      await Promise.all([
        supabase.from('education_levels').select('id, name'),
        supabase.from('industries').select('id, name'),
        supabase.from('job_functions').select('id, name'),
      ])

    const industryNames = (industries || []).map(i => i.name)
    const jobFunctionNames = (jobFunctions || []).map(j => j.name)

    const parsed = await parseScrapedJobContent(parseInput, {
      industryNames,
      jobFunctionNames,
      attachCareerTips: true,
    })

    const deadline = resolveScrapedDeadline(
      jobBoard
        ? // Job boards: trust structured employer deadline over AI (AI often invents or
          // picks BM's ~90-day listing expiry instead of "Deadline: 27th July 2026").
          normalized.valid_through || parsed.deadline || null
        : parsed.deadline || normalized.valid_through || null
    )
    if (deadline.action === 'skip_expired') {
      await supabase
        .from('scrape_queue')
        .update({
          status: 'done',
          processed_at: new Date().toISOString(),
          error_message: `Skipped: job expired on ${deadline.validThrough}`,
        })
        .eq('id', queueItem.id)

      // Record so discover won't re-queue this URL
      await supabase.from('scraped_job_sources').upsert(
        {
          source_id: source.source_id,
          job_url: canonicalUrl,
          content_hash: contentHash,
          job_id: null,
          status: 'skipped',
          raw_data: {
            ...(typeof rawData === 'object' && rawData ? rawData : {}),
            skip_reason: 'expired',
            expired_on: deadline.validThrough,
          },
        },
        { onConflict: 'job_url' }
      )

      return {
        message: 'Expired job skipped',
        processed: 1,
        expired: true,
        valid_through: deadline.validThrough,
        job_url: queueItem.job_url,
        title: normalized.title,
      }
    }

    const educationLevelId = mapEducationLevel(parsed.education_level, educationLevels || [])
    // parseScrapedJobContent already applies company/title heuristics; keep a last-resort fallback
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
    const industryRow = industryRows[0] || null
    const jobFunctionRow = jobFunctionRows[0] || null

    const scraperUserId = await getScraperUserId()
    const companyFields = companyProfileToEnsureInput(boardCompanyProfile)
    const ensured = await ensureCompanyForJob(supabase, {
      name: dedupCompany,
      userId: scraperUserId,
      ...companyFields,
    })
    const companyId = ensured.companyId

    const tags = limitTags(
      parsed.tags || normalized.tags || '',
      5
    )

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

    const boardHostsForRewrite =
      adapterType === 'myjobmag'
        ? ['myjobmag.co.ke']
        : adapterType === 'brightermonday'
          ? ['brightermonday.co.ke', 'jobberman.com']
          : adapterType === 'fuzu'
            ? ['fuzu.com']
            : []
    const boardOriginForRewrite =
      adapterType === 'myjobmag'
        ? 'https://www.myjobmag.co.ke'
        : adapterType === 'brightermonday'
          ? 'https://www.brightermonday.co.ke'
          : adapterType === 'fuzu'
            ? 'https://www.fuzu.com'
            : null

    // Absolutize leftover relative board anchors only. Do not inject apply_link /
    // application_url into body HTML — MyJobMag already rewrites /apply-now/
    // using the exact employer redirect from that link.
    const rewriteBoardHtml = (html: string | null | undefined): string | null => {
      if (!html || !boardOriginForRewrite) return html ?? null
      return rewriteJobBoardDescriptionLinks(html, {
        boardOrigin: boardOriginForRewrite,
        boardHosts: boardHostsForRewrite,
      })
    }

    const rawDescription = parsed.description || normalized.description
    await supabase
      .from('scrape_queue')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', queueItem.id)
      .eq('status', 'processing')

    // Never insert How to Apply only. Tips were started in parallel with parse;
    // this call is a no-op when they already landed, or one more dedicated try.
    const rawAdditionalInfo = await requireCareerTipsHtml(
      sanitizeAdditionalInfoApplyCopy(
        parsed.additional_info || null,
        {
          apply_email: boardApplyEmail || parsed.apply_email || null,
          apply_link: jobBoard
            ? normalized.apply_link?.trim() || null
            : parsed.apply_link || normalized.apply_link || null,
          application_url: applicationUrl,
        },
        normalized.title || null
      ),
      {
        title: normalized.title,
        company: dedupCompany,
        description: rawDescription,
        responsibilities: parsed.responsibilities || normalized.responsibilities,
        qualifications:
          parsed.required_qualifications || normalized.required_qualifications,
      }
    )
    if (!hasGeneratedCareerTips(rawAdditionalInfo)) {
      throw new Error('Career tips generation failed; will retry')
    }

    // date_posted: keep the source board's original publication date when the
    // adapter parsed one (Google requires the original employer posting date).
    // When the board date is missing, write publish time — never NULL. Spreading
    // `date_posted: null` from adapters would skip the column DEFAULT.
    const jobPayload = {
      ...normalized,
      date_posted: datePostedForInsert(normalized.date_posted),
      description: rewriteBoardHtml(rawDescription) || rawDescription,
      responsibilities: rewriteBoardHtml(
        parsed.responsibilities || normalized.responsibilities || null
      ),
      required_qualifications: (() => {
        const parsedQ = parsed.required_qualifications
        const chosen =
          parsedQ && !isMissingOrLabelOnlyQualifications(parsedQ)
            ? parsedQ
            : normalized.required_qualifications &&
                !isMissingOrLabelOnlyQualifications(normalized.required_qualifications)
              ? normalized.required_qualifications
              : null
        return rewriteBoardHtml(chosen)
      })(),
      additional_info: rewriteBoardHtml(rawAdditionalInfo),
      company_id: companyId,
      user_id: scraperUserId,
      hiring_organization_name: dedupCompany,
      hiring_organization_logo: ensured.logo,
      hiring_organization_url: ensured.website,
      source: 'Scraper',
      direct_apply: false,
      application_url: applicationUrl,
      apply_email: boardApplyEmail || parsed.apply_email || null,
      apply_link: jobBoard
        ? (normalized.apply_link?.trim() ||
            (parsed.apply_link &&
            !/brightermonday\.co\.ke|myjobmag\.co\.ke|fuzu\.com/i.test(parsed.apply_link)
              ? parsed.apply_link
              : null) ||
            null)
        : parsed.apply_link || normalized.apply_link || null,
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
      job_location_county: jobBoard
        ? normalized.job_location_county || parsed.job_location_county || null
        : parsed.job_location_county || normalized.job_location_county || null,
      job_location_city: jobBoard
        ? normalized.job_location_city || parsed.job_location_city || null
        : parsed.job_location_city || normalized.job_location_city || null,
      location: jobBoard
        ? normalized.location || parsed.job_location_city || null
        : normalized.location,
      additional_locations: parsed.additional_locations || [],
      industry: industryName,
      industries: industryNamesResolved,
      industry_id: industryRow?.id ?? null,
      industry_ids: industryRows.map(r => r.id),
      job_function: jobFunctionName,
      job_functions: jobFunctionNamesResolved,
      job_function_id: jobFunctionRow?.id ?? null,
      job_function_ids: jobFunctionRows.map(r => r.id),
      tags,
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
        tags,
        description: rawDescription,
        html: [
          rawDescription,
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
      source_id: source.source_id,
      job_url: canonicalUrl,
      content_hash: contentHash,
      job_id: insertedJob.id,
      status: 'published',
      raw_data: rawData,
    })

    await supabase
      .from('scrape_queue')
      .update({ status: 'done', processed_at: new Date().toISOString() })
      .eq('id', queueItem.id)
      .eq('status', 'processing')

    return {
      success: true,
      processed: 1,
      job_id: insertedJob.id,
      title: normalized.title,
      source: source.source_id,
      job_url: queueItem.job_url,
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'object'
          ? JSON.stringify(err)
          : String(err)
    console.error('[process] Error:', queueItem.job_url, message)

    // Permanent failures (gone postings, unparseable URLs, missing PDF worker
    // on the runtime) — don't retry and don't block the rest of the queue.
    const permanent =
      /\b404\b/i.test(message) ||
      /not found/i.test(message) ||
      /Cannot parse/i.test(message) ||
      /Invalid PDF structure/i.test(message) ||
      /Setting up fake worker failed/i.test(message) ||
      /pdf\.worker/i.test(message) ||
      /Cannot find module.*pdfjs/i.test(message) ||
      /returned HTML, not a PDF/i.test(message) ||
      /did not return PDF bytes/i.test(message)
    const { attempts, status: newStatus } = nextStatusAfterFailedScrapeAttempt(
      queueItem.attempts,
      permanent
    )

    await supabase
      .from('scrape_queue')
      .update({ status: newStatus, error_message: message, attempts })
      .eq('id', queueItem.id)
      .eq('status', 'processing')

    return {
      error: message,
      processed: 1,
      failed_permanent: newStatus === 'failed',
      job_url: queueItem.job_url,
    }
  }
}

export interface ScrapeProcessBatchOptions {
  maxJobs?: number
  /**
   * Soft time budget in ms. Stop before starting another item once exceeded.
   * Avoids hard Vercel timeouts that return HTML error pages instead of JSON.
   * Default: 270s (safe under Pro's 300s maxDuration).
   */
  budgetMs?: number
}

/** Process up to maxJobs pending queue items (one at a time). */
export async function runScrapeProcessBatch(
  supabase: SupabaseClient,
  maxJobsOrOptions: number | ScrapeProcessBatchOptions = 10
): Promise<{ processed: number; results: ScrapeProcessResult[]; stopped_early?: string }> {
  const options: ScrapeProcessBatchOptions =
    typeof maxJobsOrOptions === 'number' ? { maxJobs: maxJobsOrOptions } : maxJobsOrOptions

  const maxJobs = Math.min(Math.max(1, Math.floor(options.maxJobs ?? 10)), 25)
  const budgetMs = options.budgetMs ?? 270_000
  const startedAt = Date.now()

  const reclaimed = await reclaimStuckScrapeQueueItems(supabase, STALE_PROCESSING_MS)
  if (reclaimed > 0) {
    console.log(`[scrape-process] Reclaimed ${reclaimed} stuck processing item(s)`)
  }

  const results: ScrapeProcessResult[] = []
  let processed = 0
  let stoppedEarly: string | undefined

  for (let i = 0; i < maxJobs; i++) {
    const elapsed = Date.now() - startedAt
    // Leave headroom so the in-flight item can finish and still return JSON
    // (PSC PDFs + AI can take a long time; hard Vercel kills return HTML 500s).
    const reserveMs = 45_000
    if (elapsed >= budgetMs - reserveMs) {
      stoppedEarly = `Stopped after ${processed} item(s) to stay within Vercel time limits (${Math.round(elapsed / 1000)}s elapsed)`
      break
    }

    const result = await runScrapeProcessOne(supabase)

    if (result.processed === 0 || result.message === 'No pending jobs in queue') {
      break
    }

    results.push(result)
    processed++

    // Continue through duplicates, expiries, and per-item failures so cron can
    // drain the backlog without aborting the whole batch.
    if (
      result.message === 'Duplicate job skipped' ||
      result.message === 'Expired job skipped' ||
      result.success ||
      result.error
    ) {
      continue
    }
  }

  return { processed, results, ...(stoppedEarly ? { stopped_early: stoppedEarly } : {}) }
}

const EXPERIENCE_LEVELS = new Set(['Entry', 'Mid', 'Senior', 'Managerial', 'Internship'])
const LOCATION_TYPES = new Set(['ON_SITE', 'REMOTE', 'HYBRID'])

/** Coerce free-text / ATS labels onto the jobs.experience_level enum. */
function sanitizeExperienceLevel(value: unknown): 'Entry' | 'Mid' | 'Senior' | 'Managerial' | 'Internship' {
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

/** Schema.org TELECOMMUTE → DB REMOTE; keep ON_SITE / HYBRID. */
function sanitizeJobLocationType(value: unknown): 'ON_SITE' | 'REMOTE' | 'HYBRID' {
  const raw = String(value || '').trim().toUpperCase()
  if (raw === 'TELECOMMUTE' || raw === 'REMOTE') return 'REMOTE'
  if (raw === 'HYBRID') return 'HYBRID'
  if (LOCATION_TYPES.has(raw)) return raw as 'ON_SITE' | 'REMOTE' | 'HYBRID'
  return 'ON_SITE'
}

function resolveHiringCompany(
  sourceName: string,
  adapterType: string,
  partialData: Record<string, unknown> | null | undefined
): string {
  if (adapterType === 'psc' && partialData?.ministry) {
    return String(partialData.ministry)
  }
  return sourceName
}

let _scraperUserId: string | null = null

async function getScraperUserId(): Promise<string> {
  if (_scraperUserId) return _scraperUserId
  if (process.env.SCRAPER_USER_ID) {
    _scraperUserId = process.env.SCRAPER_USER_ID
    return _scraperUserId
  }
  throw new Error('SCRAPER_USER_ID not set in environment variables.')
}
