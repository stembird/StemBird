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
  "Accounting, Auditing & Finance": unsplash("photo-1554224155-6726b3ff858f"),
  "Advertising, Media & Communications": unsplash("photo-1655720357872-ce227e4164ba"),
  "Agriculture & Agribusiness": unsplash("photo-1625246333195-78d9c38ad449"),
  "Agriculture, Fishing & Forestry": unsplash("photo-1464226184884-fa280b87c399"),
  "Arts, Culture & Heritage": unsplash("photo-1528127269322-539801943592"),
  "Automotive & Aviation": unsplash("photo-1436491865332-7a61a109cc05"),
  "Banking, Insurance & Financial Services": unsplash("photo-1611974789855-9c2a0a7236a3"),
  "Building, Construction & Real Estate": unsplash("photo-1503387762-592deb58ef4e"),
  "Business Process Outsourcing (BPO)": unsplash("photo-1531482615713-2afd69097998"),
  "Charity, NGO & Non-Profit": unsplash("photo-1637148602945-433108982492"),
  "Chemical & Process Industry": unsplash("photo-1532187863486-abf9dbad1b69"),
  "Community & Social Services": unsplash("photo-1469571486292-0ba58a3f068b"),
  "Consulting & Professional Services": unsplash("photo-1653669486397-b802144ae64a"),
  "Creative Arts, Entertainment & Design": unsplash("photo-1513364776144-60967b0f800f"),
  "Education & Training": unsplash("photo-1637148778990-621fbe8a8358"),
  "Education Technology (EdTech)": unsplash("photo-1573166953836-06864dc70a21"),
  "Energy, Utilities & Waste Management": unsplash("photo-1473341304170-971dccb5ac1e"),
  "Engineering & Technical Services": unsplash("photo-1581094794329-c8112a89af12"),
  "Environment & Natural Resources": unsplash("photo-1516026672322-bc52d61a55d5"),
  "Fashion & Beauty": unsplash("photo-1558171813-4c088753af8f"),
  "Financial Technology (FinTech)": unsplash("photo-1563986768609-322da13575f3"),
  "Food Services, Hospitality & Catering": unsplash("photo-1414235077428-338989a2e8c0"),
  "Government & Public Administration": unsplash("photo-1529107386315-e1a2ed48a620"),
  "Health Tech & Biotechnology": unsplash("photo-1576091160399-112ba8d25d1d"),
  "Healthcare, Medical & Pharmaceutical": unsplash("photo-1516549655169-df83a0774514"),
  "Human Resources & Recruitment": unsplash("photo-1521791136064-7986c2920216"),
  "ICT & Telecommunications": unsplash("photo-1519389950473-47ba0277781c"),
  "Import & Export": unsplash("photo-1578575437130-527eed3abbec"),
  "Legal Services": unsplash("photo-1589829545856-d10d557cf95f"),
  "Logistics & Transportation": unsplash("photo-1586528116311-ad8dd3c8310d"),
  "Manufacturing & Warehousing": unsplash("photo-1565793298595-6a879b1d9492"),
  "Maritime & Shipping": unsplash("photo-1494412574643-ff11b0a5c1c3"),
  "Marketing & Public Relations": unsplash("photo-1460925895917-afdab827c52f"),
  "Media, Film & Broadcasting": unsplash("photo-1485846234645-a62644f84728"),
  "Mining, Oil & Gas": unsplash("photo-1504917595217-d4dc5ebe6122"),
  "NGO, NPO & Charity": unsplash("photo-1637148602945-433108982492"),
  "Non-classified / Miscellaneous": unsplash("photo-1497366216548-37526070297c"),
  "Printing, Publishing & Packaging": unsplash("photo-1456324504439-367cee3b3c32"),
  "Real Estate & Property Management": unsplash("photo-1560518883-ce09059eeffa"),
  "Renewable Energy & Climate": unsplash("photo-1509391366360-2e959784a276"),
  "Research, Science & Technology": unsplash("photo-1532094349884-543bc11b234d"),
  "Retail, Wholesale, E-commerce & FMCG": unsplash("photo-1555529669-e69e7aa0ba9a"),
  "Security & Defence": unsplash("photo-1582139329536-e7284fece509"),
  "Sports, Fitness & Recreation": unsplash("photo-1461896836934-ffe607ba8211"),
  "Tourism, Travel & Leisure": unsplash("photo-1516426122078-c23e76319801"),
  "Transport & Infrastructure": unsplash("photo-1474487548417-781cb71495f3"),
};

export function getIndustryCardImage(
  industryName: string | null | undefined
): string {
  if (!industryName) return ALL_INDUSTRIES_IMAGE;
  return INDUSTRY_CARD_IMAGES[industryName] || DEFAULT_INDUSTRY_IMAGE;
}
