/**
 * Run: npx tsx src/lib/listingKind.test.ts
 */
import assert from "node:assert/strict";
import {
  classifyListingKind,
  isMissingListingKindColumnError,
  isScholarshipListing,
  isScholarshipRow,
  listingPath,
  withoutScholarshipColumns,
} from "./listingKind";

assert.equal(
  classifyListingKind({
    title: "Scholarships Programme at KCB Foundation",
    occupationalCategory: "Bursary and Scholarships",
  }),
  "scholarship"
);

assert.equal(
  classifyListingKind({
    title: "Scholarship for Graduate Assistant - ICT - 3 Posts",
    jobFunctionHint: "Bursary and Scholarships , ICT / Computer",
  }),
  "scholarship"
);

assert.equal(
  classifyListingKind({
    title: "Graphic Design at RVIBS",
    tags: "Bursary and Scholarships, UX, Design and Architecture",
  }),
  "scholarship"
);

assert.equal(
  classifyListingKind({
    title: "Scholarship Coordinator at Shining Hope For Communities",
    occupationalCategory: "Bursary and Scholarships",
  }),
  "job"
);

assert.equal(
  classifyListingKind({
    title: "TVET Scholarship and Opportunity Linkages Manager",
    occupationalCategory: "Project and Program Management",
  }),
  "job"
);

assert.equal(
  classifyListingKind({ title: "Internal Auditor", tags: "Finance" }),
  "job"
);

assert.equal(
  classifyListingKind({
    title: "Digital Scholarship Assistant, Library Department",
    jobFunctionHint: "Education & Training",
  }),
  "job"
);

assert.equal(isScholarshipListing("scholarship"), true);
assert.equal(isScholarshipListing("job"), false);
assert.equal(isScholarshipListing(null), false);

assert.equal(
  isScholarshipRow({ listing_kind: "scholarship", title: "Internal Auditor" }),
  true
);
assert.equal(
  isScholarshipRow({ listing_kind: "job", title: "Scholarships Programme at KCB Foundation" }),
  false
);
assert.equal(
  isScholarshipRow({ title: "Scholarships Programme at KCB Foundation" }),
  true
);
assert.equal(isScholarshipRow({ title: "Internal Auditor" }), false);
assert.equal(
  listingPath("scholarship", "kcb-scholars"),
  "/scholarships/kcb-scholars"
);
assert.equal(listingPath("job", "auditor"), "/jobs/auditor");

const stripped = withoutScholarshipColumns({
  title: "Role",
  listing_kind: "scholarship",
  scholarship_level: "tvet",
  salary_min: 1,
});
assert.equal("listing_kind" in stripped, false);
assert.equal("scholarship_level" in stripped, false);
assert.equal(stripped.salary_min, 1);

assert.equal(
  isMissingListingKindColumnError({
    message: 'column jobs.listing_kind does not exist',
  }),
  true
);
assert.equal(
  isMissingListingKindColumnError({
    code: "42703",
    message: "column jobs.listing_kind does not exist",
  }),
  true
);
assert.equal(
  isMissingListingKindColumnError({
    code: "42703",
    message: "",
  }),
  true
);
assert.equal(
  isMissingListingKindColumnError({ message: "duplicate key" }),
  false
);

console.log("listingKind.test.ts: all assertions passed");
