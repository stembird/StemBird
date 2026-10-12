import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabaseEnv";

export type PageSeoRow = {
  seo_title: string | null;
  seo_meta_description: string | null;
  seo_canonical_url: string | null;
  seo_h1_title: string | null;
  seo_index: boolean | null;
  seo_follow: boolean | null;
  seo_url_slug: string | null;
};

/** Server-side page_content lookup used by jobs browse hubs. */
export const fetchPageContentMap = cache(async (pageSlug: string) => {
  const map: Record<string, string> = {};

  try {
    const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());
    const { data, error } = await supabase
      .from("page_content")
      .select("section_key, content_value")
      .eq("page_slug", pageSlug);

    if (error || !data) return map;

    for (const row of data) {
      if (row.section_key && row.content_value) {
        map[row.section_key] = row.content_value;
      }
    }
  } catch {
    // Fall back to hardcoded copy when CMS is unavailable.
  }

  return map;
});

/** Prefer the hero_title row, then any row that already has SEO fields. */
export const fetchPageSeo = cache(async (pageSlug: string): Promise<PageSeoRow | null> => {
  try {
    const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());
    const { data, error } = await supabase
      .from("page_content")
      .select(
        "section_key, seo_title, seo_meta_description, seo_canonical_url, seo_h1_title, seo_index, seo_follow, seo_url_slug"
      )
      .eq("page_slug", pageSlug);

    if (error || !data?.length) return null;

    const hero = data.find((row) => row.section_key === "hero_title");
    const withSeo = data.find((row) => row.seo_title || row.seo_meta_description);
    return hero || withSeo || data[0];
  } catch {
    return null;
  }
});
