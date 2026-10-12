import { readFileSync } from "node:fs";
import {
  KENYA_COUNTY_SHAPES,
  KENYA_MAP_VIEW,
} from "../src/data/kenyaCountyShapes";

// Parse a path string like "M1,2L3,4L5,6Z" into points
function parsePath(d: string): Array<[number, number]> {
  const re = /([ML])(-?\d+\.?\d*),(-?\d+\.?\d*)/g;
  const pts: Array<[number, number]> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    pts.push([parseFloat(m[2]), parseFloat(m[3])]);
  }
  return pts;
}

function pointInPolygon(px: number, py: number, pts: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Verify centroid-in-polygon for each county (largest path)
let failures = 0;
for (const county of KENYA_COUNTY_SHAPES) {
  const rings = county.paths.map(parsePath);
  const main = rings.sort((a, b) => ringArea(b) - ringArea(a))[0];
  const inside = pointInPolygon(county.x, county.y, main);
  if (!inside) {
    console.log(`CENTROID OUTSIDE: ${county.name} (x=${county.x}, y=${county.y})`);
    failures++;
  }
}
console.log(`Centroid-in-polygon failures: ${failures}/${KENYA_COUNTY_SHAPES.length}`);

function ringArea(pts: Array<[number, number]>): number {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  }
  return Math.abs(a / 2);
}

// ASCII render at ~46% scale (100 wide)
const cols = 100;
const rows = Math.round((KENYA_MAP_VIEW.height / KENYA_MAP_VIEW.width) * cols);
const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill("."));

const sx = cols / KENYA_MAP_VIEW.width;
const sy = rows / KENYA_MAP_VIEW.height;

// Rasterize polygon with point-in-polygon per cell (cheap at this resolution)
function fillPolygon(pts: Array<[number, number]>, ch: string) {
  const minX = Math.floor(Math.min(...pts.map((p) => p[0])) * sx);
  const maxX = Math.ceil(Math.max(...pts.map((p) => p[0])) * sx);
  const minY = Math.floor(Math.min(...pts.map((p) => p[1])) * sy);
  const maxY = Math.ceil(Math.max(...pts.map((p) => p[1])) * sy);
  for (let y = Math.max(0, minY); y <= Math.min(rows - 1, maxY); y++) {
    for (let x = Math.max(0, minX); x <= Math.min(cols - 1, maxX); x++) {
      const px = (x + 0.5) / sx;
      const py = (y + 0.5) / sy;
      if (pointInPolygon(px, py, pts)) grid[y][x] = ch;
    }
  }
}

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz012345";
KENYA_COUNTY_SHAPES.forEach((county, i) => {
  const rings = county.paths.map(parsePath).sort((a, b) => ringArea(b) - ringArea(a));
  fillPolygon(rings[0], chars[i % chars.length]);
});

console.log("\nASCII RENDER (each letter is a county, centroid marked with *):");
const labelMap: Record<number, number> = {};
KENYA_COUNTY_SHAPES.forEach((county, i) => {
  const cx = Math.round(county.x * sx);
  const cy = Math.round(county.y * sy);
  if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) labelMap[cy * cols + cx] = i;
});
for (let y = 0; y < rows; y++) {
  let line = "";
  for (let x = 0; x < cols; x++) {
    const idx = labelMap[y * cols + x];
    if (idx !== undefined) line += "*";
    else line += grid[y][x];
  }
  console.log(line);
}

console.log("\nCounty -> char legend:");
KENYA_COUNTY_SHAPES.forEach((county, i) => {
  console.log(`${chars[i % chars.length]} = ${county.name}`);
});
