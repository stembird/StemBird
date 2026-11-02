/**
 * Infer an employer's industry from their name/website — NOT from the jobs
 * they post. Chemistry Lens scope: only chemical, laboratory, pharma, process,
 * environmental, mining/assay, TIC and chemistry-education employers are
 * mapped. Banks, ICT firms, real-estate developers, logistics, HR consultancies
 * and general retailers intentionally return null so the directory filter
 * drops them rather than mislabelling.
 */

import { fuzzyMatchOption } from "./jobParseNormalization";

const GOVERNMENT = "Regulatory, Standards & Public Health Authorities";
const NGO = "Development Organisations & NGO Laboratory Programmes";
const EDUCATION = "Education & Training — Universities, TVET & Professional";
const SCHOOLS = "Education & Training — Schools";
const HEALTHCARE = "Clinical Chemistry & Medical Laboratory Services";
const PHARMA = "Pharmaceuticals & Drug Manufacturing";
const BIOTECH = "Biotechnology & Life Sciences";
const CONSULTING = "Chemical & Process Engineering Consultancy";
const ENVIRONMENT = "Environmental Consulting, EIA & Air Quality";
const WATER = "Water Supply & Treatment";
const WASTEWATER = "Wastewater & Effluent Management";
const WASTE = "Waste Management & Recycling";
const MANUFACTURING = "Chemicals-Driven Manufacturing & Industrial Production";
const ENERGY = "Energy, Power & Utilities";
const BUILDING = "Building & Construction Materials Chemistry";
const PAINTS = "Paints, Coatings, Adhesives & Sealants";
const POLYMERS = "Polymers, Plastics & Rubber";
const COSMETICS = "Personal Care, Cosmetics & Fragrances";
const PETRO = "Petrochemicals, Refining & Fuels";
const MINING = "Mining, Geology & Assay Laboratories";
const FOOD = "Food, Beverage & Brewery Laboratories";
const TIC = "Testing, Inspection, Certification & Calibration";
const LAB_SUPPLY = "Laboratory & Scientific Supply Services";
const TEA = "Tea, Coffee & Horticulture Post-Harvest Processing";
const RESEARCH = "Scientific Research & R&D Institutions";

