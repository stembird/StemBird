import { createClient } from "@supabase/supabase-js";
import type { CompanyCardData } from "@/components/CompanyCard";
import { inferCompanyIndustry } from "@/lib/companyIndustryInference";
import { resolveIndustryLabel } from "@/lib/jobParseNormalization";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabaseEnv";

const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());

export const ALL_INDUSTRIES_SLUG = "all";

export type IndustryCardData = {
  name: string;
  slug: string;
  companyCount: number;
  openJobs: number;
  hiringCount: number;
};

export type CompanyDirectoryData = {
  companies: CompanyCardData[];
  industries: string[];
  industryCards: IndustryCardData[];
};

export type HomepageStats = {
  activeJobs: number;
  companies: number;
};

/** URL slug for an industry name (or "all"). */
export function industryToSlug(name: string): string {
  if (!name || name === ALL_INDUSTRIES_SLUG) return ALL_INDUSTRIES_SLUG;
  return name
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveIndustryFromSlug(
  slug: string,
  industries: string[]
): string | null {
  if (!slug || slug === ALL_INDUSTRIES_SLUG) return null;
  const match = industries.find((name) => industryToSlug(name) === slug);
  return match ?? null;
}

/** PostgREST/Supabase caps each response at max_rows (default 1000). */
const DIRECTORY_PAGE_SIZE = 1000;

type CompanyRow = {
  id: string;
  name: string;
  logo: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  description: string | null;
};
type JobRow = {
  company_id: string | null;
};
type IndustryRow = { id: number | string; name: string };

async function fetchAllRows<T>(
  fetchPage: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  for (;;) {
    const to = from + DIRECTORY_PAGE_SIZE - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < DIRECTORY_PAGE_SIZE) break;
    from += DIRECTORY_PAGE_SIZE;
  }

  return rows;
}

/**
 * Resolve a company onto a canonical industry for directory cards.
 * Prefer stored company industry, then name/website inference.
 */
export function resolveDirectoryCompanyIndustry(
  company: Pick<CompanyRow, "name" | "website" | "industry">,
  industries: string[],
  modalJobIndustry?: string | null
): string | null {
  const fromStored = resolveIndustryLabel(company.industry, industries);
  if (fromStored) return fromStored;

  const inferred = inferCompanyIndustry(
    company.name,
    company.website,
    industries
  );
  if (inferred && industries.includes(inferred)) return inferred;

  if (modalJobIndustry && industries.includes(modalJobIndustry)) {
    return modalJobIndustry;
  }

  return null;
}

async function getOpenJobsByCompany(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  try {
    const { data: viewRows, error: viewError } = await supabase
      .from("active_jobs_by_company")
      .select("company_id, job_count");

    if (!viewError && Array.isArray(viewRows) && viewRows.length > 0) {
      for (const row of viewRows) {
        const id = row.company_id as string | null;
        if (!id) continue;
        counts.set(id, Number(row.job_count ?? 0));
      }
      return counts;
    }
  } catch {
    // View missing — fall through to a company_id-only scan.
  }

  const jobRows = await fetchAllRows<JobRow>((from, to) =>
    supabase
      .from("jobs")
      .select("company_id")
      .eq("status", "active")
      .eq("listing_kind", "job")
      .not("company_id", "is", null)
      .order("company_id")
      .range(from, to)
  );

  for (const job of jobRows) {
    if (!job.company_id) continue;
    counts.set(job.company_id, (counts.get(job.company_id) || 0) + 1);
  }
  return counts;
}

export type CompanyDirectoryOptions = {
  /** Homepage compact cards do not render blurbs. */
  includeDescriptions?: boolean;
};

const EMPTY_DIRECTORY: CompanyDirectoryData = {
  companies: [],
  industries: [],
  industryCards: [],
};

export async function getCompanyDirectoryData(
  options: CompanyDirectoryOptions = {}
): Promise<CompanyDirectoryData> {
  const includeDescriptions = options.includeDescriptions !== false;

  const companySelect = includeDescriptions
    ? "id, name, logo, website, industry, location, description"
    : "id, name, logo, website, industry, location";

  const [companyRows, openJobsByCompany, industryRows] = await Promise.all([
    fetchAllRows<CompanyRow>((from, to) =>
      (supabase as any)
        .from("companies")
        .select(companySelect)
        .order("name")
        .range(from, to)
    ),
    getOpenJobsByCompany(),
    fetchAllRows<IndustryRow>((from, to) =>
      supabase.from("industries").select("id, name").order("name").range(from, to)
    ),
  ]);

  const industries = industryRows
    .map((row) => row.name.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const rows: CompanyCardData[] = companyRows.map((company) => {
    const canonicalIndustry = resolveDirectoryCompanyIndustry(
      company,
      industries
    );

    return {
      id: company.id,
      name: company.name,
      logo: company.logo,
      website: company.website,
      industry: canonicalIndustry,
      location: company.location,
      description: includeDescriptions ? company.description : null,
      openJobs: openJobsByCompany.get(company.id) || 0,
    };
  });

  // Alphabetical company lists within an industry feel browseable;
  // still surface hiring employers first.
  rows.sort((a, b) => {
    if (b.openJobs !== a.openJobs) return b.openJobs - a.openJobs;
    return a.name.localeCompare(b.name);
  });

  const industryCards: IndustryCardData[] = industries.map((name) => {
    const inIndustry = rows.filter((c) => c.industry === name);
    const openJobs = inIndustry.reduce((sum, c) => sum + c.openJobs, 0);
    const hiringCount = inIndustry.filter((c) => c.openJobs > 0).length;
    return {
      name,
      slug: industryToSlug(name),
      companyCount: inIndustry.length,
      openJobs,
      hiringCount,
    };
  });

  return { companies: rows, industries, industryCards };
}

/** Homepage / companies hub: degrade to empty lists instead of failing the page. */
export async function getCompanyDirectoryDataOrEmpty(
  options: CompanyDirectoryOptions = {}
): Promise<CompanyDirectoryData> {
  try {
    return await getCompanyDirectoryData(options);
  } catch (error) {
    console.error("Error loading companies directory:", error);
    return EMPTY_DIRECTORY;
  }
}

/** Live counts for homepage counters. */
export async function getHomepageStats(): Promise<HomepageStats> {
  try {
    const [
      { count: activeJobs, error: jobsError },
      { count: companies, error: companiesError },
    ] = await Promise.all([
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .eq("listing_kind", "job"),
      supabase.from("companies").select("id", { count: "exact", head: true }),
    ]);

    if (jobsError) throw jobsError;
    if (companiesError) throw companiesError;

    return {
      activeJobs: activeJobs ?? 0,
      companies: companies ?? 0,
    };
  } catch (error) {
    console.error("Error loading homepage stats:", error);
    return { activeJobs: 0, companies: 0 };
  }
}
