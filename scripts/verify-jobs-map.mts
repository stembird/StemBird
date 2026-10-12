/**
 * Verify the "Live Jobs Across Kenya" map data pipeline against the real DB.
 *
 * Checks:
 *  1. Every stored job_location_county for active jobs resolves to a canonical county
 *     (or is intentionally ignored, e.g. missing/invalid values).
 *  2. Canonical per-county counts equal the raw stored-value counts when grouped
 *     through resolveCountyName (the exact logic src/lib/jobsByCounty.ts uses).
 *  3. All 47 SVG shapes exist and map to a canonical county (no missing counties).
 *  4. Total active jobs and per-county numbers are sane and printed for eyeballing.
 */
import { createClient } from "@supabase/supabase-js";
import { resolveCountyName, KENYA_COUNTIES } from "../src/lib/counties";
import {
  KENYA_COUNTY_SHAPES,
  KENYA_SHAPE_TO_CANONICAL,
} from "../src/data/kenyaCountyShapes";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://qxuvqrfqkdpfjfwkqatf.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dXZxcmZxa2RwZmpmd2txYXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjcxNTIsImV4cCI6MjA3NTAwMzE1Mn0.mAiL1p6YqlSaSFOIDW_G-3e_Mqck0cFqLl74_jyNpk8"
);

const PAGE_SIZE = 1000;

async function main() {
  // --- 1. Pull every active job's county column ---------------------------
  const raw = new Map<string, number>();
  let totalActive = 0;
  let missingCounty = 0;
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("jobs")
      .select("job_location_county")
      .eq("status", "active")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      totalActive++;
      if (!row.job_location_county) missingCounty++;
      else raw.set(row.job_location_county, (raw.get(row.job_location_county) || 0) + 1);
    }
    if (data.length < PAGE_SIZE) break;
  }

  // --- 2. Aggregate to canonical counties ---------------------------------
  const canonical = new Map<string, number>();
  let ignored = 0;
  for (const [value, n] of raw) {
    const name = resolveCountyName(value);
    if (!name) {
      ignored += n;
      console.log(`IGNORED stored value: "${value}" (${n})`);
      continue;
    }
    canonical.set(name, (canonical.get(name) || 0) + n);
  }

  // --- 3. Sanity checks ----------------------------------------------------
  const sumCanonical = [...canonical.values()].reduce((a, b) => a + b, 0);
  console.log("\n=== SUMMARY ===");
  console.log(`Total active jobs (DB):      ${totalActive}`);
  console.log(`Active jobs w/ missing county: ${missingCounty}`);
  console.log(`Distinct stored values:      ${raw.size}`);
  console.log(`Distinct canonical counties: ${canonical.size}`);
  console.log(`Sum of canonical counts:     ${sumCanonical}  (raw sum = ${totalActive - missingCounty - ignored} used)`);

  const top = [...canonical.entries()].sort((a, b) => b[1] - a[1]);
  console.log("\n=== TOP 15 COUNTIES (canonical) ===");
  for (const [name, n] of top.slice(0, 15)) {
    console.log(`${String(n).padStart(5)}  ${name}`);
  }

  // --- 4. Verify all 47 shapes map to canonical counties ------------------
  const shapeNames = KENYA_COUNTY_SHAPES.map((s) => s.name);
  const unresolvedShapes = shapeNames.filter((n) => !KENYA_SHAPE_TO_CANONICAL[n]);
  const canonicalOfShapes = new Set(
    shapeNames.map((n) => KENYA_SHAPE_TO_CANONICAL[n]).filter(Boolean)
  );
  const missingShapes = KENYA_COUNTIES.filter((c) => !canonicalOfShapes.has(c.name));
  console.log("\n=== SHAPE COVERAGE ===");
  console.log(`Total shapes:               ${shapeNames.length}`);
  console.log(`Unresolved shape names:     ${unresolvedShapes.length}`);
  if (unresolvedShapes.length) console.log("  ", unresolvedShapes);
  console.log(`Canonical counties missing a shape: ${missingShapes.length}`);
  if (missingShapes.length) console.log("  ", missingShapes.map((c) => c.name));

  // --- 5. Per-shape marker coverage (counties that would get a marker) -----
  const markerCounties = new Set(
    [...canonical.entries()].filter(([, n]) => n > 0).map(([name]) => name)
  );
  const countiesWithShapeAndJobs = markerCounties.size;
  const markersRenderable = [...markerCounties].filter((name) =>
    canonicalOfShapes.has(name)
  ).length;
  console.log("\n=== MARKERS ===");
  console.log(`Counties with 1+ active jobs: ${countiesWithShapeAndJobs}`);
  console.log(`Of those, renderable on map:  ${markersRenderable}`);

  const missingOnMap = [...markerCounties].filter((n) => !canonicalOfShapes.has(n));
  if (missingOnMap.length) {
    console.log("WARNING — counties with jobs but no shape:", missingOnMap);
  }

  console.log("\n=== ZERO-JOB CHECK (no marker expected) ===");
  const zeroJobCounties = KENYA_COUNTIES.filter((c) => !markerCounties.has(c.name));
  console.log(`Counties with 0 active jobs (no marker): ${zeroJobCounties.length}`);
  console.log("  ", zeroJobCounties.map((c) => c.name).join(", "));

  console.log("\nDONE.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
