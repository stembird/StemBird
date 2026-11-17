/**
 * Run: npx tsx src/lib/companyDirectory.industry.test.ts
 */
import {
  resolveDirectoryCompanyIndustry,
  industryToSlug,
} from "./companyDirectory";
import { resolveIndustryLabel } from "./jobParseNormalization";
import { ACTIVE_INDUSTRY_NAMES } from "./stemBird.taxonomy";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const industries = [...ACTIVE_INDUSTRY_NAMES];

// ── Alias resolution (fuzzy label → canonical) ─────────────────────────────
assert(
  resolveIndustryLabel("governmental", industries) === "Science & Research",
  "governmental alias"
);
assert(
  resolveIndustryLabel("pharmaceuticals", industries) ===
    "Pharmaceuticals & Biotechnology",
  "pharmaceuticals alias"
);
assert(
  resolveIndustryLabel("healthcare", industries) ===
    "Healthcare & Medical Sciences",
  "healthcare alias"
);
assert(
  resolveIndustryLabel("manufacturing", industries) ===
    "Manufacturing & Industrial Processing",
  "manufacturing alias"
);
assert(
  resolveIndustryLabel("wines & spirits", industries) ===
    "Agriculture & Food Science",
  "wines & spirits alias"
);
assert(
  resolveIndustryLabel("software", industries) ===
    "Information Technology & Software",
  "software alias"
);
assert(
  resolveIndustryLabel("telecom", industries) ===
    "Telecommunications & Networking",
  "telecom alias"
);

// ── Exact label pass-through ────────────────────────────────────────────────
assert(
  resolveIndustryLabel(
    "Engineering & Construction",
    industries
  ) === "Engineering & Construction",
  "exact industry"
);

// ── Directory company industry resolution ───────────────────────────────────
assert(
  resolveDirectoryCompanyIndustry(
    {
      name: "Acme Ltd",
      website: null,
      industry: "Engineering & Construction",
    },
    industries
  ) === "Engineering & Construction",
  "stored industry wins"
);

assert(
  resolveDirectoryCompanyIndustry(
    { name: "Kenya Bureau of Standards (KEBS)", website: null, industry: null },
    industries
  ) === "Science & Research",
  "infer kebs as research/standards via known-company override"
);

assert(
  resolveDirectoryCompanyIndustry(
    { name: "Safaricom", website: null, industry: null },
    industries
  ) === "Telecommunications & Networking",
  "safaricom telecom"
);

assert(
  resolveDirectoryCompanyIndustry(
    { name: "Unknown Co", website: null, industry: null },
    industries,
    "Science & Research"
  ) === "Science & Research",
  "modal job industry fallback"
);

// Companies out of STEM scope (banking, HR consultancies) resolve to null
assert(
  resolveDirectoryCompanyIndustry(
    { name: "Equity Bank", website: null, industry: null },
    industries
  ) === null,
  "banking is out of StemBird STEM scope"
);

// ── Slug ────────────────────────────────────────────────────────────────────
assert(
  industryToSlug("Healthcare & Medical Sciences") ===
    "healthcare-and-medical-sciences",
  "slug"
);

console.log("companyDirectory.industry.test.ts: all assertions passed");
