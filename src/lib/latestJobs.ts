import { cache } from "react"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabaseEnv"
import { queryJobCards, type JobCardRow } from "@/lib/jobCardSelect"
import { isMissingListingKindColumnError } from "@/lib/listingKind"

const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey())

export const getLatestJobCards: (limit?: number) => Promise<JobCardRow[]> = cache(
  async (limit = 6) => {
    try {
      const run = (withKind: boolean) =>
        queryJobCards<JobCardRow[]>((select) => {
          let q = (supabase as any)
            .from("jobs")
            .select(select)
            .eq("status", "active")
          if (withKind) q = q.eq("listing_kind", "job")
          return q
            .order("is_featured", { ascending: false, nullsFirst: false })
            .order("is_promoted", { ascending: false, nullsFirst: false })
            .order("date_posted", { ascending: false })
            .limit(limit)
        })

      let { data, error } = await run(true)
      if (error && isMissingListingKindColumnError(error)) {
        ;({ data, error } = await run(false))
      }
      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Failed to load latest jobs:", error)
      return []
    }
  }
)

export type HomeBlogPost = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  category: string | null
  featured_image: string | null
  created_at: string
}

export const getRecentBlogPosts: (limit?: number) => Promise<HomeBlogPost[]> = cache(
  async (limit = 3) => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, category, featured_image, created_at")
        .order("created_at", { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data || []) as HomeBlogPost[]
    } catch (error) {
      console.error("Failed to load recent blog posts:", error)
      return []
    }
  }
)
