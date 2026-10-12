/**
 * Infer an employer's industry from their name/website — NOT from the jobs they post.
 *
 * Recruitment agencies and government bodies often advertise roles across many
 * sectors; those role industries must not become the company's industry.
 */

import { fuzzyMatchOption } from "./jobParseNormalization";

const HR_RECRUITMENT = "Human Resources & Recruitment";
const GOVERNMENT = "Government & Public Administration";
const BANKING = "Banking, Insurance & Financial Services";
const NGO = "Charity, NGO & Non-Profit";
const ICT = "ICT & Telecommunications";
const EDUCATION = "Education & Training";
const HEALTHCARE = "Healthcare, Medical & Pharmaceutical";
const AGRICULTURE = "Agriculture & Agribusiness";
const CONSULTING = "Consulting & Professional Services";
const ENVIRONMENT = "Environment & Natural Resources";
const LOGISTICS = "Logistics & Transportation";
const MANUFACTURING = "Manufacturing & Warehousing";
const ENERGY = "Energy, Utilities & Waste Management";
const REAL_ESTATE = "Real Estate & Property Management";
const BUILDING = "Building, Construction & Real Estate";
const LEGAL = "Legal Services";
const TOURISM = "Tourism, Travel & Leisure";
const SECURITY = "Security & Defence";
const RETAIL = "Retail, Wholesale, E-commerce & FMCG";
const FINTECH = "Financial Technology (FinTech)";

/** Exact / identity-style overrides for well-known Kenyan employers. */
export const KNOWN_COMPANY_INDUSTRIES: Record<string, string> = {
  // Scraped city / real-estate developers
  "tatu city": BUILDING,
  tatucity: BUILDING,
  rendeavour: BUILDING,
  "r endeavour": BUILDING,
  "kiswishi city": BUILDING,
  "appolonia city": BUILDING,
  inkomoko: NGO,
  "one acre fund": AGRICULTURE,
  oneacrefund: AGRICULTURE,
  acumen: NGO,
  "acumen academy": NGO,
  "genesis analytics": CONSULTING,
  "digital divide data": "Business Process Outsourcing (BPO)",
  ddd: "Business Process Outsourcing (BPO)",
  "salix data africa": ICT,
  salix: ICT,
  "powergen renewable energy": ENERGY,
  powergen: ENERGY,
  ihub: ICT,
  "ihub nairobi": ICT,
  amref: HEALTHCARE,
  "amref health africa": HEALTHCARE,
  "corporate staffing": HR_RECRUITMENT,
  "career options africa ltd": HR_RECRUITMENT,
  "career directions limited (cdl)": HR_RECRUITMENT,
  "cdl human resource": HR_RECRUITMENT,
  "people foco": HR_RECRUITMENT,
  "hcs affiliates group": HR_RECRUITMENT,
  "reeds africa consult": HR_RECRUITMENT,
  "stratostaff": HR_RECRUITMENT,
  "gap recruitment services limited": HR_RECRUITMENT,
  "fanisi hr solutions": HR_RECRUITMENT,
  "peoplelink consultants ltd": HR_RECRUITMENT,
  "prorecruit versaatech": HR_RECRUITMENT,
  "q-sourcing servtec group": HR_RECRUITMENT,
  "human asset consultants limited": HR_RECRUITMENT,
  "human capital outsourcing limited": HR_RECRUITMENT,
  "talent grid africa": HR_RECRUITMENT,
  "talent nexus": HR_RECRUITMENT,
  "artemis outsourcing limited": HR_RECRUITMENT,
  "frank management consult ltd": HR_RECRUITMENT,
  "swinton consulting limited": CONSULTING,
  "emerge egress consulting": CONSULTING,

  "public service commission kenya (psck)": GOVERNMENT,
  "trans nzoia county public service board": GOVERNMENT,
  "makueni county public service board": GOVERNMENT,
  "nakuru county government": GOVERNMENT,
  "baringo county government": GOVERNMENT,
  "kenya revenue authority": GOVERNMENT,
  "national environment management authority (nema)": ENVIRONMENT,
  "public service superannuation fund": BANKING,

  "county sacco society ltd": BANKING,
  "absa bank limited": BANKING,
  "kcb group": BANKING,
  "equity bank": BANKING,
  "equity bank rwanda": BANKING,
  "equity afya": HEALTHCARE,
  britam: BANKING,
  "britam holdings": BANKING,
  "aga khan university": EDUCATION,
  aku: EDUCATION,
  // More specific than "aga khan university" (includes-match would otherwise win)
  "aga khan university hospital": HEALTHCARE,
  care: NGO,
  "care usa": NGO,
  "care international": NGO,
  "conservation international": ENVIRONMENT,
};

