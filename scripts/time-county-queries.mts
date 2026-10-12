/** Time the exact queries getActiveJobsByCounty() uses against the live DB. */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://qhfdjccudtqnlkbtsjgg.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoZmRqY2N1ZHRxbmxrYnRzamdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NzYwOTcsImV4cCI6MjEwNzM1MjA5N30.JFdPkbqs4dPOahVmBSS8jGcAlHABrGJVeN4ezvquvLs"
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
