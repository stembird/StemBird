'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { AlertTriangle, Loader2, RefreshCw, Send } from 'lucide-react'
import { toast } from 'sonner'
import { authedFetch } from './api'
import { PLATFORM_LABELS, formatDateTime } from './format'
import type { BufferChannel, BufferStatusDTO, PublishMode, SocialPostDTO } from '@/lib/social/types'

interface Props {
  post: SocialPostDTO
  defaultMode?: PublishMode
  onClose: () => void
  bufferStatus: BufferStatusDTO | null
  onOpenSettings: () => void
  onSent: () => void
}

export function SendToBufferDialog({
  post,
  defaultMode = 'now',
  onClose,
  bufferStatus,
  onOpenSettings,
  onSent,
}: Props) {
  const [channelId, setChannelId] = useState('')
  const [mode, setMode] = useState<PublishMode>(defaultMode)
  const [dueAtLocal, setDueAtLocal] = useState('')
  const [repost, setRepost] = useState(false)
  const [duplicate, setDuplicate] = useState<{ id: string; status: string; created_at: string } | null>(null)
  const [sending, setSending] = useState(false)
  const [liveChannels, setLiveChannels] = useState<BufferChannel[] | null>(null)
  const [refreshingChannels, setRefreshingChannels] = useState(false)

  const refreshChannels = useCallback(async () => {
    setRefreshingChannels(true)
    try {
      const status = await authedFetch<BufferStatusDTO>('/api/admin/social/buffer')
      setLiveChannels(status.channels ?? [])
    } catch {
      setLiveChannels([])
    } finally {
      setRefreshingChannels(false)
    }
  }, [])

  // The parent may pass a cached status with no channels (e.g. when Buffer is
  // connected through BUFFER_API_KEY). Pull a fresh list so the dropdown
  // populates immediately.
  useEffect(() => {
    let cancelled = false
    if (bufferStatus?.connected && (bufferStatus.channels?.length ?? 0) === 0) {
      setRefreshingChannels(true)
      authedFetch<BufferStatusDTO>('/api/admin/social/buffer')
        .then((s) => {
          if (!cancelled) setLiveChannels(s.channels ?? [])
        })
        .catch(() => {
          if (!cancelled) setLiveChannels([])
        })
        .finally(() => {
          if (!cancelled) setRefreshingChannels(false)
        })
    }
    return () => {
      cancelled = true
    }
  }, [bufferStatus])

  const channels = liveChannels ?? bufferStatus?.channels ?? []
  const sortedChannels = [...channels].sort((a, b) => {
    const aMatch = a.service === post.platform ? 0 : 1
    const bMatch = b.service === post.platform ? 0 : 1
    return aMatch - bMatch || a.name.localeCompare(b.name)
  })
  const channel = channels.find((c) => c.id === channelId)

  useEffect(() => {
    setDuplicate(null)
    setRepost(false)
  }, [channelId, mode])

  const send = async () => {
    if (!channelId) {
      toast.error('Select a channel to publish to')
      return
    }
    if (mode === 'schedule') {
      if (!dueAtLocal) {
        toast.error('Pick a date and time to schedule')
        return
      }
      const due = new Date(dueAtLocal)
      if (isNaN(due.getTime()) || due.getTime() <= Date.now()) {
        toast.error('Scheduled time must be in the future')
        return
      }
    }

    setSending(true)
    setDuplicate(null)
    try {
      const result = await authedFetch<{ post: SocialPostDTO }>(
        `/api/admin/social/posts/${post.id}/publish`,
        {
          method: 'POST',
          body: JSON.stringify({
            channel_id: channelId,
            mode,
            is_repost: repost,
            ...(mode === 'schedule' ? { dueAt: new Date(dueAtLocal).toISOString() } : {}),
          }),
        }
      )
      const sent = result.post
      toast.success(
        mode === 'now'
          ? 'Published to Buffer'
          : mode === 'schedule'
            ? `Scheduled for ${formatDateTime(sent?.scheduled_at)}`
            : 'Added to Buffer queue'
      )
      onSent()
    } catch (err: unknown) {
      if (err instanceof Error && (err as { status?: number }).status === 409) {
        const body = (err as { body?: { duplicate?: { id: string; status: string; created_at: string } } }).body
        setDuplicate(body?.duplicate ?? { id: '', status: '', created_at: '' })
        toast.warning('This job already has an active post for the same platform')
      } else {
        toast.error(err instanceof Error ? err.message : 'Failed to send to Buffer')
      }
    } finally {
      setSending(false)
    }
  }

  const notConnected = !(bufferStatus?.connected ?? false)

  return (
    <Dialog open onOpenChange={(o) => (o ? undefined : onClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send to Buffer</DialogTitle>
          <DialogDescription>
            {post.job?.title ?? 'Social post'} · {PLATFORM_LABELS[post.platform]}
          </DialogDescription>
        </DialogHeader>

        {notConnected ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-3 text-sm text-amber-800 dark:border-amber-700/30 dark:bg-amber-900/10 dark:text-amber-200">
              Buffer is not connected yet. Connect it first to send posts.
            </div>
            <Button className="bg-[#0A66C2] hover:bg-[#084f96]" onClick={onOpenSettings}>
              Open Buffer settings
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Channel</Label>
              {refreshingChannels && sortedChannels.length === 0 ? (
                <div className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading channels…
                </div>
              ) : sortedChannels.length === 0 ? (
                <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-3 text-sm text-amber-800 dark:border-amber-700/30 dark:bg-amber-900/10 dark:text-amber-200">
                  <p className="font-medium">No channels found</p>
                  <p className="mt-1 text-xs">
                    Connect your social accounts in Buffer first, then refresh. If you already
                    connected them, hit Refresh.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" size="sm" onClick={refreshChannels} disabled={refreshingChannels}>
                      <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={onOpenSettings}>
                      Buffer settings
                    </Button>
                  </div>
                </div>
              ) : (
                <Select value={channelId} onValueChange={setChannelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a connected channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedChannels.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.service})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {channel && channel.service !== post.platform && (
                <p className="text-xs text-muted-foreground">
                  Note: {channel.name} is a {channel.service} channel — this copy was written for{' '}
                  {PLATFORM_LABELS[post.platform]}.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>When to publish</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as PublishMode)}>
                <div className="flex items-center gap-2 rounded-md border p-2">
                  <RadioGroupItem value="now" id="mode-now" />
                  <label htmlFor="mode-now" className="text-sm">Publish now</label>
                </div>
                <div className="flex items-center gap-2 rounded-md border p-2">
                  <RadioGroupItem value="queue" id="mode-queue" />
                  <label htmlFor="mode-queue" className="text-sm">Add to Buffer queue</label>
                </div>
                <div className="flex items-center gap-2 rounded-md border p-2">
                  <RadioGroupItem value="schedule" id="mode-schedule" />
                  <label htmlFor="mode-schedule" className="text-sm">Schedule for a specific time</label>
                </div>
              </RadioGroup>
              {mode === 'schedule' && (
                <Input
                  type="datetime-local"
                  value={dueAtLocal}
                  onChange={(e) => setDueAtLocal(e.target.value)}
                  min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
                />
              )}
            </div>

            {duplicate && (
              <div className="rounded-lg border border-amber-300/70 bg-amber-50/60 p-3 text-sm dark:border-amber-700/40 dark:bg-amber-900/10">
                <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">Duplicate detected</p>
                    <p className="mt-1 text-xs">
                      This job already has an active {PLATFORM_LABELS[post.platform]} post
                      {duplicate.created_at ? ` (created ${formatDateTime(duplicate.created_at)})` : ''}.
                      Reposting the same job to the same platform is only allowed when you confirm.
                    </p>
                    <label className="mt-2 flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={repost}
                        onChange={(e) => setRepost(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <span className="text-xs">I want to repost this job to this platform</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={onClose} disabled={sending}>
                Cancel
              </Button>
              <Button
                onClick={send}
                disabled={sending || (duplicate !== null && !repost)}
                className="bg-[#0A66C2] hover:bg-[#084f96]"
              >
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {mode === 'now' ? 'Publish now' : mode === 'schedule' ? 'Schedule' : 'Add to queue'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
