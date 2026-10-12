import type { Metadata } from "next";
import { ContactPage } from "@/components/ContactPage";
import { fetchPageContentMap, fetchPageSeo } from "@/lib/fetchPageContent";

const FALLBACK_TITLE = "Contact CareerSasa | Support for Job Seekers and Employers";
const FALLBACK_DESCRIPTION =
  "Get in touch with CareerSasa. Email support@careersasa.co.ke or send a message — we typically respond within 24 hours on business days.";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await fetchPageSeo("contact");
  const title = seo?.seo_title || FALLBACK_TITLE;
  const description = seo?.seo_meta_description || FALLBACK_DESCRIPTION;

  return {
    title,
    description,
    alternates: seo?.seo_canonical_url
      ? { canonical: seo.seo_canonical_url }
      : undefined,
    robots: {
      index: seo?.seo_index !== false,
      follow: seo?.seo_follow !== false,
    },
  };
}

export default async function ContactRoute() {
  const content = await fetchPageContentMap("contact");
  return <ContactPage content={content} />;
}
