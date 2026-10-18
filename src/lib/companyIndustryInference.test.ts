/**
 * Run: npx tsx src/lib/companyIndustryInference.test.ts
 */
import {
  inferCompanyIndustry,
  lookupKnownCompanyDescription,
} from "./companyIndustryInference";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

assert(
  inferCompanyIndustry("Corporate Staffing") === "Consulting & Professional Services",
  "corporate staffing"
);
assert(
  inferCompanyIndustry("Career Options Africa Ltd") ===
    "Consulting & Professional Services",
  "career options"
);
assert(
  inferCompanyIndustry("Career Directions Limited (CDL)") ===
    "Consulting & Professional Services",
  "cdl"
);
assert(
  inferCompanyIndustry("Trans Nzoia County Public Service Board") ===
    "Government & Public Sector",
  "trans nzoia"
);
assert(
  inferCompanyIndustry("Public Service Commission Kenya (PSCK)") ===
    "Government & Public Sector",
  "psck"
);
assert(
  inferCompanyIndustry("Nakuru County Government") ===
    "Government & Public Sector",
  "nakuru"
);
assert(
  inferCompanyIndustry("HCS Affiliates Group") ===
    "Consulting & Professional Services",
  "hcs"
);
assert(
  inferCompanyIndustry("Equity Bank") ===
    "Banking, Finance & Insurance",
  "equity"
);
assert(
  inferCompanyIndustry("Baringo County Government", "https://baringo.go.ke") ===
    "Government & Public Sector",
  "baringo go.ke"
);
assert(
  inferCompanyIndustry("Aga Khan University Hospital") ===
    "Healthcare, Hospitals & Medical Laboratories",
  "aga khan hospital not education"
);
assert(
  inferCompanyIndustry("Central Bank of Kenya (CBK)", "https://www.centralbank.go.ke") ===
    "Banking, Finance & Insurance",
  "central bank"
);
assert(
  inferCompanyIndustry("Catholic Relief Services") === "NGOs, Development & International Organisations",
  "crs ngo"
);
assert(
  inferCompanyIndustry("Judicial Service Commission") ===
    "Government & Public Sector",
  "judicial service commission"
);
assert(
  inferCompanyIndustry("Nursing Council of Kenya NCK") ===
    "Healthcare, Hospitals & Medical Laboratories",
  "nursing council"
);

console.log("companyIndustryInference.test.ts: all assertions passed");
