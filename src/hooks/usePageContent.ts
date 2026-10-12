import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { getContentValue as getStoredContentValue } from "@/lib/pageContent";

export interface PageContent {
  id: string;
  page_slug: string;
  section_key: string;
  content_type: string;
  content_value: string;
  metadata: Database['public']['Tables']['page_content']['Row']['metadata'];
  created_at: string;
  updated_at: string;
  seo_title?: string | null;
  seo_meta_description?: string | null;
  seo_url_slug?: string | null;
  seo_canonical_url?: string | null;
  seo_index?: boolean | null;
  seo_h1_title?: string | null;
  seo_follow?: boolean | null;
}

/**
 * Hook to fetch page content from Supabase
 * @param pageSlug - The page identifier (e.g., 'home', 'services-cv')
 * @param sectionKey - Optional specific section key to fetch
 */
export function usePageContent(pageSlug: string, sectionKey?: string) {
  return useQuery({
    queryKey: ["page-content", pageSlug, sectionKey],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (sectionKey) {
        const { data, error } = await supabase
          .from("page_content")
          .select("*")
          .eq("page_slug", pageSlug)
          .eq("section_key", sectionKey)
          .single();

        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from("page_content")
        .select("*")
        .eq("page_slug", pageSlug);

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Helper function to get content value with fallback
 */
export function getContentValue(
  content: PageContent[] | PageContent | null | undefined,
  sectionKey: string,
  fallback: string = ""
): string {
  return getStoredContentValue(content, sectionKey, fallback);
}

/**
 * Helper to parse JSON content
 */
export function getJsonContent<T = any>(
  content: PageContent[] | PageContent | null | undefined,
  sectionKey: string,
  fallback: T
): T {
  const value = getContentValue(content, sectionKey);
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * Helper to get SEO data from page content
 */
export function getSEOData(
  content: PageContent[] | PageContent | null | undefined,
  sectionKey?: string
) {
  if (!content) return null;

  let item: PageContent | undefined;

  if (Array.isArray(content)) {
    // If sectionKey is provided, find that specific item
    // Otherwise, find the first item with SEO data
    item = sectionKey 
      ? content.find((c) => c.section_key === sectionKey)
      : content.find((c) => c.seo_title || c.seo_meta_description);
  } else {
    item = content;
  }

  if (!item) return null;

  return {
    seo_title: item.seo_title,
    seo_meta_description: item.seo_meta_description,
    seo_url_slug: item.seo_url_slug,
    seo_canonical_url: item.seo_canonical_url,
    seo_index: item.seo_index,
    seo_h1_title: item.seo_h1_title,
    seo_follow: item.seo_follow,
  };
}
