"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Client-side gate for admin-only dashboard pages.
 * Canonical role source is `user_roles` via useUserRole.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || role !== "admin") {
    return (
      <div className="container mx-auto flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 py-12 text-center">
        <p className="text-lg font-medium">Admin access required</p>
        <p className="text-sm text-muted-foreground">
          This page is only available to CareerSasa admins.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
