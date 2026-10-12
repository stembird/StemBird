/**
 * Company logo resolution utilities.
 *
 * Architecture:
 * - Display-time (client): resolveCompanyLogoUrl()
 *   Official curated logos → trusted stored logo → brand/website favicon CDN.
 *   Rejects unavatar / wrong job-board logos; CompanyLogo falls back to initials.
 *
 * - Enrichment-time (server): see src/lib/companyLogoFetch.ts
 *   Verifies real image bytes before writing to companies.logo.
 */

import {
  isMismatchedJobBoardLogo,
  isUntrustedLogoUrl,
  lookupOfficialLogo,
} from "./officialCompanyLogos";

interface BrandEntry {
  domain: string;
  /** Twitter/X handle – used by server-side fetcher only, not display. */
  twitter?: string;
}

/** Normalized company name → brand entry */
export const KNOWN_COMPANY_BRANDS: Record<string, BrandEntry> = {
  // ── Telecom / Tech ─────────────────────────────────────────────────
  safaricom: { domain: "safaricom.co.ke", twitter: "SafaricomPLC" },
  "safaricom plc": { domain: "safaricom.co.ke", twitter: "SafaricomPLC" },
  "safaricom limited": { domain: "safaricom.co.ke", twitter: "SafaricomPLC" },
  airtel: { domain: "airtel.ke", twitter: "airtel_ke" },
  "airtel kenya": { domain: "airtel.ke", twitter: "airtel_ke" },
  "telkom kenya": { domain: "telkom.co.ke", twitter: "TelkomKenya" },
  andela: { domain: "andela.com", twitter: "Andela" },
  cellulant: { domain: "cellulant.com", twitter: "cellulant" },
  twiga: { domain: "twiga.com", twitter: "TwigaFoodsLtd" },
  "twiga foods": { domain: "twiga.com", twitter: "TwigaFoodsLtd" },
  branch: { domain: "branch.co", twitter: "BranchApp" },
  "branch international": { domain: "branch.co", twitter: "BranchApp" },
  tala: { domain: "tala.co", twitter: "Tala_app" },
  mpesa: { domain: "safaricom.co.ke", twitter: "SafaricomPLC" },
  "m-pesa": { domain: "safaricom.co.ke", twitter: "SafaricomPLC" },
  microsoft: { domain: "microsoft.com", twitter: "Microsoft" },
  "microsoft kenya": { domain: "microsoft.com", twitter: "Microsoft" },
  google: { domain: "google.com", twitter: "Google" },
  "google kenya": { domain: "google.com", twitter: "Google" },
  ibm: { domain: "ibm.com", twitter: "IBM" },
  oracle: { domain: "oracle.com", twitter: "Oracle" },
  sap: { domain: "sap.com", twitter: "SAP" },
  huawei: { domain: "huawei.com", twitter: "Huawei" },

  // ── Banking / Finance ───────────────────────────────────────────────
  "equity bank": { domain: "equitybank.co.ke", twitter: "EquityBank" },
  "equity bank kenya": { domain: "equitybank.co.ke", twitter: "EquityBank" },
  "equity group": { domain: "equitygroupholdings.com", twitter: "EquityBank" },
  "equity group holdings": { domain: "equitygroupholdings.com", twitter: "EquityBank" },
  kcb: { domain: "kcbbankgroup.com", twitter: "KCBGroup" },
  "kcb bank": { domain: "kcbbankgroup.com", twitter: "KCBGroup" },
  "kcb group": { domain: "kcbbankgroup.com", twitter: "KCBGroup" },
  "kenya commercial bank": { domain: "kcbbankgroup.com", twitter: "KCBGroup" },
  "co-operative bank": { domain: "co-opbank.co.ke", twitter: "CoopBankKenya" },
  "co-operative bank of kenya": { domain: "co-opbank.co.ke", twitter: "CoopBankKenya" },
  "coop bank": { domain: "co-opbank.co.ke", twitter: "CoopBankKenya" },
  "co-op bank": { domain: "co-opbank.co.ke", twitter: "CoopBankKenya" },
  ncba: { domain: "ncbagroup.com", twitter: "NCBABank" },
  "ncba bank": { domain: "ncbagroup.com", twitter: "NCBABank" },
  "ncba group": { domain: "ncbagroup.com", twitter: "NCBABank" },
  absa: { domain: "absa.africa", twitter: "AbsaKenya" },
  "absa bank": { domain: "absa.africa", twitter: "AbsaKenya" },
  "absa bank kenya": { domain: "absa.africa", twitter: "AbsaKenya" },
  "standard chartered": { domain: "standardchartered.co.ke", twitter: "StanChartKenya" },
  "standard chartered bank": { domain: "standardchartered.co.ke", twitter: "StanChartKenya" },
  "standard chartered kenya": { domain: "standardchartered.co.ke", twitter: "StanChartKenya" },
  "stanbic bank": { domain: "stanbicbank.co.ke", twitter: "StanbicBankKE" },
  "stanbic bank kenya": { domain: "stanbicbank.co.ke", twitter: "StanbicBankKE" },
  "i and m bank": { domain: "imbank.com", twitter: "IM_Bank" },
  "i&m bank": { domain: "imbank.com", twitter: "IM_Bank" },
  "diamond trust bank": { domain: "dtbafrica.com", twitter: "DTBKenya" },
  dtb: { domain: "dtbafrica.com", twitter: "DTBKenya" },
  "family bank": { domain: "familybank.co.ke", twitter: "FamilyBankLtd" },
  kwft: { domain: "kwftbank.com" },
  "kenya women microfinance bank": { domain: "kwftbank.com" },
  britam: { domain: "britam.com", twitter: "britam_insure" },
  "britam holdings": { domain: "britam.com", twitter: "britam_insure" },
  jubilee: { domain: "jubileeinsurance.com", twitter: "JubileeKenya" },
  "jubilee insurance": { domain: "jubileeinsurance.com", twitter: "JubileeKenya" },
  "jubilee health insurance": { domain: "jubileeinsurance.com", twitter: "JubileeKenya" },
  "cic insurance": { domain: "cic.co.ke", twitter: "CICGroupKenya" },
  "cic group": { domain: "cic.co.ke", twitter: "CICGroupKenya" },
  "old mutual": { domain: "oldmutual.co.ke", twitter: "OldMutualSA" },
  sanlam: { domain: "sanlam.com", twitter: "Sanlam" },
  "sanlam kenya": { domain: "sanlam.com", twitter: "Sanlam" },
  icea: { domain: "icealion.com", twitter: "IceaLion" },
  "icea lion": { domain: "icealion.com", twitter: "IceaLion" },
  "apa insurance": { domain: "apainsurance.org" },
  centum: { domain: "centum.co.ke", twitter: "centum_ke" },
  "centum investment": { domain: "centum.co.ke", twitter: "centum_ke" },

  // ── Public / Development ────────────────────────────────────────────
  "public service commission": { domain: "publicservice.go.ke" },
  "public service commission of kenya": { domain: "publicservice.go.ke" },
  psc: { domain: "publicservice.go.ke" },
  "government of kenya": { domain: "kenya.go.ke" },
  "central bank of kenya": { domain: "centralbank.go.ke" },
  cbk: { domain: "centralbank.go.ke" },
  "kenya revenue authority": { domain: "kra.go.ke" },
  kra: { domain: "kra.go.ke" },
  "kenya airways": { domain: "kenya-airways.com", twitter: "KenyaAirways" },
  kq: { domain: "kenya-airways.com", twitter: "KenyaAirways" },
  "kenya power": { domain: "kplc.co.ke", twitter: "KenyaPower_care" },
  kplc: { domain: "kplc.co.ke", twitter: "KenyaPower_care" },
  "kenya power and lighting": { domain: "kplc.co.ke", twitter: "KenyaPower_care" },
  "kenya ports authority": { domain: "kpa.co.ke", twitter: "KenyaPorts" },
  kpa: { domain: "kpa.co.ke" },
  "kenya airports authority": { domain: "kaa.go.ke" },
  "communication authority of kenya": { domain: "ca.go.ke" },
  "national hospital insurance fund": { domain: "nhif.or.ke" },
  nhif: { domain: "nhif.or.ke" },
  "national social security fund": { domain: "nssf.or.ke" },
  nssf: { domain: "nssf.or.ke" },
  kengen: { domain: "kengen.co.ke", twitter: "KenGen_Kenya" },
  "kenya electricity generating company": { domain: "kengen.co.ke", twitter: "KenGen_Kenya" },
  undp: { domain: "undp.org", twitter: "UNDP" },
  unicef: { domain: "unicef.org", twitter: "UNICEF" },
  unhcr: { domain: "unhcr.org", twitter: "Refugees" },
  "un women": { domain: "unwomen.org", twitter: "UN_Women" },
  unep: { domain: "unep.org", twitter: "UNEP" },
  "united nations environment programme": { domain: "unep.org", twitter: "UNEP" },
  "united nations environment programme (unep)": { domain: "unep.org", twitter: "UNEP" },
  "united nations environment programme unep": { domain: "unep.org", twitter: "UNEP" },
  "united nations": { domain: "un.org", twitter: "UN" },
  "united nations office for project services": { domain: "unops.org", twitter: "UNOPS" },
  "united nations office for project services unops": { domain: "unops.org", twitter: "UNOPS" },
  "world bank": { domain: "worldbank.org", twitter: "WorldBank" },

  // ── Scraped Kenyan employers / NGOs (common CareerSasa sources) ─────
  amref: { domain: "amref.org", twitter: "Amref_Worldwide" },
  "amref health africa": { domain: "amref.org", twitter: "Amref_Worldwide" },
  "amref health africa4": { domain: "amref.org", twitter: "Amref_Worldwide" },
  powergen: { domain: "powergen-renewable.com" },
  "powergen renewable energy": { domain: "powergen-renewable.com" },
  "powergen renewable": { domain: "powergen-renewable.com" },
  ihub: { domain: "ihub.co.ke", twitter: "iHub" },
  "ihub nairobi": { domain: "ihub.co.ke", twitter: "iHub" },
  "co-creation hub": { domain: "cchub.africa" },
  "co creation hub": { domain: "cchub.africa" },
  "digital divide data": { domain: "digitaldividedata.com", twitter: "DDDimpact" },
  ddd: { domain: "digitaldividedata.com", twitter: "DDDimpact" },
  "salix data africa": { domain: "salixdata.com" },
  salix: { domain: "salixdata.com" },
  inkomoko: { domain: "inkomoko.com", twitter: "Inkomoko" },
  "tatu city": { domain: "tatucity.com", twitter: "TatuCity" },
  tatucity: { domain: "tatucity.com", twitter: "TatuCity" },
  rendeavour: { domain: "rendeavour.com" },
  "r endeavour": { domain: "rendeavour.com" },
  "world bank group": { domain: "worldbank.org", twitter: "WorldBank" },
  "african development bank": { domain: "afdb.org", twitter: "AfDB_Group" },
  afdb: { domain: "afdb.org", twitter: "AfDB_Group" },
  usaid: { domain: "usaid.gov", twitter: "USAID" },
  giz: { domain: "giz.de", twitter: "giz_gmbh" },
  "giz kenya": { domain: "giz.de", twitter: "giz_gmbh" },
  "british council": { domain: "britishcouncil.org", twitter: "BritishCouncil" },
  "amnesty international": { domain: "amnesty.org", twitter: "amnesty" },
  "kenya red cross": { domain: "redcross.or.ke", twitter: "kenyaredcross" },
  "kenya red cross society": { domain: "redcross.or.ke", twitter: "kenyaredcross" },
  "red cross": { domain: "redcross.or.ke" },
  "save the children": { domain: "savethechildren.org", twitter: "SavetheChildren" },
  "world food programme": { domain: "wfp.org", twitter: "WFP" },
  wfp: { domain: "wfp.org", twitter: "WFP" },
  "plan international": { domain: "plan-international.org", twitter: "PlanIntl" },
  "world vision": { domain: "worldvision.org" },
  msf: { domain: "msf.org", twitter: "MSF_USA" },
  "doctors without borders": { domain: "msf.org", twitter: "MSF_USA" },
  "mercy corps": { domain: "mercycorps.org", twitter: "Mercy_Corps" },
  psi: { domain: "psi.org" },
  care: { domain: "care.org", twitter: "CARE" },
  "care usa": { domain: "care.org", twitter: "CARE" },
  "care international": { domain: "care.org", twitter: "CARE" },
  "conservation international": { domain: "conservation.org", twitter: "ConservationOrg" },

  // ── Agriculture / FMCG ─────────────────────────────────────────────
  "bidco africa": { domain: "bidcoafrica.com", twitter: "Bidco_Africa" },
  bidco: { domain: "bidcoafrica.com", twitter: "Bidco_Africa" },
  "unga group": { domain: "unga.com" },
  "brookside dairy": { domain: "brookside.co.ke" },
  brookside: { domain: "brookside.co.ke" },
  "finlays kenya": { domain: "finlays.net" },
  "british american tobacco": { domain: "bat.com", twitter: "BATplc" },
  bat: { domain: "bat.com", twitter: "BATplc" },
  "east african breweries": { domain: "eabl.com", twitter: "EABLplc" },
  eabl: { domain: "eabl.com", twitter: "EABLplc" },
  "kenya breweries": { domain: "eabl.com", twitter: "EABLplc" },
  "bamburi cement": { domain: "bamburicement.com", twitter: "BamburiCement" },

  // ── Retail / Consumer ───────────────────────────────────────────────
  "carrefour kenya": { domain: "carrefour.ke", twitter: "CarrefourKenya" },
  carrefour: { domain: "carrefour.ke", twitter: "CarrefourKenya" },
  "naivas supermarket": { domain: "naivas.co.ke", twitter: "NaivasSupermark" },
  naivas: { domain: "naivas.co.ke", twitter: "NaivasSupermark" },
  quickmart: { domain: "quickmart.co.ke", twitter: "QuickmartSM" },
  "java house": { domain: "javahouse.africa", twitter: "JavaHouseAfrica" },
  "chicken inn": { domain: "chickeninn.co.ke" },

  // ── Media ───────────────────────────────────────────────────────────
  "nation media": { domain: "nation.africa", twitter: "nationafrica" },
  "nation media group": { domain: "nation.africa", twitter: "nationafrica" },
  nmg: { domain: "nation.africa", twitter: "nationafrica" },
  "standard media": { domain: "standardmedia.co.ke", twitter: "StandardMediaGrp" },
  "standard group": { domain: "standardmedia.co.ke", twitter: "StandardMediaGrp" },
  "royal media": { domain: "royalmedia.co.ke", twitter: "royalmediakenya" },
  "royal media services": { domain: "royalmedia.co.ke", twitter: "royalmediakenya" },

  // ── Agritech / NGOs ─────────────────────────────────────────────────
  // inkomoko is defined under scraped Kenyan employers above
  "give directly": { domain: "givedirectly.org", twitter: "GiveDirectly" },
  givedirectly: { domain: "givedirectly.org", twitter: "GiveDirectly" },
  "one acre fund": { domain: "oneacrefund.org", twitter: "OneAcreFund" },
  "living goods": { domain: "livinggoods.org", twitter: "LivingGoods_" },
  "apollo agriculture": { domain: "apolloagriculture.com", twitter: "ApolloAgricultu" },

  // ── Health ──────────────────────────────────────────────────────────
  "aga khan hospital": { domain: "agakhanhospitals.org" },
  "aga khan university": { domain: "aku.edu", twitter: "aku_global" },
  "aga khan university hospital": { domain: "hospitals.aku.edu" },
  aku: { domain: "aku.edu", twitter: "aku_global" },
  "aga khan academies": { domain: "agakhanacademies.org" },
  "aga khan academy": { domain: "agakhanacademies.org" },
  "nairobi hospital": { domain: "nairobihospital.org", twitter: "NrbHospital" },
  "kenyatta national hospital": { domain: "knh.or.ke" },
  knh: { domain: "knh.or.ke" },
  gsk: { domain: "gsk.com", twitter: "GSK" },
  astrazeneca: { domain: "astrazeneca.com", twitter: "AstraZeneca" },

  // ── Staffing / Education / Public ───────────────────────────────────
  amsol: { domain: "amsol.africa" },
  "africa management solutions": { domain: "amsol.africa" },
  "africa management solutions limited": { domain: "amsol.africa" },
  "africa management solutions limited amsol": { domain: "amsol.africa" },
  "talent grid africa": { domain: "talentgridafrica.com" },
  "talent nexus": { domain: "talentnexus.co.ke" },
  "university of nairobi": { domain: "uonbi.ac.ke" },
  uon: { domain: "uonbi.ac.ke" },
  "bank of africa kenya limited (boa-kenya)": { domain: "bankofafrica.co.ke" },
  "bank of africa": { domain: "bankofafrica.co.ke" },
  unops: { domain: "unops.org", twitter: "UNOPS" },
  "q-sourcing": { domain: "q-sourcing.com" },
  "q-sourcing servtec group": { domain: "q-sourcing.com" },
  "victory farms": { domain: "victoryfarms.com" },
  "international school of kenya (isk)": { domain: "isk.ac.ke" },
  "majid al futtaim retail": { domain: "majidalfuttaim.com" },
  "public service commission kenya (psck)": { domain: "publicservice.go.ke" },
  "l'oréal": { domain: "loreal.com", twitter: "Loreal" },
  "l’oréal": { domain: "loreal.com", twitter: "Loreal" },

  // ── Logistics ───────────────────────────────────────────────────────
  dhl: { domain: "dhl.com", twitter: "DHLglobal" },
  "dhl express": { domain: "dhl.com", twitter: "DHLglobal" },
  "posta kenya": { domain: "posta.co.ke" },

  // ── Hospitality ─────────────────────────────────────────────────────
  "sarova hotels": { domain: "sarovahotels.com", twitter: "SarovaHotels" },
  "serena hotels": { domain: "serenahotels.com", twitter: "SerenaHotels" },
};

