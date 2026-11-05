/**
 * Scholarship queue processing (discover → queue → process → publish).
 * Twin of scrapeProcess.ts for scholarship_queue / scholarships /
 * scraped_scholarship_sources. Called in-process by admin and cron routes.
 *
 * Deadline doctrine (the big difference from jobs): the deadline IS the
 * product. A scholarship without a real, future `application_deadline` is
 * worthless to a student, so:
 *   * missing/unparseable deadline  → FAILED row (retried up to the shared
 *     MAX_SCRAPE_ATTEMPTS, then `failed`) — never the jobs' 30-day default,
 *     which would publish invented windows;
 *   * deadline in the past          → skipped as `expired` (done row + skipped
 *     tombstone so Discover stops re-queuing it);
 *   * explicit "not open to Kenyans"→ skipped.
 * Then the deterministic chemistry gate (scholarshipRelevance.ts) decides
 * publication. Skip messages are chosen so the existing admin bucketing
 * ('outside chemistry' → screened out; 'expired' → other done) works as-is.
 *
 * Batch sizing reuses the jobs knobs unchanged (resolveProcessQueueBatch).
 */

import crypto from 'crypto'
import { SupabaseClient } from '@supabase/supabase-js'
import { fetchHtml, extractJobDetails, ScraperSelectors, datePostedForInsert } from './scraper'
import { normalizeJobUrl, isDeadlineExpired } from './scraperDeadline'
import {
  parseScholarshipContent,
  type ParsedScholarship,
  type ScholarshipParseInput,
} from './scholarshipParse'
import {
  SKIPPED_NON_CHEM_SCHOLARSHIP,
  evaluateScholarshipChemistryFocus,
} from './scholarshipRelevance'
import {
  EXHAUSTED_SCRAPE_ATTEMPTS_MESSAGE,
  MAX_SCRAPE_ATTEMPTS,
  STALE_PROCESSING_MS,
  isScrapeAttemptsExhausted,
  nextStatusAfterFailedScrapeAttempt,
} from './scrapeQueueStats'
import { reclaimStuckScholarshipQueueItems } from './scholarshipQueueStats'

export { MAX_SCRAPE_ATTEMPTS }

export type ScholarshipProcessResult = Record<string, unknown>

export const NO_DEADLINE_MESSAGE = 'No application deadline found — scholarship cannot be published'
export const DUPLICATE_MESSAGE = 'Duplicate scholarship skipped'

// ─── Cohort-aware dedup ─────────────────────────────────────────────────────
/**
 * "Chevening 2026" and "Chevening 2027" are the same program in different
 * cohorts and must both live, so the hash pairs a program-slug-normalized
 * title with the academic year. URL dedup alone would delete the next intake.
 */
export function normalizeScholarshipProgramTitle(title: string): string {
  return (title || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/\b(?:scholarship|scholarships|bursary|award|awards|fellowship|grant|grants|studentship|funding|loan|programme|program|opportunities|opportunity|open|applications?|invitations?|call)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

export function scholarshipContentHash(title: string, academicYear: number | null | undefined): string {
  const program = normalizeScholarshipProgramTitle(title)
  const year = academicYear ? String(academicYear) : 'unknown'
  return crypto.createHash('sha256').update(`${program}|${year}`).digest('hex')
}

/** URL-safe slug for the future public pages (Phase 2). */
export function slugifyScholarship(title: string, provider?: string | null): string {
  const base = `${provider ? `${provider} ` : ''}${title}`
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '') // eslint-disable-line no-control-regex
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return base || 'scholarship'
}

// ─── Hard publication rules (pure, testable) ────────────────────────────────
export type ScholarshipHardRuleOutcome =
  | { action: 'publish' }
  | { action: 'skip'; message: string; reason: 'no_title' | 'expired' | 'not_open_to_kenyans' }
  | { action: 'fail'; message: string }

/**
 * Order matters: a page with neither title nor deadline is a parsing failure
 * (retry), not a skip — skipping would tombstone garbage forever.
 */
export function applyScholarshipHardRules(
  parsed: Pick<ParsedScholarship, 'title' | 'applicationDeadline' | 'openToKenyans'>,
  now = new Date()
): ScholarshipHardRuleOutcome {
  const deadline = (parsed.applicationDeadline || '').trim()
  if (!deadline) {
    return { action: 'fail', message: NO_DEADLINE_MESSAGE }
  }
  if (!parsed.title?.trim()) {
    return { action: 'skip', message: 'Skipped: scholarship title is empty', reason: 'no_title' }
  }
  // `isDeadlineExpired` is a UTC day compare: a deadline falling TODAY is
  // still open, which is what a student needs to know.
  if (isDeadlineExpired(deadline, now)) {
    return {
      action: 'skip',
      message: `Skipped: scholarship expired on ${deadline}`,
      reason: 'expired',
    }
  }
  // A date nothing can parse (e.g. "TBD") must not publish either.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    return { action: 'fail', message: NO_DEADLINE_MESSAGE }
  }
  if (parsed.openToKenyans === false) {
    return {
      action: 'skip',
      message: 'Skipped: not open to Kenyans',
      reason: 'not_open_to_kenyans',
    }
  }
  return { action: 'publish' }
}

