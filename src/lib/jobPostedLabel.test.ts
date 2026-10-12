/**
 * Lightweight assertions for jobPostedLabel.
 * Run: npx tsx src/lib/jobPostedLabel.test.ts
 */

import { jobPostedLabel } from "./textUtils";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const now = Date.parse("2026-07-18T12:00:00.000Z");

function hoursAgo(h: number) {
  return new Date(now - h * 60 * 60 * 1000).toISOString();
}

function daysAgo(d: number) {
  return hoursAgo(d * 24);
}

assert(jobPostedLabel(null, now) === "", "null → empty");
assert(jobPostedLabel(undefined, now) === "", "undefined → empty");
assert(jobPostedLabel(hoursAgo(1), now) === "Just posted", "1h → Just posted");
assert(jobPostedLabel(hoursAgo(5.9), now) === "Just posted", "5.9h → Just posted");
assert(jobPostedLabel(hoursAgo(6), now) === "6 hours ago", "6h → 6 hours ago");
assert(jobPostedLabel(hoursAgo(7), now) === "7 hours ago", "7h → 7 hours ago");
assert(jobPostedLabel(hoursAgo(23), now) === "23 hours ago", "23h → 23 hours ago");
assert(jobPostedLabel(daysAgo(1), now) === "1 day ago", "1d → 1 day ago");
assert(jobPostedLabel(daysAgo(5), now) === "5 days ago", "5d → 5 days ago");
assert(jobPostedLabel(daysAgo(7), now) === "1 week ago", "7d → 1 week ago");
assert(jobPostedLabel(daysAgo(14), now) === "2 weeks ago", "14d → 2 weeks ago");
assert(jobPostedLabel(daysAgo(35), now) === "1 month ago", "35d → 1 month ago");
assert(jobPostedLabel(daysAgo(400), now) === "1 year ago", "400d → 1 year ago");

console.log("jobPostedLabel.test.ts: all assertions passed");
