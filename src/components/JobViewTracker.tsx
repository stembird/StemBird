"use client";

import { useEffect } from "react";
import { trackJobView } from "@/lib/employerAnalytics";

interface JobViewTrackerProps {
  jobId: string;
}

export default function JobViewTracker({ jobId }: JobViewTrackerProps) {
  useEffect(() => {
    // Track the job view when component mounts
    const trackView = async () => {
      try {
        // Get session ID from sessionStorage or create one
        let sessionId = sessionStorage.getItem("session_id");
        if (!sessionId) {
          sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          sessionStorage.setItem("session_id", sessionId);
        }

        await trackJobView(jobId, {
          referrer: document.referrer,
          sessionId,
        });
      } catch (error) {
        console.error("Error tracking job view:", error);
      }
    };

    trackView();
  }, [jobId]);

  return null; // This component doesn't render anything
}
