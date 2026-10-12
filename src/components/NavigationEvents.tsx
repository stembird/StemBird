"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * NavigationEvents component ensures proper page transitions
 * by forcing a scroll to top and triggering re-renders on route changes
 */
export function NavigationEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
    
    // Force a small delay to ensure DOM updates
    const timer = setTimeout(() => {
      // Trigger any pending updates
      window.dispatchEvent(new Event('routechange'));
    }, 0);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}