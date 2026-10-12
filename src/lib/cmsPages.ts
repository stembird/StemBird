const SITE_URL = "https://www.careersasa.co.ke";

export type CmsPage = {
  slug: string;
  label: string;
  defaultUrl?: string;
  defaultCanonical?: string;
  hasSeo: boolean;
};

export type DefaultSection = {
  section_key: string;
  content_type: "text" | "html" | "json" | "number";
  content_value: string;
  metadata?: Record<string, string>;
  seo_title?: string;
  seo_meta_description?: string;
  seo_url_slug?: string;
  seo_canonical_url?: string;
  seo_h1_title?: string;
};

/**
 * Pages the admin Content & SEO editor can manage.
 * Keep this in sync with public site chrome and jobs browse hubs.
 */
export const CMS_PAGES: CmsPage[] = [
  { slug: "navigation", label: "Navigation", hasSeo: false },
  {
    slug: "home",
    label: "Homepage",
    defaultUrl: "/",
    defaultCanonical: `${SITE_URL}/`,
    hasSeo: true,
  },
  {
    slug: "jobs",
    label: "All Jobs",
    defaultUrl: "/jobs",
    defaultCanonical: `${SITE_URL}/jobs`,
    hasSeo: true,
  },
  {
    slug: "jobs-industries",
    label: "Jobs by Industry",
    defaultUrl: "/jobs/industries",
    defaultCanonical: `${SITE_URL}/jobs/industries`,
    hasSeo: true,
  },
  {
    slug: "jobs-functions",
    label: "Jobs by Function",
    defaultUrl: "/jobs/functions",
    defaultCanonical: `${SITE_URL}/jobs/functions`,
    hasSeo: true,
  },
  {
    slug: "jobs-counties",
    label: "Jobs by County",
    defaultUrl: "/jobs/counties",
    defaultCanonical: `${SITE_URL}/jobs/counties`,
    hasSeo: true,
  },
  {
    slug: "scholarships",
    label: "Scholarships",
    defaultUrl: "/scholarships",
    defaultCanonical: `${SITE_URL}/scholarships`,
    hasSeo: true,
  },
  {
    slug: "companies",
    label: "Companies",
    defaultUrl: "/companies",
    defaultCanonical: `${SITE_URL}/companies`,
    hasSeo: true,
  },
  {
    slug: "services-cv",
    label: "CV Services",
    defaultUrl: "/services/cv",
    defaultCanonical: `${SITE_URL}/services/cv`,
    hasSeo: true,
  },
  {
    slug: "services-linkedin",
    label: "LinkedIn Services",
    defaultUrl: "/services/linkedin",
    defaultCanonical: `${SITE_URL}/services/linkedin`,
    hasSeo: true,
  },
  {
    slug: "services-cover-letter",
    label: "Cover Letter Services",
    defaultUrl: "/services/cover-letter",
    defaultCanonical: `${SITE_URL}/services/cover-letter`,
    hasSeo: true,
  },
  {
    slug: "about",
    label: "About Us",
    defaultUrl: "/about",
    defaultCanonical: `${SITE_URL}/about`,
    hasSeo: true,
  },
  {
    slug: "contact",
    label: "Contact Us",
    defaultUrl: "/contact",
    defaultCanonical: `${SITE_URL}/contact`,
    hasSeo: true,
  },
];

export const SEO_CMS_PAGES = CMS_PAGES.filter((page) => page.hasSeo);

