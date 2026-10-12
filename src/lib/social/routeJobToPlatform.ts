/**
 * Exclusive job → social platform routing.
 *
 * One job is assigned to exactly one platform:
 *   LinkedIn  — featured / promoted / professional roles
 *   Instagram — visual / youth roles
 *   Facebook  — high-volume / entry roles (default)
 *
 * Cadence (enforced by autoQueueJobs, not this file):
 *   3 posts per channel per day on Buffer Free.
 */

import type { SocialPlatform } from './types'

export const SOCIAL_DAILY_CAP_PER_CHANNEL = 3
export const BUFFER_FREE_QUEUE_CAP = 10
export const SOCIAL_CANDIDATE_LOOKBACK_DAYS = 14
/** Queued posts without a dueAt are assumed gone from Buffer after this. */
export const BUFFER_QUEUE_STALE_AFTER_MS = 20 * 60 * 60 * 1000

export interface RoutableJob {
  id: string
  title: string
  job_function?: string | null
  job_functions?: string[] | null
  industry?: string | null
  experience_level?: string | null
  employment_type?: string | null
  is_featured?: boolean | null
  is_promoted?: boolean | null
  date_posted?: string | null
  created_at?: string | null
}

const PROFESSIONAL_FUNCTIONS = [
  'accounting',
  'auditing',
  'finance',
  'consulting',
  'strategy',
  'engineering',
  'technology',
  'healthcare',
  'medical',
  'human resources',
  'recruitment',
  'it & software',
  'software',
  'legal',
  'management',
  'business development',
  'product',
  'project management',
  'research',
  'banking',
  'insurance',
  'financial',
  'government',
  'public service',
  'science',
  'laboratory',
  'telecommunications',
  'data, analytics',
  'analytics',
  'architecture',
  'quality control',
]

const VISUAL_YOUTH_FUNCTIONS = [
  'creative',
  'design',
  'marketing',
  'communications',
  'hospitality',
  'leisure',
  'media',
  'advertising',
  'public relations',
  'beauty',
  'wellness',
  'fitness',
  'sports',
  'recreation',
  'travel',
  'tourism',
  'fashion',
  'catering',
  'food services',
]

const HIGH_VOLUME_FUNCTIONS = [
  'admin',
  'office',
  'customer service',
  'support',
  'driver',
  'transport',
  'manufacturing',
  'warehousing',
  'sales',
  'security',
  'trades',
  'logistics',
  'maintenance',
  'repair',
  'volunteer',
  'farming',
  'agriculture',
  'community',
  'retail',
  'fmcg',
]

const PROFESSIONAL_TITLE_RE =
  /\b(manager|director|head of|lead|senior|principal|specialist|engineer|accountant|auditor|lawyer|advocate|consultant|architect|analyst|scientist|developer|physician|doctor|lecturer|professor|actuary|underwriter|counsel|partner)\b/i

const VISUAL_TITLE_RE =
  /\b(design|designer|graphic|creative|content creator|social media|photographer|videographer|video|brand|fashion|makeup|influencer|hospitality|chef|waiter|waitress|bartender|animator|illustrator|ux|ui|art director|copywriter|stylist|beauty|media|film|music)\b/i

const YOUTH_TITLE_RE =
  /\b(intern|internship|graduate|trainee|attachment|apprentice|junior|fresh|volunteer|youth|cadet|clerk|attendant|cashier|barista|rider|messenger|receptionist|data entry|call cent(?:re|er)|promoter|casual)\b/i

const ENTRY_TITLE_RE =
  /\b(intern|assistant|casual|clerk|attendant|driver|guard|cleaner|cook|waiter|waitress|cashier|messenger|rider|promoter|sales agent)\b/i

function functionsOf(job: RoutableJob): string[] {
  const list: string[] = []
  if (Array.isArray(job.job_functions)) {
    for (const f of job.job_functions) {
      if (typeof f === 'string' && f.trim()) list.push(f.trim())
    }
  }
  if (job.job_function?.trim() && !list.includes(job.job_function.trim())) {
    list.push(job.job_function.trim())
  }
  return list
}

function haystack(job: RoutableJob): string {
  return [job.title, ...functionsOf(job), job.industry, job.employment_type, job.experience_level]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .join(' ')
    .toLowerCase()
}

