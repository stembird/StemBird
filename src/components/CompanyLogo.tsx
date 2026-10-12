"use client";

import { useState, useEffect } from "react";
import { Building2 } from "lucide-react";
import {
  companyInitials,
  resolveCompanyLogoUrl,
  type CompanyLogoInput,
} from "@/lib/companyLogo";
import { cn } from "@/lib/utils";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const SIZE_PX: Record<LogoSize, number> = {
  xs: 20,
  sm: 28,
  md: 40,
  lg: 56,
  xl: 80,
  "2xl": 112,
};

const SIZE_CLASSES: Record<LogoSize, string> = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-7 w-7 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-14 w-14 text-sm",
  xl: "h-20 w-20 text-base",
  "2xl": "h-28 w-28 text-xl",
};

const ICON_SIZES: Record<LogoSize, string> = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
  "2xl": "h-12 w-12",
};

export interface CompanyLogoProps extends CompanyLogoInput {
  name?: string | null;
  size?: LogoSize;
  className?: string;
  showBuildingFallback?: boolean;
}

/**
 * Compact company mark for job cards / details.
 *
 * Resolution order:
 * 1. companies.logo (stored in DB – always trusted)
 * 2. hiring_organization_logo on the job
 * 3. companies.website domain → gstatic favicon (filtered: must be > 20×20 pixels)
 * 4. Company name → known brand domain → gstatic favicon
 * 5. Initials (coloured, never blank)
 *
 * The gstatic service returns a 16×16 generic icon for unknown domains.
 * We detect this via the rendered naturalWidth/naturalHeight and fall back to initials.
 */
export function CompanyLogo({
  name,
  logo,
  website,
  hiringOrganizationLogo,
  companyName,
  size = "sm",
  className,
  showBuildingFallback = false,
}: CompanyLogoProps) {
  const displayName = name || companyName || "";
  const resolved = resolveCompanyLogoUrl({
    logo,
    website,
    companyName: displayName,
    hiringOrganizationLogo,
  });

  // failed: image load errored or resolved to a generic icon (< 20px)
  const [failed, setFailed] = useState(false);

  // Reset failure state when the URL changes (e.g. company prop update)
  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  const showImage = !!resolved && !failed;

  if (!showImage && !displayName && showBuildingFallback) {
    return (
      <div
        className={cn(
          "shrink-0 rounded-md bg-muted flex items-center justify-center text-muted-foreground",
          SIZE_CLASSES[size],
          className
        )}
        aria-hidden
      >
        <Building2 className={ICON_SIZES[size]} />
      </div>
    );
  }

  if (!showImage) {
    return (
      <div
        className={cn(
          "shrink-0 rounded-md bg-primary/10 text-primary font-semibold flex items-center justify-center select-none",
          SIZE_CLASSES[size],
          className
        )}
        aria-hidden
        title={displayName || undefined}
      >
        {companyInitials(displayName)}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "shrink-0 rounded-md bg-muted/80 border border-border/40 overflow-hidden flex items-center justify-center",
        SIZE_CLASSES[size],
        className
      )}
    >
      <img
        src={resolved}
        alt={displayName ? `${displayName} logo` : "Company logo"}
        className="h-full w-full object-contain p-0.5"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        onLoad={(e) => {
          // Discard generic favicons: gstatic returns 16×16 for unknown domains
          const img = e.currentTarget;
          const minPx = SIZE_PX[size] <= 20 ? 12 : 20;
          if (img.naturalWidth <= minPx || img.naturalHeight <= minPx) {
            setFailed(true);
          }
        }}
      />
    </div>
  );
}

export default CompanyLogo;
