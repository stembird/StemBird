/**
 * Infer an employer's industry from their name/website — NOT from the jobs
 * they post.
 *
 * Scope: StemBird 20 Canonical STEM Industries
 * (Science & Healthcare, Technology, Engineering & Architecture, Mathematics)
 */

import { fuzzyMatchOption } from "./jobParseNormalization";

const SCIENCE_RESEARCH = "Science & Research";
const HEALTHCARE = "Healthcare & Medical Sciences";
const PHARMA = "Pharmaceuticals & Biotechnology";
const AGRICULTURE = "Agriculture & Food Science";
const CHEMICALS = "Chemicals & Chemical Manufacturing";
const MANUFACTURING = "Manufacturing & Industrial Processing";
const ENERGY = "Energy, Oil & Gas";
const ENVIRONMENT = "Environmental & Natural Sciences";
const IT_SOFTWARE = "Information Technology & Software";
const TELECOM = "Telecommunications & Networking";
const DATA_AI = "Data Science & Artificial Intelligence";
const CONSTRUCTION = "Engineering & Construction";
const ARCHITECTURE = "Architecture & Urban Planning";
const MINING = "Mining, Geology & Earth Sciences";
const WATER_WASTE = "Water, Sanitation & Waste Management";
const MATH_ACTUARIAL = "Mathematics, Statistics & Actuarial Science";
const EDUCATION = "Education & STEM Training";
const AEROSPACE = "Aerospace & Aviation";
const AUTOMOTIVE = "Automotive & Transport Technology";
const ELECTRONICS = "Electronics & Electrical Equipment";

