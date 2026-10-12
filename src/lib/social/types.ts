/**
 * Shared types for the Social Publishing module.
 */

export type SocialPlatform = 'linkedin' | 'facebook' | 'instagram'

export type SocialPostStatus =
  | 'draft'
  | 'ready'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled'

export interface SocialPostDTO {
  id: string
  job_id: string | null
  platform: SocialPlatform
  channel_id: string | null
  channel_service: string | null
  channel_name: string | null
  post_text: string
  media_url: string | null
  status: SocialPostStatus
  scheduled_at: string | null
  published_at: string | null
  buffer_post_id: string | null
  created_by: string | null
  error_message: string | null
  is_repost: boolean
  created_at: string
  updated_at: string
  job: {
    id: string
    title: string
    company: string
    location: string
    job_slug: string | null
    slug: string | null
  } | null
}

/** Subset of job fields used by the social picker list. */
export interface EligibleJob {
  id: string
  title: string
  company: string
  hiring_organization_name: string | null
  location: string
  job_location_county: string | null
  job_location_city: string | null
  location_town: string | null
  job_function: string | null
  job_functions: string[] | null
  industry: string | null
  is_featured: boolean | null
  is_promoted: boolean | null
  employment_type: string | null
  date_posted: string | null
  created_at: string
  job_slug: string | null
  slug: string | null
}

export interface JobFilters {
  search?: string
  job_function?: string
  location?: string
  employer?: string
  date_from?: string
  date_to?: string
  featured_only?: boolean
  page?: number
  page_size?: number
}

export interface BufferChannel {
  id: string
  name: string
  service: string
  avatar: string | null
  isQueuePaused: boolean | null
}

export interface BufferAccountInfo {
  id: string
  email: string
  name: string
  organizations: { id: string; name: string }[]
}

export interface BufferStatusDTO {
  connected: boolean
  /** Where the active key comes from: 'env' | 'db' | null */
  key_source: 'env' | 'db' | null
  account: {
    name: string | null
    email: string | null
    organization_id: string | null
    organization_name: string | null
  } | null
  channels: BufferChannel[]
  configured_via_env: boolean
}

export type PublishMode = 'now' | 'schedule' | 'queue'
