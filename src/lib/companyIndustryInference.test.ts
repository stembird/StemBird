/**
 * Run: npx tsx src/lib/companyIndustryInference.test.ts
 *
 * Chemistry Lens inference is deliberately conservative: employers outside
 * the chemistry / lab / pharma / process / environmental / mining / TIC /
 * education scope return null (banks, ICT, real estate, HR consultancies,
 * general retail, logistics).
 */
import {
  inferCompanyIndustry,
  lookupKnownCompanyDescription,
} from "./companyIndustryInference";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

// ── In-scope: known-company overrides ────────────────────────────────────────
assert(
  inferCompanyIndustry("Kenya Bureau of Standards (KEBS)") ===
    "Regulatory, Standards & Public Health Authorities",
  "kebs regulator"
);
assert(
  inferCompanyIndustry("NEMA", null) === "Environmental Consulting, EIA & Air Quality",
  "nema environmental"
);
assert(
  inferCompanyIndustry("National Environment Management Authority (NEMA)") ===
    "Environmental Consulting, EIA & Air Quality",
  "nema full name"
);
assert(
  inferCompanyIndustry("Kemri") === "Scientific Research & R&D Institutions",
  "kemri research"
);
assert(
  inferCompanyIndustry("East African Breweries") === "Food, Beverage & Brewery Laboratories",
  "eabl beverage lab"
);
assert(
  inferCompanyIndustry("Bamburi Cement") === "Building & Construction Materials Chemistry",
  "bamburi cement"
);
assert(
  inferCompanyIndustry("Twaha Pharmaceuticals") === "Pharmaceuticals & Drug Manufacturing",
  "twaha pharma"
);
assert(
  inferCompanyIndustry("Lancet Kenya") === "Clinical Chemistry & Medical Laboratory Services",
  "lancet pathology"
);
assert(
  inferCompanyIndustry("SGS Kenya") === "Testing, Inspection, Certification & Calibration",
  "sgs tic"
);
assert(
  inferCompanyIndustry("Kenya Tea Development Agency", "ktda.co.ke") ===
    "Tea, Coffee & Horticulture Post-Harvest Processing",
  "ktda tea"
);

// ── In-scope: regex inference from name ──────────────────────────────────────
assert(
  inferCompanyIndustry("Nairobi Water Company") === "Water Supply & Treatment",
  "water utility regex"
);
assert(
  inferCompanyIndustry("Rift Valley Paints") === "Paints, Coatings, Adhesives & Sealants",
  "paints regex"
);
assert(
  inferCompanyIndustry("Coast Petrochemicals Refinery") === "Petrochemicals, Refining & Fuels",
  "petro regex"
);

// ── Out of scope → null ──────────────────────────────────────────────────────
assert(
  inferCompanyIndustry("Equity Bank") === null,
  "banking is out of Chemistry Lens scope"
);
assert(
  inferCompanyIndustry("Safaricom") === null,
  "telecom is out of scope"
);
assert(
  inferCompanyIndustry("Corporate Staffing") === null,
  "HR consultancy is out of scope"
);
assert(
  inferCompanyIndustry("Tatu City") === null,
  "real estate is out of scope (not cement / not building-materials chemistry)"
);
assert(
  inferCompanyIndustry("Career Options Africa Ltd") === null,
  "career-options HR is out of scope"
);

// ── Government regex inference via county + .go.ke ───────────────────────────
assert(
  inferCompanyIndustry("Nakuru County Government") ===
    "Regulatory, Standards & Public Health Authorities",
  "county government via override"
);
assert(
  inferCompanyIndustry("Some County Water", "https://somewater.go.ke") ===
    "Water Supply & Treatment",
  "water utility on .go.ke beats generic government"
);

// ── Descriptions (spot check) ────────────────────────────────────────────────
assert(
  lookupKnownCompanyDescription("KEBS") !== null ||
  lookupKnownCompanyDescription("Kenya Bureau of Standards (KEBS)") !== null,
  "kebs has a known description"
);

console.log("companyIndustryInference.test.ts: all assertions passed");
