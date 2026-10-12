"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import Navbar from "@/components/Navbar";
import JobPostingForm from "@/components/JobPostingForm";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const jobId = params.id as string;

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (loading || roleLoading || !user || !jobId) return;

    // Candidates must never edit jobs. Employers may edit only their own.
    // Admins may edit any job.
    if (role === "candidate" || role === null) {
      toast.error("You do not have permission to edit jobs.");
      router.replace(`/jobs/${jobId}`);
      return;
    }

    if (role === "employer") {
      let cancelled = false;
      (async () => {
        const { data: job } = await supabase
          .from("jobs")
          .select("user_id")
          .eq("id", jobId)
          .maybeSingle();
        if (cancelled) return;
        if (!job || job.user_id !== user.id) {
          toast.error("You can only edit jobs you posted.");
          router.replace(`/jobs/${jobId}`);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [loading, roleLoading, user, role, jobId, router]);

  if (loading || roleLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== "admin" && role !== "employer") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Edit Job</h1>
          <p className="text-muted-foreground">
            Update the job listing details below
          </p>
        </div>
        <JobPostingForm jobId={jobId} isEdit={true} />
      </div>
    </div>
  );
}
