import { FALLBACK_JOB_FUNCTIONS } from "@/lib/jobParseNormalization";

type FunctionCount = {
  name: string;
  count: number;
};

const UNCATEGORIZED = "Other / Miscellaneous";

/**
 * Fill in every canonical job function (including those with zero live jobs)
 * so the functions hub is a complete directory, not only whatever is hiring
 * right now.
 */
export function completeFunctionCatalog(
  counts: FunctionCount[]
): FunctionCount[] {
  const byName = new Map<string, number>();
  for (const name of FALLBACK_JOB_FUNCTIONS) byName.set(name, 0);
  for (const row of counts) {
    const name = String(row.name || "").trim() || UNCATEGORIZED;
    byName.set(name, (byName.get(name) ?? 0) + row.count);
  }
  return [...byName.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
