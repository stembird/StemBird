"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { cn } from "@/lib/utils";

export type CompanyCardData = {
  id: string;
  name: string;
  logo: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  description: string | null;
  openJobs: number;
};

interface CompanyCardProps {
  company: CompanyCardData;
  className?: string;
  style?: CSSProperties;
  /** Homepage carousel: centered logo + name/industry, no blurb. */
  variant?: "default" | "compact";
}

/** Collapse whitespace and ensure a trailing ellipsis for card blurbs. */
export function formatCompanyBlurb(
  description: string | null | undefined,
  maxChars = 180
): string | null {
  if (!description) return null;
  let text = description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return null;

  if (text.length > maxChars) {
    const sliced = text.slice(0, maxChars);
    const lastSpace = sliced.lastIndexOf(" ");
    text = (lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trim();
  }

  text = text.replace(/[.…]+$/, "");
  return `${text}…`;
}

export function CompanyCard({
  company,
  className,
  style,
  variant = "default",
}: CompanyCardProps) {
  const blurb = formatCompanyBlurb(company.description);
  const isCompact = variant === "compact";

  if (isCompact) {
    return (
      <Link
        href={`/companies/${company.id}`}
        prefetch={true}
        className={cn(
          "group flex h-full flex-col items-center rounded-xl border border-border/60 bg-card px-3 py-4 text-center",
          "shadow-sm transition-all duration-300",
          "hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          className
        )}
        style={style}
      >
        <CompanyLogo
          name={company.name}
          logo={company.logo}
          website={company.website}
          size="lg"
          className="rounded-lg ring-1 ring-border/50 group-hover:ring-primary/30 transition-all"
        />
        <h3 className="mt-3 text-base font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {company.name}
        </h3>
        <p className="mt-1 text-xs text-primary/90 leading-snug line-clamp-2">
          {company.industry || "Employer"}
        </p>
        {company.openJobs > 0 && (
          <p className="mt-2 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
            {company.openJobs} {company.openJobs === 1 ? "open role" : "open roles"}
          </p>
        )}
      </Link>
    );
  }

  return (
    <Link
      href={`/companies/${company.id}`}
      prefetch={true}
      className={cn(
        "group block h-full rounded-xl border border-border/60 bg-card p-4",
        "shadow-sm transition-all duration-300",
        "hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className
      )}
      style={style}
    >
      <div className="flex items-start gap-4">
        <CompanyLogo
          name={company.name}
          logo={company.logo}
          website={company.website}
          size="lg"
          className="rounded-lg ring-1 ring-border/50 group-hover:ring-primary/30 transition-all"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {company.name}
          </h3>
          {company.industry ? (
            <p className="mt-1.5 text-sm text-primary/90 leading-snug">
              {company.industry}
            </p>
          ) : (
            <p className="mt-1.5 text-sm text-muted-foreground">Employer</p>
          )}
        </div>
      </div>

      {blurb && (
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          {blurb}
        </p>
      )}

      <div className="mt-5 pt-4 border-t border-border/50 flex items-end justify-between gap-3">
        <div>
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums leading-none tracking-tight",
              company.openJobs > 0 ? "text-foreground" : "text-muted-foreground/50"
            )}
          >
            {company.openJobs}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {company.openJobs === 1 ? "open role" : "open roles"}
          </p>
        </div>
        {company.location && (
          <p className="text-sm text-muted-foreground text-right leading-snug line-clamp-2 max-w-[55%]">
            {company.location}
          </p>
        )}
      </div>
    </Link>
  );
}

export default CompanyCard;
