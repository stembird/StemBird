"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CountyJobCount } from "@/lib/jobsByCounty";
import { JobsMapSectionSkeleton } from "@/components/map/JobsMapSectionSkeleton";

const JobsMapSection = dynamic(
  () =>
    import("@/components/map/JobsMapSection").then((mod) => mod.JobsMapSection),
  {
    ssr: false,
    loading: () => <JobsMapSectionSkeleton />,
  }
);

const SECTION_HEADING_CLASS = "text-3xl md:text-4xl font-bold mb-2 text-[#0A66C2]";
const SECTION_SUBCOPY_CLASS = "text-muted-foreground";

const TEASER_ROWS = 10;

type ExploreJobsByCountyTeaserProps = {
  counties: CountyJobCount[];
};

/**
 * Compact homepage teaser for jobs-by-county. Ranked list only — the full
 * interactive map lives on `/jobs/counties`.
 */
export function ExploreJobsByCountyTeaser({
  counties,
}: ExploreJobsByCountyTeaserProps) {
  const total = counties.reduce((sum, c) => sum + c.count, 0);
  const top = counties.slice(0, TEASER_ROWS);

  return (
    <section
      className="py-3 md:py-8 px-4"
      aria-labelledby="explore-jobs-by-county-teaser-heading"
    >
      <div className="container mx-auto">
        <div className="mb-4 md:mb-6 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 dark:bg-green-950/40">
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-green-700 dark:text-green-400">
              Live
            </span>
          </div>
          <h2
            id="explore-jobs-by-county-teaser-heading"
            className={SECTION_HEADING_CLASS}
          >
            Jobs by County
          </h2>
          <p className={SECTION_SUBCOPY_CLASS}>
            <span className="font-semibold text-green-700 dark:text-green-400">
              {total.toLocaleString()} live jobs · {counties.length} counties
            </span>
            <span className="text-muted-foreground">
              {" "}
              — explore the map for all 47
            </span>
          </p>
        </div>

        <ol
          className="mx-auto grid max-w-3xl grid-cols-1 gap-x-8 sm:grid-cols-2"
          role="list"
        >
          {top.map((county, index) => (
            <li key={county.name}>
              <Link
                href={`/jobs?location=${encodeURIComponent(county.name)}`}
                prefetch={false}
                className="group flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-foreground transition-colors hover:bg-primary/5"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="w-6 shrink-0 text-right text-sm font-bold tabular-nums text-primary">
                    {index + 1}.
                  </span>
                  <span className="min-w-0 text-sm font-medium leading-snug group-hover:text-[#0A66C2]">
                    {county.name}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums">
                  {county.count.toLocaleString()}
                  <ArrowRight
                    className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-[#0A66C2]"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex justify-center">
          <Link href="/jobs/counties" prefetch={true}>
            <Button variant="outline" className="whitespace-nowrap">
              <MapPin className="mr-2 h-4 w-4" />
              Explore the map
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export function JobsByCountyMap({ counts }: { counts: CountyJobCount[] }) {
  return <JobsMapSection counts={counts} showHeading={false} />;
}