// ─── Queue pick / claim / publish ───────────────────────────────────────────
async function markQueueDone(
  supabase: SupabaseClient,
  id: string,
  errorMessage: string | null
): Promise<void> {
  await supabase
    .from('scholarship_queue')
    .update({
      status: 'done',
      processed_at: new Date().toISOString(),
      ...(errorMessage ? { error_message: errorMessage.slice(0, 500) } : {}),
    })
    .eq('id', id)
}

async function recordSkipTombstone(
  supabase: SupabaseClient,
  args: {
    sourceId: string
    canonicalUrl: string
    contentHash: string
    skipReason: string
    rawData: unknown
    extra?: Record<string, unknown>
  }
): Promise<void> {
  const { error } = await supabase.from('scraped_scholarship_sources').upsert(
    {
      source_id: args.sourceId,
      scholarship_url: args.canonicalUrl,
      content_hash: args.contentHash,
      scholarship_id: null,
      status: 'skipped',
      raw_data: {
        ...(typeof args.rawData === 'object' && args.rawData ? (args.rawData as object) : {}),
        skip_reason: args.skipReason,
        ...(args.extra || {}),
      },
    },
    { onConflict: 'scholarship_url' }
  )
  // Bookkeeping only — a tombstone write failure must not lose the decision.
  if (error) {
    console.warn('[scholarship-process] Failed to record skip tombstone:', error.message)
  }
}

/** Slug collision (same title, different cohort/source) → suffix until free. */
async function ensureUniqueSlug(supabase: SupabaseClient, slug: string): Promise<string> {
  const { data: existing } = await supabase
    .from('scholarships')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()

  if (!existing) return slug

  for (let n = 2; n <= 40; n++) {
    const candidate = `${slug}-${n}`
    const { data: taken } = await supabase
      .from('scholarships')
      .select('slug')
      .eq('slug', candidate)
      .maybeSingle()
    if (!taken) return candidate
  }
  return `${slug}-${Date.now()}`
}

