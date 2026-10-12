/**
 * Lightweight assertions for company logo resolution.
 * Run: npx tsx src/lib/companyLogo.test.ts
 */

import {
  buildCompanyLogoEnrichment,
  companyInitials,
  extractDomain,
  normalizeCompanyKey,
  resolveCompanyDomain,
  resolveCompanyLogoUrl,
} from "./companyLogo";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

assert(normalizeCompanyKey("Safaricom PLC") === "safaricom", "normalize safaricom");
assert(extractDomain("https://www.safaricom.co.ke/careers") === "safaricom.co.ke", "extract domain");
assert(extractDomain("apply.workable.com/inkomoko") === null, "skip ATS host");
assert(resolveCompanyDomain("Equity Bank Kenya") === "equitybank.co.ke", "known equity");
assert(resolveCompanyDomain("KCB Bank") === "kcbbankgroup.com", "known kcb");
assert(resolveCompanyDomain("Public Service Commission of Kenya") === "publicservice.go.ke", "known psc");

// Known brands → gstatic favicon from known domain
assert(
  resolveCompanyLogoUrl({ companyName: "Safaricom" })?.includes("safaricom.co.ke"),
  "logo url for safaricom uses domain"
);
assert(
  resolveCompanyLogoUrl({ companyName: "KCB Bank" })?.includes("kcbbankgroup.com"),
  "logo url for kcb uses domain"
);
assert(
  resolveCompanyLogoUrl({ companyName: "Equity Bank" })?.includes("equitybank.co.ke"),
  "logo url for equity uses domain"
);

// Website-derived logo
assert(
  resolveCompanyLogoUrl({ website: "https://inkomoko.com" })?.includes("inkomoko.com"),
  "logo url from website"
);
// Stored URL takes top priority
assert(
  resolveCompanyLogoUrl({ logo: "https://example.com/logo.png", companyName: "Safaricom" }) === "https://example.com/logo.png",
  "stored logo wins"
);

assert(companyInitials("Equity Bank") === "EB", "initials");

const enrichment = buildCompanyLogoEnrichment({ name: "Safaricom" });
// enrichment now only fills website; logo is left for the verified server-side cron
assert(!!enrichment.website, "enrichment fills website");
assert(!enrichment.logo, "enrichment does NOT pre-fill logo (avoids storing unverified CDN URLs)");

console.log("companyLogo.test.ts: all assertions passed");
