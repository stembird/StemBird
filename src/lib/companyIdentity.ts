/**
 * Company identity helpers — normalize variant names so "Equity Bank",
 * "Equity Bank Group", "Equity Bank Kenya" resolve to one employer page.
 *
 * Used by ensureCompanyForJob (prevent new dupes) and merge scripts (heal existing).
 */

/** Trailing legal / marketing tokens stripped for identity matching. */
const TRAILING_SUFFIXES = new Set([
  "limited",
  "ltd",
  "plc",
  "inc",
  "incorporated",
  "corp",
  "corporation",
  "company",
  "co",
  "group",
  "holdings",
  "holding",
  "kenya",
  "ke",
  "services",
  "service",
  "agency",
  "international",
  "intl",
  "technologies",
  "technology",
  "tech",
  "formerly",
  "fka",
  "aka",
]);

/** Multi-word trailing phrases stripped before single-token suffixes. */
const TRAILING_PHRASES = [
  "east africa",
  "west africa",
  "world service",
  "of companies",
  "of kenya",
];

/** Trailing location tokens (after paren strip). */
const TRAILING_LOCATIONS = new Set([
  "nairobi",
  "mombasa",
  "kisumu",
  "nakuru",
  "eldoret",
  "kenya",
  "ke",
  "rwanda",
  "uganda",
  "tanzania",
]);

/**
 * Normalize a company name into a stable identity key for matching duplicates.
 *
 * Examples:
 * - "Equity Bank Group" → "equity bank"
 * - "People FOCO Agency" → "people foco"
 * - "Sun King (Formerly Greenlight Planet)" → "sun king"
 * - "Public Service Commission Kenya (PSCK)" → "public service commission"
 * - "Equity Bank Rwanda" → "equity bank rwanda" (kept distinct from Equity Bank)
 */
export function normalizeCompanyIdentityKey(name: string): string {
  if (!name) return "";

  let s = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    // Drop parenthetical aliases: (INTERFELK), (Formerly …), (AKUH)
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .toLowerCase()
    .replace(/[''`´]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bacademies\b/g, "academy")
    .replace(/\s+/g, " ")
    .trim();

  if (!s) return "";

  let changed = true;
  while (changed) {
    changed = false;

    for (const phrase of TRAILING_PHRASES) {
      if (s.endsWith(` ${phrase}`) || s === phrase) {
        s = s.slice(0, Math.max(0, s.length - phrase.length)).trim();
        changed = true;
        break;
      }
    }
    if (changed) continue;

    const parts = s.split(" ");
    if (parts.length <= 1) break;

    const last = parts[parts.length - 1]!;
    if (TRAILING_SUFFIXES.has(last) || TRAILING_LOCATIONS.has(last)) {
      // Keep country/location only when it is the sole differentiator after a short root
      // e.g. "equity bank rwanda" — do NOT strip rwanda (would collide with Equity Bank).
      // Only strip location when there are 3+ remaining tokens before it, OR the
      // location is kenya/ke (home-market qualifier, not a distinct subsidiary).
      if (TRAILING_LOCATIONS.has(last)) {
        const isHomeMarket = last === "kenya" || last === "ke";
        if (!isHomeMarket && parts.length <= 3) {
          break;
        }
      }
      parts.pop();
      s = parts.join(" ");
      changed = true;
    }
  }

  return s.trim();
}

export type CompanyIdentityFields = {
  id: string;
  name: string;
  logo?: string | null;
  website?: string | null;
  industry?: string | null;
  location?: string | null;
  size?: string | null;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  /** Optional job count for canonical selection. */
  jobCount?: number;
};

/** Prefer cleaner display names when merging / renaming the survivor. */
export function scoreCompanyDisplayName(name: string): number {
  let score = 0;
  const trimmed = name.trim();
  if (trimmed === name) score += 5;
  if (!/\s{2,}/.test(name)) score += 2;
  if (!/[()]/.test(name)) score += 3;
  if (!/,\s*$/.test(name)) score += 1;
  if (!/[–—]/.test(name)) score += 1;
  // Prefer "Limited" over abbreviated "LTD"
  if (/\blimited\b/i.test(trimmed)) score += 1;
  if (/\bltd\b/i.test(trimmed) && !/\blimited\b/i.test(trimmed)) score -= 1;
  // Prefer slightly shorter names without legal fluff, but keep acronyms in parens low
  score += Math.max(0, 40 - trimmed.length) / 10;
  // Prefer Title-ish casing over ALL CAPS
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 4) score -= 3;
  return score;
}

/**
 * Pick the company row that should survive a merge, and the display name to keep.
 */
export function pickCanonicalCompany<T extends CompanyIdentityFields>(
  companies: T[]
): { survivor: T; displayName: string; duplicates: T[] } {
  if (companies.length === 0) {
    throw new Error("pickCanonicalCompany requires at least one company");
  }

  const ranked = [...companies].sort((a, b) => {
    const jobs = (b.jobCount ?? 0) - (a.jobCount ?? 0);
    if (jobs !== 0) return jobs;

    const completeness =
      completenessScore(b) - completenessScore(a);
    if (completeness !== 0) return completeness;

    const nameScore =
      scoreCompanyDisplayName(b.name) - scoreCompanyDisplayName(a.name);
    if (nameScore !== 0) return nameScore;

    return (a.created_at || "").localeCompare(b.created_at || "");
  });

  const survivor = ranked[0]!;
  const displayName = [...companies]
    .map((c) => ({ name: c.name.trim(), score: scoreCompanyDisplayName(c.name) + (c.jobCount ?? 0) * 2 }))
    .sort((a, b) => b.score - a.score)[0]!.name;

  return {
    survivor,
    displayName,
    duplicates: ranked.slice(1),
  };
}

function completenessScore(c: CompanyIdentityFields): number {
  let score = 0;
  if (c.logo) score += 4;
  if (c.website) score += 3;
  if (c.description) score += 2;
  if (c.industry) score += 1;
  if (c.location) score += 1;
  if (c.size) score += 1;
  return score;
}

/** Merge nullable profile fields onto the survivor (fill blanks from duplicates). */
export function mergeCompanyProfileFields<T extends CompanyIdentityFields>(
  survivor: T,
  others: T[]
): Partial<T> {
  const patch: Record<string, unknown> = {};
  const fields: (keyof CompanyIdentityFields)[] = [
    "logo",
    "website",
    "industry",
    "location",
    "size",
    "description",
  ];

  for (const field of fields) {
    if (survivor[field]) continue;
    for (const other of others) {
      const value = other[field];
      if (typeof value === "string" && value.trim()) {
        patch[field as string] = value.trim();
        break;
      }
    }
  }

  return patch as Partial<T>;
}

/** Cluster companies that share the same identity key. */
export function clusterCompaniesByIdentity<T extends { name: string }>(
  companies: T[]
): Map<string, T[]> {
  const clusters = new Map<string, T[]>();
  for (const company of companies) {
    const key = normalizeCompanyIdentityKey(company.name);
    if (!key) continue;
    const list = clusters.get(key);
    if (list) list.push(company);
    else clusters.set(key, [company]);
  }
  return clusters;
}

export function companiesShareIdentity(a: string, b: string): boolean {
  const ka = normalizeCompanyIdentityKey(a);
  const kb = normalizeCompanyIdentityKey(b);
  return !!ka && ka === kb;
}
