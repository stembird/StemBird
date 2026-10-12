import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Flag } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  GraduationCap,
  Award,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import ScholarshipCard from "@/components/ScholarshipCard";
import ScholarshipDetailsHeader from "@/components/ScholarshipDetailsHeader";
import ScholarshipFacts from "@/components/ScholarshipFacts";
import ScholarshipApplySection from "@/components/ScholarshipApplySection";
import ScholarshipStickyApply from "@/components/ScholarshipStickyApply";
import SocialShare from "@/components/SocialShare";
import ServiceAdvertisement from "@/components/ServiceAdvertisement";
import { AdminEditJobButton } from "@/components/AdminEditJobButton";
import JobViewTracker from "@/components/JobViewTracker";
import { parseTagsInput, MAX_JOB_TAGS } from "@/lib/jobParseNormalization";
import {
  jobCardCompany,
  jobCardDescription,
  queryJobCards,
  queryScholarshipCards,
  type JobCardRow,
} from "@/lib/jobCardSelect";
import { sanitizeScrapedJobHtmlForDisplay } from "@/lib/jobBoardApply";
import { sanitizeStockTipsCopy } from "@/lib/sanitizeStockTipsCopy";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabaseEnv";
import { isUuid, throwIfSupabaseError } from "@/lib/supabaseRead";
import {
  isMissingListingKindColumnError,
  isScholarshipRow,
  jobPath,
  scholarshipPath,
  classifyListingKind,
} from "@/lib/listingKind";
import {
  extractScholarshipFacts,
  mergeScholarshipFacts,
} from "@/lib/scholarshipFacts";
import { resolveValidThrough } from "@/lib/jobStructuredDataMapping";

const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());

const DETAIL_SELECT = `
  *,
  companies (
    id,
    name,
    logo,
    website
  ),
  education_levels (
    id,
    name
  )
`;

async function getScholarshipData(id: string) {
  let { data: job, error } = await supabase
    .from("jobs")
    .select(DETAIL_SELECT)
    .eq("job_slug", id)
    .maybeSingle();

  if (!job && !error && isUuid(id)) {
    ({ data: job, error } = await supabase
      .from("jobs")
      .select(DETAIL_SELECT)
      .eq("id", id)
      .maybeSingle());
  }

  throwIfSupabaseError(error, "Error fetching scholarship");
  return job;
}

function isExpired(validThrough?: string | null): boolean {
  if (!validThrough) return false;
  const deadline = new Date(validThrough);
  if (Number.isNaN(deadline.getTime())) return false;
  return deadline.getTime() < Date.now();
}

async function getRelatedScholarships(
  jobId: string,
  fieldOfStudy?: string | null,
  level?: string | null
) {
  try {
    const { data, error } = await queryScholarshipCards<JobCardRow[]>((select) => {
      let q = (supabase as any)
        .from("jobs")
        .select(select)
        .neq("id", jobId)
        .eq("status", "active")
        .eq("listing_kind", "scholarship")
        .order("date_posted", { ascending: false })
        .limit(8);
      if (fieldOfStudy) q = q.eq("field_of_study", fieldOfStudy);
      else if (level) q = q.eq("scholarship_level", level);
      return q;
    });
    if (error) {
      if (isMissingListingKindColumnError(error)) {
        return relatedViaTitleFallback(jobId);
      }
      throw error;
    }
    const rows = data || [];
    if (rows.length > 0) return rows.slice(0, 6);

    const fallback = await queryScholarshipCards<JobCardRow[]>((select) =>
      (supabase as any)
        .from("jobs")
        .select(select)
        .neq("id", jobId)
        .eq("status", "active")
        .eq("listing_kind", "scholarship")
        .order("date_posted", { ascending: false })
        .limit(6)
    );
    if (fallback.error) {
      if (isMissingListingKindColumnError(fallback.error)) {
        return relatedViaTitleFallback(jobId);
      }
      throw fallback.error;
    }
    return fallback.data || [];
  } catch (error) {
    console.error("Error fetching related scholarships:", error);
    return [];
  }
}