export async function runScholarshipProcessOne(
  supabase: SupabaseClient
): Promise<ScholarshipProcessResult> {
  // Prefer never-tried items so one broken page cannot monopolise the batch.
  const { data: queueItem, error: pickError } = await supabase
    .from('scholarship_queue')
    .select('*, scraper_sources(*)')
    .eq('status', 'pending')
    .order('attempts', { ascending: true })
    .order('queued_at', { ascending: true })
    .limit(1)
    .single()

  if (pickError) {
    // A DB error here must not look like an empty queue — that hides broken
    // Supabase connectivity from the runner.
    throw new Error(`Failed to pick scholarship queue item: ${pickError.message}`)
  }
  if (!queueItem) {
    return { message: 'No pending scholarships in queue', processed: 0 }
  }

  if (isScrapeAttemptsExhausted(queueItem.attempts)) {
    await supabase
      .from('scholarship_queue')
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
      scholarship_url: queueItem.scholarship_url,
    }
  }

  await supabase
    .from('scholarship_queue')
    .update({
      status: 'processing',
      attempts: (queueItem.attempts || 0) + 1,
      processed_at: new Date().toISOString(),
    })
    .eq('id', queueItem.id)

  const source = queueItem.scraper_sources
  if (!source || typeof source !== 'object') {
    const message = `Scraper source not found for scholarship queue item ${queueItem.id} (source_id=${queueItem.source_id})`
    console.error('[scholarship-process]', message)
    await supabase
      .from('scholarship_queue')
      .update({
        status: 'failed',
        processed_at: new Date().toISOString(),
        error_message: message.slice(0, 500),
      })
      .eq('id', queueItem.id)
    return { success: false, processed: 1, error: message, scholarship_url: queueItem.scholarship_url }
  }

  const adapterType = (source.selectors as { type?: string })?.type || 'html'

  try {
    if (adapterType !== 'html') {
      // Thrown as "Cannot parse"-class permanent error by the catch below.
      throw new Error(
        `Cannot process scholarship with unsupported scraper type "${adapterType}" (html only)`
      )
    }

    const html = await fetchHtml(queueItem.scholarship_url)
    const details = extractJobDetails(html, queueItem.scholarship_url, source.selectors as ScraperSelectors)
    const listingTitle =
      typeof queueItem.partial_data?.title === 'string' ? queueItem.partial_data.title : ''

    const parseInput: ScholarshipParseInput = {
      title: details.title || listingTitle,
      // Whole page: deadline labels often sit outside the description
      // container, and grounding an AI date requires the full text.
      html,
      text: details.description || undefined,
      sourceUrl: queueItem.scholarship_url,
      applyUrl: details.apply_link || queueItem.scholarship_url,
    }

    const parsed = await parseScholarshipContent(parseInput)
    const canonicalUrl = normalizeJobUrl(queueItem.scholarship_url)
    const contentHash = scholarshipContentHash(parsed.title, parsed.academicYear)
    const rawData = {
      source_url: queueItem.scholarship_url,
      listing_title: listingTitle || null,
      parsed: {
        provider: parsed.provider,
        level: parsed.level,
        field_of_study: parsed.fieldOfStudy,
        coverage: parsed.coverage,
        deadline: parsed.applicationDeadline,
        deadline_source: parsed.deadlineSource,
        academic_year: parsed.academicYear,
        open_to_kenyans: parsed.openToKenyans,
        open_to_kenyans_explicit: parsed.openToKenyansExplicit,
      },
    }

    // ── Hard rules (deadline / eligibility) before the gate and the AI-less
    //    tombstone writes, so rejected pages cost nothing further. ──
    const hardRule = applyScholarshipHardRules(parsed)
    if (hardRule.action === 'fail') {
      // Throw so the shared attempts policy applies: a page whose deadline
      // lives in a PDF or JS may parse on a retry.
      throw new Error(hardRule.message)
    }
    if (hardRule.action === 'skip') {
      await markQueueDone(supabase, queueItem.id, hardRule.message)
      await recordSkipTombstone(supabase, {
        sourceId: source.source_id,
        canonicalUrl,
        contentHash,
        skipReason: hardRule.reason,
        rawData,
        extra:
          hardRule.reason === 'expired'
            ? { expired_on: parsed.applicationDeadline }
            : undefined,
      })
      return {
        message: hardRule.message,
        processed: 1,
        skipped: true,
        skip_reason: hardRule.reason,
        scholarship_url: queueItem.scholarship_url,
        title: parsed.title,
      }
    }

    // ── Chemistry Lens gate. Verdict is logged so a wrong-looking skip can be
    //    traced without re-running the page. ──
    const gate = evaluateScholarshipChemistryFocus(
      {
        title: parsed.title,
        provider: parsed.provider,
        fieldOfStudy: parsed.fieldOfStudy,
        programMission: parsed.programMission,
        eligibility: parsed.eligibility,
        studyDestination: parsed.studyDestination,
      },
      [parsed.description, parsed.eligibility],
      parsed.description
    )

    if (!gate.publish) {
      console.log(
        `[scholarship-process] Gate skip (${gate.reason}): ${parsed.title} — ${queueItem.scholarship_url}`
      )
      await markQueueDone(supabase, queueItem.id, SKIPPED_NON_CHEM_SCHOLARSHIP)
      await recordSkipTombstone(supabase, {
        sourceId: source.source_id,
        canonicalUrl,
        contentHash,
        skipReason: 'off_topic',
        rawData,
        extra: { gate_reason: gate.reason },
      })
      return {
        message: 'Off-topic scholarship skipped (outside chemistry focus)',
        processed: 1,
        off_topic: true,
        scholarship_url: queueItem.scholarship_url,
        title: parsed.title,
      }
    }

    // ── Dedup: cohort hash first (same award, different URL), then URL. ──
    const [{ data: existingByHash }, { data: existingByUrl }] = await Promise.all([
      supabase
        .from('scraped_scholarship_sources')
        .select('id, scholarship_url')
        .eq('content_hash', contentHash)
        .maybeSingle(),
      supabase
        .from('scraped_scholarship_sources')
        .select('id, scholarship_url')
        .eq('scholarship_url', canonicalUrl)
        .maybeSingle(),
    ])

    if (existingByHash || existingByUrl) {
      await markQueueDone(supabase, queueItem.id, DUPLICATE_MESSAGE)
      return {
        message: DUPLICATE_MESSAGE,
        processed: 1,
        scholarship_url: queueItem.scholarship_url,
        title: parsed.title,
        duplicate_reason: existingByHash ? 'content_hash' : 'scholarship_url',
      }
    }

    const slug = await ensureUniqueSlug(
      supabase,
      slugifyScholarship(parsed.title, parsed.provider)
    )

    const payload = {
      slug,
      title: parsed.title.slice(0, 300),
      provider: parsed.provider,
      description: parsed.description,
      level: parsed.level,
      field_of_study: parsed.fieldOfStudy,
      study_destination: parsed.studyDestination,
      open_to_kenyans: parsed.openToKenyans,
      eligibility: parsed.eligibility,
      coverage: parsed.coverage,
      is_partial_award: parsed.isPartialAward,
      award_value: parsed.awardValue,
      application_deadline: parsed.applicationDeadline,
      academic_year: parsed.academicYear,
      duration_text: parsed.durationText,
      application_url: parsed.applicationUrl || queueItem.scholarship_url,
      source_url: canonicalUrl,
      status: 'live' as const,
      date_posted: datePostedForInsert(),
    }

    const { data: inserted, error: insertError } = await supabase
      .from('scholarships')
      .insert(payload)
      .select('id, slug')
      .single()

    if (insertError) throw insertError

    await supabase.from('scraped_scholarship_sources').insert({
      source_id: source.source_id,
      scholarship_url: canonicalUrl,
      content_hash: contentHash,
      scholarship_id: inserted.id,
      status: 'published',
      raw_data: rawData,
    })

    // Guard on 'processing' so a reclaimed row (timeout) is never flipped to
    // done by a late-finishing worker.
    await supabase
      .from('scholarship_queue')
      .update({ status: 'done', processed_at: new Date().toISOString() })
      .eq('id', queueItem.id)
      .eq('status', 'processing')

    console.log(
      `[scholarship-process] Published ${inserted.slug} (gate: ${gate.testsPassed.join('+') || 'bypassed'})`
    )

    return {
      success: true,
      processed: 1,
      scholarship_id: inserted.id,
      slug: inserted.slug,
      title: parsed.title,
      source: source.source_id,
      scholarship_url: queueItem.scholarship_url,
      deadline: parsed.applicationDeadline,
      gate_tests: gate.testsPassed,
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'object'
          ? JSON.stringify(err)
          : String(err)
    console.error('[scholarship-process] Error:', queueItem.scholarship_url, message)

    // Dead pages and unsupported adapters are permanent — retrying them just
    // burns the attempts budget while the rest of the queue waits.
    const permanent =
      /\b404\b/i.test(message) ||
      /\b410\b/i.test(message) ||
      /not found/i.test(message) ||
      /Cannot process scholarship/i.test(message) ||
      /Cannot parse/i.test(message)
    const { attempts, status: newStatus } = nextStatusAfterFailedScrapeAttempt(
      queueItem.attempts,
      permanent
    )

    await supabase
      .from('scholarship_queue')
      .update({ status: newStatus, error_message: message.slice(0, 500), attempts })
      .eq('id', queueItem.id)
      .eq('status', 'processing')

    return {
      error: message,
      processed: 1,
      failed_permanent: newStatus === 'failed',
      scholarship_url: queueItem.scholarship_url,
    }
  }
}

