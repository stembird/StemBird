"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  Calculator,
  ClipboardList,
  Code2,
  Cog,
  Factory,
  GraduationCap,
  Headphones,
  HeartPulse,
  Landmark,
  Leaf,
  ListFilter,
  Megaphone,
  Package,
  PieChart,
  Plane,
  Scale,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  TrendingUp,
  Truck,
  Users,
  Utensils,
  Wrench,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FunctionJobCount } from "@/lib/jobsByFunction";

/**
 * Jobs-by-function visualization.
 *
 * Bars live in a CSS grid with a fixed label column and a shared track, so
 * every bar starts on the same vertical line and lengths are comparable.
 * Function names are never truncated — they wrap inside the label column.
 *
 * Clicks go to `/jobs?jobType=<function>`, which the jobs listing already
 * understands.
 */

const TEASER_ROWS = 8;

const DONUT_ROWS = 6;

const DONUT_COLORS = [
  "hsl(210 89% 40%)",
  "hsl(199 89% 48%)",
  "hsl(25 95% 53%)",
  "hsl(245 65% 55%)",
  "hsl(174 72% 40%)",
  "hsl(142 76% 36%)",
  "hsl(280 65% 52%)",
  "hsl(340 75% 50%)",
  "hsl(35 90% 52%)",
  "hsl(200 45% 48%)",
];

const FUNCTION_COLORS: Record<string, string> = {
  Sales: "hsl(210 89% 40%)",
  "Education & Training": "hsl(199 89% 48%)",
  "Engineering & Technology": "hsl(25 95% 53%)",
  "IT & Software": "hsl(245 65% 55%)",
  "Accounting, Auditing & Finance": "hsl(174 72% 40%)",
  "Healthcare & Medical": "hsl(142 76% 36%)",
};
const OTHERS_COLOR = "hsl(220 14% 64%)";

function donutColor(name: string, index: number): string {
  return FUNCTION_COLORS[name] ?? DONUT_COLORS[index % DONUT_COLORS.length];
}

const DONUT_SIZE = 220;
const DONUT_STROKE = 22;
const DONUT_ACTIVE_EXTRA = 6;
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE - DONUT_ACTIVE_EXTRA * 2) / 2;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

const OTHERS_LABEL = "Others";

const SECTION_HEADING_CLASS = "text-3xl md:text-4xl font-bold mb-2 text-[#0A66C2]";
const SECTION_SUBCOPY_CLASS = "text-muted-foreground";

type ExploreJobsByFunctionProps = {
  functions: FunctionJobCount[];
  /** `teaser` is the compact homepage block; `full` is the hub page. */
  variant?: "teaser" | "full";
  /** Hide the in-card title when the parent page already has an h1. */
  showHeader?: boolean;
};

