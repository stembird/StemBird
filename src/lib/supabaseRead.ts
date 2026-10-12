/**
 * Public-page reads from Supabase.
 *
 * A paused/unpaid project, network failure, or PostgREST 5xx must not be
 * treated as "row missing". `notFound()` is HTTP 404, which Google may
 * deindex. Real outages should throw so crawlers see 5xx and retry.
 *
 * Client input that can never match a UUID column (e.g. `/companies/safaricom`)
 * is not an outage — return a missing row so the page is 404, not 5xx.
 */

export const SUPABASE_NO_ROWS_CODE = "PGRST116";

/** Postgres `invalid_text_representation` — e.g. non-UUID in a uuid column. */
export const SUPABASE_INVALID_TEXT_CODE = "22P02";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SupabaseLikeError = {
  code?: string | null;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

export function isUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  return UUID_RE.test(value.trim());
}

export function isSupabaseMissingRowError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code =
    "code" in error ? String((error as SupabaseLikeError).code || "") : "";
  return code === SUPABASE_NO_ROWS_CODE;
}

export function isSupabaseInvalidInputError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as SupabaseLikeError;
  const code = String(err.code || "");
  if (code === SUPABASE_INVALID_TEXT_CODE) return true;
  const message = String(err.message || "").toLowerCase();
  return message.includes("invalid input syntax");
}

export function throwIfSupabaseError(
  error: SupabaseLikeError | null | undefined,
  context: string
): void {
  if (!error) return;
  if (isSupabaseMissingRowError(error)) return;
  if (isSupabaseInvalidInputError(error)) return;
  const detail = error.message || "request failed";
  const err = new Error(`${context}: ${detail}`);
  console.error(err.message, error);
  throw err;
}
