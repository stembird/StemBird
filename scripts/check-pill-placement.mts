/**
 * Verify the marker pill-placement algorithm (same logic as KenyaJobsMap)
 * against real DB counts — confirms no marker-vs-marker or pill-vs-pill
 * overlaps remain (e.g. Busia/Kakamega, Siaya/Kisumu).
 */
import { createClient } from "@supabase/supabase-js";
import { resolveCountyName } from "../src/lib/counties";
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

const MARKER_NUDGE: Record<string, [number, number]> = { Kiambu: [-9, -20] };

function markerRadius(count: number) {
  if (count <= 0) return 0;
  return 6 + Math.min(12, Math.log2(count + 1) * 1.5);
}
function pillWidth(count: number) {
  return count.toLocaleString().length * 8.2 + 18;
}

type M = { name: string; x: number; y: number; r: number; count: number };
type Rect = { x0: number; y0: number; x1: number; y1: number };
const intersects = (a: Rect, b: Rect) =>
  a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

function placements(markers: M[]) {
  const circleRects = markers.map((m) => ({
    x0: m.x - m.r,
    y0: m.y - m.r,
    x1: m.x + m.r,
    y1: m.y + m.r,
  }));
  const placedPills: Rect[] = [];
  const result = new Map<string, { flip: boolean; showPill: boolean }>();
  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    const pW = pillWidth(m.count);
    const right: Rect = { x0: m.x + m.r, y0: m.y - 11, x1: m.x + m.r + 8 + pW, y1: m.y + 11 };
    const left: Rect = { x0: m.x - m.r - 8 - pW, y0: m.y - 11, x1: m.x - m.r, y1: m.y + 11 };
    const collides = (r: Rect) =>
      circleRects.some((o, j) => j !== i && intersects(r, o)) ||
      placedPills.some((p) => intersects(r, p));
    if (!collides(right)) {
      result.set(m.name, { flip: false, showPill: true });
      placedPills.push(right);
    } else if (!collides(left)) {
      result.set(m.name, { flip: true, showPill: true });
      placedPills.push(left);
    } else {
      result.set(m.name, { flip: false, showPill: false });
    }
  }
  return result;
}

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

  const markers: M[] = KENYA_COUNTY_SHAPES.filter(
    (c) => (counts.get(KENYA_SHAPE_TO_CANONICAL[c.name] ?? c.name) ?? 0) > 0
  )
    .map((c) => {
      const canonical = KENYA_SHAPE_TO_CANONICAL[c.name] ?? c.name;
      const n = MARKER_NUDGE[canonical];
      return {
        name: canonical,
        x: c.x + (n?.[0] ?? 0),
        y: c.y + (n?.[1] ?? 0),
        r: markerRadius(counts.get(canonical)!),
        count: counts.get(canonical)!,
      };
    })
    .sort((a, b) => b.count - a.count);

  const place = placements(markers);
  const report: string[] = [];
  for (const m of markers) {
    const p = place.get(m.name)!;
    const placement = !p.showPill ? "count-inside" : p.flip ? "flip-left" : "right";
    report.push(`${m.name.padEnd(16)} n=${String(m.count).padStart(4)} r=${m.r.toFixed(1).padStart(5)}  pill=${placement}`);
  }
  console.log(report.join("\n"));

  // Assert no circle-vs-circle or pill-vs-pill overlaps.
  let failures = 0;
  for (let i = 0; i < markers.length; i++) {
    for (let j = i + 1; j < markers.length; j++) {
      const a = markers[i];
      const b = markers[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < a.r + b.r - 0.5) {
        console.log(`CIRCLE OVERLAP: ${a.name} <-> ${b.name} dist=${d.toFixed(1)} (r sum ${(a.r + b.r).toFixed(1)})`);
        failures++;
      }
    }
  }

  const pillRects: { name: string; rect: Rect }[] = [];
  for (const m of markers) {
    const p = place.get(m.name)!;
    if (!p.showPill) continue;
    const pW = pillWidth(m.count);
    pillRects.push({
      name: m.name,
      rect: p.flip
        ? { x0: m.x - m.r - 8 - pW, y0: m.y - 11, x1: m.x - m.r, y1: m.y + 11 }
        : { x0: m.x + m.r, y0: m.y - 11, x1: m.x + m.r + 8 + pW, y1: m.y + 11 },
    });
  }
  for (let i = 0; i < pillRects.length; i++) {
    for (let j = i + 1; j < pillRects.length; j++) {
      if (intersects(pillRects[i].rect, pillRects[j].rect)) {
        console.log(`PILL OVERLAP: ${pillRects[i].name} <-> ${pillRects[j].name}`);
        failures++;
      }
    }
  }

  console.log(`\nCounties with jobs: ${markers.length}`);
  console.log(failures === 0 ? "No overlaps. " : `${failures} overlap(s) found. `);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
