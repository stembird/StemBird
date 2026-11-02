/**
 * Background imagery for industry cards.
 * Prefer Black / African people and East African / Kenyan scenes where a
 * clear fit exists; otherwise use sector-authentic photography that still
 * feels grounded.
 *
 * Keys must match ACTIVE_INDUSTRY_NAMES from src/lib/chemistryLens.taxonomy.ts
 * (the industries lookup table in Supabase).
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
 * Keys must match names from the `industries` table (Chemistry Lens v1.1).
 */
export const INDUSTRY_CARD_IMAGES: Record<string, string> = {
  // ── S1 Chemicals & Advanced Materials ─────────────────────────────────
  "Industrial & Basic Chemicals": unsplash("photo-1532187863486-abf9dbad1b69"),
  "Fertilizers & Agrochemicals": unsplash("photo-1625246333195-78d9c38ad449"),
  "Paints, Coatings, Adhesives & Sealants": unsplash("photo-1562259029-ac2a98382086"),
  "Polymers, Plastics & Rubber": unsplash("photo-1581094794329-c8112a89af12"),
  "Personal Care, Cosmetics & Fragrances": unsplash("photo-1522335789207-a12e09a46f2d"),
  "Petrochemicals, Refining & Fuels": unsplash("photo-1504917595217-d4dc5ebe6122"),

  // ── S2 Pharma, Biochem & Lab Sciences ─────────────────────────────────
  "Pharmaceuticals & Drug Manufacturing": unsplash("photo-1576091160399-112ba8d25d1d"),
  "Biotechnology & Life Sciences": unsplash("photo-1579165687185-57396c7f2bfe"),
  "Clinical Chemistry & Medical Laboratory Services": unsplash("photo-1516549655169-df83a0774514"),
  "Forensic & Toxicology Laboratories": unsplash("photo-1581092918499-4411d1744662"),

  // ── S3 Energy, Process & Manufacturing ────────────────────────────────
  "Food, Beverage & Brewery Laboratories": unsplash("photo-1414235077428-338989a2e8c0"),
  "Energy, Power & Utilities": unsplash("photo-1509391366360-2e959784a276"),
  "Chemicals-Driven Manufacturing & Industrial Production": unsplash("photo-1565793298595-6a879b1d9492"),
  "Tea, Coffee & Horticulture Post-Harvest Processing": unsplash("photo-1501705384521-8d5e3a2443cb"),

  // ── S4 Environment, Water & Waste ─────────────────────────────────────
  "Water Supply & Treatment": unsplash("photo-1516026672322-bc52d61a55d5"),
  "Wastewater & Effluent Management": unsplash("photo-1585386915778-960cccce489a"),
  "Environmental Consulting, EIA & Air Quality": unsplash("photo-1473341304170-971dccb5ac1e"),
  "Waste Management & Recycling": unsplash("photo-1532996152958-d1a0d41f1564"),

  // ── S5 Mining, Minerals & Resource Processing ─────────────────────────
  "Mining, Geology & Assay Laboratories": unsplash("photo-1518709766631-a6a7f45921c5"),
  "Mineral Processing & Hydrometallurgy": unsplash("photo-1504917595217-d4dc5ebe6122"),

  // ── S6 Research, Regulation & Public Interest ─────────────────────────
  "Scientific Research & R&D Institutions": unsplash("photo-1532094349884-543bc11b234d"),
  "Regulatory, Standards & Public Health Authorities": unsplash("photo-1529107386315-e1a2ed48a620"),

  // ── S7 Testing, Science Services & Skills ─────────────────────────────
  "Testing, Inspection, Certification & Calibration": unsplash("photo-1581094794329-c8112a89af12"),
  "Laboratory & Scientific Supply Services": unsplash("photo-1579154204155-08d47583d44d"),
  "Chemical & Process Engineering Consultancy": unsplash("photo-1581091226825-a509be81ad49"),
  "Education & Training — Schools": unsplash("photo-1637148778990-621fbe8a8358"),
  "Education & Training — Universities, TVET & Professional": unsplash("photo-1573166953836-06864dc70a21"),
};

export function getIndustryCardImage(
  industryName: string | null | undefined
): string {
  if (!industryName) return ALL_INDUSTRIES_IMAGE;
  return INDUSTRY_CARD_IMAGES[industryName] || DEFAULT_INDUSTRY_IMAGE;
}
