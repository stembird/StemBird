import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_URL } from "@/lib/browseNav";
import { fetchPageSeo } from "@/lib/fetchPageContent";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const seo = await fetchPageSeo("scholarships");
  const title = seo?.seo_title || "Scholarships in Kenya";
  const description =
    seo?.seo_meta_description ||
    "Browse bursaries and scholarships in Kenya. Filter by level, field of study, and deadline, then apply on the funder site.";
  const url = seo?.seo_canonical_url || `${SITE_URL}/scholarships`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | CareerSasa`,
      description,
      url,
      type: "website",
      siteName: "CareerSasa",
    },
  };
}

export default function ScholarshipsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
