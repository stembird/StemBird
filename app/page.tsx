import HomePage from "@/components/HomePage";
import {
  getCompanyDirectoryDataOrEmpty,
  getHomepageStats,
} from "@/lib/companyDirectory";
import { getActiveJobsByCounty } from "@/lib/jobsByCounty";
import { getActiveJobsByFunction } from "@/lib/jobsByFunction";
import { getActiveJobsByIndustry } from "@/lib/jobsByIndustry";
import { getLatestJobCards, getRecentBlogPosts } from "@/lib/latestJobs";

export const revalidate = 300;

export default async function Page() {
  const [
    { companies },
    stats,
    jobsByCounty,
    jobsByFunction,
    jobsByIndustry,
    latestJobs,
    recentPosts,
  ] = await Promise.all([
    getCompanyDirectoryDataOrEmpty({ includeDescriptions: false }),
    getHomepageStats(),
    getActiveJobsByCounty(),
    getActiveJobsByFunction(),
    getActiveJobsByIndustry(),
    getLatestJobCards(6),
    getRecentBlogPosts(3),
  ]);

  const topCompanies = companies
    .filter((company) => company.openJobs > 0)
    .slice(0, 12);

  return (
    <HomePage
      topCompanies={topCompanies}
      activeJobsCount={stats.activeJobs}
      companiesCount={stats.companies}
      jobsByCounty={jobsByCounty}
      jobsByFunction={jobsByFunction}
      jobsByIndustry={jobsByIndustry}
      latestJobs={latestJobs}
      recentPosts={recentPosts}
    />
  );
}
