import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CompaniesDirectory } from "@/components/CompaniesDirectory";
import {
  ALL_INDUSTRIES_SLUG,
  getCompanyDirectoryData,
  resolveIndustryFromSlug,
} from "@/lib/companyDirectory";
import {
  ALL_INDUSTRIES_IMAGE,
  getIndustryCardImage,
} from "@/lib/industryCardImages";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://www.careersasa.co.ke";

export const revalidate = 300;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { industries } = await getCompanyDirectoryData();

  if (slug === ALL_INDUSTRIES_SLUG) {
    const url = `${SITE_URL.replace(/\/$/, "")}/companies/industry/all`;
    return {
      title: "All Companies | CareerSasa",
      description:
        "Browse all employers hiring on CareerSasa across every industry in Kenya.",
      alternates: { canonical: url },
      openGraph: {
        title: "All Companies | CareerSasa",
        description:
          "Browse all employers hiring on CareerSasa across every industry in Kenya.",
        url,
        type: "website",
        siteName: "CareerSasa",
      },
    };
  }

  const industry = resolveIndustryFromSlug(slug, industries);
  if (!industry) {
    return { title: "Industry Not Found | CareerSasa" };
  }

  const url = `${SITE_URL.replace(/\/$/, "")}/companies/industry/${slug}`;
  return {
    title: `${industry} Companies | CareerSasa`,
    description: `Explore ${industry} employers hiring on CareerSasa. View company profiles and open jobs in Kenya.`,
    alternates: { canonical: url },
    openGraph: {
      title: `${industry} Companies | CareerSasa`,
      description: `Explore ${industry} employers hiring on CareerSasa. View company profiles and open jobs in Kenya.`,
      url,
      type: "website",
      siteName: "CareerSasa",
    },
  };
}

export default async function CompaniesByIndustryPage({ params }: PageProps) {
  const { slug } = await params;
  const { companies, industries } = await getCompanyDirectoryData();

  const isAll = slug === ALL_INDUSTRIES_SLUG;
  const industryName = isAll ? null : resolveIndustryFromSlug(slug, industries);

  if (!isAll && !industryName) {
    notFound();
  }

  const filtered = isAll
    ? companies
    : companies.filter((c) => c.industry === industryName);

  const heading = isAll ? "All industries" : industryName!;
  const subcopy = isAll
    ? "Every employer listed on CareerSasa, across all sectors."
    : `Employers in ${industryName} hiring on CareerSasa.`;
  const imageUrl = isAll
    ? ALL_INDUSTRIES_IMAGE
    : getIndustryCardImage(industryName);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <section className="relative overflow-hidden border-b border-border/50">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${imageUrl})` }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/35"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-transparent"
          aria-hidden
        />

        <div className="container relative mx-auto px-4 py-8 md:py-10">
          <Link
            href="/companies"
            className="inline-flex items-center text-sm text-white/80 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            All industries
          </Link>
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/75 mb-2">
            Companies
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3 text-white drop-shadow-sm">
            {heading}
          </h1>
          <p className="text-white/85 text-base md:text-lg max-w-2xl leading-relaxed">
            {subcopy}
          </p>
        </div>
      </section>

      <main className="container mx-auto px-4 py-6 md:py-8 flex-1">
        <CompaniesDirectory companies={filtered} industryName={industryName} />
      </main>

      <Footer />
    </div>
  );
}
