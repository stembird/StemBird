import { supabase } from "@/integrations/supabase/client";

export const testSupabaseConnection = async () => {
  try {
    console.log("Testing Supabase connection...");
    
    // Test a simple query to check connection
    const { data, error } = await supabase
      .from("jobs")
      .select("id, title")
      .limit(1);
    
    if (error) {
      console.error("Supabase connection test failed:", error);
      return { success: false, error };
    }
    
    console.log("Supabase connection test successful:", data);
    return { success: true, data };
  } catch (err) {
    console.error("Supabase connection test error:", err);
    return { success: false, error: err };
  }
};