/** Exact / identity-style overrides for Kenyan employers within Chemistry Lens scope. */
export const KNOWN_COMPANY_INDUSTRIES: Record<string, string> = {
  // Building / construction-materials chemistry (cement, admixtures)
  "bamburi cement": BUILDING,
  "eastern cement": BUILDING,
  "devki cement": BUILDING,
  "nyati cement": BUILDING,
  "mima cement": BUILDING,

  // Paints / coatings / adhesives
  "savitri industries": PAINTS,
  savitri: PAINTS,
  "atlantic paint industries": PAINTS,
  "atlas paint": PAINTS,
  "dulux kenya": PAINTS,

  // Polymers / plastics / rubber
  "nyala plastics": POLYMERS,
  "polymac plastics": POLYMERS,
  "intaplast": POLYMERS,
  "mcdk plastics": POLYMERS,

  // Petrochemicals / refining / fuels
  "national oil corporation of kenya": PETRO,
  "nopk": PETRO,
  "rubis fuel kenya": PETRO,
  "total kenya": PETRO,
  "ptl kenya": PETRO,
  "veboken": PETRO,
  "kenya pipeline": PETRO,

  // Chemical distribution / laboratory supply
  "dcsa laboratories": LAB_SUPPLY,
  "labtech kenya": LAB_SUPPLY,
  "scientific suppliers kenya": LAB_SUPPLY,
  "basf kenya": "Industrial & Basic Chemicals",
  "sigma aldrich": LAB_SUPPLY,
  "merck kenya": LAB_SUPPLY,

  // Pharmaceuticals & drug manufacturing
  "twaha pharmaceuticals": PHARMA,
  "universal micropharma": PHARMA,
  "dawa limited": PHARMA,
  "philapharm": PHARMA,
  "cosmos pharmaceuticals": PHARMA,
  "mcm5 kenya": PHARMA,
  "wellness pharmaceuticals": PHARMA,

  // Biotechnology / life sciences
  "bioline": BIOTECH,
  "boston lab africa": BIOTECH,

  // Clinical chemistry / pathology labs
  "lancet kenya": HEALTHCARE,
  "nhct laboratories": HEALTHCARE,
  "afya medic laboratories": HEALTHCARE,
  "equity afya": HEALTHCARE,
  "amref health africa": HEALTHCARE,
  amref: HEALTHCARE,
  "aga khan university hospital": HEALTHCARE,
  "nairobi hospital": HEALTHCARE,
  "kenyatta national hospital": HEALTHCARE,

  // Food, beverage & brewery labs
  "east african breweries": FOOD,
  "eabl": FOOD,
  "titan brewing": FOOD,
  "christopher industries": FOOD,
  "kp foods": FOOD,
  "kerry group kenya": FOOD,
  "delmonte kenya": FOOD,
  "mcoa bakery": FOOD,

  // Tea / coffee / post-harvest
  "kenya tea growers association": TEA,
  "ktda": TEA,
  "kenya tea research institute": TEA,
  "gtw kenya": TEA,
  "ktgda": TEA,
  "coffee bureau of kenya": TEA,
  "kenya coffee estates": TEA,

  // Mining / assay
  "base titanium": MINING,
  "kwale mining": MINING,
  "kenya gold mine": MINING,
  "sokim gold": MINING,
  "geothermal development corporation": ENERGY,

  // Water / wastewater / waste
  "nairobi water": WATER,
  "kenya pipeline and distribution agency": WATER,
  "ncpwb": WATER,
  "national water harvest and storage": WATER,
  "wajir water": WATER,

  // Environmental regulator
  "national environment management authority (nema)": ENVIRONMENT,
  nema: ENVIRONMENT,
  "national environment management agency": ENVIRONMENT,
  "kenya forest service": ENVIRONMENT,
  "kenya wildlife service": ENVIRONMENT,

  // Energy / utilities
  "kenya power": ENERGY,
  "kplc": ENERGY,
  "kenya electricity transmission": ENERGY,
  "powergen renewable energy": ENERGY,
  powergen: ENERGY,

  // Regulators & standards bodies
  "kenya bureau of standards (kebs)": GOVERNMENT,
  kebs: GOVERNMENT,
  "pharmaceutical and poison board": GOVERNMENT,
  "kenya pharmacy board": GOVERNMENT,
  "energy and petroleum regulatory authority (epra)": GOVERNMENT,
  epra: GOVERNMENT,
  "kenya revenue authority": GOVERNMENT,
  "national oils laboratory": GOVERNMENT,
  "kenya nuclear science and technology authority": GOVERNMENT,

  // Research institutions
  "kenya medical research institute (kemri)": RESEARCH,
  kemri: RESEARCH,
  "kenya agricultural research institute ( kari )": RESEARCH,
  "international centre of insect physiology and ecology": RESEARCH,
  "icipe": RESEARCH,
  "kenya science research institute in Nairobi": RESEARCH,
  cgibin: RESEARCH,
  "worldfish center": RESEARCH,

  // TIC / testing / inspection
  "sgs kenya": TIC,
  "intertek kenya": TIC,
  "bureau veritas": TIC,
  "cotecna east africa": TIC,
  "svensken inspection": TIC,
  "ekopetsken": TIC,

  // NGOs (chemistry-relevant labelling/quality programmes)
  care: NGO,
  "care usa": NGO,
  "care international": NGO,
  "catholic relief services": NGO,
  "one acre fund": NGO,
  oneacrefund: NGO,
  inkomoko: NGO,
  acumen: NGO,
  "acumen academy": NGO,
  "conservation international": ENVIRONMENT,

  // Education (universities/schools)
  "aga khan university": EDUCATION,
  aku: EDUCATION,
  "university of nairobi": EDUCATION,
  uon: EDUCATION,
  "kenyatta university": EDUCATION,
  "jk3 institute of science and technology": EDUCATION,
  "technical university of kenya": EDUCATION,
  tuk: EDUCATION,

  // Government bodies → regulator is the closest active industry for a hub
  // that excludes general public administration.
  "public service commission kenya (psck)": GOVERNMENT,
  "trans nzoia county public service board": GOVERNMENT,
  "makueni county public service board": GOVERNMENT,
  "nakuru county government": GOVERNMENT,
  "baringo county government": GOVERNMENT,
  "judicial service commission": GOVERNMENT,
};

