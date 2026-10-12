/**
 * Render the KenyaJobsMap component to static HTML with REAL job counts to
 * verify the initial render path (memos, marker math, SVG output) doesn't
 * throw and produces the expected markers/counts. Effects are not run here.
 *
 * The component is loaded via require() (after patching Module._load for
 * next/link) so the mock is applied before its imports resolve.
 */
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createClient } from "@supabase/supabase-js";
import { resolveCountyName } from "../src/lib/counties";

const require = createRequire(import.meta.url);

// Mock next/link so the component can render outside Next.js.
const Module = require("module") as any;
const originalLoad = Module._load;
Module._load = function (
  this: unknown,
  request: string,
  parent: unknown,
  isMain: boolean
) {
  if (request === "next/link") {
    return function MockLink({ href, children, ...props }: any) {
      return createElement("a", { href, ...props }, children);
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

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
  const countsArray = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const { KenyaJobsMap } = require("../src/components/map/KenyaJobsMap.tsx");

  // The component relies on the automatic JSX runtime; when transpiled through
  // the CJS require hook it may emit React.createElement — make React global.
  (globalThis as any).React = require("react");

  const html = renderToStaticMarkup(
    createElement(KenyaJobsMap, { counts: countsArray })
  );

  const markerCircles = (html.match(/fill="#16a34a"/g) || []).length;
  const countPills = (html.match(/kenya-marker-count/g) || []).length;
  const countInside = (html.match(/font-size:12.5px/g) || []).length;
  console.log("Render OK. HTML length:", html.length);
  console.log(`Green markers rendered:      ${markerCircles}`);
  console.log(`Count pills rendered:        ${countPills}`);
  console.log(`Counts-inside-circle:        ${countInside}`);
  console.log(`County paths rendered:       ${(html.match(/kenya-county-shape/g) || []).length}`);
  console.log(`Summary chip present:        ${html.includes("live jobs")}`);
  console.log(`Nairobi count present:       ${html.includes(">989<")}`);
  console.log(`Nairobi count pill:          ${html.includes("989")}`);

  const expected = countsArray.filter((c) => c.count > 0).length;
  console.log(`\nExpected markers (counties with jobs): ${expected}`);
  if (markerCircles !== expected) {
    console.error(`MISMATCH: expected ${expected} markers, got ${markerCircles}`);
    process.exitCode = 1;
  } else {
    console.log("Marker count matches real data.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
