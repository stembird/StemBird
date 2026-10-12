import type { SocialPlatform, SocialPostStatus } from '@/lib/social/types'

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
}

export const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  linkedin: 'bg-[#0A66C2] text-white',
  facebook: 'bg-[#1877F2] text-white',
  instagram: 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white',
}

export const STATUS_LABELS: Record<SocialPostStatus, string> = {
  draft: 'Draft',
  ready: 'Ready',
  scheduled: 'Scheduled',
  publishing: 'Publishing',
  published: 'Published',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

export function statusBadgeVariant(status: SocialPostStatus): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'published':
      return 'default'
    case 'scheduled':
      return 'secondary'
    case 'publishing':
      return 'secondary'
    case 'failed':
      return 'destructive'
    case 'cancelled':
      return 'outline'
    case 'draft':
    case 'ready':
      return 'outline'
  }
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
