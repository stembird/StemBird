"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import Navbar from "@/components/Navbar";
import JobPostingForm from "@/components/JobPostingForm";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PostJobPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (loading || roleLoading || !user) return;
    if (role === "candidate" || role === null) {
      toast.error("Only employers and admins can post jobs.");
      router.replace("/dashboard");
    }
  }, [loading, roleLoading, user, role, router]);

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
          <h1 className="text-4xl font-bold mb-2">Post a Job — Your First 3 Are Free</h1>
          <p className="text-muted-foreground">
            Reach thousands of qualified Kenyan professionals. Our AI pre-screens candidates so you see only the top matches, not 500 unqualified applicants. Fill in the details below to post your listing.
          </p>
        </div>
        <JobPostingForm />
      </div>
    </div>
  );
}
