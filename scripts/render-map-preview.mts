import { createCanvas, Path2D } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
import {
  KENYA_COUNTY_SHAPES,
  KENYA_MAP_VIEW,
} from "../src/data/kenyaCountyShapes";

const W = KENYA_MAP_VIEW.width;
const H = KENYA_MAP_VIEW.height;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");

ctx.fillStyle = "#f0f4f8";
ctx.fillRect(0, 0, W, H);

const palette = [
  "#8ecae6", "#a2d2ff", "#bde0fe", "#ffc8dd", "#ffafcc",
  "#cdb4db", "#ffcdb2", "#ffb4a2", "#e5989b", "#b5838d",
  "#a8dadc", "#f1faee", "#e9c46a", "#f4a261", "#e76f51",
];

const named: Record<string, string> = {
  Nairobi: "#0A66C2",
  Mombasa: "#f97316",
  Kiambu: "#2a9d8f",
  Turkana: "#e9c46a",
  Marsabit: "#e76f51",
};

const labels: string[] = [];

KENYA_COUNTY_SHAPES.forEach((county, i) => {
  const fill = named[county.name] || palette[i % palette.length];
  for (const d of county.paths) {
    const p = new Path2D(d);
    ctx.fillStyle = fill;
    ctx.fill(p);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke(p);
  }
  labels.push(county.name);
});

// Draw centroids
ctx.fillStyle = "#111111";
for (const county of KENYA_COUNTY_SHAPES) {
  ctx.beginPath();
  ctx.arc(county.x, county.y, 3, 0, Math.PI * 2);
  ctx.fill();
}

// Draw name labels at centroid
ctx.fillStyle = "#000";
ctx.font = "12px sans-serif";
ctx.textAlign = "center";
for (const county of KENYA_COUNTY_SHAPES) {
  ctx.fillText(county.name, county.x, county.y + 16);
}

writeFileSync("scripts/kenya-map-preview.png", canvas.toBuffer("image/png"));
console.log("Wrote scripts/kenya-map-preview.png");
console.log(`Counties rendered: ${KENYA_COUNTY_SHAPES.length}`);
console.log(`ViewBox: ${W}x${H}`);
