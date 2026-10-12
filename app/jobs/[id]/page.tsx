import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from '@supabase/supabase-js';
import { Flag } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MapPin, Building2, DollarSign, FileText, Clock, Briefcase, GraduationCap, Award, Code, Globe, AlertTriangle, Target, TrendingUp, Layers, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import JobCard from "@/components/JobCard";
import JobDetailsHeader from "@/components/JobDetailsHeader";
import JobStructuredData from "@/components/JobStructuredData";
import ApplySection from "@/components/ApplySection";
import SocialShare from "@/components/SocialShare";
import ServiceAdvertisement from "@/components/ServiceAdvertisement";
import { AdminEditJobButton } from "@/components/AdminEditJobButton";
import JobViewTracker from "@/components/JobViewTracker";
import CVAdBanner from "@/components/CVAdBanner";
import MobileStickyApply from "@/components/MobileStickyApply";
import {
  dedupeStrings,
  matchToAllowedOptions,
  parseTagsInput,
  MAX_JOB_TAGS,
} from "@/lib/jobParseNormalization";
import { jobCardCompany, jobCardDescription, queryJobCards, type JobCardRow } from "@/lib/jobCardSelect";
import { getLookupOptions } from "@/lib/jobParsingOptimized";
import { sanitizeScrapedJobHtmlForDisplay } from "@/lib/jobBoardApply";
import { sanitizeStockTipsCopy } from "@/lib/sanitizeStockTipsCopy";
import { resolveJobSalaryDisplay } from "@/lib/kenyanSalaryEstimate";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabaseEnv";
import { isUuid, throwIfSupabaseError } from "@/lib/supabaseRead";
import { resolveValidThrough } from "@/lib/jobStructuredDataMapping";
import { isScholarshipRow, scholarshipPath } from "@/lib/listingKind";

function getDisplayLabels(values: string[] | null | undefined, fallback?: string | null): string[] {
  return dedupeStrings(values?.length ? values : fallback ? [fallback] : []);
}

/** First catalog-matched label for UI; non-catalog / extras stay for search only. */
function getPrimaryCatalogLabel(
  values: string[] | null | undefined,
  fallback: string | null | undefined,
  catalog: string[],
): string | null {
  const candidates = getDisplayLabels(values, fallback);
  return matchToAllowedOptions(candidates, catalog)[0] ?? null;
}

function getDisplayTags(tags: string | string[] | null | undefined): string[] {
  return parseTagsInput(tags).slice(0, MAX_JOB_TAGS);
}

// Server-side Supabase client (shared URL/anon fallbacks).
const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());

// Server-side data fetching
async function getJobData(id: string) {
  // Full row is required for the job detail body (HTML, qualifications, etc.).
  // List/related/homepage queries must keep using queryJobCards() instead.
  let { data: job, error } = await supabase
    .from("jobs")
    .select(`
      *,
      companies (
        id,
        name,
        logo,
        website,
        location
      ),
      education_levels (
        id,
        name
      )
    `)
    .eq("job_slug", id)
    .maybeSingle();

  // If not found by slug, try by ID (uuid column — skip non-UUID paths)
  if (!job && !error && isUuid(id)) {
    ({ data: job, error } = await supabase
      .from("jobs")
      .select(`
        *,
        companies (
          id,
          name,
          logo,
          website,
          location
        ),
        education_levels (
          id,
          name
        )
      `)
      .eq("id", id)
      .maybeSingle());
  }

  throwIfSupabaseError(error, "Error fetching job");
  return job;
}

function isJobExpiredFromDeadline(validThrough?: string | null): boolean {
  if (!validThrough) return false;
  const deadline = new Date(validThrough);
  if (Number.isNaN(deadline.getTime())) return false;
  return deadline.getTime() < Date.now();
}

function isJobLive(job: {
  valid_through?: string | null
  date_posted?: string | null
  created_at?: string | null
}): boolean {
  return !isJobExpiredFromDeadline(resolveValidThrough(job));
}

