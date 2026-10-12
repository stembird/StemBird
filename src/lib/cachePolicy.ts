/**
 * ISR windows. Next.js `export const revalidate` must be a numeric literal
 * in the page/layout file (imported identifiers fail `invalid-page-config`).
 * Keep these in sync with the page exports:
 *   public catalog pages → 300
 *   job detail layout/page → 600
 */
export const PUBLIC_PAGE_REVALIDATE_SECONDS = 300

export const JOB_PAGE_REVALIDATE_SECONDS = 600
