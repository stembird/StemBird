import { Database } from '@/integrations/supabase/types';
import { resolveCompanyLogoUrl, resolveCompanyWebsite } from '@/lib/companyLogo';
import {
  resolveApplicantLocationRequirements,
  resolveBaseSalary,
  resolveDatePosted,
  resolveEducationRequirements,
  resolveEmploymentTypes,
  resolveExperienceRequirements,
  resolveJobAddress,
  resolveJobLocationType,
  resolveValidThrough,
  isSchemaLogoPlaceholder,
} from '@/lib/jobStructuredDataMapping';

interface JobStructuredDataProps {
  job: Database['public']['Tables']['jobs']['Row'] & {
    companies?: Database['public']['Tables']['companies']['Row'] | null;
    salary_is_estimated?: boolean | null;
  };
}

export function buildJobPostingJsonLd(
  job: JobStructuredDataProps['job']
): Record<string, unknown> | null {
  const datePosted = resolveDatePosted(job);
  // datePosted is required by Google JobPosting. Omit the whole block rather
  // than emit invalid markup (GSC: "Missing field datePosted").
  if (!datePosted) return null;

  const orgName = job.companies?.name || job.company;
  const orgWebsite = resolveCompanyWebsite(
    orgName,
    job.companies?.website || job.hiring_organization_url
  );

  // Never emit favicon-CDN placeholders as the org logo (fails Google logo rules).
  const resolvedLogo = resolveCompanyLogoUrl({
    logo: job.companies?.logo,
    website: job.companies?.website || job.hiring_organization_url,
    companyName: orgName,
    hiringOrganizationLogo: job.hiring_organization_logo,
  });
  const orgLogo = isSchemaLogoPlaceholder(resolvedLogo) ? undefined : resolvedLogo;

  // Fail-safe: never fabricate unknown optional types. datePosted is required,
  // so it is resolved from date_posted → created_at → posted_date → updated_at.
  // Emitted before description so a huge/messy HTML body cannot hide the field
  // from a partial parser (GSC: "Missing field datePosted").
  // No `identifier`: the only ID CareerSasa holds is its internal UUID, which is
  // not the employer's identifier for the job. Google defines identifier as the
  // hiring organization's unique ID, so emitting our UUID would misrepresent it
  // as employer-provided — omit it entirely.
  const jobData = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    "title": job.title,
    "datePosted": datePosted,
    "validThrough": resolveValidThrough(job),
    "description": job.description || undefined,
    "employmentType": resolveEmploymentTypes(job),
    "hiringOrganization": {
      "@type": "Organization",
      "name": orgName,
      "sameAs": orgWebsite || undefined,
      "logo": orgLogo || undefined,
    },
    "jobLocationType": resolveJobLocationType(job),
    "applicantLocationRequirements": resolveApplicantLocationRequirements(job),
    "jobLocation": resolveJobAddress(job),
    "baseSalary": resolveBaseSalary(job),
    "experienceRequirements": resolveExperienceRequirements(job),
    "educationRequirements": resolveEducationRequirements(job.education_requirements),
    "industry": job.industry || undefined,
    "workHours": job.work_schedule || undefined,
    "responsibilities": job.responsibilities || undefined,
    "qualifications": job.required_qualifications || undefined,
    "benefits": job.additional_info || undefined,
    "directApply": job.direct_apply === true
  };

  const cleanJobData = Object.fromEntries(
    Object.entries(jobData).filter(([_, value]) => value !== undefined)
  );

  if (Object.keys(cleanJobData).length <= 2) return null;
  // Belt-and-suspenders: never emit JobPosting without a string datePosted.
  if (typeof cleanJobData.datePosted !== 'string' || !cleanJobData.datePosted) {
    return null;
  }
  return cleanJobData;
}

export default function JobStructuredData({ job }: JobStructuredDataProps) {
  const cleanJobData = buildJobPostingJsonLd(job);
  if (!cleanJobData) return null;

  // Escape "<" so "</script>" inside job content can never break out of the tag.
  const jsonLd = JSON.stringify(cleanJobData).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd }}
    />
  );
}