async function getRelatedJobs(jobId: string, industries?: string[], jobFunctions?: string[]) {
  const rankRelated = (jobs: JobCardRow[]) => {
    const live = jobs.filter(isJobLive);
    const expired = jobs.filter((j) => !isJobLive(j));
    return [...live, ...expired].slice(0, 6);
  };

  try {
    const hasIndustries = Boolean(industries && industries.length > 0);
    const hasFunctions = Boolean(jobFunctions && jobFunctions.length > 0);

    const queries: Promise<JobCardRow[]>[] = [];

    if (hasIndustries) {
      queries.push(
        queryJobCards<JobCardRow[]>((select) =>
          (supabase as any)
            .from("jobs")
            .select(select)
            .neq("id", jobId)
            .eq("status", "active")
            .eq("listing_kind", "job")
            .overlaps("industries", industries!)
            .order("date_posted", { ascending: false })
            .limit(8)
        ).then(({ data, error }) => {
          if (error) throw error;
          return data || [];
        })
      );
    }
    if (hasFunctions) {
      queries.push(
        queryJobCards<JobCardRow[]>((select) =>
          (supabase as any)
            .from("jobs")
            .select(select)
            .neq("id", jobId)
            .eq("status", "active")
            .eq("listing_kind", "job")
            .overlaps("job_functions", jobFunctions!)
            .order("date_posted", { ascending: false })
            .limit(8)
        ).then(({ data, error }) => {
          if (error) throw error;
          return data || [];
        })
      );
    }

    const results = queries.length > 0 ? await Promise.all(queries) : [];

    const seen = new Set<string>();
    const merged: JobCardRow[] = [];
    for (const rows of results) {
      for (const row of rows) {
        if (!row?.id || seen.has(row.id)) continue;
        seen.add(row.id);
        merged.push(row);
      }
    }

    if (merged.length > 0) {
      return rankRelated(merged);
    }

    const { data: fallback, error: fallbackError } = await queryJobCards<JobCardRow[]>(
      (select) =>
        (supabase as any)
          .from("jobs")
          .select(select)
          .neq("id", jobId)
          .eq("status", "active")
          .eq("listing_kind", "job")
          .order("date_posted", { ascending: false })
          .limit(6)
    );

    if (fallbackError) throw fallbackError;
    return rankRelated(fallback || []);
  } catch (error) {
    console.error("Error fetching related jobs:", error);
    return [];
  }
}

export const revalidate = 600;

// Metadata (including og:image) lives in layout.tsx via generateJobMetadata.
// Do not export generateMetadata here — Next.js replaces nested openGraph/twitter
// from the page over the layout, which previously wiped the job OG image.

