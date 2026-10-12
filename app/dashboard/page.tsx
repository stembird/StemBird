"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2, AlertCircle } from "lucide-react";
import EmployerDashboard from "@/components/dashboards/EmployerDashboard";
import CandidateDashboard from "@/components/dashboards/CandidateDashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

  // Show loading spinner while either auth or role is loading
  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-73px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is not authenticated, redirect to auth page (handled by useEffect)
  // If user is authenticated but no role is assigned
  if (user && !role) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center h-[calc(100vh-150px)] text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-2xl font-bold mb-2">Role Not Assigned</h2>
          <p className="text-muted-foreground mb-4">
            Your account doesn&apos;t have a role assigned yet. Please contact support for assistance.
          </p>
        </div>
      </div>
    );
  }

  // If user is authenticated and has a role
  return (
    <div className="container mx-auto px-4 py-8">
      {role === "employer" && <EmployerDashboard />}
      {role === "candidate" && <CandidateDashboard />}
      {role === "admin" && <AdminDashboard />}
      {!role && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No role assigned. Please contact support.</p>
        </div>
      )}
    </div>
  );
}
