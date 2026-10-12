'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  CalendarClock,
  Eye,
  Facebook,
  Instagram,
  Linkedin,
  Loader2,
  Pencil,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { authedFetch } from './api'
import { SendToBufferDialog } from './send-dialog'
import { PLATFORM_COLORS, PLATFORM_LABELS, STATUS_LABELS, formatDateTime, statusBadgeVariant } from './format'
import type { BufferStatusDTO, PublishMode, SocialPlatform, SocialPostDTO } from '@/lib/social/types'

function PlatformIcon({ platform, className }: { platform: SocialPlatform; className?: string }) {
  if (platform === 'linkedin') return <Linkedin className={className} />
  if (platform === 'facebook') return <Facebook className={className} />
  return <Instagram className={className} />
}

interface Props {
  posts: SocialPostDTO[]
  loading: boolean
  emptyMessage: string
  bufferStatus: BufferStatusDTO | null
  onOpenSettings: () => void
  onChanged: () => void
  onEdit: (post: SocialPostDTO) => void
}

export function PostsTable({
  posts,
  loading,
  emptyMessage,
  bufferStatus,
  onOpenSettings,
  onChanged,
  onEdit,
}: Props) {
  const [previewPost, setPreviewPost] = useState<SocialPostDTO | null>(null)
  const [sendTarget, setSendTarget] = useState<{ post: SocialPostDTO; mode: PublishMode } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (post: SocialPostDTO) => {
    if (post.status === 'scheduled' || post.status === 'published') return
    if (!window.confirm(`Delete this ${PLATFORM_LABELS[post.platform]} post? This cannot be undone.`)) return
    setDeletingId(post.id)
    try {
      await authedFetch(`/api/admin/social/posts/${post.id}`, { method: 'DELETE' })
      toast.success('Post deleted')
      onChanged()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete post')
    } finally {
      setDeletingId(null)
    }
  }

  const handleCancel = async (post: SocialPostDTO) => {
    if (!window.confirm('Cancel this post? If it is already queued in Buffer, we will try to remove it there too.')) return
    setDeletingId(post.id)
    try {
      await authedFetch(`/api/admin/social/posts/${post.id}/cancel`, { method: 'POST' })
      toast.success('Post cancelled')
      onChanged()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel post')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      {loading ? (
        <div className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading posts…
        </div>
      ) : posts.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Post</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => {
                const busy = deletingId === post.id
                return (
                  <TableRow key={post.id}>
                    <TableCell className="max-w-[280px]">
                      <p className="line-clamp-2 text-sm whitespace-pre-wrap">{post.post_text}</p>
                      {post.error_message && (
                        <p className="mt-1 line-clamp-2 text-xs text-destructive">{post.error_message}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={PLATFORM_COLORS[post.platform]}>
                        <PlatformIcon platform={post.platform} className="mr-1 h-3 w-3" />
                        {PLATFORM_LABELS[post.platform]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="truncate font-medium">{post.job?.title ?? '—'}</p>
                      {post.job && <p className="truncate text-xs text-muted-foreground">{post.job.company}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(post.status)}>{STATUS_LABELS[post.status]}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {post.status === 'published'
                        ? formatDateTime(post.published_at)
                        : formatDateTime(post.scheduled_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Preview" onClick={() => setPreviewPost(post)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {post.status !== 'published' && post.status !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit"
                            onClick={() => onEdit(post)}
                            disabled={post.status === 'scheduled'}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {(post.status === 'draft' || post.status === 'ready' || post.status === 'failed') && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Publish now"
                              onClick={() => setSendTarget({ post, mode: 'now' })}
                              disabled={busy}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Schedule"
                              onClick={() => setSendTarget({ post, mode: 'schedule' })}
                              disabled={busy}
                            >
                              <CalendarClock className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete"
                              onClick={() => handleDelete(post)}
                              disabled={busy}
                            >
                              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </>
                        )}
                        {post.status === 'scheduled' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Cancel scheduled post"
                            onClick={() => handleCancel(post)}
                            disabled={busy}
                          >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Preview */}
      {previewPost && (
        <Dialog open onOpenChange={(o) => (o ? undefined : setPreviewPost(null))}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Post preview</DialogTitle>
              <DialogDescription>
                {previewPost.job?.title ?? 'Social post'} · {PLATFORM_LABELS[previewPost.platform]}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge className={PLATFORM_COLORS[previewPost.platform]}>
                  <PlatformIcon platform={previewPost.platform} className="mr-1 h-3 w-3" />
                  {PLATFORM_LABELS[previewPost.platform]}
                </Badge>
                <Badge variant={statusBadgeVariant(previewPost.status)}>{STATUS_LABELS[previewPost.status]}</Badge>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                {previewPost.job && (
                  <div className="mb-2 border-b pb-2">
                    <p className="font-semibold">{previewPost.job.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {previewPost.job.company} · {previewPost.job.location}
                    </p>
                  </div>
                )}
                <p className="whitespace-pre-wrap text-sm">{previewPost.post_text}</p>
              </div>
              {previewPost.media_url && (
                <p className="text-xs text-muted-foreground">
                  Media: <span className="break-all">{previewPost.media_url}</span>
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p>{formatDateTime(previewPost.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {previewPost.status === 'published' ? 'Published' : 'Scheduled'}
                  </p>
                  <p>{formatDateTime(previewPost.published_at ?? previewPost.scheduled_at)}</p>
                </div>
              </div>
              {previewPost.buffer_post_id && (
                <p className="text-xs text-muted-foreground">
                  Buffer post ID: <span className="font-mono">{previewPost.buffer_post_id}</span>
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Send / schedule */}
      {sendTarget && (
        <SendToBufferDialog
          post={sendTarget.post}
          defaultMode={sendTarget.mode}
          onClose={() => setSendTarget(null)}
          bufferStatus={bufferStatus}
          onOpenSettings={onOpenSettings}
          onSent={() => {
            setSendTarget(null)
            onChanged()
          }}
        />
      )}
    </>
  )
}
