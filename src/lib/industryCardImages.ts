/**
 * Background imagery for industry cards.
 * Prefer Black / African professionals and East African / Kenyan scenes where a
 * clear fit exists; otherwise use sector-authentic photography that still
 * feels grounded.
 *
 * Keys match ACTIVE_INDUSTRY_NAMES from src/lib/stemBird.taxonomy.ts
 * (the 20 canonical STEM industries).
 *
 * Sources: Unsplash (stable photo IDs via images.unsplash.com).
 */

function unsplash(photoId: string, w = 900): string {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${w}&q=75`;
}

/** Fallback when an industry has no specific mapping. */
export const DEFAULT_INDUSTRY_IMAGE = unsplash("photo-1486406146926-c627a92ad1ab");

/** "All industries" hero card — Nairobi urban skyline. */
export const ALL_INDUSTRIES_IMAGE = unsplash("photo-1611348524140-53c9a25263d6");

/**
 * Exact industry name → image URL.
 * Keys match the 20 Canonical STEM Industries in StemBird.
 */
export const INDUSTRY_CARD_IMAGES: Record<string, string> = {
  // 1. Science & Research
  "Science & Research": unsplash("photo-1532094349884-543bc11b234d"),

  // 2. Healthcare & Medical Sciences
  "Healthcare & Medical Sciences": unsplash("photo-1516549655169-df83a0774514"),

  // 3. Pharmaceuticals & Biotechnology
  "Pharmaceuticals & Biotechnology": unsplash("photo-1576091160399-112ba8d25d1d"),

  // 4. Agriculture & Food Science
  "Agriculture & Food Science": unsplash("photo-1625246333195-78d9c38ad449"),

  // 5. Chemicals & Chemical Manufacturing
  "Chemicals & Chemical Manufacturing": unsplash("photo-1532187863486-abf9dbad1b69"),

  // 6. Manufacturing & Industrial Processing
  "Manufacturing & Industrial Processing": unsplash("photo-1565793298595-6a879b1d9492"),

  // 7. Energy, Oil & Gas
  "Energy, Oil & Gas": unsplash("photo-1509391366360-2e959784a276"),

  // 8. Environmental & Natural Sciences
  "Environmental & Natural Sciences": unsplash("photo-1473341304170-971dccb5ac1e"),

  // 9. Information Technology & Software
  "Information Technology & Software": unsplash("photo-1517694712202-14dd9538aa97"),

  // 10. Telecommunications & Networking
  "Telecommunications & Networking": unsplash("photo-1544197150-b99a580bb7a8"),

  // 11. Data Science & Artificial Intelligence
  "Data Science & Artificial Intelligence": unsplash("photo-1551288049-bebda4e38f71"),

  // 12. Engineering & Construction
  "Engineering & Construction": unsplash("photo-1541888946425-d0fbb186c5f7"),

  // 13. Architecture & Urban Planning
  "Architecture & Urban Planning": unsplash("photo-1486406146926-c627a92ad1ab"),

  // 14. Mining, Geology & Earth Sciences
  "Mining, Geology & Earth Sciences": unsplash("photo-1518709766631-a6a7f45921c5"),

  // 15. Water, Sanitation & Waste Management
  "Water, Sanitation & Waste Management": unsplash("photo-1516026672322-bc52d61a55d5"),

  // 16. Mathematics, Statistics & Actuarial Science
  "Mathematics, Statistics & Actuarial Science": unsplash("photo-1509228468518-180dd4864904"),

  // 17. Education & STEM Training
  "Education & STEM Training": unsplash("photo-1573166953836-06864dc70a21"),

  // 18. Aerospace & Aviation
  "Aerospace & Aviation": unsplash("photo-1517976487507-5b3af140ba4e"),

  // 19. Automotive & Transport Technology
  "Automotive & Transport Technology": unsplash("photo-1511919884226-fd3cad34687c"),

  // 20. Electronics & Electrical Equipment
  "Electronics & Electrical Equipment": unsplash("photo-1581092160607-ee22621dd758"),
};

export function getIndustryCardImage(
  industryName: string | null | undefined
): string {
  if (!industryName) return ALL_INDUSTRIES_IMAGE;
  return INDUSTRY_CARD_IMAGES[industryName] || DEFAULT_INDUSTRY_IMAGE;
}
