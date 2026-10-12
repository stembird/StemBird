/**
 * Shared HTTP timing for scrapers.
 *
 * Discover runs many sources sequentially on a 300s Vercel function. Long
 * per-request timeouts (15–25s) turn a flaky external outage into a full
 * CPU-duration spike while still returning success:true. Keep list/discovery
 * fetches tight; detail fetches may use the longer budget.
 */

/** Listing / discover API + HTML page fetches. */
export const DISCOVER_FETCH_TIMEOUT_MS = 12_000

/** Job detail page / API fetches during process. */
export const DETAIL_FETCH_TIMEOUT_MS = 15_000

export function abortAfter(ms: number): AbortSignal {
  return AbortSignal.timeout(ms)
}
