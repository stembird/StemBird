"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IndustryCard } from "@/components/IndustryCard";
import { getIndustryCardImage } from "@/lib/industryCardImages";
import type { IndustryJobCount } from "@/lib/jobsByIndustry";

const SECTION_HEADING_CLASS = "text-3xl md:text-4xl font-bold mb-2 text-[#0A66C2]";
const SECTION_SUBCOPY_CLASS = "text-muted-foreground";

const TEASER_COUNT = 6;

function jobsHref(name: string) {
  return `/jobs?industry=${encodeURIComponent(name)}`;
}

type ExploreJobsByIndustryProps = {
  industries: IndustryJobCount[];
  variant?: "teaser" | "full";
};

export function ExploreJobsByIndustry({
  industries,
  variant = "full",
}: ExploreJobsByIndustryProps) {
  const isTeaser = variant === "teaser";
  const items = isTeaser ? industries.slice(0, TEASER_COUNT) : industries;
  const total = industries.reduce((sum, i) => sum + i.count, 0);

  return (
    <section
      className="py-3 md:py-8 px-4"
      aria-labelledby={
        isTeaser
          ? "explore-jobs-by-industry-teaser-heading"
          : "explore-jobs-by-industry-heading"
      }
    >
      <div className="container mx-auto">
        {isTeaser ? (
          <div className="mb-4 md:mb-6 text-center">
            <h2
              id="explore-jobs-by-industry-teaser-heading"
              className={SECTION_HEADING_CLASS}
            >
              Jobs by Industry
            </h2>
            <p className={SECTION_SUBCOPY_CLASS}>
              The sectors with the most open roles on CareerSasa right now
            </p>
          </div>
        ) : (
          <div className="mb-6 md:mb-8 flex flex-wrap items-end justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">
                {total.toLocaleString()}
              </span>{" "}
              live jobs across{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {industries.length.toLocaleString()}
              </span>{" "}
              industries
            </p>
          </div>
        )}

        <div
          className={
            isTeaser
              ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5"
              : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5"
          }
        >
          {items.map((industry, index) => (
            <IndustryCard
              key={industry.name}
              title={industry.name}
              href={jobsHref(industry.name)}
              openJobs={industry.count}
              imageUrl={getIndustryCardImage(industry.name)}
              compact={isTeaser}
              eyebrow="Industry"
              className="animate-fade-in"
              style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
            />
          ))}
        </div>

        {isTeaser && (
          <div className="mt-4 flex justify-center">
            <Link href="/jobs/industries" prefetch={true}>
              <Button variant="outline" className="whitespace-nowrap">
                Explore all industries <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
