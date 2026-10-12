/**
 * Canonical Careersasa county data — the single source of truth for county
 * names used by the interactive Kenya jobs map and the jobs search filter.
 *
 * These 47 names are exactly the values Careersasa uses when filtering jobs
 * by county (`job_location_county` on `public.jobs`), and they correspond to
 * the names seeded into `public.counties` in Supabase. Keeping the list here
 * means the map, county grouping, and search all agree on one naming system.
 *
 * Special characters:
 * - "Murang'a" uses an ASCII apostrophe (matches stored job values).
 * - "Taita–Taveta" and "Tharaka–Nithi" use an en dash (U+2013), matching the
 *   canonical names in `public.counties`.
 */

export type KenyaCounty = {
  /** Canonical display name (also the value used by the search filter). */
  name: string;
  /** Stable slug used for SVG keys / anchors. */
  id: string;
};

export const KENYA_COUNTIES: KenyaCounty[] = [
  { name: "Baringo", id: "baringo" },
  { name: "Bomet", id: "bomet" },
  { name: "Bungoma", id: "bungoma" },
  { name: "Busia", id: "busia" },
  { name: "Elgeyo-Marakwet", id: "elgeyo-marakwet" },
  { name: "Embu", id: "embu" },
  { name: "Garissa", id: "garissa" },
  { name: "Homa Bay", id: "homa-bay" },
  { name: "Isiolo", id: "isiolo" },
  { name: "Kajiado", id: "kajiado" },
  { name: "Kakamega", id: "kakamega" },
  { name: "Kericho", id: "kericho" },
  { name: "Kiambu", id: "kiambu" },
  { name: "Kilifi", id: "kilifi" },
  { name: "Kirinyaga", id: "kirinyaga" },
  { name: "Kisii", id: "kisii" },
  { name: "Kisumu", id: "kisumu" },
  { name: "Kitui", id: "kitui" },
  { name: "Kwale", id: "kwale" },
  { name: "Laikipia", id: "laikipia" },
  { name: "Lamu", id: "lamu" },
  { name: "Machakos", id: "machakos" },
  { name: "Makueni", id: "makueni" },
  { name: "Mandera", id: "mandera" },
  { name: "Marsabit", id: "marsabit" },
  { name: "Meru", id: "meru" },
  { name: "Migori", id: "migori" },
  { name: "Mombasa", id: "mombasa" },
  { name: "Murang'a", id: "muranga" },
  { name: "Nairobi", id: "nairobi" },
  { name: "Nakuru", id: "nakuru" },
  { name: "Nandi", id: "nandi" },
  { name: "Narok", id: "narok" },
  { name: "Nyamira", id: "nyamira" },
  { name: "Nyandarua", id: "nyandarua" },
  { name: "Nyeri", id: "nyeri" },
  { name: "Samburu", id: "samburu" },
  { name: "Siaya", id: "siaya" },
  { name: "Taita–Taveta", id: "taita-taveta" },
  { name: "Tana River", id: "tana-river" },
  { name: "Tharaka–Nithi", id: "tharaka-nithi" },
  { name: "Trans Nzoia", id: "trans-nzoia" },
  { name: "Turkana", id: "turkana" },
  { name: "Uasin Gishu", id: "uasin-gishu" },
  { name: "Vihiga", id: "vihiga" },
  { name: "Wajir", id: "wajir" },
  { name: "West Pokot", id: "west-pokot" },
];

const COUNTY_BY_NAME = new Map(KENYA_COUNTIES.map((c) => [c.name, c]));

/**
 * Alternate spellings that appear in `job_location_county` for a canonical
 * county (mostly from scraped sources). Used both to attribute jobs to the
 * right county on the map and to expand the search filter so a county's
 * stored variants are all found by its canonical name.
 */
export const COUNTY_SEARCH_VARIANTS: Record<string, string[]> = {
  "Taita–Taveta": ["Taita–Taveta", "Taita Taveta", "Taita-Taveta"],
  "Tharaka–Nithi": [
    "Tharaka–Nithi",
    "Tharaka-Nithi",
    "Tharaka Nithi",
    "Tharaka",
  ],
  "Murang'a": ["Murang'a", "Murang’a", "Muranga"],
};

/** Look up every stored value that should match a canonical county name. */
export function countySearchValues(name: string): string[] {
  return COUNTY_SEARCH_VARIANTS[name] ?? [name];
}

/**
 * Reduce a stored county value to a comparable key: NFKC-normalized
 * (en dashes and smart quotes become ASCII), lowercase, punctuation removed.
 */
export function countyKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

const COUNTY_BY_KEY = new Map(
  KENYA_COUNTIES.map((c) => [countyKey(c.name), c])
);

/** Shorthand stored values that key to a canonical county. */
const KEY_ALIASES: Record<string, string> = {
  tharaka: "Tharaka–Nithi",
};

/**
 * Resolve any stored `job_location_county` value to a canonical county name,
 * or null when the value is not a Kenyan county (missing, junk, or foreign).
 */
export function resolveCountyName(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  const key = countyKey(value);
  if (!key) return null;
  if (KEY_ALIASES[key]) return KEY_ALIASES[key];
  return COUNTY_BY_KEY.get(key)?.name ?? null;
}
