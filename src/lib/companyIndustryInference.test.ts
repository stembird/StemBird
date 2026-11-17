/**
 * Run: npx tsx src/lib/companyIndustryInference.test.ts
 *
 * StemBird STEM inference: employers across Science & Healthcare,
 * Technology, Engineering & Architecture, and Mathematics are mapped.
 * General non-STEM employers (banking, HR consultancies, general retail) return null.
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
  inferCompanyIndustry("Kenya Bureau of Standards (KEBS)") === "Science & Research",
  "kebs regulator/standards"
);
assert(
  inferCompanyIndustry("NEMA", null) === "Environmental & Natural Sciences",
  "nema environmental"
);
assert(
  inferCompanyIndustry("National Environment Management Authority (NEMA)") ===
  "Environmental & Natural Sciences",
  "nema full name"
);
assert(
  inferCompanyIndustry("Kemri") === "Science & Research",
  "kemri research"
);
assert(
  inferCompanyIndustry("East African Breweries") === "Agriculture & Food Science",
  "eabl agriculture/food science"
);
assert(
  inferCompanyIndustry("Bamburi Cement") === "Engineering & Construction",
  "bamburi cement"
);
assert(
  inferCompanyIndustry("Twaha Pharmaceuticals") === "Pharmaceuticals & Biotechnology",
  "twaha pharma"
);
assert(
  inferCompanyIndustry("Lancet Kenya") === "Healthcare & Medical Sciences",
  "lancet healthcare"
);
assert(
  inferCompanyIndustry("SGS Kenya") === "Science & Research",
  "sgs tic"
);
assert(
  inferCompanyIndustry("Kenya Tea Development Agency", "ktda.co.ke") ===
  "Agriculture & Food Science",
  "ktda tea"
);

// ── In-scope: tech & telecom ────────────────────────────────────────────────
assert(
  inferCompanyIndustry("Safaricom") === "Telecommunications & Networking",
  "safaricom telecom"
);
assert(
  inferCompanyIndustry("Cellulant") === "Information Technology & Software",
  "cellulant software/fintech"
);

// ── In-scope: regex inference from name ──────────────────────────────────────
assert(
  inferCompanyIndustry("Nairobi Water Company") === "Water, Sanitation & Waste Management",
  "water utility regex"
);
assert(
  inferCompanyIndustry("Rift Valley Paints") === "Chemicals & Chemical Manufacturing",
  "paints regex"
);
assert(
  inferCompanyIndustry("Coast Petrochemicals Refinery") === "Energy, Oil & Gas",
  "petro regex"
);

// ── Out of scope → null ──────────────────────────────────────────────────────
assert(
  inferCompanyIndustry("Equity Bank") === null,
  "banking is out of StemBird scope"
);
assert(
  inferCompanyIndustry("Corporate Staffing") === null,
  "HR consultancy is out of scope"
);
assert(
  inferCompanyIndustry("Career Options Africa Ltd") === null,
  "career-options HR is out of scope"
);

// ── Descriptions (spot check) ────────────────────────────────────────────────
assert(
  lookupKnownCompanyDescription("KEBS") !== null ||
  lookupKnownCompanyDescription("Kenya Bureau of Standards (KEBS)") !== null,
  "kebs has a known description"
);

console.log("companyIndustryInference.test.ts: all assertions passed");