/** Backward-compat alias: domain-only lookup (for JSON-LD etc.) */
export const KNOWN_COMPANY_DOMAINS: Record<string, string> = Object.fromEntries(
  Object.entries(KNOWN_COMPANY_BRANDS).map(([k, v]) => [k, v.domain])
);

export type CompanyLogoInput = {
  logo?: string | null;
  website?: string | null;
  companyName?: string | null;
  hiringOrganizationLogo?: string | null;
};

export function normalizeCompanyKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(ltd|limited|plc|inc|corp|corporation|company)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractDomain(websiteOrDomain: string | null | undefined): string | null {
  if (!websiteOrDomain) return null;
  let value = websiteOrDomain.trim();
  if (!value) return null;
  try {
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    if (!host || !host.includes(".")) return null;
    if (
      /(workable\.com|smartrecruiters\.com|lever\.co|greenhouse\.io|bamboohr\.com|myworkdayjobs\.com|jobs\.|careersasa)/i.test(host)
    ) return null;
    return host;
  } catch {
    return null;
  }
}

/**
 * Pre-normalized brand map: map keys go through the same normalizeCompanyKey
 * transform so hyphenated names like "co-operative bank" match correctly.
 */
const _normalizedBrands: Map<string, BrandEntry> = new Map(
  Object.entries(KNOWN_COMPANY_BRANDS).map(([k, v]) => [normalizeCompanyKey(k), v])
);

