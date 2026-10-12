import Link from "next/link";
import { CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  FileText,
  Clock,
  CalendarDays,
  Star,
  TrendingUp,
  Target,
} from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { SaveJobButton } from "@/components/SaveJobButton";
import {
  formatJobSeoTitle,
  buildLocationString,
  jobPostedLabel,
} from "@/lib/textUtils";
import { resolveEmploymentTypes, resolveValidThrough } from "@/lib/jobStructuredDataMapping";

type JobDetailsHeaderProps = {
  job: {
    id: string;
    title: string;
    company: string | null;
    location: string | null;
    valid_through?: string | null;
    expires_at?: string | null;
    application_deadline?: string | null;
    date_posted?: string | null;
    created_at?: string | null;
    posted_date?: string | null;
    updated_at?: string | null;
    is_featured?: boolean | null;
    is_promoted?: boolean | null;
    promotion_tier?: string | null;
    experience_level?: string | null;
    employment_type?: string | null;
    employment_types?: string[] | null;
    job_location_type?: string | null;
    job_location_types?: string[] | null;
    job_location_city?: string | null;
    job_location_county?: string | null;
    industry?: string | null;
    industries?: string[] | null;
    job_function?: string | null;
    job_functions?: string[] | null;
    area_of_study?: string | null;
    field_of_study?: string | null;
    hiring_organization_logo?: string | null;
    hiring_organization_url?: string | null;
    company_id?: string | null;
    companies?: {
      id: string;
      name: string;
      logo?: string | null;
      website?: string | null;
    } | null;
  };
  industryLabels: string[];
  functionLabels: string[];
};

function formatEnumLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDeadlineDate(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
  };
  if (date.getFullYear() !== new Date().getFullYear()) {
    opts.year = "numeric";
  }
  return date.toLocaleDateString("en-KE", opts);
}