/** Company blurb overrides (unchanged for known employers). */
export const KNOWN_COMPANY_DESCRIPTIONS: Record<string, string> = {
  "kenya bureau of standards (kebs)":
    "The Kenya Bureau of Standards (KEBS) sets and enforces product, laboratory and metrology standards across Kenya.",
  "national environment management authority (nema)":
    "NEMA regulates environmental impact and monitors pollution through Kenya's environmental chemistry laboratories.",
  "kenya revenue authority":
    "The Kenya Revenue Authority (KRA) collects revenue and operates laboratory services for excise, fuel and commodity verification.",
  kemri:
    "The Kenya Medical Research Institute (KEMRI) conducts biomedical and clinical-chemistry research across Kenya.",
  "east african breweries":
    "East African Breweries Limited (EABL) produces spirits and beverages with on-site analytical chemistry and QA laboratories.",
  "kenya power":
    "Kenya Power (KPLC) is the national electric utility, employing water/boiler chemistry and laboratory engineers.",
  "university of nairobi":
    "The University of Nairobi is Kenya's flagship public university, hosting chemistry, chemical engineering and materials-science departments.",
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
 * Infer company industry from the employer identity itself.
 * Returns null when confidence is low OR when the employer is outside the
 * Chemistry Lens scope (banking, ICT, real estate, general retail, HR
 * consultancies, logistics, etc.).
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
    if (known.length < 6) continue;
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

  // ---- Chemistry-relevant regex patterns ----

  // Pharma / drug manufacturing (before generic "medical")
  if (/\b(pharmaceutic|pharma(?!\s+(board|council|authority))|drug (manufactur|house)|api (plant|manufactur))\b/.test(key)) {
    return matchAllowed(PHARMA, allowedIndustries);
  }

  // Biotech / reagents / life-science labs
  if (/\b(biotech|biotechnolog|life science|molecular (diagnostics|sciences)|reagent (supplier|labs))\b/.test(key)) {
    return matchAllowed(BIOTECH, allowedIndustries);
  }

  // Clinical chemistry / pathology / medical laboratory
  if (
    /\b(pathology|clinical (lab|chemistry)|medical laborator|lab(oratories|oratory)? (kenya|africa)?|health lab|diagnostic lab|nhct|lancet)\b/.test(key) ||
    /\b(hospital|clinic|afya|health)\b/.test(key)
  ) {
    return matchAllowed(HEALTHCARE, allowedIndustries);
  }

  // Petrochemicals / refining / fuels / LPG
  if (/\b(oil|petro|refinery|fuel|petrol|diesel|lpg|lubricant|bitumen)\b/.test(key)) {
    return matchAllowed(PETRO, allowedIndustries);
  }

  // Energy / power / utilities
  if (/\b(power|electricity|energy|solar|wind farm|geothermal|utility|utilities)\b/.test(key)) {
    return matchAllowed(ENERGY, allowedIndustries);
  }

  // Water / wastewater
  if (/\b(water supply|water utility|water treatment|water works|ncpwb|water company|county water)\b/.test(key) || /\bwater\b/.test(key)) {
    return matchAllowed(WATER, allowedIndustries);
  }
  if (/\b(sewerage|wastewater|effluent)\b/.test(key)) {
    return matchAllowed(WASTEWATER, allowedIndustries);
  }

  // Waste / recycling
  if (/\b(waste|recycling|scrap|e-?waste)\b/.test(key)) {
    return matchAllowed(WASTE, allowedIndustries);
  }

  // Mining / assay / mineral processing
  if (/\b(mine|mining|quarry|assay|beneficiation|gold|copper|titanium|soda ash|trona|mineral)\b/.test(key)) {
    return matchAllowed(MINING, allowedIndustries);
  }

  // Cement / concrete / building-materials chemistry
  if (/\b(cement|concrete|admixtures?|building material)\b/.test(key)) {
    return matchAllowed(BUILDING, allowedIndustries);
  }

  // Paints / coatings / adhesives / sealants
  if (/\b(paints?|coating|adhesive|sealant|varnish|lacquer)\b/.test(key)) {
    return matchAllowed(PAINTS, allowedIndustries);
  }

  // Polymers / plastics / rubber
  if (/\b(plastic|polymer|rubber|composite|injection mould|injection mold)\b/.test(key)) {
    return matchAllowed(POLYMERS, allowedIndustries);
  }

  // Cosmetics / personal care
  if (/\b(cosmetic|personal care|toiletries|skin ?care|fragrance|perfume|soap and detergent)\b/.test(key)) {
    return matchAllowed(COSMETICS, allowedIndustries);
  }

  // Food / beverage / brewery / dairy / milling
  if (/\b(brewer|brewery|beverage|distiller|malt|dairy|milling|flour|food (co|compan|labs|technolog)|sugar|juice|bottler)\b/.test(key)) {
    return matchAllowed(FOOD, allowedIndustries);
  }

  // Tea / coffee / horticulture post-harvest
  if (/\b(tea (factory|estate|research|growers|development)|coffee (bureau|estate|research|processing)|flower (farm|export|esh|bouquet)|horticulture post[- ]harvest)\b/.test(key)) {
    return matchAllowed(TEA, allowedIndustries);
  }

  // Fertilizers / agrochemicals
  if (/\b(fertilizer|fertiliser|agrochemical|pesticide|herbicide|insecticide)\b/.test(key)) {
    return matchAllowed("Fertilizers & Agrochemicals", allowedIndustries);
  }

  // Industrial & basic chemicals
  if (/\b(chemical|chem\.?(s|ical)?|acids?|alkali|solvent|caustic|industrial gas)\b/.test(key) && !/chemical engineering/.test(key)) {
    return matchAllowed("Industrial & Basic Chemicals", allowedIndustries);
  }

  // TIC / testing / inspection / calibration
  if (/\b(testing|inspection|certification|calibration|surveyor|sgs|intertek|bv )\b/.test(key)) {
    return matchAllowed(TIC, allowedIndustries);
  }

  // Laboratory / scientific supply / instrument supplier
  if (/\b(lab(oratory)? (supplier|equipment|outfitting|services)|scientific (instrument|supplier|equipment)|reagent supplier)\b/.test(key)) {
    return matchAllowed(LAB_SUPPLY, allowedIndustries);
  }

  // Environmental consulting / EIA / air quality
  if (/\b(environmental|eia|air quality|pollution control|climate (research|change))\b/.test(key)) {
    return matchAllowed(ENVIRONMENT, allowedIndustries);
  }

  // Research institutes (KEMRI/CSIR/KALRO/icipe/etc.)
  if (/\b(research (institute|centre|center)|csir|kari|kalro|kemri|icipe|institute of research)\b/.test(key)) {
    return matchAllowed(RESEARCH, allowedIndustries);
  }

  // Universities & higher education
  if (/\b(university|college|institute of science|polytechnic|tuition)\b/.test(key)) {
    return matchAllowed(EDUCATION, allowedIndustries);
  }
  if (/\b(school|academy)\b/.test(key) && !/\b(driving school)\b/.test(key)) {
    return matchAllowed(SCHOOLS, allowedIndustries);
  }

  // Regulators & standards bodies (gov)
  if (
    /\b(county government|county public service board|public service commission|ministry of|national assembly|revenue authority|standards|authority|board of kenya|council of kenya|regulator|regulatory)\b/.test(
      key
    ) ||
    (/\.go\.ke\b/.test(host) && !/\b(bank|university|hospital)\b/.test(key))
  ) {
    return matchAllowed(GOVERNMENT, allowedIndustries);
  }

  // Process-engineering consultancies (name explicitly says chemical/process engineering)
  if (/\b(chemical engineering|process engineering|process consultancy)\b/.test(key)) {
    return matchAllowed(CONSULTING, allowedIndustries);
  }

  // Everything else (banking, ICT, retail, logistics, real estate, HR, general
  // manufacturing, media, education-tech, etc.) is out of Chemistry Lens scope.
  return null;
}

export function lookupKnownCompanyDescription(name: string): string | null {
  const key = normalizeLookupKey(name);
  if (NORMALIZED_DESCRIPTIONS.has(key)) return NORMALIZED_DESCRIPTIONS.get(key)!;

  let best: { known: string; desc: string } | null = null;
  for (const [known, desc] of NORMALIZED_DESCRIPTIONS) {
    if (known.length < 6) continue;
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