/**
 * Ambiguous short/common brand tokens. These must match at the START of the
 * company name (e.g. "Care International") — never mid-name
 * ("Life Care Hospital" must not resolve to care.org).
 */
const AMBIGUOUS_BRAND_KEYS = new Set([
  "care",
  "bat",
  "bolt",
  "branch",
  "remote",
  "vert",
  "tala",
  "plan",
  "ddd",
  "psi",
  "msf",
  "red cross",
]);

/** Whole-word match so short brands like "care" do not match "Encareer". */
function keyContainsBrand(companyKey: string, brandKey: string): boolean {
  if (companyKey === brandKey) return true;
  if (!brandKey || brandKey.length < 3) return false;
  if (brandKey.length <= 4 || AMBIGUOUS_BRAND_KEYS.has(brandKey)) {
    return (
      companyKey.startsWith(`${brandKey} `) ||
      companyKey.startsWith(`${brandKey} kenya`) ||
      companyKey.startsWith(`${brandKey} international`)
    );
  }
  const escaped = brandKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`).test(companyKey);
}

/** Look up the brand entry for a company name (longest normalized-key match). */
export function lookupBrand(companyName: string): BrandEntry | null {
  const key = normalizeCompanyKey(companyName);
  if (!key) return null;
  if (_normalizedBrands.has(key)) return _normalizedBrands.get(key)!;
  let best: { known: string; entry: BrandEntry } | null = null;
  for (const [known, entry] of _normalizedBrands) {
    if (known.length < 4) continue;
    if (keyContainsBrand(key, known)) {
      if (!best || known.length > best.known.length) best = { known, entry };
    }
  }
  return best?.entry ?? null;
}

export function resolveCompanyDomain(
  companyName?: string | null,
  website?: string | null
): string | null {
  const fromWebsite = extractDomain(website);
  if (fromWebsite) return fromWebsite;
  if (!companyName) return null;
  return lookupBrand(companyName)?.domain ?? null;
}

/**
 * Build a favicon CDN URL for a domain (display-time, client-safe).
 * Uses Logo.dev when token configured, gstatic faviconV2 otherwise.
 * Note: gstatic returns a 726B generic icon for unknown domains — the
 * CompanyLogo component handles this via onError → initials fallback.
 */
export function buildLogoCdnUrl(domain: string, size = 128): string {
  const token =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN || process.env.LOGO_DEV_API_KEY
      : undefined;
  if (token) {
    return `https://img.logo.dev/${encodeURIComponent(domain)}?token=${encodeURIComponent(token)}&size=${size}&format=png`;
  }
  return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${encodeURIComponent(domain)}&size=${size}`;
}

export function isUsableLogoUrl(url?: string | null): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url.trim());
}

/**
 * Best logo URL for display (client-side, no API calls).
 *
 * Priority:
 * 1. Curated official logo for well-known employers
 * 2. companies.logo when trusted (not unavatar / mismatched job-board scrape)
 * 3. hiring_organization_logo when trusted
 * 4. known brand domain (preferred) or website → favicon CDN
 *
 * CompanyLogo falls back to initials when this returns null or the image fails.
 */
export function resolveCompanyLogoUrl(input: CompanyLogoInput): string | null {
  // Prefer curated official logos for well-known employers (fixes Equity / UN mismatches)
  const official = lookupOfficialLogo(input.companyName);
  if (official) return official;

  // Trust stored logos only when not known-bad (unavatar, wrong thumbnails, etc.)
  if (
    isUsableLogoUrl(input.logo) &&
    !isUntrustedLogoUrl(input.logo) &&
    !isMismatchedJobBoardLogo(input.companyName || "", input.logo)
  ) {
    return input.logo!.trim();
  }
  if (
    isUsableLogoUrl(input.hiringOrganizationLogo) &&
    !isUntrustedLogoUrl(input.hiringOrganizationLogo) &&
    !isMismatchedJobBoardLogo(input.companyName || "", input.hiringOrganizationLogo)
  ) {
    return input.hiringOrganizationLogo!.trim();
  }

  const fromWebsite = input.website ? extractDomain(input.website) : null;
  const brand = input.companyName ? lookupBrand(input.companyName) : null;
  const domain = brand?.domain || fromWebsite || null;

  return domain ? buildLogoCdnUrl(domain) : null;
}

/** Website URL to persist when enriching a company from a known name. */
export function resolveCompanyWebsite(
  companyName?: string | null,
  website?: string | null
): string | null {
  if (website && extractDomain(website)) {
    const domain = extractDomain(website)!;
    return website.startsWith("http") ? website : `https://${domain}`;
  }
  const domain = resolveCompanyDomain(companyName, null);
  return domain ? `https://${domain}` : null;
}

export function companyInitials(name?: string | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/**
 * Fields to write when creating/updating a company.
 * Only writes `website` from an explicit input or curated known-brand map —
 * never invents a domain from the company name slug.
 * Logo is left for the server-side verified fetcher (ensureCompanyForJob /
 * enrich-company-logos cron) so we never store unverified CDN placeholders.
 */
export function buildCompanyLogoEnrichment(input: {
  name: string;
  logo?: string | null;
  website?: string | null;
}): { logo?: string; website?: string } {
  // Prefer explicit website; otherwise curated brand map only (no AI / no invent).
  const website = input.website || resolveCompanyWebsite(input.name, null);
  const patch: { logo?: string; website?: string } = {};
  if (!input.website && website) patch.website = website;
  // Logo is intentionally NOT set here — the verified server-side fetcher handles it.
  return patch;
}

/**
 * Twitter handle for a known brand — used by server-side logo fetcher only.
 */
export function getKnownBrandTwitterHandle(companyName: string): string | null {
  return lookupBrand(companyName)?.twitter ?? null;
}
