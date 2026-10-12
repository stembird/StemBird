/**
 * Assertions for company identity normalization / merge helpers.
 * Run: npx tsx src/lib/companyIdentity.test.ts
 */

import {
  companiesShareIdentity,
  mergeCompanyProfileFields,
  normalizeCompanyIdentityKey,
  pickCanonicalCompany,
  scoreCompanyDisplayName,
} from "./companyIdentity";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

assert(
  normalizeCompanyIdentityKey("Equity Bank") === "equity bank",
  "equity bank"
);
assert(
  normalizeCompanyIdentityKey("Equity Bank Group") === "equity bank",
  "equity bank group → equity bank"
);
assert(
  normalizeCompanyIdentityKey("Equity Bank Kenya") === "equity bank",
  "equity bank kenya → equity bank"
);
assert(
  normalizeCompanyIdentityKey("Equity Bank Rwanda") === "equity bank rwanda",
  "equity bank rwanda stays distinct"
);
assert(
  !companiesShareIdentity("Equity Bank", "Equity Bank Rwanda"),
  "equity rwanda not merged with equity kenya"
);
assert(
  !companiesShareIdentity("Equity Bank", "Equity Afya"),
  "equity afya distinct"
);

assert(
  normalizeCompanyIdentityKey("People FOCO Agency") === "people foco",
  "people foco agency"
);
assert(
  normalizeCompanyIdentityKey("People FOCO (On behalf of a Microfinance Bank)") ===
    "people foco",
  "people foco paren"
);
assert(
  normalizeCompanyIdentityKey("Sun King (Formerly Greenlight Planet)") ===
    "sun king",
  "sun king formerly"
);
assert(
  normalizeCompanyIdentityKey("Sun King ") === "sun king",
  "trailing whitespace"
);
assert(
  normalizeCompanyIdentityKey("Public Service Commission Kenya (PSCK)") ===
    "public service commission",
  "psck"
);
assert(
  normalizeCompanyIdentityKey("Greben LTD") ===
    normalizeCompanyIdentityKey("Greben Limited"),
  "ltd vs limited"
);
assert(
  normalizeCompanyIdentityKey("Corporate Staffing Services") ===
    "corporate staffing",
  "corporate staffing services"
);
assert(
  normalizeCompanyIdentityKey("Senga Technologies") === "senga",
  "senga technologies"
);
assert(
  normalizeCompanyIdentityKey("Aga Khan University Hospital (AKUH), Nairobi") ===
    "aga khan university hospital",
  "akuh nairobi"
);
assert(
  normalizeCompanyIdentityKey("Aga Khan Academies") ===
    normalizeCompanyIdentityKey("Aga Khan Academy"),
  "academy plural"
);
assert(
  normalizeCompanyIdentityKey("Stratostaff East Africa") === "stratostaff",
  "east africa suffix"
);
assert(
  normalizeCompanyIdentityKey("Total Security Surveillance Ltd") ===
    "total security surveillance",
  "ltd suffix"
);
assert(
  normalizeCompanyIdentityKey("Reeds Africa Consult (RAC)") ===
    "reeds africa consult",
  "reeds rac"
);

const { survivor, displayName, duplicates } = pickCanonicalCompany([
  {
    id: "a",
    name: "People FOCO Agency",
    jobCount: 4,
    logo: "https://x/logo.png",
    website: "https://peoplefoco.co.ke",
  },
  {
    id: "b",
    name: "People FOCO",
    jobCount: 9,
    website: "https://peoplefoco.co.ke",
  },
  {
    id: "c",
    name: "People FOCO (On behalf of a Microfinance Bank)",
    jobCount: 1,
  },
]);
assert(survivor.id === "b", "survivor has most jobs");
assert(displayName === "People FOCO", "display name prefers clean + jobs");
assert(duplicates.length === 2, "two duplicates");

const patch = mergeCompanyProfileFields(
  { id: "b", name: "People FOCO", website: null, logo: null },
  [
    {
      id: "a",
      name: "People FOCO Agency",
      website: "https://peoplefoco.co.ke",
      logo: "https://x/logo.png",
    },
  ]
);
assert(patch.website === "https://peoplefoco.co.ke", "merge website");
assert(patch.logo === "https://x/logo.png", "merge logo");

assert(
  scoreCompanyDisplayName("Sun King") > scoreCompanyDisplayName("Sun King "),
  "trim preferred"
);

console.log("companyIdentity.test.ts: all assertions passed");