export const KNOWN_COMPANY_DESCRIPTIONS: Record<string, string> = {
  "corporate staffing":
    "Corporate Staffing Services is a Nairobi recruitment agency offering executive search, HR consultancy, and staffing solutions for employers across Kenya.",
  "career options africa ltd":
    "Career Options Africa is a regional HR agency providing recruitment, HR outsourcing, payroll, and employer-of-record services across multiple African markets.",
  "career directions limited (cdl)":
    "Career Directions Limited (CDL) is an East African HR consultancy specializing in recruitment, labour outsourcing, payroll, and workforce management.",
  "cdl human resource":
    "Career Directions Limited (CDL) is an East African HR consultancy specializing in recruitment, labour outsourcing, payroll, and workforce management.",
  "people foco":
    "People FOCO is a Kenyan human resources and recruitment firm that helps organizations source talent and manage hiring processes.",
  "hcs affiliates group":
    "HCS Affiliates Group is a Nairobi human resources and management consultancy offering recruitment, outsourcing, training, and executive search.",
  "trans nzoia county public service board":
    "The Trans Nzoia County Public Service Board oversees recruitment and human resource management for the County Government of Trans Nzoia.",
  "public service commission kenya (psck)":
    "The Public Service Commission of Kenya (PSCK) is the constitutional body responsible for recruitment and human resource management in Kenya’s public service.",
  "nakuru county government":
    "Nakuru County Government is the devolved administration responsible for public services and development programmes in Nakuru County, Kenya.",
  "baringo county government":
    "Baringo County Government is the devolved administration delivering public services and development programmes in Baringo County, Kenya.",
  "makueni county public service board":
    "The Makueni County Public Service Board manages recruitment and human resource functions for the County Government of Makueni.",
  "reeds africa consult":
    "Reeds Africa Consult is a Kenyan recruitment and HR consulting firm that places talent across professional and technical roles.",
  "stratostaff":
    "Stratostaff is an East African staffing and recruitment firm connecting employers with skilled talent across the region.",
  "kenya revenue authority":
    "The Kenya Revenue Authority (KRA) is the government agency responsible for assessing and collecting revenue on behalf of the Government of Kenya.",
  "equity bank":
    "Equity Bank is a leading commercial bank in Kenya and East Africa, offering retail, SME, and corporate banking services.",
  "equity bank rwanda":
    "Equity Bank Rwanda is part of Equity Group, providing retail and commercial banking services in Rwanda.",
  britam:
    "Britam is a leading financial services group in Kenya and East Africa, offering insurance, asset management, and investment solutions.",
  "britam holdings":
    "Britam is a leading financial services group in Kenya and East Africa, offering insurance, asset management, and investment solutions.",
  "aga khan university":
    "Aga Khan University is a private international university with campuses in Kenya and beyond, offering education, research, and healthcare services.",
  aku:
    "Aga Khan University is a private international university with campuses in Kenya and beyond, offering education, research, and healthcare services.",
  "aga khan university hospital":
    "Aga Khan University Hospital, Nairobi is a private not-for-profit teaching hospital providing tertiary and secondary healthcare services in East Africa.",
  care:
    "CARE is an international humanitarian organization fighting global poverty and providing emergency relief, with programs across Kenya and East Africa.",
  "care usa":
    "CARE is an international humanitarian organization fighting global poverty and providing emergency relief, with programs across Kenya and East Africa.",
  "care international":
    "CARE is an international humanitarian organization fighting global poverty and providing emergency relief, with programs across Kenya and East Africa.",
  "conservation international":
    "Conservation International is a global nonprofit that protects nature for the benefit of humanity through science, policy, fieldwork, and finance, including programs in Kenya.",
  "kcb group":
    "KCB Group is one of East Africa’s largest commercial banking groups, providing retail, corporate, and digital financial services.",
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
 * Returns null when confidence is low (leave for manual/profile entry).
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

  // Prefer more specific overrides before broad patterns
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

  // Healthcare institutions before education (e.g. "Aga Khan University Hospital")
  if (/\b(hospital|clinic|pharma|pharmaceutical|medical centre|medical center|afya)\b/.test(key)) {
    return matchAllowed(HEALTHCARE, allowedIndustries);
  }

  // Banks / insurers before .go.ke government heuristic (e.g. Central Bank of Kenya)
  if (/\b(bank|banking|insurance|sacco|microfinance|assurance|superannuation|pension fund)\b/.test(key)) {
    return matchAllowed(BANKING, allowedIndustries);
  }

  // Government / public sector
  if (
    /\b(county government|county public service board|public service board|public service commission|judicial service commission|ministry of|national assembly|county assembly|revenue authority|state department|state corporation|council of kenya|high commission|embassy of)\b/.test(
      key
    ) ||
    (/\.go\.ke\b/.test(host) && !/\b(bank|sacco|university|hospital)\b/.test(key))
  ) {
    if (/\b(nema|environment|wildlife|forest)\b/.test(key)) {
      return matchAllowed(ENVIRONMENT, allowedIndustries);
    }
    if (/\b(nursing|medical|health|hospital|pharma)\b/.test(key)) {
      return matchAllowed(HEALTHCARE, allowedIndustries);
    }
    return matchAllowed(GOVERNMENT, allowedIndustries);
  }

  // Recruitment / staffing / HR agencies
  if (
    /\b(staffing|recruit|recruitment|headhunt|talent acquisition|human resource|human resources|human capital|hr solutions|hr consultancy|hr consulting|peoplelink|prorecruit|outsourcing|placement agency|employment agency)\b/.test(
      key
    ) ||
    /\b(career options|career directions|corporate staffing|people foco|fanisi|gap recruitment|reeds africa|stratostaff|hcs affiliate|q sourcing|servtec)\b/.test(
      key
    )
  ) {
    return matchAllowed(HR_RECRUITMENT, allowedIndustries);
  }

  if (/\b(fintech|paytech|mobile money)\b/.test(key)) {
    return matchAllowed(FINTECH, allowedIndustries);
  }
  if (
    /\b(ngo|non profit|non-profit|foundation|red cross|unicef|unhcr|world vision|care kenya|oxfam|amnesty|relief services|catholic relief)\b/.test(
      key
    )
  ) {
    return matchAllowed(NGO, allowedIndustries);
  }
  if (/\b(university|academy|school|college|institute of)\b/.test(key)) {
    return matchAllowed(EDUCATION, allowedIndustries);
  }
  if (/\b(hospital|clinic|pharma|medical|afya|health)\b/.test(key)) {
    return matchAllowed(HEALTHCARE, allowedIndustries);
  }
  if (/\b(software|technologies|technology|telecom|ict|digital|systems|cyber|data)\b/.test(key)) {
    return matchAllowed(ICT, allowedIndustries);
  }
  if (/\b(farm|agric|growers|livestock|dairy|seed)\b/.test(key)) {
    return matchAllowed(AGRICULTURE, allowedIndustries);
  }
  if (/\b(logistics|freight|courier|shipping|transport)\b/.test(key)) {
    return matchAllowed(LOGISTICS, allowedIndustries);
  }
  if (/\b(manufactur|factory|industrial|plant)\b/.test(key)) {
    return matchAllowed(MANUFACTURING, allowedIndustries);
  }
  if (/\b(energy|power|solar|electric|utility|utilities)\b/.test(key)) {
    return matchAllowed(ENERGY, allowedIndustries);
  }
  if (/\b(real estate|property|housing|construction)\b/.test(key)) {
    return matchAllowed(REAL_ESTATE, allowedIndustries);
  }
  if (/\b(law firm|advocates|legal)\b/.test(key)) {
    return matchAllowed(LEGAL, allowedIndustries);
  }
  if (/\b(hotel|tourism|travel|safari|resort)\b/.test(key)) {
    return matchAllowed(TOURISM, allowedIndustries);
  }
  if (/\b(security|defence|defense|guards)\b/.test(key)) {
    return matchAllowed(SECURITY, allowedIndustries);
  }
  if (/\b(retail|supermarket|fmcg|wholesale|ecommerce|e commerce)\b/.test(key)) {
    return matchAllowed(RETAIL, allowedIndustries);
  }
  if (/\b(consult|advisory)\b/.test(key)) {
    return matchAllowed(CONSULTING, allowedIndustries);
  }

  return null;
}

export function lookupKnownCompanyDescription(name: string): string | null {
  const key = normalizeLookupKey(name);
  if (NORMALIZED_DESCRIPTIONS.has(key)) return NORMALIZED_DESCRIPTIONS.get(key)!;

  // Prefer the longest known key that is an exact prefix/identity of the name
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
): string {
  if (!allowedIndustries?.length) return industry;
  return fuzzyMatchOption(industry, allowedIndustries) || industry;
}
