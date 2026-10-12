"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { IndustryCardData } from "@/lib/companyDirectory";
import { ALL_INDUSTRIES_SLUG } from "@/lib/companyDirectory";
import {
  ALL_INDUSTRIES_IMAGE,
  getIndustryCardImage,
} from "@/lib/industryCardImages";

interface IndustryCardProps {
  title: string;
  href: string;
  companyCount?: number;
  openJobs: number;
  imageUrl: string;
  featured?: boolean;
  compact?: boolean;
  eyebrow?: string;
  className?: string;
  style?: CSSProperties;
}

export function IndustryCard({
  title,
  href,
  companyCount,
  openJobs,
  imageUrl,
  featured = false,
  compact = false,
  eyebrow,
  className,
  style,
}: IndustryCardProps) {
  const showCompanies = typeof companyCount === "number";
  return (
    <Link
      href={href}
      prefetch={true}
      className={cn(
        "group relative block overflow-hidden rounded-2xl border border-border/40",
        compact
          ? "min-h-[148px] md:min-h-[160px]"
          : "min-h-[200px] md:min-h-[220px]",
        "shadow-md transition-all duration-500",
        "hover:shadow-xl hover:-translate-y-1 hover:border-primary/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        featured && !compact && "sm:col-span-2 xl:col-span-1 md:min-h-[240px]",
        className
      )}
      style={style}
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
        style={{ backgroundImage: `url(${imageUrl})` }}
        aria-hidden
      />

      {/* Readable gradient — deeper at the bottom where copy lives */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/25 via-transparent to-transparent opacity-80"
        aria-hidden
      />

      <div className="relative z-10 flex h-full min-h-[inherit] flex-col justify-between p-4 md:p-5 text-white">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/75 mb-2">
            {eyebrow ?? (featured ? "Browse everything" : "Industry")}
          </p>
          <h3
            className={cn(
              "font-semibold leading-snug text-white drop-shadow-sm",
              compact
                ? "text-lg md:text-xl"
                : featured
                  ? "text-2xl md:text-3xl"
                  : "text-xl md:text-[1.35rem]"
            )}
          >
            {title}
          </h3>
        </div>

        <div
          className={cn(
            "flex items-end gap-4 border-t border-white/20",
            compact ? "mt-4 justify-start pt-3" : "mt-6 justify-between pt-4"
          )}
        >
          {showCompanies && (
            <div>
              <p className="text-2xl md:text-3xl font-semibold tabular-nums leading-none tracking-tight">
                {companyCount}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-white/70">
                {companyCount === 1 ? "company" : "companies"}
              </p>
            </div>
          )}
          <div className={showCompanies ? "text-right" : undefined}>
            <p
              className={cn(
                "font-semibold tabular-nums leading-none",
                compact ? "text-xl md:text-2xl" : "text-xl md:text-2xl",
                !showCompanies && "text-2xl md:text-3xl",
                openJobs > 0 ? "text-white" : "text-white/40"
              )}
            >
              {openJobs}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-white/70">
              {openJobs === 1 ? "open role" : "open roles"}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

interface IndustryCardsGridProps {
  industries: IndustryCardData[];
  totalCompanies: number;
  totalOpenJobs: number;
}

export function IndustryCardsGrid({
  industries,
  totalCompanies,
  totalOpenJobs,
}: IndustryCardsGridProps) {
  const sorted = [...industries].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
      <IndustryCard
        title="All industries"
        href={`/companies/industry/${ALL_INDUSTRIES_SLUG}`}
        companyCount={totalCompanies}
        openJobs={totalOpenJobs}
        imageUrl={ALL_INDUSTRIES_IMAGE}
        featured
        className="animate-fade-in"
      />
      {sorted.map((industry, index) => (
        <IndustryCard
          key={industry.slug}
          title={industry.name}
          href={`/companies/industry/${industry.slug}`}
          companyCount={industry.companyCount}
          openJobs={industry.openJobs}
          imageUrl={getIndustryCardImage(industry.name)}
          className="animate-fade-in"
          style={{ animationDelay: `${Math.min(index + 1, 12) * 40}ms` }}
        />
      ))}
    </div>
  );
}

export default IndustryCardsGrid;
