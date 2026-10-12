"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Edit, Loader2, Sparkles } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminEditJobButtonProps {
  jobId: string;
  /** "card" = compact outline button; "page" = larger default button */
  variant?: "card" | "page";
}

/**
 * Renders Edit + Enrich controls only when the logged-in user has admin role
 * in the canonical `user_roles` table (same source as the dashboard).
 */
export function AdminEditJobButton({
  jobId,
  variant = "card",
}: AdminEditJobButtonProps) {
  const { role, loading: roleLoading } = useUserRole();
  const [enriching, setEnriching] = useState(false);

  const runEnrich = async () => {
    try {
      setEnriching(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch("/api/admin/jobs/enrich", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ job_id: jobId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Enrich failed");

      if (body.ai_keys_configured === false) {
        toast.warning(
          "AI keys missing on server — ran rule-based normalize only."
        );
      }

      if (body.status === "updated") {
        toast.success(`Enriched: ${body.title || "job"}`);
      } else if (body.status === "skipped") {
        toast.info(body.detail || "Nothing to enrich");
      } else {
        toast.error(body.detail || "Enrich failed");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Enrich failed");
    } finally {
      setEnriching(false);
    }
  };

  // Hide for non-admins. Also hide while role is loading so candidates never
  // briefly flash admin controls.
  if (roleLoading || role !== "admin") return null;

  if (variant === "page") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/post-job/${jobId}`} prefetch={true}>
          <Button size="sm" className="gap-1.5">
            <Edit className="h-4 w-4" />
            Edit This Job
          </Button>
        </Link>
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5"
          disabled={enriching}
          onClick={runEnrich}
          title="Normalize + AI-enrich this job using production DeepSeek → Gemini keys"
        >
          {enriching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Enrich with AI
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link href={`/post-job/${jobId}`} prefetch={true}>
        <Button variant="outline" size="sm" className="gap-1 h-8 text-xs">
          <Edit className="h-3 w-3" />
          Edit
        </Button>
      </Link>
      <Button
        variant="secondary"
        size="sm"
        className="gap-1 h-8 text-xs"
        disabled={enriching}
        onClick={runEnrich}
        title="Normalize + AI-enrich this job"
      >
        {enriching ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Sparkles className="h-3 w-3" />
        )}
        Enrich
      </Button>
    </div>
  );
}
