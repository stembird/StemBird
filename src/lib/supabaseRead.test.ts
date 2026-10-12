/**
 * Run: npx tsx src/lib/supabaseRead.test.ts
 */
import assert from "node:assert/strict";
import {
  SUPABASE_INVALID_TEXT_CODE,
  SUPABASE_NO_ROWS_CODE,
  isSupabaseInvalidInputError,
  isSupabaseMissingRowError,
  isUuid,
  throwIfSupabaseError,
} from "./supabaseRead";

assert.equal(
  isSupabaseMissingRowError(null),
  false,
  "null is not a missing-row error"
);
assert.equal(
  isSupabaseMissingRowError({ code: SUPABASE_NO_ROWS_CODE }),
  true,
  ".single() with 0 rows is missing, not an outage"
);
assert.equal(
  isSupabaseMissingRowError({
    code: "PGRST301",
    message: "JWT expired",
  }),
  false,
  "auth/project errors are outages, not 404s"
);
assert.equal(
  isSupabaseMissingRowError({
    message: "Could not query the database for the schema cache. Retrying.",
  }),
  false,
  "paused/unpaid project messages are outages, not 404s"
);

assert.equal(isUuid("d765bb09-5e24-40b4-8ffa-c656026f9e48"), true, "company UUID");
assert.equal(isUuid("D765BB09-5E24-40B4-8FFA-C656026F9E48"), true, "uppercase UUID");
assert.equal(isUuid("not-a-uuid"), false);
assert.equal(isUuid("industry"), false);
assert.equal(isUuid("undefined"), false);
assert.equal(isUuid("safaricom"), false);
assert.equal(isUuid(""), false);
assert.equal(isUuid(null), false);

assert.equal(
  isSupabaseInvalidInputError({
    code: SUPABASE_INVALID_TEXT_CODE,
    message: 'invalid input syntax for type uuid: "industry"',
  }),
  true,
  "Postgres 22P02 is invalid client input, not an outage"
);
assert.equal(
  isSupabaseInvalidInputError({
    message: 'invalid input syntax for type uuid: "safaricom"',
  }),
  true,
  "invalid uuid messages without a code are still client input"
);
assert.equal(
  isSupabaseInvalidInputError({
    code: "502",
    message: "Bad Gateway",
  }),
  false,
  "gateway failures are not invalid input"
);

throwIfSupabaseError(null, "fetching job");
throwIfSupabaseError(undefined, "fetching job");
throwIfSupabaseError(
  { code: SUPABASE_NO_ROWS_CODE, message: "JSON object requested, multiple (or no) rows returned" },
  "fetching job"
);
throwIfSupabaseError(
  {
    code: SUPABASE_INVALID_TEXT_CODE,
    message: 'invalid input syntax for type uuid: "industry"',
  },
  "fetching company"
);

assert.throws(
  () =>
    throwIfSupabaseError(
      { message: "Could not query the database for the schema cache. Retrying." },
      "fetching job"
    ),
  /fetching job: Could not query the database/,
  "outage errors must throw so the page is 5xx, not 404"
);

assert.throws(
  () =>
    throwIfSupabaseError(
      { code: "502", message: "Bad Gateway" },
      "fetching company"
    ),
  /fetching company: Bad Gateway/,
  "gateway failures must throw"
);

console.log("supabaseRead test: ok");