/** Exact / identity-style overrides for Kenyan employers within StemBird scope. */
export const KNOWN_COMPANY_INDUSTRIES: Record<string, string> = {
  // Building & Construction / Materials
  "bamburi cement": CONSTRUCTION,
  "eastern cement": CONSTRUCTION,
  "devki cement": CONSTRUCTION,
  "nyati cement": CONSTRUCTION,
  "mima cement": CONSTRUCTION,

  // Paints / coatings / adhesives / chemicals
  "savitri industries": CHEMICALS,
  savitri: CHEMICALS,
  "atlantic paint industries": CHEMICALS,
  "atlas paint": CHEMICALS,
  "dulux kenya": CHEMICALS,
  "nyala plastics": CHEMICALS,
  "polymac plastics": CHEMICALS,
  intaplast: CHEMICALS,
  "mcdk plastics": CHEMICALS,
  "basf kenya": CHEMICALS,

  // Petrochemicals / fuels / energy
  "national oil corporation of kenya": ENERGY,
  nopk: ENERGY,
  "rubis fuel kenya": ENERGY,
  "total kenya": ENERGY,
  "ptl kenya": ENERGY,
  veboken: ENERGY,
  "kenya pipeline": ENERGY,
  "kenya power": ENERGY,
  kplc: ENERGY,
  "kenya electricity transmission": ENERGY,
  "powergen renewable energy": ENERGY,
  powergen: ENERGY,
  kengen: ENERGY,
  "geothermal development corporation": ENERGY,

  // Scientific supply & labs
  "dcsa laboratories": SCIENCE_RESEARCH,
  "labtech kenya": SCIENCE_RESEARCH,
  "scientific suppliers kenya": SCIENCE_RESEARCH,
  "sigma aldrich": SCIENCE_RESEARCH,
  "merck kenya": SCIENCE_RESEARCH,

  // Pharmaceuticals & biotechnology
  "twaha pharmaceuticals": PHARMA,
  "universal micropharma": PHARMA,
  "dawa limited": PHARMA,
  philapharm: PHARMA,
  "cosmos pharmaceuticals": PHARMA,
  "mcm5 kenya": PHARMA,
  "wellness pharmaceuticals": PHARMA,
  bioline: PHARMA,
  "boston lab africa": PHARMA,

  // Clinical & healthcare
  "lancet kenya": HEALTHCARE,
  "nhct laboratories": HEALTHCARE,
  "afya medic laboratories": HEALTHCARE,
  "equity afya": HEALTHCARE,
  "amref health africa": HEALTHCARE,
  amref: HEALTHCARE,
  "aga khan university hospital": HEALTHCARE,
  "nairobi hospital": HEALTHCARE,
  "kenyatta national hospital": HEALTHCARE,

  // Food & Agriculture
  "east african breweries": AGRICULTURE,
  eabl: AGRICULTURE,
  "titan brewing": AGRICULTURE,
  "christopher industries": AGRICULTURE,
  "kp foods": AGRICULTURE,
  "kerry group kenya": AGRICULTURE,
  "delmonte kenya": AGRICULTURE,
  "mcoa bakery": AGRICULTURE,
  "kenya tea growers association": AGRICULTURE,
  ktda: AGRICULTURE,
  "kenya tea research institute": AGRICULTURE,
  gtw kenya: AGRICULTURE,
  ktgda: AGRICULTURE,
  "coffee bureau of kenya": AGRICULTURE,
  "kenya coffee estates": AGRICULTURE,

  // Mining / Geology
  "base titanium": MINING,
  "kwale mining": MINING,
  "kenya gold mine": MINING,
  "sokim gold": MINING,

  // Water & waste management
  "nairobi water": WATER_WASTE,
  "kenya pipeline and distribution agency": WATER_WASTE,
  ncpwb: WATER_WASTE,
  "national water harvest and storage": WATER_WASTE,
  "wajir water": WATER_WASTE,

  // Environmental
  "national environment management authority (nema)": ENVIRONMENT,
  nema: ENVIRONMENT,
  "national environment management agency": ENVIRONMENT,
  "kenya forest service": ENVIRONMENT,
  "kenya wildlife service": ENVIRONMENT,
  "conservation international": ENVIRONMENT,

  // Research institutes
  "kenya medical research institute (kemri)": SCIENCE_RESEARCH,
  kemri: SCIENCE_RESEARCH,
  "kenya agricultural research institute ( kari )": SCIENCE_RESEARCH,
  "international centre of insect physiology and ecology": SCIENCE_RESEARCH,
  icipe: SCIENCE_RESEARCH,
  "kenya science research institute in nairobi": SCIENCE_RESEARCH,
  "worldfish center": SCIENCE_RESEARCH,
  kalro: SCIENCE_RESEARCH,

  // Standards / TIC
  "kenya bureau of standards (kebs)": SCIENCE_RESEARCH,
  kebs: SCIENCE_RESEARCH,
  "sgs kenya": SCIENCE_RESEARCH,
  "intertek kenya": SCIENCE_RESEARCH,
  "bureau veritas": SCIENCE_RESEARCH,
  "cotecna east africa": SCIENCE_RESEARCH,

  // IT & Tech & Telecoms
  safaricom: TELECOM,
  airtel: TELECOM,
  telkom: TELECOM,
  cellulant: IT_SOFTWARE,
  andela: IT_SOFTWARE,
  microsoft: IT_SOFTWARE,
  google: IT_SOFTWARE,

  // Education & STEM Training
  "aga khan university": EDUCATION,
  aku: EDUCATION,
  "university of nairobi": EDUCATION,
  uon: EDUCATION,
  "kenyatta university": EDUCATION,
  "technical university of kenya": EDUCATION,
  tuk: EDUCATION,
  "strathmore university": EDUCATION,
  "jkuat": EDUCATION,
};

