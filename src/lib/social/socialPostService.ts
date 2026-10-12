/**
 * Social Post Service — the single orchestration layer between the admin UI,
 * the social_posts database, and the Buffer adapter.
 *
 * Flow:  Admin UI → Social Post Service → Buffer Adapter → Buffer GraphQL API.
 *
 * Buffer failures are contained here: a failed send only marks the social post
 * as failed and never touches job publishing or the public site.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  bufferCreatePost,
  bufferDeletePost,
  bufferGetAccount,
  bufferListChannels,
  BufferApiError,
  resolveBufferApiKey,
  warmPublicImageUrl,
} from './bufferAdapter'
import { generatePostCopy, jobOgImageUrl, type JobForCopy } from './socialPostCopy'
import type {
  BufferChannel,
  BufferStatusDTO,
  EligibleJob,
  JobFilters,
  PublishMode,
  SocialPlatform,
  SocialPostDTO,
} from './types'

const POSTS_PER_PAGE_DEFAULT = 50

export interface PostListResult {
  posts: SocialPostDTO[]
  counts: { draft: number; ready: number; scheduled: number; published: number; failed: number }
}

export interface PublishOutcome {
  ok: boolean
  post: SocialPostDTO | null
  duplicate: {
    id: string
    platform: SocialPlatform
    status: string
    created_at: string
  } | null
  error: string | null
}

// ---------------------------------------------------------------------------
// Jobs picker
// ---------------------------------------------------------------------------

const ELIGIBLE_JOB_SELECT = [
  'id',
  'title',
  'company',
  'hiring_organization_name',
  'location',
  'job_location_county',
  'job_location_city',
  'location_town',
  'job_function',
  'job_functions',
  'industry',
  'is_featured',
  'is_promoted',
  'employment_type',
  'date_posted',
  'created_at',
  'job_slug',
  'slug',
].join(', ')

export async function listEligibleJobs(
  adminClient: SupabaseClient,
  filters: JobFilters = {}
): Promise<{ jobs: EligibleJob[]; total: number }> {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filters.page_size ?? POSTS_PER_PAGE_DEFAULT))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = adminClient
    .from('jobs')
    .select(ELIGIBLE_JOB_SELECT, { count: 'exact' })
    .eq('status', 'active')

  if (filters.search?.trim()) {
    const q = `%${filters.search.trim()}%`
    query = query.or(`title.ilike.${q},company.ilike.${q},hiring_organization_name.ilike.${q}`)
  }
  if (filters.job_function?.trim()) {
    // Strip characters that would break the PostgREST .or()/contains syntax.
    const fn = filters.job_function.trim().replace(/["\\,]/g, '')
    query = query.or(`job_function.ilike.%${fn}%,job_functions.cs.{"${fn}"}`)
  }
  if (filters.location?.trim()) {
    const q = `%${filters.location.trim()}%`
    query = query.or(
      `location.ilike.${q},location_town.ilike.${q},job_location_city.ilike.${q},job_location_county.ilike.${q}`
    )
  }
  if (filters.employer?.trim()) {
    const q = `%${filters.employer.trim()}%`
    query = query.or(`company.ilike.${q},hiring_organization_name.ilike.${q}`)
  }
  if (filters.date_from) {
    query = query.gte('date_posted', filters.date_from)
  }
  if (filters.date_to) {
    query = query.lte('date_posted', filters.date_to)
  }
  if (filters.featured_only) {
    query = query.eq('is_featured', true)
  }

  query = query
    .order('is_featured', { ascending: false, nullsFirst: false })
    .order('date_posted', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  const { data, error, count } = await query
  if (error) {
    console.error('[socialPostService] listEligibleJobs error:', error.message)
    throw new Error('Failed to load eligible jobs')
  }
  return { jobs: (data ?? []) as unknown as EligibleJob[], total: count ?? 0 }
}

// ---------------------------------------------------------------------------
// Posts CRUD
// ---------------------------------------------------------------------------

const POST_SELECT = [
  '*',
  'job:jobs(id,title,company,location,job_slug,slug)',
].join(',')

function mapPostRow(row: Record<string, unknown>): SocialPostDTO {
  return {
    id: row.id as string,
    job_id: (row.job_id as string | null) ?? null,
    platform: row.platform as SocialPlatform,
    channel_id: (row.channel_id as string | null) ?? null,
    channel_service: (row.channel_service as string | null) ?? null,
    channel_name: (row.channel_name as string | null) ?? null,
    post_text: row.post_text as string,
    media_url: (row.media_url as string | null) ?? null,
    status: row.status as SocialPostDTO['status'],
    scheduled_at: (row.scheduled_at as string | null) ?? null,
    published_at: (row.published_at as string | null) ?? null,
    buffer_post_id: (row.buffer_post_id as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    error_message: (row.error_message as string | null) ?? null,
    is_repost: (row.is_repost as boolean) ?? false,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    job: row.job
      ? {
          id: (row.job as { id: string }).id,
          title: (row.job as { title: string }).title,
          company: (row.job as { company: string }).company,
          location: (row.job as { location: string }).location,
          job_slug: (row.job as { job_slug: string | null }).job_slug ?? null,
          slug: (row.job as { slug: string | null }).slug ?? null,
        }
      : null,
  }
}

export async function listPosts(
  adminClient: SupabaseClient,
  opts: { statuses?: SocialPostDTO['status'][]; limit?: number } = {}
): Promise<PostListResult> {
  const statuses = opts.statuses?.length ? opts.statuses : undefined
  const limit = Math.min(200, Math.max(1, opts.limit ?? POSTS_PER_PAGE_DEFAULT))

  let query = adminClient.from('social_posts').select(POST_SELECT)
  if (statuses?.length === 1) {
    query = query.eq('status', statuses[0])
  } else if (statuses?.length) {
    query = query.in('status', statuses)
  }
  const { data, error } = await query
    .order('scheduled_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[socialPostService] listPosts error:', error.message)
    throw new Error('Failed to load social posts')
  }

  const posts = ((data ?? []) as unknown as Record<string, unknown>[]).map(mapPostRow)

  const countBuckets: SocialPostDTO['status'][] = [
    'draft',
    'ready',
    'scheduled',
    'published',
    'failed',
  ]
  const counts: PostListResult['counts'] = {
    draft: 0,
    ready: 0,
    scheduled: 0,
    published: 0,
    failed: 0,
  }
  await Promise.all(
    countBuckets.map(async (status) => {
      const { count } = await adminClient
        .from('social_posts')
        .select('id', { count: 'exact', head: true })
        .eq('status', status)
      counts[status] = count ?? 0
    })
  )

  return { posts, counts }
}

export interface CreatePostInput {
  job_id?: string | null
  platform: SocialPlatform
  post_text: string
  media_url?: string | null
  status?: SocialPostDTO['status']
  is_repost?: boolean
}

export async function createPost(
  adminClient: SupabaseClient,
  userId: string | null,
  input: CreatePostInput
): Promise<SocialPostDTO> {
  const { data, error } = await adminClient
    .from('social_posts')
    .insert({
      job_id: input.job_id ?? null,
      platform: input.platform,
      post_text: input.post_text,
      media_url: input.media_url ?? null,
      status: input.status ?? 'draft',
      is_repost: input.is_repost ?? false,
      created_by: userId || null,
    })
    .select(POST_SELECT)
    .single()

  if (error) {
    console.error('[socialPostService] createPost error:', error.message)
    throw new Error('Failed to save social post')
  }
  return mapPostRow(data as unknown as Record<string, unknown>)
}

export async function getPost(
  adminClient: SupabaseClient,
  postId: string
): Promise<SocialPostDTO> {
  const { data, error } = await adminClient
    .from('social_posts')
    .select(POST_SELECT)
    .eq('id', postId)
    .single()
  if (error || !data) {
    throw new Error('Social post not found')
  }
  return mapPostRow(data as unknown as Record<string, unknown>)
}

export async function updatePost(
  adminClient: SupabaseClient,
  postId: string,
  patch: {
    post_text?: string
    media_url?: string | null
    platform?: SocialPlatform
    scheduled_at?: string | null
  }
): Promise<SocialPostDTO> {
  const { data, error } = await adminClient
    .from('social_posts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', postId)
    .select(POST_SELECT)
    .single()
  if (error) {
    console.error('[socialPostService] updatePost error:', error.message)
    throw new Error('Failed to update social post')
  }
  return mapPostRow(data as unknown as Record<string, unknown>)
}

export async function deletePost(
  adminClient: SupabaseClient,
  postId: string
): Promise<void> {
  const { error } = await adminClient.from('social_posts').delete().eq('id', postId)
  if (error) {
    console.error('[socialPostService] deletePost error:', error.message)
    throw new Error('Failed to delete social post')
  }
}

// ---------------------------------------------------------------------------
// Duplicate protection
// ---------------------------------------------------------------------------

/**
 * Find an existing post for the same job + platform that still counts as
 * published/queued (drafts, failures and cancellations do not block a repost).
 */
