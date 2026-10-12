/**
 * Run: npx tsx src/lib/cmsPages.test.ts
 */
import { CMS_PAGES, getMissingDefaultSections, getPageSeoRow, SEO_CMS_PAGES } from "./cmsPages";
import { getContentValue } from "./pageContent";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

assert(
  CMS_PAGES.some((page) => page.slug === "navigation"),
  "content editor includes Navigation"
);
assert(
  CMS_PAGES.some((page) => page.slug === "jobs-industries"),
  "content editor includes jobs by industry"
);
assert(
  CMS_PAGES.some((page) => page.slug === "jobs-functions"),
  "content editor includes jobs by function"
);
assert(
  CMS_PAGES.some((page) => page.slug === "jobs-counties"),
  "content editor includes jobs by county"
);
assert(
  CMS_PAGES.some((page) => page.slug === "scholarships"),
  "content editor includes Scholarships"
);
assert(
  CMS_PAGES.find((page) => page.slug === "about")?.label === "About Us",
  "about page is labeled About Us"
);
assert(
  CMS_PAGES.find((page) => page.slug === "contact")?.label === "Contact Us",
  "contact page is labeled Contact Us"
);
assert(
  SEO_CMS_PAGES.some((page) => page.slug === "companies"),
  "SEO editor includes Companies"
);
assert(
  !SEO_CMS_PAGES.some((page) => page.slug === "navigation"),
  "navigation is not a public SEO page"
);

const missing = getMissingDefaultSections("navigation", ["nav_browse_all_jobs"]);
assert(
  missing.some((section) => section.section_key === "nav_browse_label"),
  "missing browse label is reported"
);
assert(
  missing.every((section) => section.section_key !== "nav_browse_all_jobs"),
  "existing keys are not reported as missing"
);
assert(
  missing.find((section) => section.section_key === "nav_browse_label")
    ?.content_value === "Browse Jobs",
  "default browse label is Browse Jobs"
);

assert(
  getMissingDefaultSections("navigation", [
    "nav_browse_label",
    "nav_browse_all_jobs",
    "nav_browse_all_jobs_description",
    "nav_browse_by_industry",
    "nav_browse_by_industry_description",
    "nav_browse_by_function",
    "nav_browse_by_function_description",
    "nav_browse_by_county",
    "nav_browse_by_county_description",
  ]).length === 0,
  "no missing sections when all defaults exist"
);

assert(
  getContentValue([{ section_key: "nav_browse_label", content_value: "Browse Jobs" }], "nav_browse_label", "Browse") ===
    "Browse Jobs",
  "array lookup returns stored value"
);
assert(
  getContentValue({ nav_browse_label: "Browse Jobs" }, "nav_browse_label", "Browse") ===
    "Browse Jobs",
  "map lookup returns stored value"
);
assert(
  getContentValue(null, "nav_browse_label", "Browse Jobs") === "Browse Jobs",
  "fallback is used when content is missing"
);

const aboutMissing = getMissingDefaultSections("about", []);
assert(aboutMissing.length > 0, "about has default website sections");
assert(
  aboutMissing.some((section) => section.section_key === "hero_title"),
  "about defaults include hero_title"
);
assert(
  getMissingDefaultSections("contact", []).some(
    (section) => section.section_key === "hero_title"
  ),
  "contact defaults include hero_title"
);
assert(
  getMissingDefaultSections("companies", []).some(
    (section) => section.section_key === "hero_title"
  ),
  "companies defaults include hero_title"
);

assert(
  getPageSeoRow([
    { section_key: "story_p1" },
    { section_key: "hero_title" },
  ])?.section_key === "hero_title",
  "SEO row prefers hero_title"
);
assert(
  getPageSeoRow([{ section_key: "nav_browse_label" }])?.section_key ===
    "nav_browse_label",
  "SEO row falls back to the first section"
);

console.log("cmsPages tests passed");
