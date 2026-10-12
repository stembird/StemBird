"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { KenyaJobsMap } from "@/components/map/KenyaJobsMap";
import type { CountyJobCount } from "@/lib/jobsByCounty";
import { KENYA_COUNTIES } from "@/lib/counties";

const SECTION_HEADING_CLASS = "text-3xl md:text-4xl font-bold mb-2 text-[#0A66C2]";
const SECTION_SUBCOPY_CLASS = "text-muted-foreground";

type JobsMapSectionProps = {
  counts: CountyJobCount[];
  /** When false, the parent page supplies the heading (e.g. the counties hub). */
  showHeading?: boolean;
};

type SortMode = "count" | "alpha";

/**
 * "Live Jobs Across Kenya" homepage section — an interactive 47-county map
 * with a scrollable list of all counties (default ranked by live job count,
 * optionally alphabetical). Data is aggregated server-side and passed in as
 * props; the map itself is lazy-loaded from the homepage.
 */
export function JobsMapSection({
  counts,
  showHeading = true,
}: JobsMapSectionProps) {
  const total = useMemo(() => counts.reduce((sum, c) => sum + c.count, 0), [counts]);
  const activeCounties = counts.length;

  const countByCanonical = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of counts) map.set(c.name, c.count);
    return map;
  }, [counts]);

  // Every Kenyan county, including zero-job ones.
  const allCounties = useMemo(() => {
    return KENYA_COUNTIES.map((c) => ({
      name: c.name,
      count: countByCanonical.get(c.name) ?? 0,
    }));
  }, [countByCanonical]);

  const [sortMode, setSortMode] = useState<SortMode>("count");
  const [isDesktop, setIsDesktop] = useState(false);
  const [mapHeight, setMapHeight] = useState(0);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const update = () => setMapHeight(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sortedCounties = useMemo(() => {
    const sorted = [...allCounties];
    if (sortMode === "alpha") {
      sorted.sort((a, b) => a.name.localeCompare(b.name, "en"));
    } else {
      sorted.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "en"));
    }
    return sorted;
  }, [allCounties, sortMode]);

  const sortButton = (mode: SortMode, label: string) => {
    const active = sortMode === mode;
    return (
      <button
        type="button"
        onClick={() => setSortMode(mode)}
        aria-pressed={active}
        className={`rounded-full px-2.5 py-1 transition-colors ${
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <section
      className="py-3 md:py-8 px-4"
      aria-labelledby={showHeading ? "live-jobs-map-heading" : undefined}
      aria-label={showHeading ? undefined : "Live jobs across Kenya"}
    >
      <div className="container mx-auto">
        {showHeading ? (
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
            <h2 id="live-jobs-map-heading" className={SECTION_HEADING_CLASS}>
              Live Jobs Across Kenya
            </h2>
            <p className={`${SECTION_SUBCOPY_CLASS} flex flex-wrap items-center justify-center gap-x-2 gap-y-1`}>
              <span className="inline-flex items-center font-semibold text-green-700 dark:text-green-400">
                {total.toLocaleString()} live jobs · {activeCounties} counties
              </span>
              <span className="text-muted-foreground">— tap a county to explore</span>
            </p>
          </div>
        ) : (
          <p className="mb-4 md:mb-6 text-center text-muted-foreground">
            <span className="inline-flex items-center font-semibold text-green-700 dark:text-green-400">
              {total.toLocaleString()} live jobs · {activeCounties} counties
            </span>
            <span> — tap a county to explore</span>
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div ref={mapRef} className="relative">
            <KenyaJobsMap counts={counts} />
          </div>

          <aside
            className="flex flex-col rounded-2xl border border-border/50 bg-card/70 p-4 md:p-5 lg:sticky lg:top-6"
            style={isDesktop && mapHeight > 0 ? { height: `${mapHeight}px` } : undefined}
            aria-label="All counties by live job count"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                All Counties
              </h3>
              <div
                className="flex shrink-0 items-center rounded-full border border-border bg-background/60 p-0.5 text-xs font-semibold"
                role="group"
                aria-label="Sort counties"
              >
                {sortButton("count", "Most jobs")}
                {sortButton("alpha", "A–Z")}
              </div>
            </div>

            <ol className="min-h-0 max-h-[26rem] space-y-0.5 overflow-y-scroll pr-2 lg:max-h-none lg:flex-1 [scrollbar-color:auto] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-background/50">
              {sortedCounties.map((county, index) => (
                <li key={county.name}>
                  <Link
                    href={`/jobs?location=${encodeURIComponent(county.name)}`}
                    prefetch={false}
                    className="group flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-foreground transition-colors hover:bg-primary/5"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="w-5 flex-shrink-0 text-right text-sm font-bold text-primary">
                        {index + 1}.
                      </span>
                      <span className="min-w-0 text-sm font-medium leading-snug group-hover:text-[#0A66C2]">
                        {county.name}
                      </span>
                    </span>
                    <span className="flex flex-shrink-0 items-center gap-1 text-sm font-semibold tabular-nums">
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

            <div className="mt-3 border-t border-border/60 pt-3">
              <Link
                href="/jobs"
                prefetch={false}
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                Browse all jobs
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