export async function findActiveDuplicate(
  adminClient: SupabaseClient,
  jobId: string | null,
  platform: SocialPlatform,
  excludePostId?: string
): Promise<SocialPostDTO | null> {
  if (!jobId) return null
  let query = adminClient
    .from('social_posts')
    .select(POST_SELECT)
    .eq('job_id', jobId)
    .eq('platform', platform)
    .in('status', ['ready', 'scheduled', 'publishing', 'published'])
  if (excludePostId) {
    query = query.neq('id', excludePostId)
  }
  const { data, error } = await query.limit(1)
  if (error) {
    console.error('[socialPostService] findActiveDuplicate error:', error.message)
    return null
  }
  return data?.length ? mapPostRow(data[0] as unknown as Record<string, unknown>) : null
}

// ---------------------------------------------------------------------------
// Publish / schedule via Buffer
// ---------------------------------------------------------------------------

async function channelNameMap(
  adminClient: SupabaseClient,
  channels: BufferChannel[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  for (const c of channels) map.set(c.id, c.name)
  if (map.size === 0) {
    const cached = await getCachedChannels(adminClient)
    for (const c of cached) map.set(c.id, c.name)
  }
  return map
}

async function getCachedChannels(adminClient: SupabaseClient): Promise<BufferChannel[]> {
  const { data } = await adminClient
    .from('buffer_config')
    .select('channels_json')
    .eq('id', 1)
    .maybeSingle()
  if (Array.isArray(data?.channels_json)) return data.channels_json as BufferChannel[]
  return []
}

export interface PublishInput {
  postId: string
  channelId: string
  mode: PublishMode
  dueAt?: string | null
  isRepost?: boolean
}

export async function publishToBuffer(
  adminClient: SupabaseClient,
  input: PublishInput
): Promise<PublishOutcome> {
  const post = await getPost(adminClient, input.postId)

  // 1. State guard — already sent posts can't be sent again.
  if (post.status === 'published' || post.status === 'scheduled') {
    return { ok: false, post: null, duplicate: null, error: 'This post was already sent to Buffer.' }
  }
  if (post.status === 'publishing') {
    return { ok: false, post: null, duplicate: null, error: 'This post is currently being sent. Refresh in a moment.' }
  }

  // 2. Duplicate protection (unless the admin explicitly chose to repost).
  if (!input.isRepost) {
    const dup = await findActiveDuplicate(adminClient, post.job_id, post.platform, post.id)
    if (dup) {
      return {
        ok: false,
        post: null,
        duplicate: { id: dup.id, platform: dup.platform, status: dup.status, created_at: dup.created_at },
        error: null,
      }
    }
  }

  if (!post.post_text?.trim()) {
    return {
      ok: false,
      post: null,
      duplicate: null,
      error: 'This post has no text. Add a caption before sending to Buffer.',
    }
  }

  // 3. Resolve the Buffer key server-side.
  const resolved = await resolveBufferApiKey(adminClient)
  if (!resolved) {
    return { ok: false, post: null, duplicate: null, error: 'Buffer is not connected. Connect Buffer in Social Publishing settings first.' }
  }

  const channels = await listChannelsForPublish(adminClient, resolved.apiKey)
  const names = await channelNameMap(adminClient, channels)
  const channel = channels.find((c) => c.id === input.channelId)
  const channelName = channel?.name ?? names.get(input.channelId) ?? null
  const channelService = channel?.service ?? post.platform

  // 4. Mark publishing so a double-click can't fire twice.
  await adminClient
    .from('social_posts')
    .update({ status: 'publishing', updated_at: new Date().toISOString() })
    .eq('id', post.id)

  try {
    const mediaUrl = post.media_url?.trim() || (post.job ? jobOgImageUrl(post.job) : null)
    if (mediaUrl) {
      const warmed = await warmPublicImageUrl(mediaUrl)
      if (!warmed) {
        console.warn('[socialPostService] OG image warm failed, sending URL to Buffer anyway:', mediaUrl)
      }
    }

    const created = await bufferCreatePost(resolved.apiKey, {
      channelId: input.channelId,
      text: post.post_text,
      mode: input.mode,
      dueAt: input.mode === 'schedule' ? input.dueAt : null,
      channelName,
      service: channelService,
      mediaUrl,
      linkTitle: post.job?.title ?? null,
      linkDescription: post.job
        ? `${post.job.title} at ${post.job.company} — ${post.job.location}`
        : null,
    })

    const isNow = input.mode === 'now'
    const patch: Record<string, unknown> = {
      status: 'scheduled',
      buffer_post_id: created.id,
      channel_id: input.channelId,
      channel_service: channelService,
      channel_name: channelName,
      scheduled_at: created.dueAt ?? (input.mode === 'schedule' ? input.dueAt : null),
      published_at: isNow ? new Date().toISOString() : null,
      error_message: null,
      is_repost: input.isRepost ?? post.is_repost,
      updated_at: new Date().toISOString(),
    }
    if (isNow) patch.status = 'published'

    const { data, error } = await adminClient
      .from('social_posts')
      .update(patch)
      .eq('id', post.id)
      .select(POST_SELECT)
      .single()
    if (error) {
      console.error('[socialPostService] publish post-update error:', error.message)
      return { ok: false, post: null, duplicate: null, error: 'Sent to Buffer but failed to update the post record.' }
    }
    return { ok: true, post: mapPostRow(data as unknown as Record<string, unknown>), duplicate: null, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Buffer failed to create the post'
    await adminClient
      .from('social_posts')
      .update({
        status: 'failed',
        error_message: message.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq('id', post.id)
    console.error('[socialPostService] publishToBuffer failed:', message)
    return { ok: false, post: null, duplicate: null, error: message }
  }
}

/** Live channel list for a connected key (used when publishing). */
export async function listChannelsForPublish(
  adminClient: SupabaseClient,
  apiKey: string
): Promise<BufferChannel[]> {
  const { data } = await adminClient
    .from('buffer_config')
    .select('organization_id')
    .eq('id', 1)
    .maybeSingle()
  const orgId = data?.organization_id
  if (!orgId) return []
  return bufferListChannels(apiKey, orgId)
}

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

export async function cancelPost(
  adminClient: SupabaseClient,
  postId: string
): Promise<SocialPostDTO> {
  const post = await getPost(adminClient, postId)
  if (post.status === 'published') {
    throw new Error('A published post cannot be cancelled from Careersasa — delete it from Buffer directly.')
  }

  // Best-effort removal from Buffer (only queued/scheduled posts can be deleted).
  if (post.buffer_post_id && (post.status === 'scheduled' || post.status === 'ready')) {
    try {
      const resolved = await resolveBufferApiKey(adminClient)
      if (resolved) {
        await bufferDeletePost(resolved.apiKey, post.buffer_post_id)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Buffer delete failed'
      console.error('[socialPostService] cancelPost buffer delete failed:', message)
      // Non-blocking: still cancel locally; log the remote failure on the record.
      const { data, error } = await adminClient
        .from('social_posts')
        .update({
          status: 'cancelled',
          error_message: `Cancelled locally; could not remove from Buffer: ${message.slice(0, 300)}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id)
        .select(POST_SELECT)
        .single()
      if (error) throw new Error('Failed to cancel social post')
      return mapPostRow(data as unknown as Record<string, unknown>)
    }
  }

  const { data, error } = await adminClient
    .from('social_posts')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', post.id)
    .select(POST_SELECT)
    .single()
  if (error) {
    console.error('[socialPostService] cancelPost error:', error.message)
    throw new Error('Failed to cancel social post')
  }
  return mapPostRow(data as unknown as Record<string, unknown>)
}

// ---------------------------------------------------------------------------
// Buffer connection / status
// ---------------------------------------------------------------------------

export async function getBufferStatus(adminClient: SupabaseClient): Promise<BufferStatusDTO> {
  const resolved = await resolveBufferApiKey(adminClient)
  const { data } = await adminClient
    .from('buffer_config')
    .select('api_key, account_name, account_email, organization_id, channels_json, connected_at')
    .eq('id', 1)
    .maybeSingle()

  let channels = Array.isArray(data?.channels_json)
    ? (data.channels_json as BufferChannel[])
    : []
  let accountName = (data?.account_name as string | null) ?? null
  let accountEmail = (data?.account_email as string | null) ?? null
  let organizationId = (data?.organization_id as string | null) ?? null

  if (!resolved) {
    return {
      connected: false,
      key_source: null,
      account: null,
      channels: [],
      configured_via_env: false,
    }
  }

  // When the key is configured via BUFFER_API_KEY the channels are never
  // cached (connectBuffer is not called), so the send dialog would show an
  // empty channel list. Bootstrap account + channels from Buffer on demand
  // and cache them; once cached, later status calls read the cache.
  if (!organizationId || channels.length === 0) {
    try {
      const account = await bufferGetAccount(resolved.apiKey)
      const organization = account.organizations?.[0]
      if (organization) {
        organizationId = organization.id
        channels = await bufferListChannels(resolved.apiKey, organization.id)
        accountName = account.name ?? accountName
        accountEmail = account.email ?? accountEmail
        await adminClient.from('buffer_config').upsert({
          id: 1,
          // Only persist a DB-stored key; an env key stays out of the database.
          api_key: resolved.source === 'db' ? resolved.apiKey : (data?.api_key ?? null),
          account_name: account.name,
          account_email: account.email,
          organization_id: organization.id,
          channels_json: channels,
          connected_at: data?.connected_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    } catch (err: unknown) {
      console.error('[socialPostService] getBufferStatus bootstrap failed:', err)
    }
  }

  return {
    connected: true,
    key_source: resolved.source,
    account: {
      name: accountName,
      email: accountEmail,
      organization_id: organizationId,
      organization_name: null,
    },
    channels,
    configured_via_env: resolved.source === 'env',
  }
}

export async function connectBuffer(
  adminClient: SupabaseClient,
  apiKey: string
): Promise<BufferStatusDTO> {
  const key = apiKey.trim()
  if (key.length < 20) {
    throw new Error('That does not look like a valid Buffer API key.')
  }

  let account
  try {
    account = await bufferGetAccount(key)
  } catch (err: unknown) {
    if (err instanceof BufferApiError) throw err
    throw new Error('Could not reach the Buffer API. Check the key and try again.')
  }

  const organization = account.organizations?.[0]
  if (!organization) {
    throw new Error('Your Buffer account has no organization. Create one in Buffer first.')
  }

  const channels = await bufferListChannels(key, organization.id)

  await adminClient
    .from('buffer_config')
    .upsert({
      id: 1,
      api_key: key,
      account_name: account.name,
      account_email: account.email,
      organization_id: organization.id,
      channels_json: channels,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

  return {
    connected: true,
    key_source: 'db',
    account: {
      name: account.name,
      email: account.email,
      organization_id: organization.id,
      organization_name: organization.name,
    },
    channels,
    configured_via_env: false,
  }
}

export async function disconnectBuffer(
  adminClient: SupabaseClient
): Promise<BufferStatusDTO> {
  await adminClient
    .from('buffer_config')
    .upsert({
      id: 1,
      api_key: null,
      account_name: null,
      account_email: null,
      organization_id: null,
      channels_json: [],
      connected_at: null,
      updated_at: new Date().toISOString(),
    })
  return getBufferStatus(adminClient)
}

export async function refreshBufferChannels(
  adminClient: SupabaseClient
): Promise<BufferChannel[]> {
  const resolved = await resolveBufferApiKey(adminClient)
  if (!resolved) throw new Error('Buffer is not connected')

  const { data } = await adminClient
    .from('buffer_config')
    .select('organization_id')
    .eq('id', 1)
    .maybeSingle()

  // Env-key connections bootstrap account/channels on first status read; make
  // sure the org id exists before calling Buffer.
  if (!data?.organization_id) {
    await getBufferStatus(adminClient)
  }

  const { data: refreshed } = await adminClient
    .from('buffer_config')
    .select('organization_id')
    .eq('id', 1)
    .maybeSingle()
  if (!refreshed?.organization_id) {
    throw new Error('Buffer organization not set — reconnect Buffer.')
  }

  const channels = await bufferListChannels(resolved.apiKey, refreshed.organization_id)
  await adminClient
    .from('buffer_config')
    .update({
      channels_json: channels,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
  return channels
}

// ---------------------------------------------------------------------------
// Post generation (copy)
// ---------------------------------------------------------------------------

export interface GenerateInput {
  job_ids: string[]
  platform: SocialPlatform
}

export async function generatePosts(
  adminClient: SupabaseClient,
  userId: string,
  input: GenerateInput
): Promise<SocialPostDTO[]> {
  const ids = input.job_ids.filter(Boolean)
  if (ids.length === 0) throw new Error('Select at least one job first.')

  const { data: rows, error } = await adminClient
    .from('jobs')
    .select('*')
    .in('id', ids)
  if (error || !rows?.length) {
    console.error('[socialPostService] generatePosts job fetch error:', error?.message)
    throw new Error('Could not load the selected jobs.')
  }

  const created: SocialPostDTO[] = []
  for (const row of rows) {
    const job = row as unknown as JobForCopy & { id: string }
    const copy = await generatePostCopy(job, input.platform)

    const mediaUrl = jobOgImageUrl(job)

    created.push(
      await createPost(adminClient, userId, {
        job_id: job.id,
        platform: input.platform,
        post_text: copy.text,
        media_url: mediaUrl,
        status: 'ready',
      })
    )
  }
  return created
}
