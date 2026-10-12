import { supabase } from "@/integrations/supabase/client";

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  search_params: Record<string, any>;
  email_alerts_enabled: boolean;
  alert_frequency: 'instant' | 'daily' | 'weekly';
  last_alert_sent_at?: string;
  created_at: string;
  updated_at: string;
}

export const saveSearch = async (
  name: string,
  searchParams: Record<string, any>,
  emailAlertsEnabled: boolean = false,
  alertFrequency: 'instant' | 'daily' | 'weekly' = 'daily'
) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User must be logged in to save searches");
  }

  // Temporarily use minimal insert due to schema cache issue
  // PostgREST hasn't recognized the new columns yet
  const { data, error } = await supabase
    .from("saved_searches")
    .insert({
      user_id: user.id,
      name,
      search_params: searchParams
      // email_alerts_enabled and alert_frequency temporarily disabled
      // due to Supabase schema cache not recognizing these columns yet
    } as any)
    .select()
    .single();

  if (error) {
    console.error("Error saving search:", error);
    
    // If it's a schema cache error, provide helpful message
    if (error.message?.includes('schema cache')) {
      throw new Error("The saved searches feature is still initializing. Please try again in 24-48 hours.");
    }
    
    throw new Error(error.message || "Failed to save search");
  }
  
  // Show warning if email alerts were requested but couldn't be saved
  if (emailAlertsEnabled) {
    console.warn("Email alerts setting could not be saved due to schema cache issue. This will be available once the cache refreshes.");
  }
  
  return data as any;
};

export const getSavedSearches = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User must be logged in");
  }

  const { data, error } = await supabase
    .from("saved_searches")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as any;
};

export const updateSavedSearch = async (
  searchId: string,
  updates: Partial<Omit<SavedSearch, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User must be logged in");
  }

  const { data, error } = await supabase
    .from("saved_searches")
    .update(updates as any)
    .eq("id", searchId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw error;
  return data as any;
};

export const deleteSavedSearch = async (searchId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User must be logged in");
  }

  const { error } = await supabase
    .from("saved_searches")
    .delete()
    .eq("id", searchId)
    .eq("user_id", user.id);

  if (error) throw error;
};

export const getJobsForSavedSearch = async (searchParams: Record<string, any>) => {
  let query = supabase
    .from("jobs")
    .select(`
      *,
      companies (
        id,
        name,
        logo,
        website
      )
    `)
    .eq("status", "active")
    .eq("listing_kind", "job");

  // Apply search filters
  if (searchParams.searchTerm) {
    query = query.ilike("title", `%${searchParams.searchTerm}%`);
  }

  if (searchParams.location) {
    query = query.eq("job_location_county", searchParams.location);
  }

  if (searchParams.employmentType) {
    query = query.eq("employment_type", searchParams.employmentType);
  }

  if (searchParams.experienceLevel) {
    query = query.eq("experience_level", searchParams.experienceLevel);
  }

  if (searchParams.remoteOnly) {
    query = query.eq("job_location_type", "REMOTE");
  }

  if (searchParams.educationLevel) {
    query = query.ilike("education_requirements", `%${searchParams.educationLevel}%`);
  }

  if (searchParams.industry) {
    query = query.eq("industry", searchParams.industry);
  }

  if (searchParams.jobType) {
    query = query.eq("job_function", searchParams.jobType);
  }

  if (searchParams.salaryMin !== null && searchParams.salaryMin !== undefined) {
    query = query.gte("salary_min", searchParams.salaryMin);
  }

  if (searchParams.salaryMax !== null && searchParams.salaryMax !== undefined) {
    query = query.lte("salary_max", searchParams.salaryMax);
  }

  query = query.order("created_at", { ascending: false }).limit(50);

  const { data, error } = await query;

  if (error) throw error;
  return data;
};
