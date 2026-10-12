import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { IndustryCardsGrid } from "@/components/IndustryCard";
import { getCompanyDirectoryDataOrEmpty } from "@/lib/companyDirectory";
import { fetchPageContentMap, fetchPageSeo } from "@/lib/fetchPageContent";
import { getContentValue } from "@/lib/pageContent";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://www.careersasa.co.ke";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const seo = await fetchPageSeo("companies");
  const title = seo?.seo_title || "Companies by Industry | CareerSasa";
  const description =
    seo?.seo_meta_description ||
    "Browse Kenyan employers by industry on CareerSasa. Pick a sector to see company profiles and open jobs.";
  const url = (seo?.seo_canonical_url || `${SITE_URL.replace(/\/$/, "")}/companies`);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "CareerSasa",
    },
    robots: {
      index: seo?.seo_index !== false,
      follow: seo?.seo_follow !== false,
    },
  };
}

export default async function CompaniesPage() {
  const [{ companies, industryCards }, content] = await Promise.all([
    getCompanyDirectoryDataOrEmpty(),
    fetchPageContentMap("companies"),
  ]);
  const totalOpenJobs = companies.reduce((sum, c) => sum + c.openJobs, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-mesh opacity-70" aria-hidden />
        <div className="absolute inset-0 bg-gradient-subtle" aria-hidden />
        <div className="container relative mx-auto px-4 py-8 md:py-10">
          <p className="text-sm font-medium text-primary mb-2 tracking-wide">
            {getContentValue(content, "eyebrow", "Employers on CareerSasa")}
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3">
            {getContentValue(content, "hero_title", "Companies")}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl leading-relaxed">
            {getContentValue(
              content,
              "hero_subtitle",
              "Choose an industry to explore employers hiring in Kenya — or browse all companies at once."
            )}
          </p>
        </div>
      </section>

      <main className="container mx-auto px-4 py-6 md:py-8 flex-1">
        <IndustryCardsGrid
          industries={industryCards}
          totalCompanies={companies.length}
          totalOpenJobs={totalOpenJobs}
        />
      </main>

      <Footer />
    </div>
  );
}
