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
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Check,
  ClipboardCopy,
  Eye,
  EyeOff,
  Facebook,
  Instagram,
  Linkedin,
  Loader2,
  Send,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { authedFetch } from './api'
import { SendToBufferDialog } from './send-dialog'
import { PLATFORM_LABELS, PLATFORM_COLORS } from './format'
import type { BufferStatusDTO, SocialPlatform, SocialPostDTO } from '@/lib/social/types'

const MAX_LENGTH: Record<SocialPlatform, number> = {
  linkedin: 3000,
  facebook: 2200,
  instagram: 2200,
}

const PLATFORM_OPTIONS: SocialPlatform[] = ['linkedin', 'facebook', 'instagram']

function PlatformIcon({ platform, className }: { platform: SocialPlatform; className?: string }) {
  if (platform === 'linkedin') return <Linkedin className={className} />
  if (platform === 'facebook') return <Facebook className={className} />
  return <Instagram className={className} />
}

export interface ComposerState {
  mode: 'generate' | 'edit'
  platform?: SocialPlatform
  jobIds?: string[]
  post?: SocialPostDTO
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  state: ComposerState | null
  bufferStatus: BufferStatusDTO | null
  onChanged: () => void
}

export function PostComposer({ open, onOpenChange, state, bufferStatus, onChanged }: Props) {
  const [platform, setPlatform] = useState<SocialPlatform | null>(null)
  const [generating, setGenerating] = useState(false)
  const [posts, setPosts] = useState<SocialPostDTO[]>([])
  const [savingEdit, setSavingEdit] = useState(false)
  const [savingTextId, setSavingTextId] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState<Record<string, boolean>>({})
  const [sendTarget, setSendTarget] = useState<SocialPostDTO | null>(null)

  const isEdit = state?.mode === 'edit'

  useEffect(() => {
    if (open) {
      if (state?.mode === 'edit' && state.post) {
        setPlatform(state.post.platform)
        setPosts([state.post])
      } else if (state?.mode === 'generate') {
        setPlatform(state.platform ?? null)
        setPosts([])
      }
      setPreviewing({})
      setSendTarget(null)
    }
  }, [open, state])

  const generate = useCallback(
    async (chosen: SocialPlatform) => {
      if (!state?.jobIds?.length) return
      setGenerating(true)
      setPlatform(chosen)
      try {
        const result = await authedFetch<{ posts: SocialPostDTO[] }>('/api/admin/social/generate', {
          method: 'POST',
          body: JSON.stringify({ job_ids: state.jobIds, platform: chosen }),
        })
        setPosts(result.posts ?? [])
        toast.success(`Generated ${result.posts?.length ?? 0} ${PLATFORM_LABELS[chosen]} post(s)`)
        onChanged()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to generate posts')
      } finally {
        setGenerating(false)
      }
    },
    [state, onChanged]
  )

  const updateText = (id: string, text: string) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, post_text: text } : p)))
  }

  const copyPost = async (post: SocialPostDTO) => {
    try {
      await navigator.clipboard.writeText(post.post_text)
      toast.success('Post copied to clipboard')
    } catch {
      toast.error('Could not copy — copy the text manually')
    }
  }

  const saveEdit = async () => {
    if (!state?.post || !posts[0]) return
    setSavingEdit(true)
    try {
      const result = await authedFetch<{ post: SocialPostDTO }>(
        `/api/admin/social/posts/${state.post.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ post_text: posts[0].post_text }),
        }
      )
      setPosts([result.post])
      toast.success('Post updated')
      onChanged()
      onOpenChange(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save post')
    } finally {
      setSavingEdit(false)
    }
  }

  /**
   * In generate mode the draft edits live only in local state. Persist them
   * first because publishing reads the copy from the database, then open the
   * send dialog with the freshly-saved post.
   */
  const prepareSend = async (post: SocialPostDTO) => {
    setSavingTextId(post.id)
    try {
      const result = await authedFetch<{ post: SocialPostDTO }>(
        `/api/admin/social/posts/${post.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ post_text: post.post_text }),
        }
      )
      setPosts((prev) => prev.map((p) => (p.id === result.post.id ? result.post : p)))
      setSendTarget(result.post)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save post before sending')
    } finally {
      setSavingTextId(null)
    }
  }

  // ----- Step 1 (generate mode): pick platform -----
  if (isEdit === false && !platform) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#F97316]" />
              Generate Social Posts
            </DialogTitle>
            <DialogDescription>
              {state?.jobIds?.length} job(s) selected. Choose a platform — Careersasa will write
              platform-appropriate copy from the job details already in the database.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PLATFORM_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => generate(p)}
                disabled={generating}
                className="group flex flex-col items-center gap-2 rounded-xl border p-5 text-center transition-colors hover:border-[#0A66C2] hover:bg-primary/5 disabled:opacity-60"
              >
                <PlatformIcon platform={p} className="h-8 w-8" />
                <span className="font-semibold">{PLATFORM_LABELS[p]}</span>
                <span className="text-xs text-muted-foreground">Max {MAX_LENGTH[p].toLocaleString()} chars</span>
              </button>
            ))}
          </div>
          {generating && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Writing posts…
            </div>
          )}
        </DialogContent>
      </Dialog>
    )
  }

  // ----- Step 2: post cards -----
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {platform && <PlatformIcon platform={platform} className="h-5 w-5" />}
              {isEdit ? 'Edit Social Post' : `${PLATFORM_LABELS[platform ?? 'linkedin']} posts`}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Review the copy, edit if needed, then send to Buffer.'
                : 'Review the generated copy, edit if needed, then send each post to Buffer. Only facts from the job database are used.'}
            </DialogDescription>
            {!isEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 -ml-2"
                onClick={() => setPlatform(null)}
              >
                ← Choose a different platform
              </Button>
            )}
          </DialogHeader>

          {generating ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Writing posts…
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => {
                const max = MAX_LENGTH[post.platform]
                const over = post.post_text.length > max
                const showPreview = previewing[post.id]
                return (
                  <div key={post.id} className="rounded-xl border p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className={PLATFORM_COLORS[post.platform]}>
                          <PlatformIcon platform={post.platform} className="mr-1 h-3 w-3" />
                          {PLATFORM_LABELS[post.platform]}
                        </Badge>
                        <span className="text-sm font-medium">{post.job?.title ?? 'Untitled job'}</span>
                      </div>
                      <span
                        className={`text-xs ${over ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}
                      >
                        {post.post_text.length.toLocaleString()} / {max.toLocaleString()}
                      </span>
                    </div>

                    {showPreview ? (
                      <div className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-sm">
                        {post.post_text || <span className="text-muted-foreground italic">Empty</span>}
                      </div>
                    ) : (
                      <Textarea
                        value={post.post_text}
                        onChange={(e) => updateText(post.id, e.target.value)}
                        rows={8}
                        className="font-mono text-sm"
                      />
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => copyPost(post)}>
                        <ClipboardCopy className="mr-1 h-3.5 w-3.5" /> Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewing((p) => ({ ...p, [post.id]: !p[post.id] }))}
                      >
                        {showPreview ? <EyeOff className="mr-1 h-3.5 w-3.5" /> : <Eye className="mr-1 h-3.5 w-3.5" />}
                        {showPreview ? 'Edit' : 'Preview'}
                      </Button>
                      <div className="flex-1" />
                      {isEdit ? (
                        <Button size="sm" onClick={saveEdit} disabled={savingEdit || !posts[0]?.post_text.trim()}>
                          {savingEdit ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
                          Save
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => prepareSend(post)}
                          disabled={!post.post_text.trim() || savingTextId === post.id}
                          className="bg-[#0A66C2] hover:bg-[#084f96]"
                        >
                          {savingTextId === post.id ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="mr-1 h-3.5 w-3.5" />
                          )}
                          Send to Buffer
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}

              {posts.length === 0 && !isEdit && (
                <p className="py-6 text-center text-muted-foreground">No posts yet.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {sendTarget && (
        <SendToBufferDialog
          post={sendTarget}
          onClose={() => setSendTarget(null)}
          bufferStatus={bufferStatus}
          onOpenSettings={() => {
            setSendTarget(null)
            onOpenChange(false)
          }}
          onSent={() => {
            setSendTarget(null)
            onChanged()
          }}
        />
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// (SendToBufferDialog lives in send-dialog.tsx)
// ---------------------------------------------------------------------------
