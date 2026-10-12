'use client'

import { useEffect, useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plug,
  RefreshCw,
  Unplug,
} from 'lucide-react'
import { toast } from 'sonner'
import { authedFetch } from './api'
import type { BufferChannel, BufferStatusDTO } from '@/lib/social/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Latest status from the parent; kept in sync after connect/disconnect. */
  status: BufferStatusDTO | null
  onStatusChange: (status: BufferStatusDTO) => void
}

export function BufferSettings({ open, onOpenChange, status, onStatusChange }: Props) {
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState<'connect' | 'disconnect' | 'refresh' | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    authedFetch<BufferStatusDTO>('/api/admin/social/buffer')
      .then((s) => {
        if (!cancelled) onStatusChange(s)
      })
      .catch((err: unknown) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load Buffer status')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, onStatusChange])

  const connect = async () => {
    if (!apiKey.trim()) {
      toast.error('Paste your Buffer API key first')
      return
    }
    setBusy('connect')
    try {
      const next = await authedFetch<BufferStatusDTO>('/api/admin/social/buffer', {
        method: 'POST',
        body: JSON.stringify({ api_key: apiKey.trim() }),
      })
      onStatusChange(next)
      setApiKey('')
      toast.success('Buffer connected')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to connect Buffer')
    } finally {
      setBusy(null)
    }
  }

  const disconnect = async () => {
    if (!window.confirm('Disconnect Buffer? Scheduled posts already sent will remain in Buffer.')) return
    setBusy('disconnect')
    try {
      const next = await authedFetch<BufferStatusDTO>('/api/admin/social/buffer', {
        method: 'DELETE',
      })
      onStatusChange(next)
      toast.success('Buffer disconnected')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to disconnect Buffer')
    } finally {
      setBusy(null)
    }
  }

  const refreshChannels = async () => {
    setBusy('refresh')
    try {
      const { channels } = await authedFetch<{ channels: BufferChannel[] }>(
        '/api/admin/social/buffer/channels'
      )
      onStatusChange({ ...(status ?? ({} as BufferStatusDTO)), channels })
      toast.success(`Loaded ${channels.length} channel(s)`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to refresh channels')
    } finally {
      setBusy(null)
    }
  }

  const connected = status?.connected ?? false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-[#0A66C2]" />
            Buffer Connection
          </DialogTitle>
          <DialogDescription>
            Careersasa publishes through your Buffer account. Your API key stays on the server and is
            never exposed to the browser.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking connection…
          </div>
        ) : !connected ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-3 text-sm text-amber-800 dark:border-amber-700/30 dark:bg-amber-900/10 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Not connected</p>
                  <p className="mt-1 text-xs">
                    Generate your free Buffer API key at{' '}
                    <a
                      href="https://publish.buffer.com/settings/api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center underline"
                    >
                      publish.buffer.com/settings/api <ExternalLink className="ml-0.5 h-3 w-3" />
                    </a>{' '}
                    (Settings → API → Generate API key). For production, set it as the{' '}
                    <code className="rounded bg-muted px-1">BUFFER_API_KEY</code> environment variable
                    instead.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="buffer-api-key">Buffer API key</Label>
              <Input
                id="buffer-api-key"
                type="password"
                placeholder="Paste your Buffer API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
              />
            </div>

            <Button onClick={connect} disabled={busy !== null} className="bg-[#0A66C2] hover:bg-[#084f96]">
              {busy === 'connect' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plug className="mr-2 h-4 w-4" />
              )}
              Connect Buffer
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-[#0A66C2]/30 bg-[#0A66C2]/5 p-3 text-sm text-[#0A66C2] dark:border-[#0A66C2]/40 dark:bg-[#0A66C2]/10">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Connected{status?.account?.name ? ` as ${status.account.name}` : ''}</p>
                {status?.account?.email && (
                  <p className="mt-0.5 text-xs">{status.account.email}</p>
                )}
                <p className="mt-0.5 text-xs">
                  {status?.key_source === 'env'
                    ? 'Using the BUFFER_API_KEY environment variable.'
                    : 'Using a key stored in the admin-only buffer configuration.'}
                </p>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Channels ({status?.channels?.length ?? 0})</Label>
                <Button variant="outline" size="sm" onClick={refreshChannels} disabled={busy !== null}>
                  {busy === 'refresh' ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1 h-3 w-3" />
                  )}
                  Refresh
                </Button>
              </div>
              {status?.channels?.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {status.channels.map((c) => (
                    <Card key={c.id}>
                      <CardContent className="flex items-center gap-2 p-3">
                        {c.avatar ? (
                          <img
                            src={c.avatar}
                            alt=""
                            className="h-6 w-6 rounded-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-primary/10" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{c.name}</p>
                          <p className="truncate text-xs text-muted-foreground capitalize">{c.service}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No channels found. Connect social accounts in Buffer, then refresh.
                </p>
              )}
            </div>

            <div className="flex justify-end border-t pt-4">
              <Button variant="destructive" onClick={disconnect} disabled={busy !== null}>
                {busy === 'disconnect' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Unplug className="mr-2 h-4 w-4" />
                )}
                Disconnect
              </Button>
            </div>
          </div>
        )}

        <div className="mt-2 rounded-md bg-muted/50 p-2 text-[11px] text-muted-foreground">
          <Badge variant="outline" className="mr-1">Tip</Badge>
          Scheduled posts that fail to send keep the rest of the site unaffected — a failed social
          post never blocks job publishing.
        </div>
      </DialogContent>
    </Dialog>
  )
}
