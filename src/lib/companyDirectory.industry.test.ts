/**
 * Run: npx tsx src/lib/companyDirectory.industry.test.ts
 */
import {
  resolveDirectoryCompanyIndustry,
  industryToSlug,
} from "./companyDirectory";
import { resolveIndustryLabel } from "./jobParseNormalization";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const industries = [
  "Industrial & Basic Chemicals",
  "Pharmaceuticals & Drug Manufacturing",
  "Clinical Chemistry & Medical Laboratory Services",
  "Regulatory, Standards & Public Health Authorities",
  "Chemicals-Driven Manufacturing & Industrial Production",
  "Food, Beverage & Brewery Laboratories",
  "Personal Care, Cosmetics & Fragrances",
  "Environmental Consulting, EIA & Air Quality",
  "Mining, Geology & Assay Laboratories",
  "Testing, Inspection, Certification & Calibration",
  "Laboratory & Scientific Supply Services",
  "Education & Training — Universities, TVET & Professional",
  "Education & Training — Schools",
];

// ── Alias resolution (fuzzy label → canonical) ─────────────────────────────
assert(
  resolveIndustryLabel("governmental", industries) ===
    "Regulatory, Standards & Public Health Authorities",
  "governmental alias"
);
assert(
  resolveIndustryLabel("pharmaceuticals", industries) ===
    "Pharmaceuticals & Drug Manufacturing",
  "pharmaceuticals alias"
);
assert(
  resolveIndustryLabel("healthcare", industries) ===
    "Clinical Chemistry & Medical Laboratory Services",
  "healthcare alias"
);
assert(
  resolveIndustryLabel("ngo/non-profit", industries) === null,
  "retired ngo alias resolves out-of-list to null"
);
assert(
  resolveIndustryLabel("manufacturing", industries) ===
    "Chemicals-Driven Manufacturing & Industrial Production",
  "manufacturing alias"
);
assert(
  resolveIndustryLabel("wines & spirits", industries) ===
    "Food, Beverage & Brewery Laboratories",
  "wines & spirits alias"
);

// ── Exact label pass-through ────────────────────────────────────────────────
assert(
  resolveIndustryLabel(
    "Regulatory, Standards & Public Health Authorities",
    industries
  ) === "Regulatory, Standards & Public Health Authorities",
  "exact industry"
);

// ── Directory company industry resolution ───────────────────────────────────
assert(
  resolveDirectoryCompanyIndustry(
    {
      name: "Acme Ltd",
      website: null,
      industry: "Regulatory, Standards & Public Health Authorities",
    },
    industries
  ) === "Regulatory, Standards & Public Health Authorities",
  "stored industry wins"
);

assert(
  resolveDirectoryCompanyIndustry(
    { name: "Kenya Bureau of Standards (KEBS)", website: null, industry: null },
    industries
  ) === "Regulatory, Standards & Public Health Authorities",
  "infer kebs as regulator via known-company override"
);

assert(
  resolveDirectoryCompanyIndustry(
    { name: "Nursing Council of Kenya NCK", website: null, industry: null },
    industries
  ) === "Regulatory, Standards & Public Health Authorities",
  "nursing council is a professional regulator via council-of-kenya pattern"
);

assert(
  resolveDirectoryCompanyIndustry(
    { name: "Unknown Co", website: null, industry: null },
    industries,
    "Testing, Inspection, Certification & Calibration"
  ) === "Testing, Inspection, Certification & Calibration",
  "modal job industry fallback"
);

assert(
  resolveDirectoryCompanyIndustry(
    { name: "Unknown Co", website: null, industry: "Paper Milling" },
    industries
  ) === "Chemicals-Driven Manufacturing & Industrial Production",
  "paper milling alias retargets to the general chemistry-driven plant industry"
);

// Companies out of Chemistry Lens scope (banks, ICT) now resolve to null
assert(
  resolveDirectoryCompanyIndustry(
    { name: "Equity Bank", website: null, industry: null },
    industries
  ) === null,
  "banking is out of Chemistry Lens scope"
);

// ── Slug ────────────────────────────────────────────────────────────────────
assert(
  industryToSlug("Clinical Chemistry & Medical Laboratory Services") ===
    "clinical-chemistry-and-medical-laboratory-services",
  "slug"
);

console.log("companyDirectory.industry.test.ts: all assertions passed");
