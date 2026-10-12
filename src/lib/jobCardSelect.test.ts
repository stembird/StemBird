/**
 * Run: npx tsx src/lib/jobCardSelect.test.ts
 */
import assert from "node:assert/strict"
import { jobCardCompany, jobCardDescription, JOB_CARD_SELECT, SCHOLARSHIP_CARD_SELECT } from "./jobCardSelect"

assert.equal(
  jobCardDescription({
    id: "1",
    title: "Role",
    company: "Acme",
    location: "Nairobi",
    description_excerpt: "Short teaser",
    description: "<p>Huge HTML body that must not be preferred</p>",
  }),
  "Short teaser"
)

assert.equal(
  jobCardDescription({
    id: "1",
    title: "Role",
    company: "Acme",
    location: "Nairobi",
    description: "<p>Hello <b>world</b> from a listing.</p>",
  }),
  "Hello world from a listing."
)

assert.equal(
  jobCardCompany({
    id: "1",
    title: "Role",
    company: "Acme",
    location: "Nairobi",
    companies: [{ id: "c1", name: "Acme Ltd", logo: null, website: null }],
  })?.name,
  "Acme Ltd"
)

assert.match(JOB_CARD_SELECT, /description_excerpt/)
assert.doesNotMatch(JOB_CARD_SELECT, /\bdescription\b/)
assert.doesNotMatch(JOB_CARD_SELECT, /responsibilities/)
assert.doesNotMatch(JOB_CARD_SELECT, /additional_info/)
assert.match(SCHOLARSHIP_CARD_SELECT, /scholarship_level/)
assert.match(SCHOLARSHIP_CARD_SELECT, /listing_kind/)

console.log("jobCardSelect.test.ts: all assertions passed")