function matchesAny(text: string, needles: string[]): boolean {
  return needles.some((n) => {
    if (n.includes(' ') || n.includes('&') || n.includes(',')) return text.includes(n)
    const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`).test(text)
  })
}

export function normalizeExperienceLevel(
  value: string | null | undefined
): 'entry' | 'mid' | 'senior' | 'managerial' | 'internship' | null {
  if (!value) return null
  const v = value.trim().toLowerCase()
  if (v.includes('intern')) return 'internship'
  if (v.includes('senior')) return 'senior'
  if (v.includes('manager')) return 'managerial'
  if (v.includes('entry') || v === 'junior') return 'entry'
  if (v.includes('mid')) return 'mid'
  return null
}

function isYouthEmployment(job: RoutableJob): boolean {
  const type = (job.employment_type ?? '').toUpperCase()
  return type === 'INTERN' || type === 'VOLUNTEER' || type === 'TEMPORARY'
}

/**
 * Assign a job to exactly one platform. Featured/promoted always win LinkedIn;
 * remaining jobs are classified professional → visual/youth → high-volume/entry.
 */
export function routeJobToPlatform(job: RoutableJob): SocialPlatform {
  if (job.is_featured || job.is_promoted) return 'linkedin'

  const level = normalizeExperienceLevel(job.experience_level)
  const text = haystack(job)
  const youthLevel = level === 'internship' || level === 'entry' || isYouthEmployment(job)
  const professionalLevel = level === 'senior' || level === 'managerial'
  const visualFn = matchesAny(text, VISUAL_YOUTH_FUNCTIONS)
  const professionalFn = matchesAny(text, PROFESSIONAL_FUNCTIONS)
  const highVolumeFn = matchesAny(text, HIGH_VOLUME_FUNCTIONS)
  const visualTitle = VISUAL_TITLE_RE.test(job.title)
  const youthTitle = YOUTH_TITLE_RE.test(job.title)
  const professionalTitle = PROFESSIONAL_TITLE_RE.test(job.title)
  const entryTitle = ENTRY_TITLE_RE.test(job.title)

  if (professionalLevel) return 'linkedin'
  if (visualFn || visualTitle) return 'instagram'
  if (youthLevel || youthTitle || entryTitle || highVolumeFn) {
    if (professionalTitle) return 'linkedin'
    return 'facebook'
  }
  if (professionalFn || professionalTitle || level === 'mid') return 'linkedin'
  return 'facebook'
}

export function rankJobForPlatform(job: RoutableJob, platform: SocialPlatform): number {
  const level = normalizeExperienceLevel(job.experience_level)
  const text = haystack(job)
  let score = 0
  if (job.is_featured) score += 1000
  if (job.is_promoted) score += 500

  if (platform === 'linkedin') {
    if (level === 'managerial') score += 250
    if (level === 'senior') score += 200
    if (level === 'mid') score += 80
    if (matchesAny(text, PROFESSIONAL_FUNCTIONS)) score += 100
    if (PROFESSIONAL_TITLE_RE.test(job.title)) score += 60
  } else if (platform === 'instagram') {
    if (matchesAny(text, VISUAL_YOUTH_FUNCTIONS)) score += 200
    if (VISUAL_TITLE_RE.test(job.title)) score += 120
    if (level === 'internship' || level === 'entry' || isYouthEmployment(job)) score += 100
    if (YOUTH_TITLE_RE.test(job.title)) score += 60
  } else {
    if (level === 'internship' || level === 'entry' || isYouthEmployment(job)) score += 200
    if (matchesAny(text, HIGH_VOLUME_FUNCTIONS)) score += 100
    if (ENTRY_TITLE_RE.test(job.title) || YOUTH_TITLE_RE.test(job.title)) score += 60
  }

  const posted = job.date_posted || job.created_at
  if (posted) {
    const ageMs = Date.now() - new Date(posted).getTime()
    const ageDays = Number.isFinite(ageMs) ? ageMs / (24 * 60 * 60 * 1000) : 30
    score += Math.max(0, Math.round(120 - ageDays * 8))
  }
  return score
}

export function nairobiDayBounds(now = new Date()): { start: Date; end: Date } {
  const eatMs = now.getTime() + 3 * 60 * 60 * 1000
  const eat = new Date(eatMs)
  const startUtc = Date.UTC(eat.getUTCFullYear(), eat.getUTCMonth(), eat.getUTCDate(), 0, 0, 0, 0) - 3 * 60 * 60 * 1000
  return { start: new Date(startUtc), end: new Date(startUtc + 24 * 60 * 60 * 1000) }
}

export function remainingDailySlots(
  todayCount: number,
  scheduledCount: number,
  dailyCap = SOCIAL_DAILY_CAP_PER_CHANNEL,
  queueCap = BUFFER_FREE_QUEUE_CAP
): number {
  const dailyLeft = dailyCap - todayCount
  const queueLeft = queueCap - scheduledCount
  return Math.max(0, Math.min(dailyLeft, queueLeft, dailyCap))
}

/**
 * True when a Careersasa "scheduled" row is still waiting in Buffer's queue.
 *
 * Auto-queue uses Buffer addToQueue and stores status=scheduled. Buffer then
 * publishes at 08:00 / 12:30 / 17:00 EAT, but we never flip the row to
 * published. Counting every historical scheduled row against the Free-plan
 * 10-slot cap makes the cron silently queue nothing after a few days.
 */
export function occupiesBufferQueue(
  row: { scheduled_at?: string | null; created_at?: string | null },
  now = new Date()
): boolean {
  if (row.scheduled_at) {
    const due = new Date(row.scheduled_at).getTime()
    if (Number.isFinite(due)) return due > now.getTime()
  }
  if (!row.created_at) return false
  const created = new Date(row.created_at).getTime()
  if (!Number.isFinite(created)) return false
  return now.getTime() - created < BUFFER_QUEUE_STALE_AFTER_MS
}

export function countsTowardToday(
  timestamps: { created_at?: string | null; scheduled_at?: string | null; published_at?: string | null },
  bounds: { start: Date; end: Date }
): boolean {
  const raw = timestamps.created_at
  if (!raw) return false
  const ms = new Date(raw).getTime()
  if (!Number.isFinite(ms)) return false
  return ms >= bounds.start.getTime() && ms < bounds.end.getTime()
}

export interface ChannelSlots {
  todayCount: number
  scheduledCount: number
}

/**
 * Pick up to `remaining` unused jobs per platform. Each job appears in at most
 * one platform list.
 */
export function selectJobsForQueue(
  jobs: RoutableJob[],
  usedJobIds: Set<string>,
  remaining: Record<SocialPlatform, number>
): Record<SocialPlatform, RoutableJob[]> {
  const buckets: Record<SocialPlatform, RoutableJob[]> = {
    linkedin: [],
    facebook: [],
    instagram: [],
  }
  const claimed = new Set<string>()

  for (const job of jobs) {
    if (!job.id || usedJobIds.has(job.id) || claimed.has(job.id)) continue
    const platform = routeJobToPlatform(job)
    claimed.add(job.id)
    buckets[platform].push(job)
  }

  const picked: Record<SocialPlatform, RoutableJob[]> = {
    linkedin: [],
    facebook: [],
    instagram: [],
  }
  for (const platform of ['linkedin', 'facebook', 'instagram'] as SocialPlatform[]) {
    const cap = remaining[platform] ?? 0
    picked[platform] = buckets[platform]
      .slice()
      .sort((a, b) => {
        const rank = rankJobForPlatform(b, platform) - rankJobForPlatform(a, platform)
        if (rank !== 0) return rank
        const aDate = a.date_posted || a.created_at || ''
        const bDate = b.date_posted || b.created_at || ''
        return bDate.localeCompare(aDate)
      })
      .slice(0, cap)
  }
  return picked
}

export function slotsFromCounts(
  counts: Record<SocialPlatform, ChannelSlots>,
  dailyCap = SOCIAL_DAILY_CAP_PER_CHANNEL
): Record<SocialPlatform, number> {
  return {
    linkedin: remainingDailySlots(counts.linkedin.todayCount, counts.linkedin.scheduledCount, dailyCap),
    facebook: remainingDailySlots(counts.facebook.todayCount, counts.facebook.scheduledCount, dailyCap),
    instagram: remainingDailySlots(counts.instagram.todayCount, counts.instagram.scheduledCount, dailyCap),
  }
}
