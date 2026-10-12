"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CompanyCard, type CompanyCardData } from "@/components/CompanyCard";

interface CompaniesDirectoryProps {
  companies: CompanyCardData[];
  /** Display title for the current industry filter (null = all). */
  industryName?: string | null;
}

function StatFigure({
  value,
  label,
}: {
  value: number | string;
  label: string;
}) {
  return (
    <div className="min-w-0 px-1 sm:px-2 text-center">
      <p className="text-xl sm:text-2xl font-semibold tabular-nums tracking-tight text-foreground leading-none">
        {value}
      </p>
      <p className="mt-1.5 text-[10px] sm:text-[11px] uppercase tracking-[0.12em] text-muted-foreground leading-tight">
        {label}
      </p>
    </div>
  );
}

export function CompaniesDirectory({
  companies,
  industryName = null,
}: CompaniesDirectoryProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.industry || "").toLowerCase().includes(q) ||
        (c.location || "").toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q)
    );
  }, [companies, search]);

  const hiringCount = filtered.filter((c) => c.openJobs > 0).length;
  const openRoles = filtered.reduce((sum, c) => sum + c.openJobs, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              industryName
                ? `Search companies in ${industryName}…`
                : "Search companies by name or location…"
            }
            className="pl-10 h-11 bg-background/80"
            aria-label="Search companies"
          />
        </div>

        <div
          className="grid w-full grid-cols-3 items-start gap-0 divide-x divide-border/70 rounded-xl border border-border/60 bg-muted/20 py-3 sm:w-auto sm:min-w-[22rem] lg:min-w-[24rem]"
          role="group"
          aria-label="Industry company stats"
        >
          <StatFigure
            value={filtered.length}
            label={filtered.length === 1 ? "company" : "companies"}
          />
          <StatFigure
            value={openRoles}
            label={openRoles === 1 ? "open role" : "open roles"}
          />
          <StatFigure value={hiringCount} label="hiring now" />
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
          {filtered.map((company, index) => (
            <CompanyCard
              key={company.id}
              company={company}
              className="animate-fade-in"
              style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/70 py-16 text-center px-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            No matches
          </p>
          <p className="text-lg font-medium">
            {companies.length === 0
              ? "No companies in this industry yet"
              : "Nothing matches your search"}
          </p>
          <p className="text-muted-foreground mt-1 max-w-md mx-auto">
            {companies.length === 0
              ? "Try another industry or browse all employers."
              : "Try a different name or clear your search."}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
            {search && (
              <button
                type="button"
                className="text-sm font-medium text-primary hover:underline"
                onClick={() => setSearch("")}
              >
                Clear search
              </button>
            )}
            <Link
              href="/companies"
              className="text-sm font-medium text-primary hover:underline"
            >
              Back to industries
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompaniesDirectory;