export default function JobDetailsHeader({
  job,
  industryLabels,
  functionLabels,
}: JobDetailsHeaderProps) {
  const companyName = job.companies?.name || job.company || "Direct Listing";
  const isRemote =
    job.job_location_type === "REMOTE" ||
    job.job_location_types?.includes("REMOTE");

  const displayLocation = isRemote
    ? "Remote (Kenya)"
    : buildLocationString(
        job.job_location_city,
        job.job_location_county,
        job.location,
      ) || job.location || "Kenya";

  const seoTitle = formatJobSeoTitle(job.title, companyName === "Direct Listing" ? null : companyName, {
    city: job.job_location_city,
    county: job.job_location_county,
    rawLocation: job.location,
    isRemote: !!isRemote,
  });

  const postedAt = job.date_posted || job.created_at;
  const postedRel = jobPostedLabel(postedAt);
  const postedValue =
    postedRel ||
    (postedAt ? formatDeadlineDate(postedAt) : null);
  const validThrough = resolveValidThrough(job);
  const deadlineValue = formatDeadlineDate(validThrough);
  const deadlineDate = validThrough ? new Date(validThrough) : null;
  const isExpired = deadlineDate ? deadlineDate.getTime() < Date.now() : false;

  const resolvedEmployment = resolveEmploymentTypes(job);
  const employmentTypes = resolvedEmployment
    ? Array.isArray(resolvedEmployment)
      ? resolvedEmployment
      : [resolvedEmployment]
    : ["FULL_TIME"];

  const locationTypes =
    job.job_location_types?.length
      ? job.job_location_types
      : job.job_location_type
        ? [job.job_location_type]
        : [];

  // Show at most one industry + one job function (catalog-validated by caller)
  const primaryIndustry = industryLabels[0] || null;
  const primaryFunction = functionLabels[0] || null;

  const metaTags = [
    ...employmentTypes.map((type) => ({
      key: `emp-${type}`,
      label: formatEnumLabel(type),
    })),
    ...locationTypes.map((type) => ({
      key: `loc-${type}`,
      label: formatEnumLabel(type),
    })),
    ...(job.experience_level
      ? [{ key: `exp-${job.experience_level}`, label: job.experience_level }]
      : []),
    ...(primaryIndustry
      ? [{ key: `ind-${primaryIndustry}`, label: primaryIndustry }]
      : []),
    ...(primaryFunction
      ? [{ key: `fn-${primaryFunction}`, label: primaryFunction }]
      : []),
  ];

  return (
    <CardHeader className="space-y-0 border-b bg-gradient-to-br from-muted/50 via-background to-background p-4 sm:p-5">
      {/* Screen-reader / SEO continuity for the long-form title */}
      <p className="sr-only">{seoTitle}</p>

      {(job.is_featured || job.is_promoted) && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {job.is_featured && (
            <Badge className="gap-1 bg-amber-500 px-2.5 py-1 text-white hover:bg-amber-500">
              <Star className="h-3.5 w-3.5 fill-white" />
              Featured
            </Badge>
          )}
          {job.is_promoted && (
            <Badge className="gap-1 bg-sky-600 px-2.5 py-1 text-white hover:bg-sky-600">
              <TrendingUp className="h-3.5 w-3.5" />
              Promoted{job.promotion_tier ? ` · ${job.promotion_tier}` : ""}
            </Badge>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-3 sm:gap-4">
        {/* Mobile: title full-width left; logo drops beside company name.
            sm+: logo left of title+company (unchanged desktop layout). */}
        <div className="grid min-w-0 flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 sm:gap-x-3.5">
          <div className="col-start-1 row-start-2 shrink-0 self-center rounded-xl border border-border/70 bg-card p-1 shadow-sm sm:row-span-2 sm:row-start-1 sm:self-start">
            {job.company_id && job.companies ? (
              <CompanyLogo
                name={job.companies.name}
                logo={job.companies.logo}
                website={job.companies.website}
                size="lg"
              />
            ) : job.company ? (
              <CompanyLogo
                name={job.company}
                logo={job.hiring_organization_logo}
                website={job.hiring_organization_url}
                size="lg"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <FileText className="h-6 w-6" />
              </div>
            )}
          </div>

          <h1 className="col-span-2 col-start-1 row-start-1 min-w-0 text-2xl font-bold leading-tight tracking-tight text-[#0A66C2] sm:col-span-1 sm:col-start-2 sm:text-3xl">
            {job.title}
          </h1>

          <div className="col-start-2 row-start-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm sm:text-[15px]">
            {job.company_id && job.companies ? (
              <Link
                href={`/companies/${job.company_id}`}
                className="font-medium text-foreground transition-colors hover:text-[#0A66C2]"
              >
                {job.companies.name}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-2 font-medium text-foreground">
                {companyName}
                {!job.company && (
                  <Badge variant="outline" className="text-xs font-normal">
                    Direct Listing
                  </Badge>
                )}
              </span>
            )}

            {displayLocation && (
              <>
                <span className="text-muted-foreground/35" aria-hidden>
                  ·
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{displayLocation}</span>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button asChild variant="outline" size="icon" className="sm:hidden">
            <Link
              href={`/dashboard/career-tools?jobId=${encodeURIComponent(job.id)}`}
              aria-label="Target a Career Tools CV for this job"
            >
              <Target className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="default" className="hidden sm:inline-flex">
            <Link href={`/dashboard/career-tools?jobId=${encodeURIComponent(job.id)}`}>
              <Target className="h-4 w-4 mr-1.5" />
              Target CV
            </Link>
          </Button>
          <SaveJobButton
            jobId={job.id}
            variant="outline"
            size="icon"
            showText={false}
            className="sm:hidden"
          />
          <SaveJobButton
            jobId={job.id}
            variant="outline"
            size="default"
            showText={true}
            className="hidden sm:inline-flex"
          />
        </div>
      </div>

      {/* Posted + Apply by side by side; value stacks under each label */}
      {(postedValue || deadlineValue) && (
        <div className="mt-2.5 grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:mt-3 sm:max-w-md sm:text-sm">
          {postedValue && (
            <div className="flex min-w-0 items-start gap-1.5">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
              <div className="min-w-0 leading-snug">
                <p className="font-medium text-foreground/75">Posted</p>
                <p className="truncate">{postedValue}</p>
              </div>
            </div>
          )}

          {deadlineValue && (
            <div
              className={`flex min-w-0 items-start gap-1.5 ${
                isExpired ? "text-destructive" : ""
              }`}
            >
              <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
              <div className="min-w-0 leading-snug">
                <p className={`font-medium ${isExpired ? "text-destructive" : "text-foreground/75"}`}>
                  Apply by
                </p>
                <p className={`truncate ${isExpired ? "font-medium" : ""}`}>
                  {isExpired ? "Closed" : deadlineValue}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {metaTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-3 sm:mt-3.5 sm:gap-2">
          {metaTags.map((tag) => (
            <Badge
              key={tag.key}
              variant="outline"
              className="rounded-md border-border/80 bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground"
            >
              {tag.label}
            </Badge>
          ))}
        </div>
      )}
    </CardHeader>
  );
}
