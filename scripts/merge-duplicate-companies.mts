/**
 * Find duplicate companies (variant names for the same employer) and merge them.
 *
 * Usage:
 *   npx tsx scripts/merge-duplicate-companies.mts           # dry-run
 *   npx tsx scripts/merge-duplicate-companies.mts --apply   # write changes
 *
 * For each identity cluster:
 * 1. Pick a survivor (most jobs → richest profile → cleanest name)
 * 2. Re-point jobs.company_id (+ sync company / hiring_organization_* text)
 * 3. Fill blank logo/website/description on the survivor from duplicates
 * 4. Rename survivor to the preferred display name (trimmed)
 * 5. Delete duplicate company rows
 */
import { createClient } from "@supabase/supabase-js";
import {
  clusterCompaniesByIdentity,
  mergeCompanyProfileFields,
  normalizeCompanyIdentityKey,
  pickCanonicalCompany,
  type CompanyIdentityFields,
} from "../src/lib/companyIdentity.ts";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APPLY = process.argv.includes("--apply");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type CompanyRow = CompanyIdentityFields & {
  user_id: string;
};

async function main() {
  console.log(APPLY ? "MODE: APPLY (writing changes)" : "MODE: DRY-RUN (no writes)");

  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select(
      "id, name, logo, website, industry, location, size, description, user_id, created_at, updated_at"
    )
    .order("name");

  if (companiesError) throw companiesError;
  if (!companies?.length) {
    console.log("No companies found.");
    return;
  }

  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id, company_id, company, hiring_organization_name, hiring_organization_logo, hiring_organization_url");

  if (jobsError) throw jobsError;

  const jobCountByCompany = new Map<string, number>();
  for (const job of jobs || []) {
    if (!job.company_id) continue;
    jobCountByCompany.set(
      job.company_id,
      (jobCountByCompany.get(job.company_id) || 0) + 1
    );
  }

  // Also trim whitespace-only name fixes for singleton companies
  const whitespaceOnly = (companies as CompanyRow[]).filter(
    (c) => c.name !== c.name.trim() || /\s{2,}/.test(c.name)
  );

  const withCounts: CompanyRow[] = (companies as CompanyRow[]).map((c) => ({
    ...c,
    jobCount: jobCountByCompany.get(c.id) || 0,
  }));

  const clusters = clusterCompaniesByIdentity(withCounts);
  const duplicateClusters = [...clusters.entries()]
    .filter(([, rows]) => rows.length > 1)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  console.log(`Companies: ${companies.length}`);
  console.log(`Duplicate identity clusters: ${duplicateClusters.length}`);
  console.log(`Whitespace-only names: ${whitespaceOnly.length}`);

  let jobsRepointed = 0;
  let companiesDeleted = 0;
  let companiesRenamed = 0;

  for (const [key, rows] of duplicateClusters) {
    const { survivor, displayName, duplicates } = pickCanonicalCompany(rows);
    console.log(`\n── ${key} ──`);
    console.log(
      `  KEEP  jobs=${survivor.jobCount ?? 0}  "${survivor.name}"  →  "${displayName}"  (${survivor.id})`
    );
    for (const dup of duplicates) {
      console.log(
        `  MERGE jobs=${dup.jobCount ?? 0}  "${dup.name}"  (${dup.id})`
      );
    }

    const duplicateIds = duplicates.map((d) => d.id);
    const profilePatch = mergeCompanyProfileFields(survivor, duplicates);
    const renameNeeded = survivor.name !== displayName;

    if (!APPLY) {
      if (Object.keys(profilePatch).length) {
        console.log(`  would patch survivor fields: ${Object.keys(profilePatch).join(", ")}`);
      }
      if (renameNeeded) console.log(`  would rename survivor → "${displayName}"`);
      const linkedJobs = (jobs || []).filter((j) =>
        duplicateIds.includes(j.company_id as string)
      );
      const nameMatchJobs = (jobs || []).filter(
        (j) =>
          !j.company_id &&
          duplicates.some(
            (d) =>
              (j.company || "").trim().toLowerCase() === d.name.trim().toLowerCase()
          )
      );
      console.log(
        `  would re-point ${linkedJobs.length} linked jobs + ${nameMatchJobs.length} orphan name matches`
      );
      continue;
    }

    // 1. Re-point jobs linked to duplicates
    for (const dup of duplicates) {
      const { data: linked, error } = await supabase
        .from("jobs")
        .update({
          company_id: survivor.id,
          company: displayName,
          hiring_organization_name: displayName,
        })
        .eq("company_id", dup.id)
        .select("id");
      if (error) throw error;
      jobsRepointed += linked?.length || 0;
    }

    // 2. Orphan jobs whose company text matches a duplicate name
    for (const dup of duplicates) {
      const { data: orphaned, error } = await supabase
        .from("jobs")
        .update({
          company_id: survivor.id,
          company: displayName,
          hiring_organization_name: displayName,
        })
        .is("company_id", null)
        .ilike("company", dup.name.trim())
        .select("id");
      if (error) throw error;
      jobsRepointed += orphaned?.length || 0;
    }

    // 3. Also normalize jobs already on survivor that still use a variant name
    const variantNames = [survivor.name, ...duplicates.map((d) => d.name)]
      .map((n) => n.trim())
      .filter((n) => n.toLowerCase() !== displayName.toLowerCase());

    for (const variant of variantNames) {
      const { data: renamedJobs, error } = await supabase
        .from("jobs")
        .update({
          company: displayName,
          hiring_organization_name: displayName,
        })
        .eq("company_id", survivor.id)
        .ilike("company", variant)
        .select("id");
      if (error) throw error;
      jobsRepointed += renamedJobs?.length || 0;
    }

    // 4. Delete duplicates first so the preferred display name is free to claim
    //    (jobs already re-pointed; FK is ON DELETE SET NULL as a safety net)
    const { error: deleteError, count } = await supabase
      .from("companies")
      .delete({ count: "exact" })
      .in("id", duplicateIds);
    if (deleteError) throw deleteError;
    companiesDeleted += count || duplicateIds.length;

    // 5. Patch survivor profile + rename now that the name is unique
    const survivorUpdate: Record<string, unknown> = { ...profilePatch };
    if (renameNeeded) survivorUpdate.name = displayName;

    if (Object.keys(survivorUpdate).length > 0) {
      const { error } = await supabase
        .from("companies")
        .update(survivorUpdate)
        .eq("id", survivor.id);
      if (error) {
        // Name collision on LOWER(name) — keep existing name, still merged jobs
        if (renameNeeded && /companies_name_unique|duplicate key/i.test(error.message)) {
          console.warn(
            `  warn: could not rename to "${displayName}" (${error.message}); keeping "${survivor.name}"`
          );
          delete survivorUpdate.name;
          if (Object.keys(survivorUpdate).length > 0) {
            const { error: retryError } = await supabase
              .from("companies")
              .update(survivorUpdate)
              .eq("id", survivor.id);
            if (retryError) throw retryError;
          }
        } else {
          throw error;
        }
      } else if (renameNeeded) {
        companiesRenamed += 1;
      }
    }

    console.log(`  merged OK — deleted ${duplicateIds.length} duplicate(s)`);
  }

  // Trim whitespace-only singleton names
  for (const company of whitespaceOnly) {
    const key = normalizeCompanyIdentityKey(company.name);
    const cluster = clusters.get(key);
    if (cluster && cluster.length > 1) continue; // already handled in merge

    const trimmed = company.name.trim().replace(/\s+/g, " ");
    if (trimmed === company.name) continue;
    console.log(`\nTRIM "${company.name}" → "${trimmed}"`);
    if (!APPLY) continue;

    const { error } = await supabase
      .from("companies")
      .update({ name: trimmed })
      .eq("id", company.id);
    if (error) {
      console.warn(`  skip trim: ${error.message}`);
      continue;
    }
    companiesRenamed += 1;

    await supabase
      .from("jobs")
      .update({
        company: trimmed,
        hiring_organization_name: trimmed,
      })
      .eq("company_id", company.id);
  }

  console.log("\n════════ SUMMARY ════════");
  console.log(`Clusters processed: ${duplicateClusters.length}`);
  if (APPLY) {
    console.log(`Jobs re-pointed / renamed: ${jobsRepointed}`);
    console.log(`Companies deleted: ${companiesDeleted}`);
    console.log(`Companies renamed/trimmed: ${companiesRenamed}`);
  } else {
    console.log("Dry-run only. Re-run with --apply to write changes.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
