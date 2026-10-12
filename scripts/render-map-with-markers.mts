/**
 * Render a PNG preview of the jobs map using REAL live job counts from the
 * database, so the marker layout / overlap behaviour can be eyeballed.
 */
import { createCanvas, Path2D } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
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

async function getCounts() {
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
  return counts;
}

const W = KENYA_MAP_VIEW.width;
const H = KENYA_MAP_VIEW.height;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");

ctx.fillStyle = "#f8fafc";
ctx.fillRect(0, 0, W, H);

for (const county of KENYA_COUNTY_SHAPES) {
  for (const d of county.paths) {
    const p = new Path2D(d);
    ctx.fillStyle = "#eef2f7";
    ctx.fill(p);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    ctx.stroke(p);
  }
}

const counts = await getCounts();

// Green markers at county centroids
for (const county of KENYA_COUNTY_SHAPES) {
  const n = counts.get(county.name) ?? 0;
  if (n <= 0) continue;
  const r = 10 + Math.min(16, Math.log10(n) * 5);
  ctx.beginPath();
  ctx.arc(county.x, county.y, r, 0, Math.PI * 2);
  ctx.fillStyle = "#16a34a";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${r > 14 ? 14 : 12}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n), county.x, county.y);
}

// County names
ctx.fillStyle = "#1e293b";
ctx.font = "11px sans-serif";
ctx.textAlign = "center";
for (const county of KENYA_COUNTY_SHAPES) {
  const n = counts.get(county.name) ?? 0;
  if (n <= 0) continue;
  ctx.fillText(county.name, county.x, county.y + 20);
}

writeFileSync("scripts/kenya-map-jobs-preview.png", canvas.toBuffer("image/png"));
console.log("Wrote scripts/kenya-map-jobs-preview.png");
console.log(`Counties rendered: ${KENYA_COUNTY_SHAPES.length}`);
console.log(`Counties with markers: ${[...counts.entries()].filter(([, n]) => n > 0).length}`);
