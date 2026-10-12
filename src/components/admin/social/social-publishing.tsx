'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Loader2, Plug, RefreshCw, Send, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { authedFetch } from './api'
import { BufferSettings } from './buffer-settings'
import { JobPicker } from './job-picker'
import { PostComposer, type ComposerState } from './post-composer'
import { PostsTable } from './posts-table'
import type { BufferStatusDTO, SocialPostDTO } from '@/lib/social/types'

type TabKey = 'generate' | 'drafts' | 'scheduled' | 'published'

interface Counts {
  draft: number
  ready: number
  scheduled: number
  published: number
  failed: number
}

const EMPTY_COUNTS: Counts = { draft: 0, ready: 0, scheduled: 0, published: 0, failed: 0 }

const TAB_STATUSES: Record<Exclude<TabKey, 'generate'>, SocialPostDTO['status'][]> = {
  drafts: ['draft', 'ready', 'failed'],
  scheduled: ['scheduled'],
  published: ['published'],
}

export function SocialPublishing() {
  const [activeTab, setActiveTab] = useState<TabKey>('generate')
  const [bufferStatus, setBufferStatus] = useState<BufferStatusDTO | null>(null)
  const [bufferOpen, setBufferOpen] = useState(false)
  const [posts, setPosts] = useState<SocialPostDTO[]>([])
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [composer, setComposer] = useState<ComposerState | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)

  const loadBufferStatus = useCallback(async () => {
    try {
      const status = await authedFetch<BufferStatusDTO>('/api/admin/social/buffer')
      setBufferStatus(status)
    } catch {
      // Non-fatal — publishing flows surface their own connection errors.
    }
  }, [])

  const loadCounts = useCallback(async () => {
    try {
      const result = await authedFetch<{ counts: Counts }>('/api/admin/social/posts?limit=1')
      if (result.counts) setCounts(result.counts)
    } catch {
      // Non-fatal — tab loads surface their own errors.
    }
  }, [])

  const loadPosts = useCallback(async (tab: TabKey) => {
    if (tab === 'generate') {
      setPosts([])
      return
    }
    setLoadingPosts(true)
    try {
      const statuses = TAB_STATUSES[tab as Exclude<TabKey, 'generate'>]
      const result = await authedFetch<{ posts: SocialPostDTO[]; counts: Counts }>(
        `/api/admin/social/posts?status=${statuses.join(',')}&limit=100`
      )
      setPosts(result.posts ?? [])
      if (result.counts) setCounts(result.counts)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load posts')
    } finally {
      setLoadingPosts(false)
    }
  }, [])

  useEffect(() => {
    loadBufferStatus()
    loadCounts()
  }, [loadBufferStatus, loadCounts])

  useEffect(() => {
    loadPosts(activeTab)
  }, [activeTab, loadPosts])

  const handleChanged = useCallback(() => {
    loadPosts(activeTab)
    loadCounts()
    loadBufferStatus()
  }, [activeTab, loadPosts, loadCounts, loadBufferStatus])

  const handleGenerate = (ids: string[]) => {
    setComposer({ mode: 'generate', jobIds: ids })
    setComposerOpen(true)
  }

  const handleEdit = (post: SocialPostDTO) => {
    setComposer({ mode: 'edit', post })
    setComposerOpen(true)
  }

  const draftsCount = counts.draft + counts.ready + counts.failed

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mb-2 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Admin Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Social Publishing</h1>
          <p className="text-muted-foreground mt-1">
            Select jobs, generate platform-ready posts and send them through Buffer — LinkedIn, Facebook
            and Instagram. Vercel Cron also fills up to 3 exclusive posts per channel each Nairobi day
            (featured/professional → LinkedIn, visual/youth → Instagram, high-volume/entry → Facebook).
            Set three posting times per channel in Buffer so the queue actually publishes.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {bufferStatus?.connected ? (
            <Badge className="justify-center bg-[#0A66C2] hover:bg-[#084f96] px-3 py-1.5">
              <Plug className="mr-1 h-3.5 w-3.5" /> Buffer connected
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="justify-center border-[#F97316] text-[#F97316] px-3 py-1.5"
            >
              <Plug className="mr-1 h-3.5 w-3.5" /> Buffer not connected
            </Badge>
          )}
          <Button variant="outline" onClick={() => setBufferOpen(true)}>
            <Plug className="mr-2 h-4 w-4" /> Buffer Settings
          </Button>
          <Button
            className="bg-[#F97316] hover:bg-[#ea6c0c]"
            onClick={() => setActiveTab('generate')}
          >
            <Sparkles className="mr-2 h-4 w-4" /> Generate Posts
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Drafts" value={counts.draft} tone="orange" />
        <StatCard label="Ready" value={counts.ready} tone="blue" />
        <StatCard label="Scheduled" value={counts.scheduled} tone="blue" />
        <StatCard label="Published" value={counts.published} tone="blue" />
        <StatCard label="Failed" value={counts.failed} tone="red" />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsList className="w-full sm:w-auto flex-wrap h-auto">
          <TabsTrigger value="generate" className="flex-1 sm:flex-none">
            <Sparkles className="mr-1.5 h-4 w-4" /> Generate Posts
          </TabsTrigger>
          <TabsTrigger value="drafts" className="flex-1 sm:flex-none">
            Drafts {draftsCount > 0 && <Badge variant="secondary" className="ml-1.5">{draftsCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex-1 sm:flex-none">
            Scheduled{' '}
            {counts.scheduled > 0 && <Badge variant="secondary" className="ml-1.5">{counts.scheduled}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="published" className="flex-1 sm:flex-none">
            Published{' '}
            {counts.published > 0 && <Badge variant="secondary" className="ml-1.5">{counts.published}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-4 space-y-4">
          <JobPicker
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onGenerate={handleGenerate}
          />
          {selectedIds.size > 0 && (
            <p className="text-xs text-muted-foreground">
              <Send className="mr-1 inline h-3.5 w-3.5" />
              Posts are generated from data already in the job database — no invented salary,
              qualifications, benefits or deadlines.
            </p>
          )}
        </TabsContent>

        <TabsContent value="drafts" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Today&apos;s queue</h2>
                  <p className="text-sm text-muted-foreground">
                    Drafts, ready-to-send and failed posts. Preview, edit, schedule or publish each one.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleChanged}>
                  <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
                </Button>
              </div>
              <PostsTable
                posts={posts}
                loading={loadingPosts}
                emptyMessage="No draft posts yet. Use Generate Posts to create copy from your active jobs."
                bufferStatus={bufferStatus}
                onOpenSettings={() => setBufferOpen(true)}
                onChanged={handleChanged}
                onEdit={handleEdit}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Scheduled posts</h2>
                <p className="text-sm text-muted-foreground">
                  Posts queued in Buffer. You can cancel a scheduled post here.
                </p>
              </div>
              <PostsTable
                posts={posts}
                loading={loadingPosts}
                emptyMessage="Nothing scheduled. Send a post with Schedule to see it here."
                bufferStatus={bufferStatus}
                onOpenSettings={() => setBufferOpen(true)}
                onChanged={handleChanged}
                onEdit={handleEdit}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="published" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Published posts</h2>
                <p className="text-sm text-muted-foreground">
                  Posts sent through Buffer. Manage further reposts from the Generate Posts tab.
                </p>
              </div>
              <PostsTable
                posts={posts}
                loading={loadingPosts}
                emptyMessage="Nothing published yet."
                bufferStatus={bufferStatus}
                onOpenSettings={() => setBufferOpen(true)}
                onChanged={handleChanged}
                onEdit={handleEdit}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <BufferSettings
        open={bufferOpen}
        onOpenChange={setBufferOpen}
        status={bufferStatus}
        onStatusChange={setBufferStatus}
      />

      <PostComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        state={composer}
        bufferStatus={bufferStatus}
        onChanged={handleChanged}
      />
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'orange' | 'red' }) {
  const toneClass =
    tone === 'orange'
      ? 'text-[#F97316]'
      : tone === 'red'
        ? 'text-destructive'
        : 'text-[#0A66C2]'
  return (
    <Card>
      <CardContent className="pt-6">
        <div className={`text-2xl font-bold ${toneClass}`}>{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  )
}
