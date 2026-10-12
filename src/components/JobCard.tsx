"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  DollarSign,
  FileText,
  Clock,
  CalendarDays,
  Star,
  TrendingUp,
} from "lucide-react";
import {
  stripHtmlTags,
  formatJobSeoTitle,
  buildLocationString,
  jobPostedLabel,
} from "@/lib/textUtils";
import { SaveJobButton } from "@/components/SaveJobButton";
import { AdminEditJobButton } from "@/components/AdminEditJobButton";
import { CompanyLogo } from "@/components/CompanyLogo";
import { resolveJobSalaryDisplay } from "@/lib/kenyanSalaryEstimate";

interface JobCardProps {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  // Legacy combined salary text (optional)
  salary?: string;
  companyId?: string | null;
  companyLogo?: string | null;
  companyWebsite?: string | null;
  // New optional fields for richer display
  industry?: string | null;
  locationType?: string | null; // e.g., REMOTE, HYBRID, ONSITE
  employmentType?: string | null; // e.g., FULL_TIME
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null; // e.g., KES
  salaryPeriod?: string | null; // e.g., MONTH
  salaryIsEstimated?: boolean | null;
  salaryVisibility?: string | null; // 'Show' | 'Hide' — employer opt-out
  experienceLevel?: string | null; // e.g., MID, SENIOR
  datePosted?: string | null; // ISO string
  validThrough?: string | null; // ISO string (deadline)
  applicationUrl?: string | null;
  applyEmail?: string | null;
  applyLink?: string | null;
  skillsTop3?: string[] | null; // optional: top 3 skills
  department?: string | null;
  jobSlug?: string | null; // SEO-friendly slug
  educationLevel?: string | null; // Education level name
  locationCity?: string | null;
  locationCounty?: string | null;
  locationCountry?: string | null;
  // Featured/Promoted status
  isFeatured?: boolean | null;
  isPromoted?: boolean | null;
  promotionTier?: string | null;
}

const toTitleCase = (text?: string | null) => {
  if (!text) return null;
  return text
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
};

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

const JobCard = ({
  id,
  title,
  company,
  location,
  description,
  salary,
  companyId,
  companyLogo,
  companyWebsite,
  industry,
  locationType,
  employmentType,
  locationCity,
  locationCounty,
  locationCountry,
  salaryMin,
  salaryMax,
  salaryCurrency,
  salaryPeriod,
  salaryIsEstimated,
  salaryVisibility,
  experienceLevel,
  datePosted,
  validThrough,
  skillsTop3,
  department,
  jobSlug,
  isFeatured,
  isPromoted,
  promotionTier,
}: JobCardProps) => {
  const isRemote = locationType === "REMOTE";
  const locationLabel = isRemote
    ? "Remote (Kenya)"
    : buildLocationString(locationCity, locationCounty, location) || location || "Kenya";

  // SEO string for tooltip / assistive text; visible title stays clean
  const seoTitle = formatJobSeoTitle(title, company, {
    city: locationCity,
    county: locationCounty,
    rawLocation: location,
    isRemote,
  });

  const { display: salaryDisplay } = resolveJobSalaryDisplay({
    salaryMin,
    salaryMax,
    salary,
    salaryCurrency,
    salaryPeriod,
    salaryIsEstimated,
    salaryVisibility,
    title,
    experienceLevel,
    locationCountry: locationCountry || "Kenya",
  });

  const experienceDisplay = experienceLevel
    ? toTitleCase(experienceLevel)?.replace("Mid", "Mid-level")?.replace("Entry", "Entry-level")
    : null;

  const postedValue = jobPostedLabel(datePosted) || formatDeadlineDate(datePosted);
  const deadlineValue = formatDeadlineDate(validThrough);
  const deadline = validThrough ? new Date(validThrough) : null;
  const isExpired = deadline ? deadline.getTime() < Date.now() : false;

  const jobUrl = jobSlug ? `/jobs/${jobSlug}` : `/jobs/${id}`;

  const metaTags = [
    employmentType
      ? { key: "emp", label: toTitleCase(employmentType) || employmentType }
      : null,
    locationType ? { key: "loc", label: toTitleCase(locationType) || locationType } : null,
    experienceDisplay ? { key: "exp", label: experienceDisplay } : null,
    industry ? { key: "ind", label: industry } : null,
    department ? { key: "fn", label: department } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <Link href={jobUrl} className="block h-full" prefetch={true}>
      <Card
        className={`group h-full overflow-hidden border-border/50 transition-all duration-300 hover:border-primary/50 hover:shadow-xl ${
          isFeatured ? "border-2 border-yellow-500/50 shadow-lg" : ""
        } ${isPromoted ? "border-2 border-blue-500/50" : ""}`}
      >
        <CardHeader className="space-y-0 p-4 pb-3 sm:p-6 sm:pb-3">
          {(isFeatured || isPromoted) && (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {isFeatured && (
                <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
                  <Star className="h-3 w-3 fill-white" />
                  Featured
                </Badge>
              )}
              {isPromoted && (
                <Badge className="gap-1 bg-sky-600 text-white hover:bg-sky-600">
                  <TrendingUp className="h-3 w-3" />
                  Promoted{promotionTier ? ` · ${promotionTier}` : ""}
                </Badge>
              )}
            </div>
          )}

          {/* Mobile: title full-width left; logo drops beside company name.
              sm+: logo left of title+company (unchanged desktop layout). */}
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <div className="col-start-1 row-start-2 shrink-0 self-center rounded-xl border border-border/70 bg-card p-1 shadow-sm sm:row-span-2 sm:row-start-1 sm:self-start">
              {company ? (
                <CompanyLogo
                  name={company}
                  logo={companyLogo}
                  website={companyWebsite}
                  size="md"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <FileText className="h-5 w-5" />
                </div>
              )}
            </div>

            <h3
              className="col-span-2 col-start-1 row-start-1 min-w-0 text-lg font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-[#0A66C2] group-active:text-[#0A66C2] sm:col-span-1 sm:col-start-2 sm:text-xl"
              title={seoTitle}
            >
              {title}
            </h3>

            <div className="col-start-2 row-start-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
              <span className="truncate font-medium text-foreground">
                {company || "Direct Listing"}
              </span>
              {locationLabel && (
                <>
                  <span className="text-muted-foreground/35" aria-hidden>
                    ·
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate">{locationLabel}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          <p className="sr-only">{seoTitle}</p>

          {(postedValue || deadlineValue) && (
            <div className="mt-2.5 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
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
                    <p
                      className={`font-medium ${
                        isExpired ? "text-destructive" : "text-foreground/75"
                      }`}
                    >
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
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {metaTags.map((tag) => (
                <Badge
                  key={tag.key}
                  variant="outline"
                  className="rounded-md border-border/80 bg-background/80 px-2 py-0.5 text-xs font-medium text-foreground"
                >
                  {tag.label}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-2.5 flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-success" />
            <span className="text-sm font-semibold text-foreground">{salaryDisplay}</span>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
          <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground sm:mb-4 sm:line-clamp-3">
            {stripHtmlTags(description || "")}
          </p>

          {skillsTop3 && skillsTop3.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5 sm:mb-4">
              {skillsTop3.slice(0, 3).map((skill, idx) => (
                <Badge key={idx} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" className="flex-1">
              View Details
            </Button>
            <AdminEditJobButton jobId={id} variant="card" />
            <SaveJobButton
              jobId={id}
              variant="outline"
              size="default"
              showText={false}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default JobCard;
