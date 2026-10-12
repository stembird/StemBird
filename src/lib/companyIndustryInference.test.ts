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
  inferCompanyIndustry("Corporate Staffing") === "Human Resources & Recruitment",
  "corporate staffing"
);
assert(
  inferCompanyIndustry("Career Options Africa Ltd") ===
    "Human Resources & Recruitment",
  "career options"
);
assert(
  inferCompanyIndustry("Career Directions Limited (CDL)") ===
    "Human Resources & Recruitment",
  "cdl"
);
assert(
  inferCompanyIndustry("Trans Nzoia County Public Service Board") ===
    "Government & Public Administration",
  "trans nzoia"
);
assert(
  inferCompanyIndustry("Public Service Commission Kenya (PSCK)") ===
    "Government & Public Administration",
  "psck"
);
assert(
  inferCompanyIndustry("Nakuru County Government") ===
    "Government & Public Administration",
  "nakuru"
);
assert(
  inferCompanyIndustry("HCS Affiliates Group") ===
    "Human Resources & Recruitment",
  "hcs"
);
assert(
  inferCompanyIndustry("Equity Bank") ===
    "Banking, Insurance & Financial Services",
  "equity"
);
assert(
  inferCompanyIndustry("Baringo County Government", "https://baringo.go.ke") ===
    "Government & Public Administration",
  "baringo go.ke"
);
assert(
  inferCompanyIndustry("Aga Khan University Hospital") ===
    "Healthcare, Medical & Pharmaceutical",
  "aga khan hospital not education"
);
assert(
  inferCompanyIndustry("Central Bank of Kenya (CBK)", "https://www.centralbank.go.ke") ===
    "Banking, Insurance & Financial Services",
  "central bank"
);
assert(
  inferCompanyIndustry("Catholic Relief Services") === "Charity, NGO & Non-Profit",
  "crs ngo"
);
assert(
  inferCompanyIndustry("Judicial Service Commission") ===
    "Government & Public Administration",
  "judicial service commission"
);
assert(
  inferCompanyIndustry("Nursing Council of Kenya NCK") ===
    "Healthcare, Medical & Pharmaceutical",
  "nursing council"
);

console.log("companyIndustryInference.test.ts: all assertions passed");
