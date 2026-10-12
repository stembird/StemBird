import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { buildLocationString } from "@/lib/textUtils";
import { buildShareOgImagePath } from "@/lib/ogTemplateCatalog";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabaseEnv";
import { isUuid, throwIfSupabaseError } from "@/lib/supabaseRead";
import { isMissingListingKindColumnError, isScholarshipRow } from "@/lib/listingKind";

type ListingMetadataRow = {
  id: string;
  title: string | null;
  company: string | null;
  location: string | null;
  job_slug: string | null;
  listing_kind?: string | null;
  job_location_type: string | null;
  job_location_city: string | null;
  job_location_county: string | null;
  companies: { name?: string } | { name?: string }[] | null;
};

const select = `
  id,
  title,
  company,
  location,
  job_slug,
  listing_kind,
  job_location_type,
  job_location_city,
  job_location_county,
  companies (
    name
  )
`;

const selectWithoutKind = `
  id,
  title,
  company,
  location,
  job_slug,
  job_location_type,
  job_location_city,
  job_location_county,
  companies (
    name
  )
`;

function companyNameFrom(job: ListingMetadataRow): string | null {
  const rel = job.companies;
  const relatedName = Array.isArray(rel) ? rel[0]?.name : rel?.name;
  return relatedName || job.company || null;
}

async function fetchScholarshipForMetadata(id: string, columns: string): Promise<{
  job: ListingMetadataRow | null;
  error: { message?: string } | null;
}> {
  const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());
  let { data: job, error } = await supabase
    .from("jobs")
    .select(columns)
    .eq("job_slug", id)
    .maybeSingle();

  if (!job && !error && isUuid(id)) {
    ({ data: job, error } = await supabase
      .from("jobs")
      .select(columns)
      .eq("id", id)
      .maybeSingle());
  }
  return {
    job: (job as unknown as ListingMetadataRow | null) ?? null,
    error,
  };
}

export async function generateScholarshipMetadata(id: string): Promise<Metadata> {
  let { job, error } = await fetchScholarshipForMetadata(id, select);
  if (error && isMissingListingKindColumnError(error)) {
    ({ job, error } = await fetchScholarshipForMetadata(id, selectWithoutKind));
  }

  throwIfSupabaseError(error, "Error generating scholarship metadata");

  if (!job || !isScholarshipRow(job)) {
    return {
      title: "Scholarship Not Found - CareerSasa",
      description: "The scholarship you are looking for could not be found.",
    };
  }

  const companyName = companyNameFrom(job);
  const titleText = job.title || "Scholarship";
  const isRemote = job.job_location_type === "REMOTE";
  const locationPart = buildLocationString(
    job.job_location_city,
    job.job_location_county,
    job.location
  );

  const title = isRemote
    ? `${titleText}${companyName ? ` at ${companyName}` : ""} Scholarship — Remote (Kenya) | CareerSasa`
    : `${titleText}${companyName ? ` at ${companyName}` : ""} Scholarship in ${locationPart} | CareerSasa`;

  const description = `${titleText} scholarship${companyName ? ` at ${companyName}` : ""}${
    isRemote ? " — Remote (Kenya)" : ` in ${locationPart}`
  }. Eligibility, award details, and how to apply on CareerSasa.`;

  const siteUrl = "https://www.careersasa.co.ke";
  const thumbnailUrl = `${siteUrl}${buildShareOgImagePath(id)}`;
  const url = `${siteUrl}/scholarships/${job.job_slug || job.id || id}`;
  const imageAlt = `${titleText}${companyName ? ` at ${companyName}` : ""}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "CareerSasa",
      images: [
        {
          url: thumbnailUrl,
          secureUrl: thumbnailUrl,
          type: "image/png",
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
      locale: "en_KE",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [thumbnailUrl],
    },
  };
}
