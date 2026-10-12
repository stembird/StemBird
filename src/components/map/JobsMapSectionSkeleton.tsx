/**
 * Lightweight loading placeholder for the "Live Jobs Across Kenya" section.
 * Kept in its own file so the interactive map chunk (with the SVG shapes)
 * stays lazy-loaded and never blocks the initial homepage bundle.
 */
export function JobsMapSectionSkeleton() {
  return (
    <section className="py-3 md:py-8 px-4" aria-hidden="true">
      <div className="container mx-auto">
        <div className="mb-4 md:mb-6 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 dark:bg-green-950/40">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-green-700 dark:text-green-400">
              Live
            </span>
          </div>
          <div className="mx-auto mb-2 h-9 w-64 animate-pulse rounded-lg bg-muted" />
          <div className="mx-auto h-5 w-72 max-w-md animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="h-[440px] animate-pulse rounded-2xl bg-muted" />
          <div className="h-[320px] animate-pulse rounded-2xl bg-muted lg:sticky lg:top-6" />
        </div>
      </div>
    </section>
  );
}