async function relatedViaTitleFallback(jobId: string) {
  const { data, error } = await queryJobCards<JobCardRow[]>((select) =>
    (supabase as any)
      .from("jobs")
      .select(select)
      .neq("id", jobId)
      .eq("status", "active")
      .or("title.ilike.%scholarship%,title.ilike.%bursary%,title.ilike.%scholars %")
      .order("date_posted", { ascending: false })
      .limit(24)
  );
  if (error) throw error;
  return (data || [])
    .filter((row) =>
      classifyListingKind({
        title: row.title,
        tags: typeof row.job_function === "string" ? row.job_function : null,
      }) === "scholarship"
    )
    .slice(0, 6);
}

export const revalidate = 600;

export default async function ScholarshipDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getScholarshipData(id);
  if (!job) return notFound();

  if (!isScholarshipRow(job)) {
    redirect(jobPath(job.job_slug || job.id));
  }

  const extracted = extractScholarshipFacts({
    title: job.title,
    html: [job.description, job.required_qualifications, job.additional_info]
      .filter(Boolean)
      .join("\n"),
  });
  const facts = mergeScholarshipFacts(job, extracted);
  const jobWithFacts = { ...job, ...facts };

  const deadline = resolveValidThrough(job);
  const expired = isExpired(deadline);
  const related = await getRelatedScholarships(
    job.id,
    job.field_of_study,
    facts.scholarship_level
  );
  const hasRelated = related.length > 0;

  const descriptionHtml = sanitizeScrapedJobHtmlForDisplay(job.description);
  const qualificationsRaw =
    typeof job.required_qualifications === "string"
      ? job.required_qualifications
      : job.required_qualifications == null
        ? null
        : String(job.required_qualifications);
  const eligibilityHtml = sanitizeScrapedJobHtmlForDisplay(qualificationsRaw);
  const additionalInfoHtml = sanitizeStockTipsCopy(
    sanitizeScrapedJobHtmlForDisplay(job.additional_info),
    job.title
  );
  const tags = parseTagsInput(job.tags).slice(0, MAX_JOB_TAGS);
  const publicUrl = `https://www.careersasa.co.ke${scholarshipPath(job.job_slug || job.id)}`;

  return (
    <>
      <JobViewTracker jobId={job.id} />
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <Link href="/scholarships" prefetch={true}>
              <Button variant="ghost" className="h-9 px-3">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Scholarships
              </Button>
            </Link>
            <AdminEditJobButton jobId={job.id} variant="page" />
          </div>

          {expired && (
            <div className="mb-4 rounded-md border border-orange-300 bg-orange-50 px-3 py-2.5 text-sm text-orange-800">
              This scholarship has expired.{" "}
              {hasRelated ? (
                <>
                  Browse{" "}
                  <a
                    href="#related-scholarships"
                    className="font-semibold underline underline-offset-2 hover:text-orange-950"
                  >
                    related scholarships
                  </a>{" "}
                  below, or{" "}
                </>
              ) : null}
              <Link
                href="/scholarships"
                prefetch={true}
                className="font-semibold underline underline-offset-2 hover:text-orange-950"
              >
                {hasRelated ? "view all open scholarships" : "browse open scholarships"}
              </Link>
              .
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
            <div className="space-y-4 lg:col-span-2 sm:space-y-5">
              <Card className="overflow-visible border-border sm:overflow-hidden">
                <ScholarshipDetailsHeader job={jobWithFacts} />
                <CardContent className="space-y-4 py-5 sm:space-y-5 sm:py-6">
                  <div>
                    <h3 className="mb-2.5 flex items-center gap-2 text-xl font-semibold text-[#0A66C2] sm:mb-3">
                      <GraduationCap className="h-5 w-5" />
                      About this scholarship
                    </h3>
                    <div
                      className="richtext-content text-muted-foreground leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                    />
                  </div>

                  {eligibilityHtml && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="mb-2.5 flex items-center gap-2 text-xl font-semibold text-[#0A66C2] sm:mb-3">
                          <Award className="h-5 w-5" />
                          Eligibility
                        </h3>
                        <div
                          className="richtext-content text-muted-foreground leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: eligibilityHtml }}
                        />
                      </div>
                    </>
                  )}
                  <Separator />
                </CardContent>
              </Card>

              <ScholarshipFacts job={jobWithFacts} />

              {additionalInfoHtml && (
                <Card className="border-border">
                  <CardHeader className="pb-3 pt-4 sm:pb-4 sm:pt-5">
                    <CardTitle className="flex items-center gap-2 text-lg text-[#0A66C2]">
                      <Lightbulb className="h-5 w-5" />
                      Additional information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 pt-0 sm:pb-5">
                    <div
                      className="richtext-content text-muted-foreground leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: additionalInfoHtml }}
                    />
                  </CardContent>
                </Card>
              )}

              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 sm:p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div className="text-sm leading-relaxed text-amber-900">
                    <strong>CareerSasa Safety Alert:</strong> Never pay anyone for a
                    scholarship application, interview, or placement. Legitimate funders
                    do not charge a fee to apply. Report suspicious listings with Flag.
                  </div>
                </div>
                <div className="mt-2.5 flex justify-end gap-2">
                  <SocialShare
                    url={publicUrl}
                    title={`${job.title} at ${job.companies?.name || job.company || "Funder"} - CareerSasa`}
                    description={job.description?.replace(/<[^>]*>/g, "").substring(0, 160)}
                  />
                  <Button variant="outline" size="sm" className="flex items-center gap-2 whitespace-nowrap">
                    <Flag className="h-4 w-4" />
                    Flag
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4 lg:sticky lg:top-24 lg:h-fit lg:self-start sm:space-y-5">
              <div className="hidden lg:block">
                <ScholarshipApplySection job={job} expired={expired} />
              </div>
              <div className="hidden lg:block">
                <ServiceAdvertisement />
              </div>
              {tags.length > 0 && (
                <Card className="hidden lg:block">
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-base text-[#0A66C2]">Tags</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 pt-0">
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
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

          <div className="mt-4 space-y-4 pb-24 lg:hidden sm:mt-5 sm:space-y-5">
            <ServiceAdvertisement />
            {tags.length > 0 && (
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-base text-[#0A66C2]">Tags</CardTitle>
                </CardHeader>
                <CardContent className="pb-4 pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
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

          <ScholarshipStickyApply job={job} expired={expired} />

          {hasRelated && (
            <div id="related-scholarships" className="mt-8 scroll-mt-24 sm:mt-10">
              <h2 className="mb-4 text-2xl font-bold text-[#0A66C2] sm:mb-5">
                Related scholarships
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 sm:gap-5">
                {related.map((row) => {
                  const company = jobCardCompany(row);
                  return (
                    <ScholarshipCard
                      key={row.id}
                      id={row.id}
                      title={row.title}
                      company={company?.name || row.company}
                      location={row.location || ""}
                      description={jobCardDescription(row)}
                      companyLogo={company?.logo}
                      companyWebsite={company?.website}
                      jobSlug={row.job_slug}
                      datePosted={row.date_posted}
                      validThrough={row.valid_through}
                      locationCity={row.job_location_city}
                      locationCounty={row.job_location_county}
                      isFeatured={row.is_featured}
                      isPromoted={row.is_promoted}
                      promotionTier={row.promotion_tier}
                      scholarshipLevel={row.scholarship_level}
                      scholarshipCoverage={row.scholarship_coverage}
                      fieldOfStudy={row.field_of_study}
                      areaOfStudy={row.area_of_study}
                    />
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-center sm:mt-8">
            <Link href="/scholarships" prefetch={true}>
              <Button
                variant="outline"
                size="lg"
                className="border-2 hover:bg-gradient-primary hover:text-primary-foreground hover:border-transparent transition-all duration-300"
              >
                Browse more scholarships
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
