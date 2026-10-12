"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import ApplySection from "@/components/ApplySection";

type MobileStickyApplyProps = {
  job: any;
  expired?: boolean;
};

/**
 * LinkedIn-blue sticky Apply Now bar for mobile job details.
 * Opens the application area in a bottom sheet.
 */
export default function MobileStickyApply({
  job,
  expired = false,
}: MobileStickyApplyProps) {
  const [open, setOpen] = useState(false);
  const hasExternal =
    !!(job?.application_url || job?.apply_link || job?.apply_email);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <div className="pointer-events-auto border-t border-border/60 bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/85">
          <button
            type="button"
            disabled={expired}
            onClick={() => {
              if (!expired) setOpen(true);
            }}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-lg text-base font-semibold shadow-md transition-colors ${
              expired
                ? "cursor-not-allowed bg-muted text-muted-foreground"
                : "bg-[#0A66C2] text-white hover:bg-[#004182] active:bg-[#003166]"
            }`}
          >
            {expired ? "Job Closed" : "Apply Now"}
            {!expired && hasExternal && (
              <ExternalLink className="h-4 w-4 opacity-90" />
            )}
          </button>
        </div>
      </div>

      {!expired && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[88vh] overflow-y-auto rounded-t-2xl p-4 sm:p-6"
          >
            <SheetHeader className="mb-3 text-left">
              <SheetTitle className="text-lg text-[#0A66C2]">
                Apply for this Job
              </SheetTitle>
            </SheetHeader>
            <ApplySection job={job} embedded expired={expired} />
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
