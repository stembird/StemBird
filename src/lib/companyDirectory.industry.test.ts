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
  "Banking, Insurance & Financial Services",
  "Building, Construction & Real Estate",
  "Charity, NGO & Non-Profit",
  "Education & Training",
  "Government & Public Administration",
  "Healthcare, Medical & Pharmaceutical",
  "Human Resources & Recruitment",
  "ICT & Telecommunications",
  "Logistics & Transportation",
  "Manufacturing & Warehousing",
  "Retail, Wholesale, E-commerce & FMCG",
];

assert(
  resolveIndustryLabel("Governmental", industries) ===
    "Government & Public Administration",
  "governmental alias"
);
assert(
  resolveIndustryLabel("Pharmaceuticals", industries) ===
    "Healthcare, Medical & Pharmaceutical",
  "pharmaceuticals alias"
);
assert(
  resolveIndustryLabel("NGO/Non-Profit", industries) ===
    "Charity, NGO & Non-Profit",
  "ngo alias"
);
assert(
  resolveIndustryLabel("Education & Training", industries) ===
    "Education & Training",
  "exact industry"
);

assert(
  resolveDirectoryCompanyIndustry(
    { name: "Acme Ltd", website: null, industry: "Education & Training" },
    industries
  ) === "Education & Training",
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
  ) === "Government & Public Administration",
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
  ) === "Healthcare, Medical & Pharmaceutical",
  "infer nursing council as healthcare"
);

assert(
  resolveDirectoryCompanyIndustry(
    { name: "Unknown Co", website: null, industry: null },
    industries,
    "ICT & Telecommunications"
  ) === "ICT & Telecommunications",
  "modal job industry fallback"
);

assert(
  resolveDirectoryCompanyIndustry(
    { name: "Unknown Co", website: null, industry: "Paper Milling" },
    industries
  ) === "Manufacturing & Warehousing",
  "alias unmatched stored industry"
);

assert(
  industryToSlug("Healthcare, Medical & Pharmaceutical") ===
    "healthcare-medical-and-pharmaceutical",
  "slug"
);

console.log("companyDirectory.industry.test.ts: all assertions passed");
