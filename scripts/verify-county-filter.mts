/**
 * Verify the jobs-search county filter behaviour used by the map links:
 * filtering by a canonical county name (via /jobs?location=...) must match
 * every stored spelling variant for that county. Cross-checks the filter's
 * row count against the canonical aggregation used by the map.
 */
import { createClient } from "@supabase/supabase-js";
import {
  KENYA_COUNTIES,
  countySearchValues,
  resolveCountyName,
} from "../src/lib/counties";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://qxuvqrfqkdpfjfwkqatf.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dXZxcmZxa2RwZmpmd2txYXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjcxNTIsImV4cCI6MjA3NTAwMzE1Mn0.mAiL1p6YqlSaSFOIDW_G-3e_Mqck0cFqLl74_jyNpk8"
);

async function countForCounty(values: string[]): Promise<number> {
  const { count, error } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .in("job_location_county", values);
  if (error) throw error;
  return count ?? 0;
}

async function main() {
  // Canonical aggregation (same as the map)
  const raw = new Map<string, number>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("jobs")
      .select("job_location_county")
      .eq("status", "active")
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      const name = resolveCountyName(row.job_location_county as string | null);
      if (!name) continue;
      raw.set(name, (raw.get(name) || 0) + 1);
    }
    if (data.length < 1000) break;
  }

  console.log("=== FILTER vs MAP AGGREGATION (active jobs) ===");
  let allMatch = true;
  for (const county of KENYA_COUNTIES) {
    const values = countySearchValues(county.name);
    const filterCount = await countForCounty(values);
    const mapCount = raw.get(county.name) ?? 0;
    const status = filterCount === mapCount ? "OK " : "DIFF";
    if (filterCount !== mapCount) allMatch = false;
    if (filterCount > 0 || mapCount > 0) {
      console.log(`${status} ${county.name.padEnd(18)} filter=${String(filterCount).padStart(4)}  map=${String(mapCount).padStart(4)}  values=${values.length}`);
    }
  }
  console.log(`\nAll counties match: ${allMatch ? "YES" : "NO (see DIFF)"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
