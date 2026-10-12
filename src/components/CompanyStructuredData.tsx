import Script from "next/script";
import { resolveCompanyLogoUrl, resolveCompanyWebsite } from "@/lib/companyLogo";

interface CompanyStructuredDataProps {
  company: {
    id: string;
    name: string;
    description?: string | null;
    logo?: string | null;
    website?: string | null;
    industry?: string | null;
    location?: string | null;
  };
  pageUrl: string;
}

export default function CompanyStructuredData({
  company,
  pageUrl,
}: CompanyStructuredDataProps) {
  const website = resolveCompanyWebsite(company.name, company.website);
  const logo = resolveCompanyLogoUrl({
    logo: company.logo,
    website: company.website,
    companyName: company.name,
  });

  const orgData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.name,
    url: pageUrl,
    sameAs: website || undefined,
    logo: logo || undefined,
    description: company.description || undefined,
    industry: company.industry || undefined,
    address: company.location
      ? {
          "@type": "PostalAddress",
          addressLocality: company.location,
          addressCountry: "KE",
        }
      : undefined,
  };

  const clean = Object.fromEntries(
    Object.entries(orgData).filter(([, value]) => value !== undefined)
  );

  return (
    <Script
      id={`company-org-${company.id}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(clean) }}
    />
  );
}
