import { browseNavLinks } from "@/lib/browseNav";
import { usePageContent, getContentValue } from "@/hooks/usePageContent";

const BROWSE_LABEL_FALLBACK = "Browse Jobs";

/**
 * CMS-backed header Browse Jobs menu (desktop + mobile).
 * Falls back to the live-site defaults when content has not been seeded yet.
 */
export function useNavContent() {
  const { data } = usePageContent("navigation");

  const browseLabel = getContentValue(
    data,
    "nav_browse_label",
    BROWSE_LABEL_FALLBACK
  );

  const links = browseNavLinks.map((link) => ({
    ...link,
    title: getContentValue(data, link.cmsKey, link.title),
    description: getContentValue(
      data,
      `${link.cmsKey}_description`,
      link.description
    ),
  }));

  return { browseLabel, links };
}
