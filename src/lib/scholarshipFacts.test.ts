/**
 * Run: npx tsx src/lib/scholarshipFacts.test.ts
 */
import assert from "node:assert/strict";
import {
  extractScholarshipFacts,
  formatProgrammeStart,
  mergeScholarshipFacts,
  scholarshipCoverageLabel,
  scholarshipLevelLabel,
} from "./scholarshipFacts";

const tmu = extractScholarshipFacts({
  title: "Scholarship Opportunities at Tom Mboya University",
  html: `
    <p>The University invites applications for these scholarships from suitably qualified
    persons to Masters OR Ph.D Programmes.</p>
    <p>The scholarship package will cover tuition fees and research costs for the duration of study.
    The scholarships are open to all Kenyans under the age of 30 years who will also be engaged as
    Graduate Assistants OR Tutorial Fellows. Programmes of study funded by the scholarship are
    scheduled to commence in August, 2026.</p>
    <p>The studies will be tenable at Dalian Maritime University/Shanghai Maritime University.</p>
  `,
});
assert.equal(tmu.scholarship_level, "phd");
assert.equal(tmu.scholarship_coverage, "full");
assert.equal(tmu.scholarship_duration, "Duration of study");
assert.equal(tmu.scholarship_nationality, "Kenyan citizens");
assert.equal(tmu.scholarship_age_limit, "Under 30");
assert.equal(tmu.scholarship_bonding, "Bonded as Graduate Assistants OR Tutorial Fellows");
assert.match(tmu.scholarship_host_institution || "", /Dalian Maritime University/);
assert.equal(tmu.scholarship_programme_start, "2026-08-01");

const kcb = extractScholarshipFacts({
  title: "Scholarships Programme at KCB Foundation",
  html: `<p>KCB Foundation is offering Grade 3 Level scholarships.
  Eligibility: Be between the age of 18-34years. Be a resident of Mathioya Constituency.</p>`,
});
assert.equal(kcb.scholarship_level, "tvet");
assert.equal(kcb.scholarship_age_limit, "18–34 years");
assert.equal(kcb.scholarship_nationality, "Residents of Mathioya Constituency");

const rvibs = extractScholarshipFacts({
  title: "Graphic Design at RVIBS",
  html: `<p>RVIBS Media Talent Academy is offering partial scholarships to Kenyan youth.
  Selected applicants will receive three months of intensive, practical training.</p>`,
});
assert.equal(rvibs.scholarship_coverage, "partial");
assert.equal(rvibs.scholarship_duration, "3 months");
assert.equal(rvibs.scholarship_level, "short_course");
assert.equal(rvibs.scholarship_nationality, "Kenyan youth");

const meru = extractScholarshipFacts({
  title: "Scholarship for Graduate Assistant - ICT - 3 Posts",
  html: `<p>The scholarship package will cover tuition fees for the duration of study.
  Scholarships are tenable at the Meru University of Science and Technology.
  The successful candidates shall be bonded under the applicable terms.</p>`,
});
assert.equal(meru.scholarship_level, "postgraduate");
assert.equal(meru.scholarship_coverage, "tuition");
assert.equal(meru.scholarship_awards_count, 3);
assert.match(meru.scholarship_host_institution || "", /Meru University/);
assert.equal(meru.scholarship_bonding, "Bonded");

const meruUndergrad = extractScholarshipFacts({
  title: "Scholarships (Undergraduate Programmes) - Renewable Energy & Smart Grid",
  html: `<p>The scholarship package will cover tuition fees, Project and Assessments costs for the duration of study.
  The scholarships are open to all Kenyans under the age of 40 years who will be engaged as Technicians and Technologists.
  Scholarships are tenable at the Meru University of Science and Technology;
  Applications will be as per the outlined below online application procedure.</p>`,
});
assert.equal(meruUndergrad.scholarship_level, "undergraduate");
assert.equal(meruUndergrad.scholarship_coverage, "full");
assert.equal(meruUndergrad.scholarship_nationality, "Kenyan citizens");
assert.equal(meruUndergrad.scholarship_age_limit, "Under 40");
assert.equal(meruUndergrad.scholarship_bonding, "Bonded as Technicians and Technologists");
assert.equal(
  meruUndergrad.scholarship_host_institution,
  "Meru University of Science and Technology"
);

assert.equal(scholarshipLevelLabel("phd"), "PhD");
assert.equal(scholarshipCoverageLabel("partial"), "Partial");
assert.equal(formatProgrammeStart("2026-08-01"), "August 2026");

assert.equal(
  mergeScholarshipFacts(
    { scholarship_level: "tvet", scholarship_coverage: null },
    {
      scholarship_level: "undergraduate",
      scholarship_coverage: "partial",
      scholarship_duration: "3 months",
      scholarship_nationality: null,
      scholarship_age_limit: null,
      scholarship_bonding: null,
      scholarship_host_institution: null,
      scholarship_awards_count: null,
      scholarship_programme_start: null,
    }
  ).scholarship_coverage,
  "partial"
);

console.log("scholarshipFacts.test.ts: all assertions passed");
