import type { Json } from '@/integrations/supabase/types'

export function parserJobTitle(jobText: string, result: Json | null, id: string): string {
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const title = (result as Record<string, unknown>).title
    if (typeof title === 'string' && title.trim()) return title.trim()
  }
  const first = jobText.split(/\r?\n/).map(line => line.trim()).find(Boolean)
  if (first) return first.length > 80 ? `${first.slice(0, 77)}…` : first
  return `Job ${id.slice(0, 8)}`
}
