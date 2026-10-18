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
  "Banking, Finance & Insurance",
  "Construction, Infrastructure & Built Environment",
  "NGOs, Development & International Organisations",
  "Technical & Vocational Education and Training (TVET)",
  "Government & Public Sector",
  "Healthcare, Hospitals & Medical Laboratories",
  "Pharmaceuticals & Biotechnology",
  "Information Technology & Software",
  "Logistics, Supply Chain & Distribution",
  "Manufacturing & Industrial Production",
  "Paper, Pulp & Packaging",
  "Consumer Goods & Retail",
];

assert(
  resolveIndustryLabel("Governmental", industries) ===
    "Government & Public Sector",
  "governmental alias"
);
assert(
  resolveIndustryLabel("Pharmaceuticals", industries) ===
    "Pharmaceuticals & Biotechnology",
  "pharmaceuticals alias"
);
assert(
  resolveIndustryLabel("NGO/Non-Profit", industries) ===
    "NGOs, Development & International Organisations",
  "ngo alias"
);
assert(
  resolveIndustryLabel("Technical & Vocational Education and Training (TVET)", industries) ===
    "Technical & Vocational Education and Training (TVET)",
  "exact industry"
);

assert(
  resolveDirectoryCompanyIndustry(
    { name: "Acme Ltd", website: null, industry: "Technical & Vocational Education and Training (TVET)" },
    industries
  ) === "Technical & Vocational Education and Training (TVET)",
  "stored industry wins"
);

assert(
  resolveDirectoryCompanyIndustry(
    {
      name: "Judicial Service Commission",
      website: null,
      industry: null,
    },
    industries
  ) === "Government & Public Sector",
  "infer government commission"
);

assert(
  resolveDirectoryCompanyIndustry(
    {
      name: "Nursing Council of Kenya NCK",
      website: null,
      industry: null,
    },
    industries
  ) === "Healthcare, Hospitals & Medical Laboratories",
  "infer nursing council as healthcare"
);

assert(
  resolveDirectoryCompanyIndustry(
    { name: "Unknown Co", website: null, industry: null },
    industries,
    "Information Technology & Software"
  ) === "Information Technology & Software",
  "modal job industry fallback"
);

assert(
  resolveDirectoryCompanyIndustry(
    { name: "Unknown Co", website: null, industry: "Paper Milling" },
    industries
  ) === "Paper, Pulp & Packaging",
  "alias unmatched stored industry"
);

assert(
  industryToSlug("Healthcare, Hospitals & Medical Laboratories") ===
    "healthcare-hospitals-and-medical-laboratories",
  "slug"
);

console.log("companyDirectory.industry.test.ts: all assertions passed");