function functionIcon(name: string) {
  const key = name.toLowerCase();
  if (key.includes("engineering") || key.includes("technology")) return Cog;
  if (key.includes("software") || key.includes("it &") || key.includes("telecom"))
    return Code2;
  if (
    key.includes("data") ||
    key.includes("analytics") ||
    key.includes("ai") ||
    key.includes("science")
  )
    return BarChart3;
  if (key.includes("account") || key.includes("finance") || key.includes("bank"))
    return Calculator;
  if (key.includes("sales")) return TrendingUp;
  if (key.includes("admin") || key.includes("office")) return ClipboardList;
  if (key.includes("health") || key.includes("medical")) return HeartPulse;
  if (key.includes("management") || key.includes("executive")) return Briefcase;
  if (key.includes("quality") || key.includes("health & safety")) return ShieldCheck;
  if (
    key.includes("supply chain") ||
    key.includes("procurement") ||
    key.includes("logistics") ||
    key.includes("transport") ||
    key.includes("driver")
  )
    return Truck;
  if (
    key.includes("marketing") ||
    key.includes("media") ||
    key.includes("advertis") ||
    key.includes("pr")
  )
    return Megaphone;
  if (
    key.includes("human resources") ||
    key.includes("recruit") ||
    key.includes("hr")
  )
    return Users;
  if (
    key.includes("education") ||
    key.includes("training") ||
    key.includes("teaching") ||
    key.includes("research")
  )
    return GraduationCap;
  if (key.includes("legal")) return Scale;
  if (key.includes("customer")) return Headphones;
  if (key.includes("manufactur") || key.includes("warehouse")) return Factory;
  if (key.includes("retail") || key.includes("fashion") || key.includes("fmcg"))
    return ShoppingBag;
  if (
    key.includes("building") ||
    key.includes("architect") ||
    key.includes("construction") ||
    key.includes("real estate")
  )
    return Building2;
  if (
    key.includes("food") ||
    key.includes("catering") ||
    key.includes("hospitality") ||
    key.includes("restaurant")
  )
    return Utensils;
  if (
    key.includes("agriculture") ||
    key.includes("farming") ||
    key.includes("vet") ||
    key.includes("natural resources")
  )
    return Sprout;
  if (
    key.includes("environment") ||
    key.includes("energy") ||
    key.includes("renewable")
  )
    return Leaf;
  if (key.includes("travel") || key.includes("tourism") || key.includes("leisure"))
    return Plane;
  if (key.includes("trades") || key.includes("maintenance") || key.includes("repair"))
    return Wrench;
  if (key.includes("supply") || key.includes("procurement")) return Package;
  if (key.includes("insurance") || key.includes("financial")) return Landmark;
  return Briefcase;
}

