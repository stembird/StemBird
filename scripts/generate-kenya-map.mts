import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

type GeoJSON = {
  type: string;
  features: Array<{
    type: string;
    properties: Record<string, unknown>;
    geometry: {
      type: string;
      coordinates: number[][][][] | number[][][] | number[][] | number[];
    };
  }>;
};

const geojson = JSON.parse(
  readFileSync(join(tmpdir(), "kenya-counties-simplified.geojson"), "utf8")
) as GeoJSON;

// ---- Projection setup (equirectangular fitted to Kenya) ----
let lonMin = Infinity, lonMax = -Infinity, latMin = Infinity, latMax = -Infinity;

function walkCoords(
  coords: number[][][][] | number[][][] | number[][] | number[],
  fn: (lon: number, lat: number) => void
) {
  const first = coords[0];
  if (typeof first === "number") {
    fn(coords[0] as number, coords[1] as number);
    return;
  }
  for (const c of coords) walkCoords(c as number[][][], fn);
}

for (const f of geojson.features) {
  walkCoords(f.geometry.coordinates, (lon, lat) => {
    if (lon < lonMin) lonMin = lon;
    if (lon > lonMax) lonMax = lon;
    if (lat < latMin) latMin = lat;
    if (lat > latMax) latMax = lat;
  });
}

const PAD_LON = 0.35;
const PAD_LAT = 0.3;
lonMin -= PAD_LON;
lonMax += PAD_LON;
latMin -= PAD_LAT;
latMax += PAD_LAT;

const VIEW_W = 1000;
const scale = VIEW_W / (lonMax - lonMin);
const VIEW_H = (latMax - latMin) * scale;

function project(lon: number, lat: number): [number, number] {
  return [(lon - lonMin) * scale, (latMax - lat) * scale];
}

// ---- Douglas-Peucker simplification (tolerance in viewBox units) ----
const TOLERANCE = 1.5;

function perpDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
  return Math.abs(dy * px - dx * py + x2 * y1 - y2 * x1) / Math.hypot(dx, dy);
}

function simplifyRing(ring: number[][], tol: number): number[][] {
  const pts = ring.map(([lon, lat]) => project(lon, lat));
  if (pts.length <= 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, pts.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let maxDist = 0;
    let idx = -1;
    for (let i = start + 1; i < end; i++) {
      const d = perpDistance(pts[i][0], pts[i][1], pts[start][0], pts[start][1], pts[end][0], pts[end][1]);
      if (d > maxDist) {
        maxDist = d;
        idx = i;
      }
    }
    if (maxDist > tol && idx !== -1) {
      keep[idx] = 1;
      stack.push([start, idx]);
      stack.push([idx, end]);
    }
  }
  return pts.filter((_, i) => keep[i] === 1);
}

// ---- Polygon → SVG path ----
function ringToPath(ring: number[][]): string {
  const simplified = simplifyRing(ring, TOLERANCE);
  let d = "";
  for (let i = 0; i < simplified.length; i++) {
    const [x, y] = simplified[i];
    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }
  d += "Z";
  return d;
}

function polygonToPaths(polygon: number[][][]): string[] {
  return polygon.map(ringToPath);
}

function geometryToPaths(geometry: {
  type: string;
  coordinates: number[][][][] | number[][][] | number[][] | number[];
}): string[] {
  if (geometry.type === "Polygon") {
    return polygonToPaths(geometry.coordinates as number[][][]);
  }
  if (geometry.type === "MultiPolygon") {
    const paths: string[] = [];
    for (const poly of geometry.coordinates as number[][][][]) {
      paths.push(...polygonToPaths(poly));
    }
    return paths;
  }
  return [];
}

// ---- Polygon area / centroid (shoelace) ----
function polygonCentroid(ring: number[][]): { x: number; y: number; area: number } {
  let cx = 0, cy = 0, area = 0;
  const pts = ring.map(([lon, lat]) => project(lon, lat));
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % n];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  area /= 2;
  if (area === 0) {
    // Degenerate ring — fall back to average
    const sx = pts.reduce((s, [x]) => s + x, 0) / n;
    const sy = pts.reduce((s, [, y]) => s + y, 0) / n;
    return { x: sx, y: sy, area: 0 };
  }
  return { x: cx / (6 * area), y: cy / (6 * area), area: Math.abs(area) };
}

