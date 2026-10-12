import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qxuvqrfqkdpfjfwkqatf.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dXZxcmZxa2RwZmpmd2txYXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjcxNTIsImV4cCI6MjA3NTAwMzE1Mn0.mAiL1p6YqlSaSFOIDW_G-3e_Mqck0cFqLl74_jyNpk8"
);

async function main() {
  // Total active jobs
  const { count: totalActive } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");
  console.log("TOTAL ACTIVE JOBS:", totalActive);

  // Distinct job_location_county for active jobs
  const { data: counties } = await supabase
    .from("jobs")
    .select("job_location_county")
    .eq("status", "active")
    .limit(1000);

  const counts: Record<string, number> = {};
  const nullCount = { total: 0 };
  for (const row of counties || []) {
    const c = row.job_location_county;
    if (!c) nullCount.total++;
    else counts[c] = (counts[c] || 0) + 1;
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  console.log("\nDISTINCT COUNTY VALUES (sample up to 1000 rows):");
  for (const [county, n] of sorted) {
    console.log(`${String(n).padStart(4)}  ${county}`);
  }
  console.log(`\nNULL county count (of sampled): ${nullCount.total}`);

  // Check county_id usage
  const { data: countyIdJobs } = await supabase
    .from("jobs")
    .select("job_location_county, county_id")
    .eq("status", "active")
    .limit(1000);

  const withCountyId = (countyIdJobs || []).filter((r) => r.county_id != null).length;
  console.log(`\nSample rows with county_id set: ${withCountyId} / ${(countyIdJobs || []).length}`);

  // Full counts via fetch-all (paginated) to get exact numbers
  const allCounts: Record<string, number> = {};
  let total = 0;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("jobs")
      .select("job_location_county")
      .eq("status", "active")
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      total++;
      if (!row.job_location_county) continue;
      allCounts[row.job_location_county] = (allCounts[row.job_location_county] || 0) + 1;
    }
  }
  console.log("\nEXACT PER-COUNTY COUNTS (all active jobs):");
  const sortedAll = Object.entries(allCounts).sort((a, b) => b[1] - a[1]);
  for (const [county, n] of sortedAll) {
    console.log(`${String(n).padStart(5)}  ${county}`);
  }
  console.log(`\nTOTAL with county: ${total}`);
  console.log(`Sum of county counts: ${sortedAll.reduce((s, [, n]) => s + n, 0)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
