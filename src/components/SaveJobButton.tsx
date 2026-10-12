"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { saveJob, unsaveJob, isJobSaved } from "@/lib/savedJobs";
import { supabase } from "@/integrations/supabase/client";

interface SaveJobButtonProps {
  jobId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
  className?: string;
}

export const SaveJobButton = ({ 
  jobId, 
  variant = "outline", 
  size = "default",
  showText = true,
  className = "",
}: SaveJobButtonProps) => {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndSavedStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      
      if (user) {
        const saved = await isJobSaved(jobId);
        setIsSaved(saved);
      }
    };

    checkAuthAndSavedStatus();
  }, [jobId]);

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast({
        title: "Sign in to save jobs",
        description: "Create a free account or sign in to bookmark this job.",
      });
      router.push("/auth");
      return;
    }

    setIsLoading(true);

    try {
      if (isSaved) {
        await unsaveJob(jobId);
        setIsSaved(false);
        toast({
          title: "Job Unsaved",
          description: "Job removed from your saved list"
        });
      } else {
        await saveJob(jobId);
        setIsSaved(true);
        toast({
          title: "Job Saved",
          description: "Job added to your saved list"
        });
      }
    } catch (error) {
      console.error("Error toggling save:", error);
      toast({
        title: "Error",
        description: "Failed to save job. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggleSave}
      disabled={isLoading}
      aria-label={isSaved ? "Unsave job" : "Save job"}
      className={`${isSaved ? "text-primary" : ""} ${className}`.trim()}
    >
      <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""} ${showText ? "mr-2" : ""}`} />
      {showText && (isSaved ? "Saved" : "Save Job")}
    </Button>
  );
};