// ---- Build output ----
const counties = geojson.features
  .map((f, idx) => {
    const shapeName = String(f.properties.shapeName ?? `county-${idx}`);
    const paths = geometryToPaths(f.geometry);
    // Centroid of largest polygon (main landmass)
    const polys: number[][][][] =
      f.geometry.type === "Polygon"
        ? [f.geometry.coordinates as number[][][]]
        : (f.geometry.coordinates as number[][][][]);
    let best = { x: 0, y: 0, area: -1 };
    for (const poly of polys) {
      const c = polygonCentroid(poly[0]);
      if (c.area > best.area) best = c;
    }
    // Bounding box of the largest polygon (for label-space heuristics)
    const mainRing = polys.map((p) => p[0]).sort((a, b) => polygonCentroid(b).area - polygonCentroid(a).area)[0];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [lon, lat] of mainRing) {
      const [x, y] = project(lon, lat);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return {
      name: shapeName,
      paths,
      centroid: { x: best.x, y: best.y },
      size: Math.max(maxX - minX, maxY - minY),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

// Normalize an id: lowercase, replace non-word chars with '-'
function countyId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const lines: string[] = [];
lines.push(
  "// Generated from HDX Kenya counties GeoJSON (kenya-counties-simplified, 2022-07).",
  "// Projected with an equirectangular projection fitted to Kenya's bounding box.",
  "// Each entry: { name: canonical GeoJSON shape name, id: slug, paths: SVG path d strings,",
  "//   x, y: projected centroid in viewBox units (for markers/labels),",
  "//   size: largest-polygon span in viewBox units (for label-space heuristics) }.",
  "export type KenyaCountyShape = {",
  "  name: string;",
  "  id: string;",
  "  paths: string[];",
  "  x: number;",
  "  y: number;",
  "  size: number;",
  "};",
  "",
  `export const KENYA_MAP_VIEW = { width: ${Math.round(VIEW_W)}, height: ${Math.round(VIEW_H)} } as const;`,
  "",
  "export const KENYA_COUNTY_SHAPES: KenyaCountyShape[] = ["
);

for (const c of counties) {
  const id = countyId(c.name);
  lines.push(
    `  { name: ${JSON.stringify(c.name)}, id: ${JSON.stringify(id)},`,
    `    x: ${c.centroid.x.toFixed(2)}, y: ${c.centroid.y.toFixed(2)}, size: ${c.size.toFixed(2)},`,
    "    paths: ["
  );
  for (const p of c.paths) {
    lines.push(`      ${JSON.stringify(p)},`);
  }
  lines.push("    ],");
  lines.push("  },");
}

lines.push("];", "");
lines.push(
  "// Map a GeoJSON shape name to the Careersasa canonical county name.",
  "// Canonical names come from the shared county list used by the jobs search filter."
);
lines.push("export const KENYA_SHAPE_TO_CANONICAL: Record<string, string> = {");
const CANONICAL_NAMES: Record<string, string> = {
  Tharaka: "Tharaka–Nithi",
  "Taita Taveta": "Taita–Taveta",
};
for (const c of counties) {
  lines.push(`  ${JSON.stringify(c.name)}: ${JSON.stringify(CANONICAL_NAMES[c.name] ?? c.name)},`);
}
lines.push("};", "");

const outFile = join(process.cwd(), "src", "data", "kenyaCountyShapes.ts");
writeFileSync(outFile, lines.join("\n"), "utf8");
console.log(
  `Wrote ${outFile} with ${counties.length} counties, viewBox ${Math.round(VIEW_W)}x${Math.round(VIEW_H)}, ` +
  `bounds lon [${lonMin.toFixed(2)}, ${lonMax.toFixed(2)}] lat [${latMin.toFixed(2)}, ${latMax.toFixed(2)}]`
);