export interface ScholarshipProcessBatchOptions {
  maxItems?: number
  /** Soft time budget (ms) — stop before starting another item. */
  budgetMs?: number
}

/** Drain up to maxItems pending rows, one at a time. */
export async function runScholarshipProcessBatch(
  supabase: SupabaseClient,
  maxItemsOrOptions: number | ScholarshipProcessBatchOptions = 10
): Promise<{ processed: number; results: ScholarshipProcessResult[]; stopped_early?: string }> {
  const options: ScholarshipProcessBatchOptions =
    typeof maxItemsOrOptions === 'number' ? { maxItems: maxItemsOrOptions } : maxItemsOrOptions

  const maxItems = Math.min(Math.max(1, Math.floor(options.maxItems ?? 10)), 25)
  const budgetMs = options.budgetMs ?? 270_000
  const startedAt = Date.now()

  const reclaimed = await reclaimStuckScholarshipQueueItems(supabase, STALE_PROCESSING_MS)
  if (reclaimed > 0) {
    console.log(`[scholarship-process] Reclaimed ${reclaimed} stuck processing item(s)`)
  }

  const results: ScholarshipProcessResult[] = []
  let processed = 0
  let stoppedEarly: string | undefined

  for (let i = 0; i < maxItems; i++) {
    const elapsed = Date.now() - startedAt
    // Headroom for the in-flight item so Vercel returns JSON, not an HTML 500.
    const reserveMs = 45_000
    if (elapsed >= budgetMs - reserveMs) {
      stoppedEarly = `Stopped after ${processed} item(s) to stay within Vercel time limits (${Math.round(
        elapsed / 1000
      )}s elapsed)`
      break
    }

    const result = await runScholarshipProcessOne(supabase)

    if (result.processed === 0 || result.message === 'No pending scholarships in queue') {
      break
    }

    results.push(result)
    processed++
    // Keep draining through duplicates, expiries and per-item failures so the
    // cron can work the backlog down in one invocation.
  }

  return { processed, results, ...(stoppedEarly ? { stopped_early: stoppedEarly } : {}) }
}