// Main page component
export default async function JobDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Fetch job data on the server
  const job = await getJobData(id);

  // Only a missing row is a 404. Query/outage errors throw (HTTP 5xx) so
  // Google retries instead of treating the listing as deleted.
  if (!job) {
    return notFound();
  }

  if (isScholarshipRow(job)) {
    redirect(scholarshipPath(job.job_slug || job.id));
  }
  
  // Fetch related jobs (use full arrays so extras still power search/overlap)
  const relatedJobs = await getRelatedJobs(
    job.id,
    job.industries?.length > 0 ? job.industries : job.industry ? [job.industry] : [],
    job.job_functions?.length > 0 ? job.job_functions : job.job_function ? [job.job_function] : []
  );

  const { industries: industryCatalog, jobFunctions: functionCatalog } =
    await getLookupOptions();
  const primaryIndustry = getPrimaryCatalogLabel(
    job.industries,
    job.industry,
    industryCatalog,
  );
  const primaryJobFunction = getPrimaryCatalogLabel(
    job.job_functions,
    job.job_function,
    functionCatalog,
  );
  const jobExpired = isJobExpiredFromDeadline(resolveValidThrough(job));
  const hasRelatedJobs = relatedJobs && relatedJobs.length > 0;

  // Only fix relative MyJobMag /apply-now/ anchors (404 on CareerSasa).
  // Do not substitute apply_link / application_url into body HTML.
  const descriptionHtml = sanitizeScrapedJobHtmlForDisplay(job.description);
  const responsibilitiesHtml = sanitizeScrapedJobHtmlForDisplay(job.responsibilities);
  const qualificationsHtml = sanitizeScrapedJobHtmlForDisplay(
    typeof job.required_qualifications === "string"
      ? job.required_qualifications
      : job.required_qualifications == null
        ? null
        : String(job.required_qualifications)
  );
  const softwareSkillsHtml = sanitizeScrapedJobHtmlForDisplay(job.software_skills);
  const additionalInfoHtml = sanitizeStockTipsCopy(
    sanitizeScrapedJobHtmlForDisplay(job.additional_info),
    job.title
  );
  
  return (
    <>
      <JobStructuredData job={job} />
      <JobViewTracker jobId={job.id} />
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <Link href="/jobs" prefetch={true}>
              <Button variant="ghost" className="h-9 px-3">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Jobs
              </Button>
            </Link>
            <AdminEditJobButton jobId={job.id} variant="page" />
          </div>

          {jobExpired && (
            <div className="mb-4 rounded-md border border-orange-300 bg-orange-50 px-3 py-2.5 text-sm text-orange-800">
              This job has expired.{" "}
              {hasRelatedJobs ? (
                <>
                  Browse{" "}
                  <a
                    href="#related-opportunities"
                    className="font-semibold underline underline-offset-2 hover:text-orange-950"
                  >
                    related opportunities
                  </a>{" "}
                  below, or{" "}
                </>
              ) : null}
              <Link
                href="/jobs"
                prefetch={true}
                className="font-semibold underline underline-offset-2 hover:text-orange-950"
              >
                {hasRelatedJobs ? "view all open jobs" : "browse open jobs"}
              </Link>
              .
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
            {/* Main Content */}
            <div className="space-y-4 lg:col-span-2 sm:space-y-5">
              <Card className="overflow-visible border-border sm:overflow-hidden">
                <JobDetailsHeader
                  job={job}
                  industryLabels={primaryIndustry ? [primaryIndustry] : []}
                  functionLabels={primaryJobFunction ? [primaryJobFunction] : []}
                />
                
                <CardContent className="space-y-4 py-5 sm:space-y-5 sm:py-6">
                  {/* CV Builder promo — shown before description */}
                  <CVAdBanner jobId={job.id} />

                  <div>
                    <h3 className="mb-2.5 flex items-center gap-2 text-xl font-semibold text-[#0A66C2] sm:mb-3">
                      <Briefcase className="h-5 w-5" />
                      Job Description
                    </h3>
                    <div className="richtext-content text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
                  </div>

                  {responsibilitiesHtml && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="mb-2.5 flex items-center gap-2 text-xl font-semibold text-[#0A66C2] sm:mb-3">
                          <FileText className="h-5 w-5" />
                          Key Responsibilities
                        </h3>
                        <div className="richtext-content text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: responsibilitiesHtml }} />
                      </div>
                    </>
                  )}

                  {qualificationsHtml && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="mb-2.5 flex items-center gap-2 text-xl font-semibold text-[#0A66C2] sm:mb-3">
                          <Award className="h-5 w-5" />
                          Required Qualifications
                        </h3>
                        <div className="richtext-content text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: qualificationsHtml }} />
                      </div>
                    </>
                  )}

                  {softwareSkillsHtml && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="mb-2.5 flex items-center gap-2 text-xl font-semibold text-[#0A66C2] sm:mb-3">
                          <Code className="h-5 w-5" />
                          Required Skills & Software
                        </h3>
                        <div className="richtext-content text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: softwareSkillsHtml }} />
                      </div>
                    </>
                  )}

                  <Separator />
                </CardContent>
              </Card>
              
              {/* Job Details Section - Moved to main content area */}
              <RoleDetails job={job} primaryJobFunction={primaryJobFunction} />
              
              {/* Additional Info Section */}
              {additionalInfoHtml && (
                <Card className="border-border">
                  <CardHeader className="pb-3 pt-4 sm:pb-4 sm:pt-5">
                    <CardTitle className="flex items-center gap-2 text-lg text-[#0A66C2]">
                      <Lightbulb className="h-5 w-5" />
                      Additional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 pt-0 sm:pb-5">
                    <div className="richtext-content text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: additionalInfoHtml }} />
                  </CardContent>
                </Card>
              )}
              
              {/* Safety Alert + Share & Report Job */}
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 sm:p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div className="text-sm leading-relaxed text-amber-900">
                    <strong>CareerSasa Safety Alert:</strong> Never pay employers or agencies for interviews, training, or job placement. Does a job request payment? Report it immediately using the "Flag" button. While CareerSasa vets job postings thoroughly, always verify opportunities independently.
                  </div>
                </div>
                <div className="mt-2.5 flex justify-end gap-2">
                  <SocialShare 
                    url={`https://www.careersasa.co.ke/jobs/${job.job_slug || job.id}`}
                    title={`${job.title} at ${job.companies?.name || job.company || 'Company'} - CareerSasa`}
                    description={job.description?.replace(/<[^>]*>/g, '').substring(0, 160)}
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    <Flag className="h-4 w-4" />
                    Flag
                  </Button>
                </div>
              </div>
            </div>

            {/* Sidebar - Made sticky for desktop */}
            <div className="space-y-4 lg:sticky lg:top-24 lg:h-fit lg:self-start sm:space-y-5">
              {/* Apply Here section - only visible on desktop */}
              <div className="hidden lg:block">
                <ApplySection job={job} expired={jobExpired} />
              </div>

              {/* Service Advertisement - only visible on desktop */}
              <div className="hidden lg:block">
                <ServiceAdvertisement />
              </div>

              {/* Tags section - only visible on desktop */}
              {job?.tags && (
                <Card className="hidden lg:block">
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-base text-[#0A66C2]">Tags</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 pt-0">
                    <div className="flex flex-wrap gap-1.5">
                      {getDisplayTags(job.tags).map((tag: string) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="px-2 py-0 text-[11px] font-medium leading-5"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Mobile sidebar content — Apply opens via sticky bar + sheet */}
          <div className="mt-4 space-y-4 pb-24 lg:hidden sm:mt-5 sm:space-y-5">
            {/* Service Advertisement for mobile */}
            <ServiceAdvertisement />
            
            {/* Tags section for mobile */}
            {job?.tags && (
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-base text-[#0A66C2]">Tags</CardTitle>
                </CardHeader>
                <CardContent className="pb-4 pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {getDisplayTags(job.tags).map((tag: string) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="px-2 py-0 text-[11px] font-medium leading-5"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <MobileStickyApply job={job} expired={jobExpired} />

          {/* Related Opportunities Section */}
          {hasRelatedJobs && (
            <div id="related-opportunities" className="mt-8 scroll-mt-24 sm:mt-10">
              <h2 className="mb-4 text-2xl font-bold text-[#0A66C2] sm:mb-5">Related Opportunities</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 sm:gap-5">
                {relatedJobs.slice(0, 6).map((relatedJob: JobCardRow) => {
                  const company = jobCardCompany(relatedJob);
                  return (
                  <JobCard
                    key={relatedJob.id}
                    id={relatedJob.id}
                    title={relatedJob.title}
                    company={company?.name || relatedJob.company}
                    location={relatedJob.location || ""}
                    locationCity={relatedJob.job_location_city}
                    locationCounty={relatedJob.job_location_county}
                    description={jobCardDescription(relatedJob)}
                    salary={relatedJob.salary || undefined}
                    companyId={relatedJob.company_id}
                    companyLogo={company?.logo}
                    companyWebsite={company?.website}
                    industry={relatedJob.industry}
                    locationType={relatedJob.job_location_type}
                    employmentType={relatedJob.employment_type}
                    salaryMin={relatedJob.salary_min}
                    salaryMax={relatedJob.salary_max}
                    salaryCurrency={relatedJob.salary_currency}
                    salaryPeriod={relatedJob.salary_period}
                    salaryIsEstimated={relatedJob.salary_is_estimated}
                    salaryVisibility={relatedJob.salary_visibility}
                    experienceLevel={relatedJob.experience_level}
                    datePosted={relatedJob.date_posted}
                    validThrough={relatedJob.valid_through}
                    applicationUrl={relatedJob.application_url}
                    applyEmail={relatedJob.apply_email}
                    applyLink={relatedJob.apply_link}
                    skillsTop3={undefined}
                    department={relatedJob.job_function}
                    jobSlug={relatedJob.job_slug}
                    educationLevel=""
                    locationCountry={relatedJob.job_location_country}
                  />
                  );
                })}
              </div>
            </div>
          )}
          <div className="mt-6 flex justify-center sm:mt-8">
            <Link href="/jobs" prefetch={true}>
              <Button variant="outline" size="lg" className="border-2 hover:bg-gradient-primary hover:text-primary-foreground hover:border-transparent transition-all duration-300">
                Browse More Opportunities
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

const RoleDetails = ({
  job,
  primaryJobFunction,
}: {
  job: any;
  primaryJobFunction?: string | null;
}) => {
  const salaryResolved = resolveJobSalaryDisplay({
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
    salary: job.salary,
    salaryCurrency: job.salary_currency,
    salaryPeriod: job.salary_period,
    salaryIsEstimated: job.salary_is_estimated,
    salaryVisibility: job.salary_visibility,
    title: job.title,
    experienceLevel: job.experience_level,
    locationCountry: job.job_location_country || "Kenya",
  });

  // Group job details into categories for better organization
  const salaryDetails = [
    salaryResolved.display !== "Negotiable"
      ? {
          icon: <DollarSign className="h-5 w-5 text-secondary mt-0.5" />,
          label: salaryResolved.isEstimated ? "Estimated Salary Range" : "Salary Range",
          value: salaryResolved.display.replace(/^Est\.\s*/, ""),
          subtext: salaryResolved.isEstimated
            ? "Based on Kenyan market rates for similar roles"
            : "",
        }
      : null,
    job.salary_type ? {
      icon: <DollarSign className="h-5 w-5 text-secondary mt-0.5" />,
      label: "Salary Type",
      value: job.salary_type
    } : null
  ].filter(Boolean);

  const jobDetails = [
    job.specialization ? {
      icon: <Lightbulb className="h-5 w-5 text-primary mt-0.5" />,
      label: "Specialization",
      value: job.specialization
    } : null,
    primaryJobFunction ? {
      icon: <Target className="h-5 w-5 text-primary mt-0.5" />,
      label: "Job Function",
      value: primaryJobFunction
    } : null,
    job.work_schedule ? {
      icon: <Clock className="h-5 w-5 text-primary mt-0.5" />,
      label: "Work Schedule",
      value: job.work_schedule
    } : null,
    job.minimum_experience ? {
      icon: <TrendingUp className="h-5 w-5 text-primary mt-0.5" />,
      label: "Minimum Experience",
      value: `${job.minimum_experience} years`
    } : null
  ].filter(Boolean);

  const requirements = [
    job.education_levels?.name ? {
      icon: <GraduationCap className="h-5 w-5 text-primary mt-0.5" />,
      label: "Education Level",
      value: job.education_levels.name
    } : null,
    job.area_of_study ? {
      icon: <GraduationCap className="h-5 w-5 text-primary mt-0.5" />,
      label: "Area of Study",
      value: job.area_of_study
    } : null,
    job.field_of_study ? {
      icon: <GraduationCap className="h-5 w-5 text-primary mt-0.5" />,
      label: "Field of Study",
      value: job.field_of_study
    } : null,
    job.license_requirements ? {
      icon: <Award className="h-5 w-5 text-primary mt-0.5" />,
      label: "License Required",
      value: job.license_requirements
    } : null,
    job.language_requirements ? {
      icon: <Globe className="h-5 w-5 text-primary mt-0.5" />,
      label: "Languages",
      value: job.language_requirements
    } : null
  ].filter(Boolean);

  const additionalDetails = [
    job.additional_locations?.length > 0 ? {
      icon: <MapPin className="h-5 w-5 text-primary mt-0.5" />,
      label: "Other Locations",
      value: job.additional_locations.map((loc: any) => [loc.city, loc.county].filter(Boolean).join(', ')).join('; ')
    } : null,
    job.practice_area ? {
      icon: <Layers className="h-5 w-5 text-primary mt-0.5" />,
      label: "Practice Area",
      value: job.practice_area
    } : null,
    job.project_type ? {
      icon: <Building2 className="h-5 w-5 text-primary mt-0.5" />,
      label: "Project Type",
      value: job.project_type
    } : null,
    job.visa_sponsorship && job.visa_sponsorship !== "Not Applicable" ? {
      icon: <Globe className="h-5 w-5 text-primary mt-0.5" />,
      label: "Visa Sponsorship",
      value: job.visa_sponsorship
    } : null,
    job.is_featured ? {
      icon: <Award className="h-5 w-5 text-yellow-500 mt-0.5" />,
      label: "Featured Job",
      value: "Yes"
    } : null
  ].filter(Boolean);

  // Helper function to render detail items
  const renderDetailItem = (item: any) => (
    <div className="flex items-start gap-3">
      {item.icon}
      <div>
        <p className="text-sm font-medium" style={{ color: '#0b66c3' }}>{item.label}</p>
        <p className={`font-medium ${item.label === 'Featured Job' ? 'text-yellow-600' : ''}`}>
          {item.value}
          {item.subtext && <span className="text-sm text-muted-foreground ml-1">{item.subtext}</span>}
        </p>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3 pt-4 sm:pb-4 sm:pt-5">
        <CardTitle className="text-lg text-[#0A66C2]">Job Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-4 pt-0 sm:space-y-5 sm:pb-5">
        {salaryDetails.length > 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 sm:gap-4">
            {salaryDetails.map((item, index) => <div key={index}>{renderDetailItem(item)}</div>)}
          </div>
        )}

        {jobDetails.length > 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 sm:gap-4">
            {jobDetails.map((item, index) => <div key={index}>{renderDetailItem(item)}</div>)}
          </div>
        )}

        {requirements.length > 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 sm:gap-4">
            {requirements.map((item, index) => <div key={index}>{renderDetailItem(item)}</div>)}
          </div>
        )}

        {additionalDetails.length > 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 sm:gap-4">
            {additionalDetails.map((item, index) => <div key={index}>{renderDetailItem(item)}</div>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
};