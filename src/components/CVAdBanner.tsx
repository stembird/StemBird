import Link from "next/link";
import { FileText, ArrowRight } from "lucide-react";

/**
 * Inline promotional banner shown on job detail pages.
 * Encourages users to build a CV before applying.
 */
export default function CVAdBanner({ jobId }: { jobId?: string }) {
  const href = jobId
    ? `/dashboard/career-tools?jobId=${encodeURIComponent(jobId)}`
    : "/dashboard/career-tools";

  return (
    <div className="rounded-lg border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-lg bg-orange-100 p-2">
          <FileText className="h-5 w-5 text-orange-600" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p className="text-sm font-semibold leading-snug text-gray-900">
            {jobId
              ? "Tailor a Career Tools CV to this listing — see which keywords are missing."
              : "Build your CV in minutes! Tailored for the Kenyan job market."}
          </p>
          <Link
            href={href}
            className="inline-flex w-auto shrink-0 items-center gap-1.5 self-start rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 sm:self-auto sm:px-4"
          >
            {jobId ? "Target this job" : "Build My CV"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
