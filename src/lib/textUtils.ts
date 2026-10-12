/**
 * Strips HTML tags from a string and normalizes whitespace
 * @param html - The HTML string to clean
 * @returns Clean plain text
 */
export const stripHtmlTags = (html: string): string => {
  if (!html) return "";
  
  // Remove HTML tags using regex
  let text = html.replace(/<[^>]*>/g, "");
  
  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Normalize whitespace (multiple spaces, tabs, newlines to single space)
  text = text.replace(/\s+/g, " ");
  
  // Trim leading/trailing whitespace
  return text.trim();
};

/**
 * Strips trailing country names (e.g. ", Kenya", "Kenya") from a location string
 * to prevent duplication when we append ", Kenya" ourselves.
 */
function stripCountrySuffix(loc: string | null | undefined): string {
  if (!loc) return '';
  return loc
    .replace(/,?\s*Kenya\s*$/i, '')
    .replace(/^Kenya$/i, '')
    .trim();
}

/**
 * Builds a clean, deduplicated location string in the format:
 * [City], [County], Kenya
 * Omits parts that are empty or duplicates.
 */
export function buildLocationString(
  city?: string | null,
  county?: string | null,
  rawLocation?: string | null,
): string {
  const cleanCity = stripCountrySuffix(city);
  const cleanCounty = stripCountrySuffix(county);

  // If we have explicit city/county, use them
  const parts: string[] = [];
  if (cleanCity) parts.push(cleanCity);
  if (cleanCounty && cleanCounty.toLowerCase() !== cleanCity.toLowerCase()) {
    parts.push(cleanCounty);
  }

  // Fallback: use raw location (stripped of "Kenya")
  if (parts.length === 0 && rawLocation) {
    const clean = stripCountrySuffix(rawLocation);
    if (clean) parts.push(clean);
  }

  return parts.length > 0 ? `${parts.join(', ')}, Kenya` : 'Kenya';
}

/**
 * Builds an SEO-friendly job title:
 * [Post] at [Company] in [City], [County], Kenya
 * For remote: [Post] at [Company] — Remote (Kenya)
 * Omits "at [Company]" if company is empty.
 */
export function formatJobSeoTitle(
  title: string,
  company?: string | null,
  opts?: {
    city?: string | null;
    county?: string | null;
    rawLocation?: string | null;
    isRemote?: boolean;
  },
): string {
  const parts: string[] = [title];

  // "at [Company]"
  if (company && company.trim()) {
    parts.push(`at ${company.trim()}`);
  }

  // Location
  if (opts?.isRemote) {
    parts.push('— Remote (Kenya)');
  } else {
    const loc = buildLocationString(opts?.city, opts?.county, opts?.rawLocation);
    parts.push(`in ${loc}`);
  }

  return parts.join(' ');
}

/**
 * Relative age for jobs listed on the site.
 * "Just posted" only within the first 6 hours; after that, whole-number units.
 */
export function jobPostedLabel(iso?: string | null, nowMs: number = Date.now()): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = nowMs - date.getTime();
  if (diffMs < 0) return "Just posted";

  const totalHours = diffMs / (1000 * 60 * 60);
  if (totalHours < 6) return "Just posted";

  const hours = Math.floor(totalHours);
  if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }

  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}