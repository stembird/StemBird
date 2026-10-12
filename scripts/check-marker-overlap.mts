/**
 * Report marker positions and pairwise distances for counties that have jobs,
 * focusing on the dense Nairobi/Central region, to sanity-check label/marker
 * overlap risk. (Uses the same count pipeline as the map.)
 */
import { createClient } from "@supabase/supabase-js";
import { resolveCountyName } from "../src/lib/counties";
import {
  KENYA_COUNTY_SHAPES,
  KENYA_MAP_VIEW,
} from "../src/data/kenyaCountyShapes";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://qxuvqrfqkdpfjfwkqatf.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dXZxcmZxa2RwZmpmd2txYXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjcxNTIsImV4cCI6MjA3NTAwMzE1Mn0.mAiL1p6YqlSaSFOIDW_G-3e_Mqck0cFqLl74_jyNpk8"
);

async function main() {
  const counts = new Map<string, number>();
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
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    if (data.length < 1000) break;
  }

  const markers = KENYA_COUNTY_SHAPES.filter((c) => (counts.get(c.name) ?? 0) > 0)
    .map((c) => ({ name: c.name, x: c.x, y: c.y, count: counts.get(c.name)! }));

  console.log("=== MARKER POSITIONS (viewBox 1000x1234) ===");
  const rows = markers
    .slice()
    .sort((a, b) => a.x - b.x)
    .map((m) => `${m.name.padEnd(18)} x=${m.x.toFixed(1).padStart(7)} y=${m.y.toFixed(1).padStart(7)} n=${m.count}`);
  console.log(rows.join("\n"));

  console.log("\n=== CLOSEST PAIRS (potential overlap) ===");
  const pairs: { a: string; b: string; d: number }[] = [];
  for (let i = 0; i < markers.length; i++) {
    for (let j = i + 1; j < markers.length; j++) {
      const dx = markers[i].x - markers[j].x;
      const dy = markers[i].y - markers[j].y;
      pairs.push({ a: markers[i].name, b: markers[j].name, d: Math.hypot(dx, dy) });
    }
  }
  pairs.sort((a, b) => a.d - b.d);
  for (const p of pairs.slice(0, 15)) {
    const note =
      p.d < 18 ? "  <-- very close (marker radius ~12-26 at scale 1)" : "";
    console.log(`${p.a.padEnd(18)} ${p.b.padEnd(18)} dist=${p.d.toFixed(1)}${note}`);
  }
  console.log(`\nMap viewBox: ${KENYA_MAP_VIEW.width}x${KENYA_MAP_VIEW.height}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
