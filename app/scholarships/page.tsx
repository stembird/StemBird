"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import ScholarshipCard from "@/components/ScholarshipCard";
import { Loader2, ChevronLeft, ChevronRight, Search, RotateCcw } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { KENYA_COUNTIES, countySearchValues } from "@/lib/counties";
import { usePageContent, getContentValue } from "@/hooks/usePageContent";
import {
  jobCardCompany,
  jobCardDescription,
  queryJobCards,
  queryScholarshipCards,
  type JobCardRow,
} from "@/lib/jobCardSelect";
import { isMissingListingKindColumnError, classifyListingKind } from "@/lib/listingKind";
import { SCHOLARSHIP_LEVELS, extractScholarshipFacts } from "@/lib/scholarshipFacts";
import { Footer } from "@/components/Footer";

const PER_PAGE = 12;
const SEARCH_DEBOUNCE_MS = 300;

type Filters = {
  searchTerm: string;
  location: string;
  level: string;
  fieldOfStudy: string;
  sortBy: string;
};

function applyFilters(query: any, filters: Filters) {
  query = query.eq("status", "active").eq("listing_kind", "scholarship");

  if (filters.searchTerm) {
    query = query.ilike("title", `%${filters.searchTerm}%`);
  }
  if (filters.location) {
    const countyValues = countySearchValues(filters.location);
    query = countyValues.length > 1
      ? query.in("job_location_county", countyValues)
      : query.eq("job_location_county", filters.location);
  }
  if (filters.level) {
    query = query.eq("scholarship_level", filters.level);
  }
  if (filters.fieldOfStudy) {
    query = query.ilike("field_of_study", `%${filters.fieldOfStudy}%`);
  }
  return query;
}

function applySort(query: any, sortBy: string) {
  query = query
    .order("is_featured", { ascending: false, nullsFirst: false })
    .order("is_promoted", { ascending: false, nullsFirst: false });
  if (sortBy === "deadline") {
    return query.order("valid_through", { ascending: true, nullsFirst: false });
  }
  if (sortBy === "oldest") {
    return query.order("created_at", { ascending: true });
  }
  return query.order("created_at", { ascending: false });
}

function applyTitleFallback(query: any) {
  return query
    .eq("status", "active")
    .or("title.ilike.%scholarship%,title.ilike.%bursary%,title.ilike.%scholars %");
}

async function fetchViaTitleFallback(
  filters: Filters,
  page: number
): Promise<{ data: JobCardRow[]; count: number }> {
  const { data: rows, error } = await queryJobCards<JobCardRow[]>((select) =>
    applySort(
      applyTitleFallback((supabase as any).from("jobs").select(select)),
      filters.sortBy
    ).range(0, 199)
  );
  if (error) throw new Error(error.message);
  let classified = (rows || [])
    .filter(
      (row) =>
        classifyListingKind({
          title: row.title,
          tags: typeof row.job_function === "string" ? row.job_function : null,
        }) === "scholarship"
    )
    .map((row) => {
      const facts = extractScholarshipFacts({
        title: row.title,
        html: row.description_excerpt || row.description,
      });
      return {
        ...row,
        scholarship_level: row.scholarship_level || facts.scholarship_level,
        scholarship_coverage: row.scholarship_coverage || facts.scholarship_coverage,
      };
    });
  if (filters.searchTerm) {
    const q = filters.searchTerm.toLowerCase();
    classified = classified.filter((row) => row.title.toLowerCase().includes(q));
  }
  if (filters.location) {
    classified = classified.filter((row) => row.job_location_county === filters.location);
  }
  if (filters.fieldOfStudy) {
    const q = filters.fieldOfStudy.toLowerCase();
    classified = classified.filter((row) =>
      (row.field_of_study || "").toLowerCase().includes(q)
    );
  }
  const from = (page - 1) * PER_PAGE;
  return { data: classified.slice(from, from + PER_PAGE), count: classified.length };
}