/** Company blurb overrides. */
export const KNOWN_COMPANY_DESCRIPTIONS: Record<string, string> = {
  "kenya bureau of standards (kebs)":
    "The Kenya Bureau of Standards (KEBS) sets and enforces product, laboratory and metrology standards across Kenya.",
  "national environment management authority (nema)":
    "NEMA regulates environmental impact, biodiversity and sustainable natural resource management in Kenya.",
  "kenya revenue authority":
    "The Kenya Revenue Authority (KRA) operates technical and laboratory services for verification and customs.",
  kemri:
    "The Kenya Medical Research Institute (KEMRI) conducts biomedical and clinical health sciences research across Kenya.",
  "east african breweries":
    "East African Breweries Limited (EABL) is a leading manufacturing and agro-processing enterprise with state-of-the-art QA facilities.",
  "kenya power":
    "Kenya Power (KPLC) manages electric power transmission and distribution engineering across Kenya.",
  "university of nairobi":
    "The University of Nairobi is Kenya's flagship university offering premier education across all STEM fields.",
};

function normalizeLookupKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''`´]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildNormalizedMap(source: Record<string, string>): Map<string, string> {
  const map = new Map<string, string>();
  for (const [raw, value] of Object.entries(source)) {
    const key = normalizeLookupKey(raw);
    if (key) map.set(key, value);
  }
  return map;
}

const NORMALIZED_INDUSTRIES = buildNormalizedMap(KNOWN_COMPANY_INDUSTRIES);
const NORMALIZED_DESCRIPTIONS = buildNormalizedMap(KNOWN_COMPANY_DESCRIPTIONS);

/**
 * Infer company industry from the employer identity.
 */
export function inferCompanyIndustry(
  name: string,
  website?: string | null,
  allowedIndustries?: string[]
): string | null {
  const key = normalizeLookupKey(name);
  if (!key) return null;

  if (NORMALIZED_INDUSTRIES.has(key)) {
    return matchAllowed(NORMALIZED_INDUSTRIES.get(key)!, allowedIndustries);
  }

  let bestKnown: { known: string; industry: string } | null = null;
  for (const [known, industry] of NORMALIZED_INDUSTRIES) {
    if (known.length < 5) continue;
    if (key === known || key.includes(known) || known.includes(key)) {
      if (!bestKnown || known.length > bestKnown.known.length) {
        bestKnown = { known, industry };
      }
    }
  }
  if (bestKnown) {
    return matchAllowed(bestKnown.industry, allowedIndustries);
  }

  const host = (website || "").toLowerCase();

  // 1. Tech & Software
  if (/\b(software|tech|technologies|systems|digital|app|cloud|saas|fintech|cyber|solutions|developer)\b/.test(key)) {
    return matchAllowed(IT_SOFTWARE, allowedIndustries);
  }

  // 2. Telecoms & Networking
  if (/\b(telecom|telecommunication|network|fibre|fiber|cellular|wireless|broadband|isp)\b/.test(key)) {
    return matchAllowed(TELECOM, allowedIndustries);
  }

  // 3. Data Science & AI
  if (/\b(data science|analytics|artificial intelligence|machine learning|bi analytics)\b/.test(key)) {
    return matchAllowed(DATA_AI, allowedIndustries);
  }

  // 4. Pharma & Biotech
  if (/\b(pharmaceutic|pharma|drug|biotech|biotechnolog|molecular|life science)\b/.test(key)) {
    return matchAllowed(PHARMA, allowedIndustries);
  }

  // 5. Healthcare & Medical
  if (
    /\b(hospital|clinic|afya|health|medical|pathology|diagnostic|clinical|dispensary)\b/.test(key)
  ) {
    return matchAllowed(HEALTHCARE, allowedIndustries);
  }

  // 6. Agriculture & Food Science
  if (/\b(agriculture|agri|farm|crop|seed|brew|beverage|food|dairy|tea|coffee|flour|grain|sugar)\b/.test(key)) {
    return matchAllowed(AGRICULTURE, allowedIndustries);
  }

  // 7. Chemicals & Chemical Manufacturing
  if (/\b(chemical|paint|coating|adhesive|plastic|polymer|rubber|cosmetic|fragrance|fertilizer|soap|detergent)\b/.test(key)) {
    return matchAllowed(CHEMICALS, allowedIndustries);
  }

  // 8. Energy, Oil & Gas
  if (/\b(oil|petro|refinery|fuel|gas|power|electric|energy|solar|wind|geothermal)\b/.test(key)) {
    return matchAllowed(ENERGY, allowedIndustries);
  }

  // 9. Environmental & Natural Sciences
  if (/\b(environment|eia|conservation|ecology|forestry|wildlife|climate)\b/.test(key)) {
    return matchAllowed(ENVIRONMENT, allowedIndustries);
  }

  // 10. Engineering & Construction
  if (/\b(construction|builder|cement|concrete|contractor|civil engineering|structural|infrastructure)\b/.test(key)) {
    return matchAllowed(CONSTRUCTION, allowedIndustries);
  }

  // 11. Architecture & Urban Planning
  if (/\b(architecture|architects|urban planning|spatial|interior design)\b/.test(key)) {
    return matchAllowed(ARCHITECTURE, allowedIndustries);
  }

  // 12. Mining, Geology & Earth Sciences
  if (/\b(mining|quarry|assay|geology|geoscience|mineral|gold|titanium)\b/.test(key)) {
    return matchAllowed(MINING, allowedIndustries);
  }

  // 13. Water, Sanitation & Waste Management
  if (/\b(water|sanitation|sewerage|wastewater|effluent|waste|recycling)\b/.test(key)) {
    return matchAllowed(WATER_WASTE, allowedIndustries);
  }

  // 14. Mathematics, Statistics & Actuarial
  if (/\b(actuarial|statistics|mathematics|quant)\b/.test(key)) {
    return matchAllowed(MATH_ACTUARIAL, allowedIndustries);
  }

  // 15. Education & STEM Training
  if (/\b(university|college|polytechnic|school|academy|institute of technology|tvet)\b/.test(key)) {
    return matchAllowed(EDUCATION, allowedIndustries);
  }

  // 16. Aerospace & Aviation
  if (/\b(aviation|aerospace|airline|airport|airways|avionics|aeronautical)\b/.test(key)) {
    return matchAllowed(AEROSPACE, allowedIndustries);
  }

  // 17. Automotive & Transport Technology
  if (/\b(automotive|motor|vehicles|transport technology|assembly plant)\b/.test(key)) {
    return matchAllowed(AUTOMOTIVE, allowedIndustries);
  }

  // 18. Electronics & Electrical Equipment
  if (/\b(electronics|electrical equipment|semiconductor|hardware|circuits)\b/.test(key)) {
    return matchAllowed(ELECTRONICS, allowedIndustries);
  }

  // 19. Manufacturing & Industrial Processing
  if (/\b(manufacturing|industrial|factory|processing|mills|packaging)\b/.test(key)) {
    return matchAllowed(MANUFACTURING, allowedIndustries);
  }

  // 20. Science & Research
  if (/\b(research|laboratories|laboratory|testing|inspection|standards|kebs|kemri|kari|kalro|icipe)\b/.test(key)) {
    return matchAllowed(SCIENCE_RESEARCH, allowedIndustries);
  }

  return null;
}

export function lookupKnownCompanyDescription(name: string): string | null {
  const key = normalizeLookupKey(name);
  if (NORMALIZED_DESCRIPTIONS.has(key)) return NORMALIZED_DESCRIPTIONS.get(key)!;

  let best: { known: string; desc: string } | null = null;
  for (const [known, desc] of NORMALIZED_DESCRIPTIONS) {
    if (known.length < 5) continue;
    if (key === known || key.startsWith(`${known} `)) {
      const remainder = key.slice(known.length).trim();
      if (remainder && /^(rwanda|uganda|tanzania|afya|insurance|group)\b/.test(remainder)) {
        continue;
      }
      if (!best || known.length > best.known.length) best = { known, desc };
    }
  }
  return best?.desc ?? null;
}

function matchAllowed(
  industry: string,
  allowedIndustries?: string[]
): string | null {
  if (!allowedIndustries?.length) return industry;
  return fuzzyMatchOption(industry, allowedIndustries) || null;
}
