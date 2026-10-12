import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabaseEnv";
import { resolveCountyName } from "@/lib/counties";

const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());

export type CountyJobCount = {
  /** Canonical Careersasa county name (see src/lib/counties.ts). */
  name: string;
  /** Number of currently active/live jobs attributed to the county. */
  count: number;
};

/** Page size for the fallback column-scan aggregation. */
const PAGE_SIZE = 1000;

function sortCounts(counts: Map<string, number>): CountyJobCount[] {
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * Aggregate the current active/live job counts by county for the Kenya map
 * on the jobs-by-county hub and the homepage teaser.
 *
 * Active/live follows the application's existing job-status logic: only
 * `status = 'active'` jobs are counted (drafts, pending and expired jobs are
 * excluded — the same set `expire_old_jobs()` and the jobs listing use).
 *
 * This runs entirely server-side so the homepage never fetches individual job
 * records to compute county counts. It prefers the aggregated
 * `active_jobs_by_county` view (created by the
 * `20260817_create_active_jobs_by_county_view` migration); when the view has
 * not been applied yet it falls back to a paginated scan of just the county
 * column, which is a single cheap request for a handful of small strings.
 *
 * The result is memoized per request with React `cache()` so multiple server
 * components asking for the same data share one query.
 */
export const getActiveJobsByCounty: () => Promise<CountyJobCount[]> = cache(
  async () => {
    const counts = new Map<string, number>();

    try {
      const { data: viewRows, error: viewError } = await supabase
        .from("active_jobs_by_county")
        .select("county, job_count");

      if (!viewError && Array.isArray(viewRows) && viewRows.length > 0) {
        for (const row of viewRows) {
          const name = resolveCountyName(row.county as string | null);
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
          .select("job_location_county")
          .eq("status", "active")
          .eq("listing_kind", "job")
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        for (const row of data) {
          const name = resolveCountyName(row.job_location_county as string | null);
          if (!name) continue;
          counts.set(name, (counts.get(name) ?? 0) + 1);
        }

        if (data.length < PAGE_SIZE) break;
      }

      return sortCounts(counts);
    } catch (error) {
      // The map is a progressive enhancement — if Supabase is unreachable the
      // homepage renders without the section rather than failing the page.
      console.error("Failed to aggregate active jobs by county:", error);
      return [];
    }
  }
);