/** Default copy for new / missing CMS keys so the editor stays aligned with the live site. */
export const DEFAULT_PAGE_CONTENT: Record<string, DefaultSection[]> = {
  navigation: [
    {
      section_key: "nav_browse_label",
      content_type: "text",
      content_value: "Browse Jobs",
      metadata: { location: "header", note: "Desktop and mobile nav trigger" },
    },
    {
      section_key: "nav_browse_all_jobs",
      content_type: "text",
      content_value: "All jobs",
      metadata: { href: "/jobs" },
    },
    {
      section_key: "nav_browse_all_jobs_description",
      content_type: "text",
      content_value: "Search and filter every live role",
    },
    {
      section_key: "nav_browse_by_industry",
      content_type: "text",
      content_value: "By industry",
      metadata: { href: "/jobs/industries" },
    },
    {
      section_key: "nav_browse_by_industry_description",
      content_type: "text",
      content_value: "See which sectors are hiring now",
    },
    {
      section_key: "nav_browse_by_function",
      content_type: "text",
      content_value: "By function",
      metadata: { href: "/jobs/functions" },
    },
    {
      section_key: "nav_browse_by_function_description",
      content_type: "text",
      content_value: "Browse jobs by what you do",
    },
    {
      section_key: "nav_browse_by_county",
      content_type: "text",
      content_value: "By county",
      metadata: { href: "/jobs/counties" },
    },
    {
      section_key: "nav_browse_by_county_description",
      content_type: "text",
      content_value: "Find roles across Kenya's 47 counties",
    },
  ],
  jobs: [
    {
      section_key: "hero_title",
      content_type: "text",
      content_value: "Find Your Next Job in Kenya",
    },
    {
      section_key: "hero_subtitle",
      content_type: "text",
      content_value:
        "Verified jobs from real employers, updated daily. Apply now. Early applicants get 4x more interview callbacks.",
    },
  ],
  "jobs-industries": [
    {
      section_key: "eyebrow",
      content_type: "text",
      content_value: "Browse jobs",
    },
    {
      section_key: "hero_title",
      content_type: "text",
      content_value: "Jobs by Industry",
    },
    {
      section_key: "hero_subtitle",
      content_type: "text",
      content_value:
        "Pick a sector to see live roles. Industry names are shown in full so you can compare hiring at a glance.",
    },
  ],
  "jobs-functions": [
    {
      section_key: "eyebrow",
      content_type: "text",
      content_value: "Browse jobs",
    },
    {
      section_key: "hero_title",
      content_type: "text",
      content_value: "Jobs by Function",
    },
    {
      section_key: "hero_subtitle",
      content_type: "text",
      content_value:
        "Every field we hire for — including those with no live roles right now. Search, sort, and click through to open jobs.",
    },
  ],
  "jobs-counties": [
    {
      section_key: "eyebrow",
      content_type: "text",
      content_value: "Browse jobs",
    },
    {
      section_key: "hero_title",
      content_type: "text",
      content_value: "Jobs by County",
    },
    {
      section_key: "hero_subtitle",
      content_type: "text",
      content_value:
        "The interactive map belongs here — tap a county or pick from the ranked list to see live jobs nearby.",
    },
  ],
  scholarships: [
    {
      section_key: "hero_title",
      content_type: "text",
      content_value: "Scholarships in Kenya",
      seo_title: "Scholarships in Kenya | CareerSasa",
      seo_meta_description:
        "Browse bursaries and scholarships in Kenya. Filter by level, field of study, and deadline, then apply on the funder site.",
      seo_url_slug: "/scholarships",
      seo_canonical_url: `${SITE_URL}/scholarships`,
      seo_h1_title: "Scholarships in Kenya",
    },
    {
      section_key: "hero_subtitle",
      content_type: "text",
      content_value:
        "Bursaries and funded study awards from universities, foundations, and government programmes. Filter by level and field, then apply on the funder site.",
    },
  ],
  companies: [
    {
      section_key: "eyebrow",
      content_type: "text",
      content_value: "Employers on CareerSasa",
    },
    {
      section_key: "hero_title",
      content_type: "text",
      content_value: "Companies",
      seo_title: "Companies by Industry | CareerSasa",
      seo_meta_description:
        "Browse Kenyan employers by industry on CareerSasa. Pick a sector to see company profiles and open jobs.",
      seo_url_slug: "/companies",
      seo_canonical_url: `${SITE_URL}/companies`,
      seo_h1_title: "Companies",
    },
    {
      section_key: "hero_subtitle",
      content_type: "text",
      content_value:
        "Choose an industry to explore employers hiring in Kenya — or browse all companies at once.",
    },
  ],
  about: [
    {
      section_key: "hero_title",
      content_type: "text",
      content_value: "About CareerSasa",
      seo_title:
        "About CareerSasa - Kenya's Fastest Path from Job Search to Job Offer",
      seo_meta_description:
        "Learn how CareerSasa uses AI-powered matching, free career tools, and verified job listings to help Kenyan professionals land interviews 3x faster than any other job board.",
      seo_url_slug: "/about",
      seo_canonical_url: `${SITE_URL}/about`,
      seo_h1_title: "About CareerSasa",
    },
    {
      section_key: "hero_subtitle",
      content_type: "text",
      content_value: "Kenya's AI-Powered Job Platform. Where Skills Meet Opportunity",
    },
    {
      section_key: "story_title",
      content_type: "text",
      content_value: "Why We Built CareerSasa",
    },
    {
      section_key: "story_p1",
      content_type: "text",
      content_value:
        "We watched thousands of talented Kenyans send 50, 100, even 200 applications and hear nothing back. Not for lack of qualifications. The system was broken. Generic job boards match keywords, not skills. Resumes disappear into black holes. And employers waste weeks sifting through unqualified applicants.",
    },
    {
      section_key: "story_p2",
      content_type: "text",
      content_value:
        "CareerSasa was built to fix that. We use AI-powered matching that connects candidates to jobs they'll actually get, not just jobs that exist. We give every user free career tools worth KES 10,000+: CV builder, cover letter generator, LinkedIn optimizer. We believe the barrier to getting hired should never be money. And we give employers pre-screened, qualified candidates so they can hire in days, not months.",
    },
    {
      section_key: "story_p3",
      content_type: "text",
      content_value:
        "The result? Our users report 3x more interview callbacks than on other platforms, and employers fill positions faster with candidates who actually fit the role.",
    },
    {
      section_key: "values_title",
      content_type: "text",
      content_value: "Our Core Values",
    },
    {
      section_key: "value_speed_title",
      content_type: "text",
      content_value: "Speed",
    },
    {
      section_key: "value_speed_body",
      content_type: "text",
      content_value:
        "Getting hired shouldn't take months. Our AI matching and real-time alerts cut job search time in half. Every day without work is a day too long.",
    },
    {
      section_key: "value_transparency_title",
      content_type: "text",
      content_value: "Transparency",
    },
    {
      section_key: "value_transparency_body",
      content_type: "text",
      content_value:
        "No hidden fees. No ghost listings. Every job is verified, every salary shown where possible, and every application tracked. You deserve honesty in your job search.",
    },
    {
      section_key: "value_fairness_title",
      content_type: "text",
      content_value: "Fairness",
    },
    {
      section_key: "value_fairness_body",
      content_type: "text",
      content_value:
        "Your background shouldn't determine your future. CareerSasa is free for every job seeker. The best candidate might be someone who can't afford a KES 5,000 CV service.",
    },
    {
      section_key: "value_innovation_title",
      content_type: "text",
      content_value: "Kenyan-First Innovation",
    },
    {
      section_key: "value_innovation_body",
      content_type: "text",
      content_value:
        "We build for Kenya's job market, from county-specific job filters to M-Pesa-friendly pricing to Swahili-friendly support. International tools don't understand our market. We do.",
    },
    {
      section_key: "stats_title",
      content_type: "text",
      content_value: "CareerSasa by the Numbers",
    },
    {
      section_key: "stats_subtitle",
      content_type: "text",
      content_value: "Real results, not empty promises",
    },
    {
      section_key: "stats_jobs_value",
      content_type: "text",
      content_value: "1,070+",
    },
    {
      section_key: "stats_jobs_label",
      content_type: "text",
      content_value: "Verified Active Jobs",
    },
    {
      section_key: "stats_companies_value",
      content_type: "text",
      content_value: "103+",
    },
    {
      section_key: "stats_companies_label",
      content_type: "text",
      content_value: "Hiring Companies",
    },
    {
      section_key: "stats_callbacks_value",
      content_type: "text",
      content_value: "3x",
    },
    {
      section_key: "stats_callbacks_label",
      content_type: "text",
      content_value: "More Interview Callbacks",
    },
    {
      section_key: "commitment_title",
      content_type: "text",
      content_value: "What This Means for You",
    },
    {
      section_key: "commitment_seeker",
      content_type: "text",
      content_value:
        "If you're a job seeker: You get AI-matched to jobs that fit your actual skills, alerted in real time, and supported with free career tools, so you stop spraying applications and start landing interviews.",
    },
    {
      section_key: "commitment_employer",
      content_type: "text",
      content_value:
        "If you're an employer: You get pre-screened, qualified candidates delivered to your inbox, not 500 unqualified applicants you have to sift through. Post your first 3 jobs free and see the difference yourself.",
    },
  ],
  contact: [
    {
      section_key: "hero_title",
      content_type: "text",
      content_value: "Contact Us",
      seo_title: "Contact CareerSasa | Support for Job Seekers and Employers",
      seo_meta_description:
        "Get in touch with CareerSasa. Email support@careersasa.co.ke or send a message — we typically respond within 24 hours on business days.",
      seo_url_slug: "/contact",
      seo_canonical_url: `${SITE_URL}/contact`,
      seo_h1_title: "Contact Us",
    },
    {
      section_key: "hero_subtitle",
      content_type: "text",
      content_value: "We're here to help. Reach out with any questions or concerns.",
    },
    {
      section_key: "form_title",
      content_type: "text",
      content_value: "Send Us a Message",
    },
    {
      section_key: "form_subtitle",
      content_type: "text",
      content_value: "Fill out the form below and we'll get back to you soon.",
    },
    {
      section_key: "form_button",
      content_type: "text",
      content_value: "Send Message",
    },
    {
      section_key: "info_title",
      content_type: "text",
      content_value: "Contact Information",
    },
    {
      section_key: "email_label",
      content_type: "text",
      content_value: "Email",
    },
    {
      section_key: "email_value",
      content_type: "text",
      content_value: "support@careersasa.co.ke",
    },
    {
      section_key: "hours_label",
      content_type: "text",
      content_value: "Business Hours",
    },
    {
      section_key: "hours_weekday",
      content_type: "text",
      content_value: "Monday - Friday: 8:00 AM - 6:00 PM",
    },
    {
      section_key: "hours_saturday",
      content_type: "text",
      content_value: "Saturday: 9:00 AM - 2:00 PM",
    },
    {
      section_key: "hours_sunday",
      content_type: "text",
      content_value: "Sunday: Closed",
    },
    {
      section_key: "support_title",
      content_type: "text",
      content_value: "Quick Support",
    },
    {
      section_key: "support_body",
      content_type: "text",
      content_value:
        "Email us anytime — we typically respond within 24 hours during business days.",
    },
    {
      section_key: "faq_title",
      content_type: "text",
      content_value: "FAQ",
    },
    {
      section_key: "faq_body",
      content_type: "text",
      content_value:
        "Before reaching out, check our FAQ section for quick answers to common questions about job postings, applications, and account management.",
    },
  ],
};

export function getMissingDefaultSections(
  pageSlug: string,
  existingKeys: Iterable<string>
): DefaultSection[] {
  const defaults = DEFAULT_PAGE_CONTENT[pageSlug] ?? [];
  const existing = new Set(existingKeys);
  return defaults.filter((section) => !existing.has(section.section_key));
}

export function getPageSeoRow<T extends { section_key: string }>(
  rows: T[]
): T | undefined {
  return rows.find((row) => row.section_key === "hero_title") ?? rows[0];
}

export function toPageContentInserts(pageSlug: string, sections: DefaultSection[]) {
  return sections.map((section) => ({
    page_slug: pageSlug,
    section_key: section.section_key,
    content_type: section.content_type,
    content_value: section.content_value,
    metadata: section.metadata ?? {},
    seo_title: section.seo_title ?? null,
    seo_meta_description: section.seo_meta_description ?? null,
    seo_url_slug: section.seo_url_slug ?? null,
    seo_canonical_url: section.seo_canonical_url ?? null,
    seo_h1_title: section.seo_h1_title ?? null,
    seo_index: true,
    seo_follow: true,
  }));
}