export default function ScholarshipsPage() {
  const [filters, setFilters] = useState<Filters>({
    searchTerm: "",
    location: "",
    level: "",
    fieldOfStudy: "",
    sortBy: "newest",
  });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [currentPage, setCurrentPage] = useState(1);
  const { data: content } = usePageContent("scholarships");
  const heroTitle = getContentValue(content, "hero_title", "Scholarships in Kenya");
  const heroSubtitle = getContentValue(
    content,
    "hero_subtitle",
    "Bursaries and funded study awards from universities, foundations, and government programmes. Filter by level and field, then apply on the funder site."
  );

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedFilters(filters), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilters]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["scholarships", debouncedFilters, currentPage],
    queryFn: async () => {
      const countQuery = applyFilters(
        supabase.from("jobs").select("id", { count: "exact" }).limit(0),
        debouncedFilters
      );
      const { count, error: countError } = await countQuery;
      if (countError) {
        if (isMissingListingKindColumnError(countError)) {
          return fetchViaTitleFallback(debouncedFilters, currentPage);
        }
        throw new Error(countError.message);
      }

      const from = (currentPage - 1) * PER_PAGE;
      const to = currentPage * PER_PAGE - 1;
      const { data: rows, error: dataError } = await queryScholarshipCards<JobCardRow[]>(
        (select) =>
          applySort(
            applyFilters((supabase as any).from("jobs").select(select), debouncedFilters),
            debouncedFilters.sortBy
          ).range(from, to)
      );
      if (dataError) {
        if (isMissingListingKindColumnError(dataError)) {
          return fetchViaTitleFallback(debouncedFilters, currentPage);
        }
        throw new Error(dataError.message);
      }
      return { data: rows || [], count: count || 0 };
    },
    staleTime: 1000 * 60 * 5,
  });

  const total = data?.count || 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage < 1 || newPage > totalPages) return;
      setCurrentPage(newPage);
      document.getElementById("scholarship-listings")?.scrollIntoView({ behavior: "smooth" });
    },
    [totalPages]
  );

  const resetFilters = () => {
    setFilters({
      searchTerm: "",
      location: "",
      level: "",
      fieldOfStudy: "",
      sortBy: "newest",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <section className="relative overflow-hidden border-b border-border/40 min-h-[min(56vh,480px)] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A66C2]/15 via-background to-[#E8712B]/10" aria-hidden />
        <div className="container relative z-10 mx-auto py-12 md:py-16 px-4">
          <div className="max-w-4xl md:mx-auto md:text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-[#0A66C2] leading-[1.1]">
              {heroTitle}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-6 max-w-2xl leading-relaxed md:mx-auto">
              {heroSubtitle}
            </p>
            <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl shadow-xl border border-white/40 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="relative lg:col-span-2">
                  <input
                    type="text"
                    placeholder="Keywords"
                    value={filters.searchTerm}
                    onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                    className="w-full p-2 pl-8 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <select
                  value={filters.level}
                  onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md"
                >
                  <option value="">Any level</option>
                  {SCHOLARSHIP_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md"
                >
                  <option value="">Any county</option>
                  {KENYA_COUNTIES.map((county) => (
                    <option key={county.name} value={county.name}>
                      {county.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Field of study"
                  value={filters.fieldOfStudy}
                  onChange={(e) => setFilters({ ...filters, fieldOfStudy: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                  className="p-2 text-sm border border-gray-300 rounded-md"
                >
                  <option value="newest">Newest</option>
                  <option value="deadline">Deadline soonest</option>
                  <option value="oldest">Oldest</option>
                </select>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-6 md:py-8 flex-1">
        <div id="scholarship-listings">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading scholarships...</p>
            </div>
          ) : error ? (
            <div className="text-center py-32">
              <p className="text-2xl font-semibold mb-2">Error loading scholarships</p>
              <p className="text-muted-foreground mb-4">There was a problem loading listings.</p>
              <button
                onClick={() => refetch()}
                className="inline-flex items-center rounded-md border px-4 py-2 text-sm"
              >
                Try again
              </button>
            </div>
          ) : data && data.data.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {total} scholarship{total === 1 ? "" : "s"}
              </p>
              <div className="grid grid-cols-1 gap-4 md:gap-6">
                {data.data.map((row) => {
                  const company = jobCardCompany(row);
                  return (
                    <ScholarshipCard
                      key={row.id}
                      id={row.id}
                      title={row.title}
                      company={company?.name || row.company}
                      location={row.location || ""}
                      description={jobCardDescription(row)}
                      companyLogo={company?.logo}
                      companyWebsite={company?.website}
                      jobSlug={row.job_slug}
                      datePosted={row.date_posted}
                      validThrough={row.valid_through}
                      locationCity={row.job_location_city}
                      locationCounty={row.job_location_county}
                      isFeatured={row.is_featured}
                      isPromoted={row.is_promoted}
                      promotionTier={row.promotion_tier}
                      scholarshipLevel={row.scholarship_level}
                      scholarshipCoverage={row.scholarship_coverage}
                      fieldOfStudy={row.field_of_study}
                      areaOfStudy={row.area_of_study}
                    />
                  );
                })}
              </div>
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-md border disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-md border disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-24">
              <p className="text-2xl font-semibold mb-2">No scholarships found</p>
              <p className="text-muted-foreground mb-4">
                Try a different keyword, level, or county.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center rounded-md border px-4 py-2 text-sm"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
