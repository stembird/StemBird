/** Time the exact queries getActiveJobsByCounty() uses against the live DB. */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://qxuvqrfqkdpfjfwkqatf.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dXZxcmZxa2RwZmpmd2txYXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjcxNTIsImV4cCI6MjA3NTAwMzE1Mn0.mAiL1p6YqlSaSFOIDW_G-3e_Mqck0cFqLl74_jyNpk8"
);

const timing = async (label: string, fn: () => Promise<unknown>) => {
  const t0 = performance.now();
  await fn();
  console.log(`${label.padEnd(52)} ${(performance.now() - t0).toFixed(0)} ms`);
};

async function main() {
  await timing("warm-up: count active jobs (head:true)", () =>
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "active"));

  await timing("page 1: 1000 rows of job_location_county", () =>
    supabase.from("jobs").select("job_location_county").eq("status", "active").range(0, 999));

  await timing("page 2: 1000 rows of job_location_county", () =>
    supabase.from("jobs").select("job_location_county").eq("status", "active").range(1000, 1999));

  await timing("page 3: rows 2000+", () =>
    supabase.from("jobs").select("job_location_county").eq("status", "active").range(2000, 2999));

  await timing("count exact via .in county (Nairobi)", () =>
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "active").eq("job_location_county", "Nairobi"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
