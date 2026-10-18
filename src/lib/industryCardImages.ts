/**
 * Background imagery for industry cards.
 * Prefer Black / African people and East African / Kenyan scenes where a
 * clear fit exists; otherwise use sector-authentic photography that still
 * feels grounded.
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
 * Keys must match names from the `industries` table.
 */
export const INDUSTRY_CARD_IMAGES: Record<string, string> = {
  "Agriculture, Agribusiness & Agricultural Technology": unsplash("photo-1625246333195-78d9c38ad449"),
  "Food & Beverage Manufacturing": unsplash("photo-1414235077428-338989a2e8c0"),
  "Chemicals, Paints, Polymers & Industrial Materials": unsplash("photo-1532187863486-abf9dbad1b69"),
  "Pharmaceuticals & Biotechnology": unsplash("photo-1576091160399-112ba8d25d1d"),
  "Healthcare, Hospitals & Medical Laboratories": unsplash("photo-1516549655169-df83a0774514"),
  "Manufacturing & Industrial Production": unsplash("photo-1565793298595-6a879b1d9492"),
  "Paper, Pulp & Packaging": unsplash("photo-1456324504439-367cee3b3c32"),
  "Plastics, Rubber & Composites": unsplash("photo-1581094794329-c8112a89af12"),
  "Oil, Gas & Petrochemicals": unsplash("photo-1504917595217-d4dc5ebe6122"),
  "Energy, Power & Renewable Energy": unsplash("photo-1509391366360-2e959784a276"),
  "Water, Wastewater & Water Treatment": unsplash("photo-1516026672322-bc52d61a55d5"),
  "Environmental Services & Conservation": unsplash("photo-1473341304170-971dccb5ac1e"),
  "Mining, Geology & Mineral Processing": unsplash("photo-1504917595217-d4dc5ebe6122"),
  "Construction, Infrastructure & Built Environment": unsplash("photo-1503387762-592deb58ef4e"),
  "Electrical & Electronics Manufacturing": unsplash("photo-1519389950473-47ba0277781c"),
  "Automotive & Transport Equipment": unsplash("photo-1436491865332-7a61a109cc05"),
  "Aerospace & Defence": unsplash("photo-1436491865332-7a61a109cc05"),
  "Information Technology & Software": unsplash("photo-1531482615713-2afd69097998"),
  "Telecommunications & Networking": unsplash("photo-1519389950473-47ba0277781c"),
  "Data, Artificial Intelligence & Analytics": unsplash("photo-1531482615713-2afd69097998"),
  "Banking, Finance & Insurance": unsplash("photo-1611974789855-9c2a0a7236a3"),
  "Consulting & Professional Services": unsplash("photo-1653669486397-b802144ae64a"),
  "Scientific Research & Development": unsplash("photo-1532094349884-543bc11b234d"),
  "Testing, Inspection, Certification & Calibration": unsplash("photo-1581094794329-c8112a89af12"),
  "Schools & Secondary Education": unsplash("photo-1637148778990-621fbe8a8358"),
  "Universities & Higher Education": unsplash("photo-1573166953836-06864dc70a21"),
  "Technical & Vocational Education and Training (TVET)": unsplash("photo-1581094794329-c8112a89af12"),
  "STEM Training & Professional Development": unsplash("photo-1521791136064-7986c2920216"),
  "Educational Technology (EdTech)": unsplash("photo-1573166953836-06864dc70a21"),
  "Government & Public Sector": unsplash("photo-1529107386315-e1a2ed48a620"),
  "NGOs, Development & International Organisations": unsplash("photo-1637148602945-433108982492"),
  "Logistics, Supply Chain & Distribution": unsplash("photo-1586528116311-ad8dd3c8310d"),
  "Consumer Goods & Retail": unsplash("photo-1555529669-e69e7aa0ba9a"),
  "Textiles, Apparel & Leather Manufacturing": unsplash("photo-1558171813-4c088753af8f"),
  "Life Sciences & Biomedical Research": unsplash("photo-1576091160399-112ba8d25d1d"),
  "Laboratories & Scientific Services": unsplash("photo-1532094349884-543bc11b234d"),
  "Aviation & Aerospace Services": unsplash("photo-1436491865332-7a61a109cc05"),
  "Real Estate & Facilities Management": unsplash("photo-1560518883-ce09059eeffa"),
  "Telecommunications Infrastructure": unsplash("photo-1519389950473-47ba0277781c"),
  "Waste Management & Recycling": unsplash("photo-1473341304170-971dccb5ac1e"),
};

export function getIndustryCardImage(
  industryName: string | null | undefined
): string {
  if (!industryName) return ALL_INDUSTRIES_IMAGE;
  return INDUSTRY_CARD_IMAGES[industryName] || DEFAULT_INDUSTRY_IMAGE;
}
