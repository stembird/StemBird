import type { Metadata } from "next";
import { BrowseHubChrome } from "@/components/BrowseHubChrome";
import { ExploreJobsByIndustry } from "@/components/ExploreJobsByIndustry";
import { getActiveJobsByIndustry } from "@/lib/jobsByIndustry";
import { SITE_URL } from "@/lib/browseNav";
import { fetchPageContentMap } from "@/lib/fetchPageContent";
import { getContentValue } from "@/lib/pageContent";

export const revalidate = 300;

const title = "Jobs by Industry";
const description =
  "Browse live jobs in Kenya by industry. See which sectors are hiring and jump into open roles.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: `${SITE_URL}/jobs/industries`,
  },
  openGraph: {
    title: `${title} | CareerSasa`,
    description,
    url: `${SITE_URL}/jobs/industries`,
    type: "website",
    siteName: "CareerSasa",
  },
};

export default async function JobsByIndustryPage() {
  const [industries, content] = await Promise.all([
    getActiveJobsByIndustry(),
    fetchPageContentMap("jobs-industries"),
  ]);

  return (
    <BrowseHubChrome
      eyebrow={getContentValue(content, "eyebrow", "Browse jobs")}
      title={getContentValue(content, "hero_title", "Jobs by Industry")}
      description={getContentValue(
        content,
        "hero_subtitle",
        "Pick a sector to see live roles. Industry names are shown in full so you can compare hiring at a glance."
      )}
    >
      <ExploreJobsByIndustry industries={industries} variant="full" />
    </BrowseHubChrome>
  );
}
