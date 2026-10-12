import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { buildLocationString } from '@/lib/textUtils';
import { buildShareOgImagePath } from '@/lib/ogTemplateCatalog';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabaseEnv';
import { isUuid, throwIfSupabaseError } from '@/lib/supabaseRead';
import { isMissingListingKindColumnError, isScholarshipRow } from '@/lib/listingKind';

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

const jobSelect = `
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

const jobSelectWithoutKind = `
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

async function fetchJobForMetadata(id: string, select: string): Promise<{
  job: ListingMetadataRow | null;
  error: { message?: string } | null;
}> {
  const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());
  let { data: job, error } = await supabase
    .from('jobs')
    .select(select)
    .eq('job_slug', id)
    .maybeSingle();

  if (!job && !error && isUuid(id)) {
    ({ data: job, error } = await supabase
      .from('jobs')
      .select(select)
      .eq('id', id)
      .maybeSingle());
  }
  return {
    job: (job as unknown as ListingMetadataRow | null) ?? null,
    error,
  };
}

export async function generateJobMetadata(id: string): Promise<Metadata> {
  try {
    let { job, error } = await fetchJobForMetadata(id, jobSelect);
    if (error && isMissingListingKindColumnError(error)) {
      ({ job, error } = await fetchJobForMetadata(id, jobSelectWithoutKind));
    }

    throwIfSupabaseError(error, 'Error generating job metadata');
    
    if (!job) {
      return {
        title: 'Job Not Found - CareerSasa',
        description: 'The job you are looking for could not be found.',
      };
    }
    
    const companyName = companyNameFrom(job);
    const jobTitle = job.title || 'Job Opening';
    const isRemote = job.job_location_type === 'REMOTE';
    const locationPart = buildLocationString(
      job.job_location_city,
      job.job_location_county,
      job.location,
    );

    // SEO-friendly title: "[Post] at [Company] in [City], [County], Kenya | CareerSasa"
    const isScholarship = isScholarshipRow(job);
    const kindLabel = isScholarship ? 'Scholarship' : 'Job';
    const pathPrefix = isScholarship ? 'scholarships' : 'jobs';

    const title = isRemote
      ? `${jobTitle}${companyName ? ` at ${companyName}` : ''} ${kindLabel} — Remote (Kenya) | CareerSasa`
      : `${jobTitle}${companyName ? ` at ${companyName}` : ''} ${kindLabel} in ${locationPart} | CareerSasa`;

    const description = isRemote
      ? `${jobTitle}${isScholarship ? ' scholarship' : ' job'}${companyName ? ` at ${companyName}` : ''} — Remote (Kenya). Apply now on CareerSasa.`
      : `${jobTitle}${isScholarship ? ' scholarship' : ' job'}${companyName ? ` at ${companyName}` : ''} in ${locationPart}. Apply now on CareerSasa.`;

    const siteUrl = 'https://www.careersasa.co.ke';
    // Same .png URL Buffer warms before Facebook scrapes the link card.
    const thumbnailUrl = `${siteUrl}${buildShareOgImagePath(id)}`;
    const url = `${siteUrl}/${pathPrefix}/${job.job_slug || job.id || id}`;
    const imageAlt = `${jobTitle}${companyName ? ` at ${companyName}` : ''}`;
    
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        siteName: 'CareerSasa',
        images: [
          {
            url: thumbnailUrl,
            secureUrl: thumbnailUrl,
            type: 'image/png',
            width: 1200,
            height: 630,
            alt: imageAlt,
          },
        ],
        locale: 'en_KE',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [thumbnailUrl],
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    throw error;
  }
}
