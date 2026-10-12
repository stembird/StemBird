import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabaseEnv";

const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());

export type FunctionJobCount = {
  /** Canonical Careersasa job function name (see src/lib/jobParseNormalization.ts). */
  name: string;
  /** Number of currently active/live jobs attributed to the function. */
  count: number;
};

/** Page size for the fallback column-scan aggregation. */
const PAGE_SIZE = 1000;

/** Fallback label for jobs with no function value. */
const UNCATEGORIZED = "Other / Miscellaneous";

function sortCounts(counts: Map<string, number>): FunctionJobCount[] {
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * Aggregate the current active/live job counts by function for the
 * jobs-by-function hub and homepage teaser.
 *
 * Active/live follows the application's existing job-status logic: only
 * `status = 'active'` jobs are counted (drafts, pending and expired jobs are
 * excluded — the same set `expire_old_jobs()` and the jobs listing use).
 *
 * This runs entirely server-side so the homepage never fetches individual job
 * records to compute function counts. It prefers the aggregated
 * `active_jobs_by_function` view (created by the
 * `20260818_create_active_jobs_by_function_view` migration); when the view has
 * not been applied yet it falls back to a paginated scan of just the function
 * column, which is a single cheap request for a handful of small strings.
 *
 * The result is memoized per request with React `cache()` so multiple server
 * components asking for the same data share one query.
 */
export const getActiveJobsByFunction: () => Promise<FunctionJobCount[]> = cache(
  async () => {
    const counts = new Map<string, number>();

    try {
      const { data: viewRows, error: viewError } = await supabase
        .from("active_jobs_by_function")
        .select("function_name, job_count");

      if (!viewError && Array.isArray(viewRows) && viewRows.length > 0) {
        for (const row of viewRows) {
          const name = String(row.function_name || UNCATEGORIZED).trim();
          if (!name) continue;
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
          .select("job_function")
          .eq("status", "active")
          .eq("listing_kind", "job")
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        for (const row of data) {
          const name = String(row.job_function ?? "").trim();
          counts.set(name || UNCATEGORIZED, (counts.get(name || UNCATEGORIZED) ?? 0) + 1);
        }

        if (data.length < PAGE_SIZE) break;
      }

      return sortCounts(counts);
    } catch (error) {
      // The visualization is a progressive enhancement — if Supabase is
      // unreachable the homepage renders without the section rather than
      // failing the page.
      console.error("Failed to aggregate active jobs by function:", error);
      return [];
    }
  }
);
