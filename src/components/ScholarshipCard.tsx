"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, CalendarDays, Star, TrendingUp, GraduationCap } from "lucide-react";
import { buildLocationString, jobPostedLabel } from "@/lib/textUtils";
import { CompanyLogo } from "@/components/CompanyLogo";
import { scholarshipPath } from "@/lib/listingKind";
import {
  scholarshipCoverageLabel,
  scholarshipLevelLabel,
} from "@/lib/scholarshipFacts";

export type ScholarshipCardProps = {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  companyLogo?: string | null;
  companyWebsite?: string | null;
  jobSlug?: string | null;
  datePosted?: string | null;
  validThrough?: string | null;
  locationCity?: string | null;
  locationCounty?: string | null;
  isFeatured?: boolean | null;
  isPromoted?: boolean | null;
  promotionTier?: string | null;
  scholarshipLevel?: string | null;
  scholarshipCoverage?: string | null;
  fieldOfStudy?: string | null;
  areaOfStudy?: string | null;
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

export default function ScholarshipCard({
  id,
  title,
  company,
  location,
  description,
  companyLogo,
  companyWebsite,
  jobSlug,
  datePosted,
  validThrough,
  locationCity,
  locationCounty,
  isFeatured,
  isPromoted,
  promotionTier,
  scholarshipLevel,
  scholarshipCoverage,
  fieldOfStudy,
  areaOfStudy,
}: ScholarshipCardProps) {
  const url = scholarshipPath(jobSlug || id);
  const locationLabel =
    buildLocationString(locationCity, locationCounty, location) || location;
  const postedValue = jobPostedLabel(datePosted) || formatDeadlineDate(datePosted);
  const deadlineValue = formatDeadlineDate(validThrough);
  const deadline = validThrough ? new Date(validThrough) : null;
  const isExpired = deadline ? deadline.getTime() < Date.now() : false;
  const excerpt = description.replace(/\s+/g, " ").trim().slice(0, 220);

  const metaTags = [
    scholarshipLevelLabel(scholarshipLevel),
    scholarshipCoverageLabel(scholarshipCoverage),
    fieldOfStudy,
    areaOfStudy,
  ].filter(Boolean) as string[];

  return (
    <Link href={url} className="block h-full" prefetch={true}>
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
                  <GraduationCap className="h-5 w-5" />
                </div>
              )}
            </div>

            <h3 className="col-span-2 col-start-1 row-start-1 min-w-0 text-lg font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-[#0A66C2] sm:col-span-1 sm:col-start-2 sm:text-xl">
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
              {metaTags.map((label) => (
                <Badge
                  key={label}
                  variant="outline"
                  className="rounded-md border-border/80 bg-background/80 px-2 py-0.5 text-xs font-medium text-foreground"
                >
                  {label}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
          {excerpt ? (
            <p className="line-clamp-3 text-sm text-muted-foreground">{excerpt}</p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
