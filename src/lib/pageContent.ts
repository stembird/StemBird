export type PageContentValue = {
  section_key: string;
  content_value: string | null;
};

/**
 * Helper to read a CMS value with a fallback.
 * Accepts a list of rows, a single row, or a key→value map.
 */
export function getContentValue(
  content:
    | PageContentValue[]
    | PageContentValue
    | Record<string, string>
    | null
    | undefined,
  sectionKey: string,
  fallback: string = ""
): string {
  if (!content) return fallback;

  if (Array.isArray(content)) {
    const item = content.find((row) => row.section_key === sectionKey);
    return item?.content_value || fallback;
  }

  if ("section_key" in content) {
    return content.section_key === sectionKey
      ? content.content_value || fallback
      : fallback;
  }

  return content[sectionKey] || fallback;
}
