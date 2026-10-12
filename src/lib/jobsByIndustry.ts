import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabaseEnv";
import {
  FALLBACK_INDUSTRIES,
  resolveIndustryLabel,
} from "@/lib/jobParseNormalization";

const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());

export type IndustryJobCount = {
  /** Canonical Careersasa industry name (see src/lib/jobParseNormalization.ts). */
  name: string;
  /** Number of currently active/live jobs attributed to the industry. */
  count: number;
};

/** Page size for the fallback column-scan aggregation. */
const PAGE_SIZE = 1000;

/** Fallback label for jobs with no industry value. */
const UNCATEGORIZED = "Non-classified / Miscellaneous";

const ALLOWED_INDUSTRIES = [...FALLBACK_INDUSTRIES];

function sortCounts(counts: Map<string, number>): IndustryJobCount[] {
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function canonicalIndustry(raw: string | null | undefined): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return UNCATEGORIZED;
  return resolveIndustryLabel(trimmed, ALLOWED_INDUSTRIES) ?? UNCATEGORIZED;
}

/**
 * Aggregate the current active/live job counts by industry.
 *
 * Active/live follows the application's existing job-status logic: only
 * `status = 'active'` jobs are counted (drafts, pending and expired jobs are
 * excluded — the same set `expire_old_jobs()` and the jobs listing use).
 *
 * Names are mapped onto the jobs-page industry dropdown so hub links
 * (`/jobs?industry=…`) match the listing filter.
 *
 * This runs entirely server-side. It prefers the aggregated
 * `active_jobs_by_industry` view (created by the
 * `20260819_create_active_jobs_by_industry_view` migration); when the view has
 * not been applied yet it falls back to a paginated scan of the industry
 * column.
 *
 * The result is memoized per request with React `cache()`.
 */
export const getActiveJobsByIndustry: () => Promise<IndustryJobCount[]> = cache(
  async () => {
    const counts = new Map<string, number>();

    try {
      const { data: viewRows, error: viewError } = await supabase
        .from("active_jobs_by_industry")
        .select("industry_name, job_count");

      if (!viewError && Array.isArray(viewRows) && viewRows.length > 0) {
        for (const row of viewRows) {
          const name = canonicalIndustry(row.industry_name as string | null);
          counts.set(name, (counts.get(name) ?? 0) + Number(row.job_count ?? 0));
        }
        return sortCounts(counts);
      }
    } catch {
      // View missing or query failed — fall through to the column scan.
    }

    try {
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from("jobs")
          .select("industry")
          .eq("status", "active")
          .eq("listing_kind", "job")
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        for (const row of data) {
          const name = canonicalIndustry(row.industry as string | null);
          counts.set(name, (counts.get(name) ?? 0) + 1);
        }

        if (data.length < PAGE_SIZE) break;
      }

      return sortCounts(counts);
    } catch (error) {
      console.error("Failed to aggregate active jobs by industry:", error);
      return [];
    }
  }
);
