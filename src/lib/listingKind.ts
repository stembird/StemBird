import { extractScholarshipFacts } from "./scholarshipFacts";

export const LISTING_KIND_JOB = "job" as const;
export const LISTING_KIND_SCHOLARSHIP = "scholarship" as const;

export type ListingKind = typeof LISTING_KIND_JOB | typeof LISTING_KIND_SCHOLARSHIP;

const AWARD_TITLE_RE =
  /\b(scholarships?|bursar(?:y|ies)|scholars?\s+programme|scholars?\s+program)\b/i;

const BURSARY_FIELD_RE = /bursary\s+and\s+scholarships?/i;

/** Employment roles that administer scholarships — keep these on the jobs board. */
const ADMIN_ROLE_RE =
  /\b(coordinator|officer|manager|administrator|clerk|director|specialist|analyst|assistant director|digital scholarship assistant)\b/i;

const GRADUATE_ASSISTANT_RE = /\b(graduate assistant|tutorial fellow)\b/i;

export type ClassifyListingKindInput = {
  title?: string | null;
  occupationalCategory?: string | null;
  jobFunctionHint?: string | null;
  tags?: string | null;
  description?: string | null;
};

function joinedHints(input: ClassifyListingKindInput): string {
  return [input.occupationalCategory, input.jobFunctionHint, input.tags]
    .filter(Boolean)
    .join(" ");
}

/**
 * Scholarships are funding/study awards a student applies for.
 * Jobs that merely mention scholarships (coordinator, manager, …) stay jobs.
 */
export function classifyListingKind(input: ClassifyListingKindInput): ListingKind {
  const title = (input.title || "").trim();
  if (title && ADMIN_ROLE_RE.test(title) && !GRADUATE_ASSISTANT_RE.test(title)) {
    return LISTING_KIND_JOB;
  }

  if (BURSARY_FIELD_RE.test(joinedHints(input))) {
    return LISTING_KIND_SCHOLARSHIP;
  }

  if (AWARD_TITLE_RE.test(title)) {
    return LISTING_KIND_SCHOLARSHIP;
  }

  return LISTING_KIND_JOB;
}

export function isScholarshipListing(kind?: string | null): boolean {
  return kind === LISTING_KIND_SCHOLARSHIP;
}

export type ListingKindRow = {
  listing_kind?: string | null;
  title?: string | null;
  job_function?: string | null;
  tags?: string | null;
  occupationalCategory?: string | null;
};

/**
 * Prefer stored listing_kind after migration. Before the column exists (or is
 * still null), classify from title / bursary field so awards can live on
 * /scholarships instead of looking like Full Time jobs.
 */
export function isScholarshipRow(row: ListingKindRow | null | undefined): boolean {
  if (!row) return false;
  if (row.listing_kind === LISTING_KIND_SCHOLARSHIP) return true;
  if (row.listing_kind === LISTING_KIND_JOB) return false;
  return (
    classifyListingKind({
      title: row.title,
      tags: row.tags,
      jobFunctionHint: row.job_function,
      occupationalCategory: row.occupationalCategory,
    }) === LISTING_KIND_SCHOLARSHIP
  );
}

export function scholarshipPath(slugOrId: string): string {
  return `/scholarships/${slugOrId}`;
}

export function jobPath(slugOrId: string): string {
  return `/jobs/${slugOrId}`;
}

export function listingPath(
  kind: string | null | undefined,
  slugOrId: string
): string {
  return isScholarshipListing(kind) ? scholarshipPath(slugOrId) : jobPath(slugOrId);
}

/** PostgREST error when listing_kind / scholarship columns are not migrated yet. */
export function isMissingListingKindColumnError(error: unknown): boolean {
  if (!error) return false;
  const err = typeof error === "object" ? (error as {
    message?: unknown;
    code?: unknown;
  }) : { message: error };
  const message = String(err.message || "").toLowerCase();
  if (err.code === "42703") {
    if (!message.trim()) return true;
    return message.includes("listing_kind") || message.includes("scholarship_");
  }
  return (
    (message.includes("listing_kind") || message.includes("scholarship_")) &&
    (message.includes("column") ||
      message.includes("schema cache") ||
      message.includes("could not find"))
  );
}

const SCHOLARSHIP_PAYLOAD_KEYS = [
  "listing_kind",
  "scholarship_level",
  "scholarship_coverage",
  "scholarship_duration",
  "scholarship_nationality",
  "scholarship_age_limit",
  "scholarship_bonding",
  "scholarship_host_institution",
  "scholarship_awards_count",
  "scholarship_programme_start",
] as const;

export function withoutScholarshipColumns<T extends Record<string, any>>(
  payload: T
): Omit<T, (typeof SCHOLARSHIP_PAYLOAD_KEYS)[number]> {
  const rest = { ...payload };
  for (const key of SCHOLARSHIP_PAYLOAD_KEYS) {
    delete rest[key];
  }
  return rest;
}

/** Chain `.eq('listing_kind', kind)` onto a Supabase query builder. */
export function withListingKind<Q>(query: Q, kind: ListingKind): Q {
  return (query as { eq: (column: string, value: string) => Q }).eq(
    "listing_kind",
    kind
  );
}

export function scholarshipPublishFields(input: ClassifyListingKindInput & {
  html?: string | null;
}): { listing_kind: ListingKind } & Record<string, string | number | null> {
  const listing_kind = classifyListingKind(input);
  if (listing_kind !== LISTING_KIND_SCHOLARSHIP) {
    return { listing_kind };
  }
  return {
    listing_kind,
    ...extractScholarshipFacts({ title: input.title, html: input.html }),
  };
}
