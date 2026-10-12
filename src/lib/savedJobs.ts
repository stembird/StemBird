import { supabase } from "@/integrations/supabase/client";

export interface SavedJob {
  id: string;
  user_id: string;
  job_id: string;
  notes?: string;
  created_at: string;
  jobs?: any;
}

export const saveJob = async (jobId: string, notes?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User must be logged in to save jobs");
  }

  // Check if already saved to avoid 409 conflict
  const existing = await isJobSaved(jobId);
  if (existing) {
    // If already saved, just return success (idempotent operation)
    const { data } = await supabase
      .from("saved_jobs")
      .select()
      .eq("user_id", user.id)
      .eq("job_id", jobId)
      .single();
    return data;
  }

  const { data, error } = await supabase
    .from("saved_jobs")
    .insert({
      user_id: user.id,
      job_id: jobId
      // Note: 'notes' field temporarily disabled due to Supabase schema cache issue
      // Will be re-enabled once schema cache refreshes (24-48 hours after migration)
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const unsaveJob = async (jobId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User must be logged in");
  }

  const { error } = await supabase
    .from("saved_jobs")
    .delete()
    .eq("user_id", user.id)
    .eq("job_id", jobId);

  if (error) throw error;
};

export const isJobSaved = async (jobId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;

  const { data, error } = await supabase
    .from("saved_jobs")
    .select("id")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle();

  if (error) {
    console.error("Error checking if job is saved:", error);
    return false;
  }

  return !!data;
};

export const getSavedJobs = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("saved_jobs")
    .select(`
      *,
      jobs (
        *,
        companies (
          id,
          name,
          logo,
          website
        )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as SavedJob[];
};

export const updateSavedJobNotes = async (jobId: string, notes: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User must be logged in");
  }

  // Temporarily disabled due to Supabase schema cache issue
  // The 'notes' column exists in the database but PostgREST schema cache hasn't refreshed yet
  // This will be re-enabled once the schema cache updates (24-48 hours after migration)
  // For now, throw a user-friendly error
  throw new Error("Notes feature is temporarily unavailable. Please try again in 24-48 hours.");

  /* Will be re-enabled once schema cache refreshes:
  const { error } = await supabase
    .from("saved_jobs")
    .update({ notes } as any)
    .eq("user_id", user.id)
    .eq("job_id", jobId);

  if (error) throw error;
  */
};
