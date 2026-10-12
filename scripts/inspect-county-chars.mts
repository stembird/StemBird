import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qxuvqrfqkdpfjfwkqatf.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dXZxcmZxa2RwZmpmd2txYXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjcxNTIsImV4cCI6MjA3NTAwMzE1Mn0.mAiL1p6YqlSaSFOIDW_G-3e_Mqck0cFqLl74_jyNpk8"
);

async function main() {
  const { data: counties } = await supabase.from("counties").select("id, name").order("id");
  console.log("COUNTIES TABLE (id | name | charcodes of last segment):");
  for (const row of counties || []) {
    const n = row.name as string;
    const specials = [...n]
      .filter((ch) => !/[\x20-\x7E]/.test(ch))
      .map((ch) => `${ch}=U+${ch.codePointAt(0)!.toString(16).toUpperCase()}`);
    console.log(
      `${String(row.id).padStart(2)} | ${n}${specials.length ? "  <<< " + specials.join(", ") : ""}`
    );
  }

  // Check job_location_county for any non-ASCII
  const { data: jobs } = await supabase
    .from("jobs")
    .select("job_location_county")
    .eq("status", "active")
    .limit(1000);
  const nonAscii = new Set<string>();
  for (const j of jobs || []) {
    const c = j.job_location_county as string | null;
    if (!c) continue;
    const bad = [...c].filter((ch) => !/[\x20-\x7E]/.test(ch));
    if (bad.length) nonAscii.add(c);
  }
  console.log("\nACTIVE JOB county values containing non-ASCII chars:");
  for (const v of nonAscii) {
    const codes = [...v]
      .map((ch) => (!/[\x20-\x7E]/.test(ch) ? `U+${ch.codePointAt(0)!.toString(16).toUpperCase()}` : ch))
      .join("");
    console.log(`  ${v}  (${codes})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