function FunctionBars({
  functions,
  total,
  maxCount,
  inView,
  activeName,
  setActiveName,
  onNavigate,
}: {
  functions: FunctionJobCount[];
  total: number;
  maxCount: number;
  inView: boolean;
  activeName: string | null;
  setActiveName: (name: string | null) => void;
  onNavigate: (name: string) => void;
}) {
  const percentOf = (count: number) =>
    total > 0 ? Math.round((count / total) * 100) : 0;

  const percentText = (count: number) => {
    const pct = percentOf(count);
    return pct < 1 ? "<1" : String(pct);
  };

  return (
    <ul className="flex flex-col gap-1" role="list">
      {functions.map((fn, index) => {
        const Icon = functionIcon(fn.name);
        const isActive = activeName === fn.name;
        const barWidth =
          !inView || fn.count <= 0
            ? "0%"
            : `${Math.max(2, (fn.count / maxCount) * 100)}%`;
        return (
          <li key={fn.name}>
            <button
              type="button"
              onMouseEnter={() => setActiveName(fn.name)}
              onMouseLeave={() => setActiveName(null)}
              onClick={() => onNavigate(fn.name)}
              aria-label={`${fn.name}: ${fn.count.toLocaleString()} active jobs (${percentOf(fn.count)}%), explore jobs`}
              className={`group grid w-full grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-x-3 gap-y-1.5 rounded-xl px-2 py-2 text-left transition-colors md:grid-cols-[16rem_minmax(0,1fr)_5.5rem] lg:grid-cols-[18rem_minmax(0,1fr)_5.5rem] ${
                isActive ? "bg-primary/5" : "hover:bg-primary/5"
              } ${fn.count <= 0 ? "opacity-60" : ""}`}
            >
              <span className="col-span-2 flex min-w-0 items-start gap-2 md:col-span-1">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 text-sm font-medium leading-snug text-foreground">
                  {fn.name}
                </span>
              </span>

              <span className="relative h-2.5 w-full min-w-0 self-center overflow-hidden rounded-full bg-muted">
                <span
                  className={`absolute inset-y-0 left-0 rounded-full bg-[#0A66C2] origin-left ${
                    isActive
                      ? "brightness-110 scale-y-[1.35]"
                      : "group-hover:brightness-110 group-hover:scale-y-[1.35]"
                  }`}
                  style={{
                    width: barWidth,
                    transition: `width 700ms cubic-bezier(0.25,1,0.5,1) ${index * 40}ms, transform 200ms ease, filter 200ms ease`,
                  }}
                />
              </span>

              <span className="flex shrink-0 items-baseline justify-end gap-1.5 self-center">
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {fn.count.toLocaleString()}
                </span>
                <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
                  {percentText(fn.count)}%
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ExploreJobsByFunction({
  functions,
  variant = "full",
  showHeader = true,
}: ExploreJobsByFunctionProps) {
  const router = useRouter();
  const isTeaser = variant === "teaser";

  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(!isTeaser);
  const [activeName, setActiveName] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"count" | "alpha">("count");
  const [query, setQuery] = useState("");

  const total = useMemo(
    () => functions.reduce((sum, f) => sum + f.count, 0),
    [functions]
  );

  const maxCount = useMemo(
    () => Math.max(1, ...functions.map((f) => f.count)),
    [functions]
  );

  const hiringCount = useMemo(
    () => functions.filter((f) => f.count > 0).length,
    [functions]
  );

  const displayFunctions = useMemo(() => {
    if (isTeaser) return functions.slice(0, TEASER_ROWS);

    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? functions.filter((f) => f.name.toLowerCase().includes(needle))
      : [...functions];

    if (sortMode === "alpha") {
      filtered.sort((a, b) => a.name.localeCompare(b.name, "en"));
    } else {
      filtered.sort(
        (a, b) => b.count - a.count || a.name.localeCompare(b.name, "en")
      );
    }
    return filtered;
  }, [functions, isTeaser, query, sortMode]);

  const displayMaxCount = useMemo(
    () => Math.max(1, ...displayFunctions.map((f) => f.count)),
    [displayFunctions]
  );

  const donutFunctions = useMemo(
    () => functions.slice(0, DONUT_ROWS),
    [functions]
  );

  const othersCount = Math.max(
    0,
    total - donutFunctions.reduce((s, f) => s + f.count, 0)
  );

  const donutSegments = useMemo(() => {
    const segments = donutFunctions.map((f, i) => ({
      name: f.name,
      count: f.count,
      color: donutColor(f.name, i),
    }));
    if (othersCount > 0) {
      segments.push({
        name: OTHERS_LABEL,
        count: othersCount,
        color: OTHERS_COLOR,
      });
    }
    return segments;
  }, [donutFunctions, othersCount]);

  const legendItems = donutSegments;

  const activeSegment = useMemo(
    () =>
      activeName
        ? donutSegments.find((seg) => seg.name === activeName) ?? null
        : null,
    [activeName, donutSegments]
  );

  useEffect(() => {
    if (!isTeaser) return;
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isTeaser]);

  const navigateToFunction = (name: string) => {
    if (name === OTHERS_LABEL) {
      router.push("/jobs");
      return;
    }
    router.push(`/jobs?jobType=${encodeURIComponent(name)}`);
  };

  const percentText = (count: number) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return pct < 1 ? "<1" : String(pct);
  };

  const headingId = isTeaser
    ? "explore-jobs-by-function-teaser-heading"
    : "explore-jobs-by-function-heading";

  return (
    <section
      ref={sectionRef}
      className="overflow-x-clip py-3 md:py-8 px-4"
      aria-labelledby={isTeaser || showHeader ? headingId : undefined}
      aria-label={isTeaser || showHeader ? undefined : "Jobs by function"}
    >
      <div className="container mx-auto">
        {isTeaser ? (
          <div className="mb-4 md:mb-6 text-center">
            <h2 id={headingId} className={SECTION_HEADING_CLASS}>
              Jobs by Function
            </h2>
            <p className={SECTION_SUBCOPY_CLASS}>
              Find opportunities based on what you do
            </p>
          </div>
        ) : null}

        <div
          className={
            isTeaser
              ? "min-w-0"
              : "min-w-0 rounded-2xl border border-border/60 bg-white p-4 shadow-sm dark:bg-card sm:rounded-3xl sm:p-5 md:p-7 lg:p-8"
          }
        >
          {!isTeaser && showHeader && (
            <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-11 sm:w-11">
                  <Briefcase className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2
                    id={headingId}
                    className="text-xl font-bold leading-tight text-[#0A66C2] sm:text-2xl md:text-3xl"
                  >
                    Explore Jobs by Function
                  </h2>
                  <p className="text-sm text-muted-foreground md:text-base">
                    Find opportunities based on what you do best.
                  </p>
                </div>
              </div>

              <Link href="/jobs" prefetch={false} className="shrink-0 md:mt-1">
                <Button variant="outline" className="w-full whitespace-nowrap md:w-auto">
                  <ListFilter className="h-4 w-4" aria-hidden="true" />
                  Browse all jobs
                </Button>
              </Link>
            </div>
          )}

          {!isTeaser && (
            <div className="flex w-full items-start gap-2.5 rounded-xl border border-border/60 bg-orange-50/70 px-3.5 py-2.5 dark:bg-orange-950/20">
              <Zap
                className="mt-0.5 h-4 w-4 shrink-0 text-secondary"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Tip: Click any function to explore jobs
                </p>
                <p className="text-xs text-muted-foreground">
                  Get matched with the right opportunities for your skills.
                </p>
              </div>
            </div>
          )}

          <div
            className={`flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 ${
              isTeaser ? "mb-5" : "mt-5 md:mt-6"
            }`}
          >
            <span className="text-3xl font-extrabold tabular-nums text-[#0A66C2] sm:text-4xl md:text-5xl">
              {total.toLocaleString()}
            </span>
            <span className="max-w-full text-center text-sm text-muted-foreground md:text-base">
              active jobs across{" "}
              <span className="font-semibold text-foreground">
                {functions.length.toLocaleString()}
              </span>{" "}
              functions
              {!isTeaser && hiringCount < functions.length ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-semibold text-foreground">
                    {hiringCount.toLocaleString()}
                  </span>{" "}
                  hiring now
                </>
              ) : null}
            </span>
          </div>

          <div className={`flex min-w-0 flex-col gap-6 ${isTeaser ? "" : "mt-6 md:mt-8"}`}>
            {!isTeaser && (
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="relative min-w-0 flex-1 sm:max-w-sm">
                  <span className="sr-only">Search functions</span>
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search all functions"
                    className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {displayFunctions.length.toLocaleString()} of{" "}
                    {functions.length.toLocaleString()}
                  </p>
                  <div
                    className="flex shrink-0 items-center rounded-full border border-border bg-background/60 p-0.5 text-xs font-semibold"
                    role="group"
                    aria-label="Sort functions"
                  >
                    <button
                      type="button"
                      onClick={() => setSortMode("count")}
                      aria-pressed={sortMode === "count"}
                      className={`rounded-full px-2.5 py-1 transition-colors ${
                        sortMode === "count"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Most jobs
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortMode("alpha")}
                      aria-pressed={sortMode === "alpha"}
                      className={`rounded-full px-2.5 py-1 transition-colors ${
                        sortMode === "alpha"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      A–Z
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="min-w-0">
              {displayFunctions.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No functions match “{query.trim()}”.
                </p>
              ) : (
                <FunctionBars
                  functions={displayFunctions}
                  total={total}
                  maxCount={isTeaser ? displayMaxCount : maxCount}
                  inView={inView}
                  activeName={activeName}
                  setActiveName={setActiveName}
                  onNavigate={navigateToFunction}
                />
              )}
            </div>

            {!isTeaser && (
              <aside
                className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/70 p-3 sm:p-4 md:p-5"
                aria-label="Jobs by function overview"
              >
                <h3 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-bold text-foreground sm:text-lg">
                  <PieChart
                    className="h-4 w-4 shrink-0 text-[#0A66C2]"
                    aria-hidden="true"
                  />
                  <span>Jobs by Function</span>
                  <span className="text-sm font-medium text-muted-foreground sm:text-base">
                    (Overview)
                  </span>
                </h3>

                <div className="mt-4 flex min-w-0 flex-1 flex-col items-center gap-5 md:flex-row md:items-center md:gap-8">
                  <div
                    className="relative aspect-square w-[min(11.5rem,70vw)] shrink-0 sm:w-52"
                    style={{
                      opacity: inView ? 1 : 0,
                      transform: inView ? "scale(1)" : "scale(0.96)",
                      transition: "opacity 500ms ease, transform 500ms ease",
                    }}
                  >
                    <svg
                      viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
                      className="h-full w-full overflow-visible"
                      role="img"
                      aria-label="Distribution of active jobs by function"
                    >
                      <g
                        transform={`rotate(-90 ${DONUT_SIZE / 2} ${DONUT_SIZE / 2})`}
                      >
                        {(() => {
                          let cumulative = 0;
                          return donutSegments.map((seg) => {
                            const fraction = total > 0 ? seg.count / total : 0;
                            const dash = fraction * DONUT_CIRCUMFERENCE;
                            const gap = DONUT_CIRCUMFERENCE - dash;
                            const offset = -cumulative * DONUT_CIRCUMFERENCE;
                            cumulative += fraction;
                            const isActive = activeName === seg.name;
                            return (
                              <circle
                                key={seg.name}
                                cx={DONUT_SIZE / 2}
                                cy={DONUT_SIZE / 2}
                                r={DONUT_RADIUS}
                                fill="none"
                                stroke={seg.color}
                                strokeWidth={
                                  isActive
                                    ? DONUT_STROKE + DONUT_ACTIVE_EXTRA
                                    : DONUT_STROKE
                                }
                                strokeDasharray={`${dash} ${gap}`}
                                strokeDashoffset={offset}
                                strokeLinecap="butt"
                                tabIndex={0}
                                role="button"
                                aria-label={`${seg.name}: ${seg.count.toLocaleString()} active jobs`}
                                className="cursor-pointer transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                style={{
                                  opacity: activeSegment && !isActive ? 0.25 : 1,
                                }}
                                onMouseEnter={() => setActiveName(seg.name)}
                                onMouseLeave={() => setActiveName(null)}
                                onFocus={() => setActiveName(seg.name)}
                                onBlur={() => setActiveName(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    navigateToFunction(seg.name);
                                  }
                                }}
                                onClick={() => navigateToFunction(seg.name)}
                              />
                            );
                          });
                        })()}
                      </g>
                    </svg>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4">
                      <span className="max-w-full truncate text-2xl font-extrabold tabular-nums text-[#0A66C2] sm:text-3xl md:text-4xl">
                        {activeSegment
                          ? activeSegment.count.toLocaleString()
                          : total.toLocaleString()}
                      </span>
                      <span className="max-w-full text-center text-xs leading-snug text-muted-foreground">
                        {activeSegment ? activeSegment.name : "Total Jobs"}
                      </span>
                    </div>
                  </div>

                  <ul className="flex w-full min-w-0 flex-1 flex-col gap-0.5" role="list">
                    {legendItems.map((item) => {
                      const isActive = activeName === item.name;
                      return (
                        <li key={item.name} className="min-w-0">
                          <button
                            type="button"
                            onMouseEnter={() => setActiveName(item.name)}
                            onMouseLeave={() => setActiveName(null)}
                            onClick={() => navigateToFunction(item.name)}
                            className={`flex w-full min-w-0 items-start gap-2 rounded-lg px-2 py-1 text-left transition-colors ${
                              isActive ? "bg-primary/5" : "hover:bg-primary/5"
                            }`}
                          >
                            <span
                              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-[3px]"
                              style={{ backgroundColor: item.color }}
                              aria-hidden="true"
                            />
                            <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">
                              {item.name}
                            </span>
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                              {percentText(item.count)}%
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </aside>
            )}
          </div>

          {isTeaser && (
            <div className="mt-6 flex justify-center">
              <Link href="/jobs/functions" prefetch={true}>
                <Button variant="outline" className="whitespace-nowrap">
                  Explore all functions <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
