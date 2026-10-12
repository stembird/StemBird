import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

export interface ApplicationRating {
  id: string;
  application_id: string;
  rated_by: string;
  overall_score: number | null;
  technical_score: number | null;
  experience_score: number | null;
  culture_fit_score: number | null;
  communication_score: number | null;
  rating_notes: string | null;
  recommendation: "strong_yes" | "yes" | "maybe" | "no" | "strong_no" | null;
  created_at: string;
  updated_at: string;
}

export interface EmployerNote {
  id: string;
  application_id: string;
  created_by: string;
  note_text: string;
  note_type: string;
  is_private: boolean;
  is_pinned: boolean;
  mentioned_users: string[] | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewSchedule {
  id: string;
  application_id: string;
  interview_type: string;
  interview_title: string;
  interview_description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  location: string | null;
  meeting_link: string | null;
  meeting_password: string | null;
  interviewer_ids: string[] | null;
  scheduled_by: string | null;
  status: string;
  reminder_sent: boolean;
  feedback_submitted: boolean;
  interview_feedback: string | null;
  interview_rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface AverageRating {
  avg_overall: number;
  avg_technical: number;
  avg_experience: number;
  avg_culture_fit: number;
  avg_communication: number;
  total_ratings: number;
}

export interface BulkActionResult {
  success_count: number;
  failure_count: number;
}

// ============================================================================
// APPLICATION RATINGS
// ============================================================================

/**
 * Add or update a rating for an application
 */
export async function rateApplication(
  applicationId: string,
  rating: {
    overall_score?: number;
    technical_score?: number;
    experience_score?: number;
    culture_fit_score?: number;
    communication_score?: number;
    rating_notes?: string;
    recommendation?: "strong_yes" | "yes" | "maybe" | "no" | "strong_no";
  }
): Promise<ApplicationRating | null> {
  const supabaseAny = supabase as any;
  const { data, error } = await supabaseAny
    .from("application_ratings")
    .upsert({
      application_id: applicationId,
      rated_by: (await supabase.auth.getUser()).data.user?.id,
      ...rating,
    })
    .select()
    .single();

  if (error) {
    console.error("Error rating application:", error);
    throw error;
  }

  return data as ApplicationRating;
}

/**
 * Get all ratings for an application
 */
export async function getApplicationRatings(
  applicationId: string
): Promise<ApplicationRating[]> {
  const supabaseAny = supabase as any;
  const { data, error } = await supabaseAny
    .from("application_ratings")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching ratings:", error);
    return [];
  }

  return (data || []) as ApplicationRating[];
}

/**
 * Get average rating for an application
 */
export async function getAverageRating(
  applicationId: string
): Promise<AverageRating | null> {
  const supabaseAny = supabase as any;
  const { data, error } = await supabaseAny.rpc("get_application_average_rating", {
    p_application_id: applicationId,
  });

  if (error) {
    console.error("Error fetching average rating:", error);
    return null;
  }

  return data?.[0] as AverageRating | null;
}

// ============================================================================
// EMPLOYER NOTES
// ============================================================================

/**
 * Add a note to an application
 */
export async function addEmployerNote(
  applicationId: string,
  note: {
    note_text: string;
    note_type?: string;
    is_private?: boolean;
    is_pinned?: boolean;
    mentioned_users?: string[];
    tags?: string[];
  }
): Promise<EmployerNote | null> {
  const supabaseAny = supabase as any;
  const { data, error } = await supabaseAny
    .from("employer_application_notes")
    .insert({
      application_id: applicationId,
      created_by: (await supabase.auth.getUser()).data.user?.id,
      ...note,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding note:", error);
    throw error;
  }

  return data as EmployerNote;
}

/**
 * Get all notes for an application
 */
export async function getEmployerNotes(
  applicationId: string
): Promise<EmployerNote[]> {
  const supabaseAny = supabase as any;
  const { data, error } = await supabaseAny
    .from("employer_application_notes")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching notes:", error);
    return [];
  }

  return (data || []) as EmployerNote[];
}

/**
 * Update a note
 */
export async function updateEmployerNote(
  noteId: string,
  updates: Partial<EmployerNote>
): Promise<EmployerNote | null> {
  const supabaseAny = supabase as any;
  const { data, error } = await supabaseAny
    .from("employer_application_notes")
    .update(updates)
    .eq("id", noteId)
    .select()
    .single();

  if (error) {
    console.error("Error updating note:", error);
    throw error;
  }

  return data as EmployerNote;
}

/**
 * Delete a note
 */
export async function deleteEmployerNote(noteId: string): Promise<boolean> {
  const supabaseAny = supabase as any;
  const { error } = await supabaseAny
    .from("employer_application_notes")
    .delete()
    .eq("id", noteId);

  if (error) {
    console.error("Error deleting note:", error);
    return false;
  }

  return true;
}

// ============================================================================
// INTERVIEW SCHEDULING
// ============================================================================

/**
 * Schedule an interview
 */
export async function scheduleInterview(
  applicationId: string,
  interview: {
    interview_type: string;
    interview_title: string;
    interview_description?: string;
    scheduled_at: string;
    duration_minutes?: number;
    timezone?: string;
    location?: string;
    meeting_link?: string;
    meeting_password?: string;
    interviewer_ids?: string[];
  }
): Promise<InterviewSchedule | null> {
  const supabaseAny = supabase as any;
  const { data, error } = await supabaseAny
    .from("interview_schedules")
    .insert({
      application_id: applicationId,
      scheduled_by: (await supabase.auth.getUser()).data.user?.id,
      ...interview,
    })
    .select()
    .single();

  if (error) {
    console.error("Error scheduling interview:", error);
    throw error;
  }

  return data as InterviewSchedule;
}

/**
 * Get interviews for an application
 */
export async function getInterviews(
  applicationId: string
): Promise<InterviewSchedule[]> {
  const supabaseAny = supabase as any;
  const { data, error } = await supabaseAny
    .from("interview_schedules")
    .select("*")
    .eq("application_id", applicationId)
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("Error fetching interviews:", error);
    return [];
  }

  return (data || []) as InterviewSchedule[];
}

/**
 * Update interview status
 */
export async function updateInterviewStatus(
  interviewId: string,
  status: string,
  feedback?: {
    interview_feedback?: string;
    interview_rating?: number;
  }
): Promise<InterviewSchedule | null> {
  const supabaseAny = supabase as any;
  const { data, error } = await supabaseAny
    .from("interview_schedules")
    .update({
      status,
      ...feedback,
      feedback_submitted: feedback ? true : undefined,
    })
    .eq("id", interviewId)
    .select()
    .single();

  if (error) {
    console.error("Error updating interview:", error);
    throw error;
  }

  return data as InterviewSchedule;
}

/**
 * Cancel an interview
 */
export async function cancelInterview(interviewId: string): Promise<boolean> {
  const supabaseAny = supabase as any;
  const { error } = await supabaseAny
    .from("interview_schedules")
    .update({ status: "cancelled" })
    .eq("id", interviewId);

  if (error) {
    console.error("Error cancelling interview:", error);
    return false;
  }

  return true;
}

// ============================================================================
// BULK ACTIONS
// ============================================================================

/**
 * Bulk update application status
 */
export async function bulkUpdateStatus(
  applicationIds: string[],
  newStatus: string
): Promise<BulkActionResult> {
  const supabaseAny = supabase as any;
  const userId = (await supabase.auth.getUser()).data.user?.id;

  const { data, error } = await supabaseAny.rpc("bulk_update_application_status", {
    p_application_ids: applicationIds,
    p_new_status: newStatus,
    p_performed_by: userId,
  });

  if (error) {
    console.error("Error performing bulk update:", error);
    throw error;
  }

  return data?.[0] as BulkActionResult;
}

/**
 * Bulk reject applications
 */
export async function bulkReject(
  applicationIds: string[],
  rejectionReason?: string
): Promise<BulkActionResult> {
  return bulkUpdateStatus(applicationIds, "rejected");
}

/**
 * Bulk shortlist applications
 */
export async function bulkShortlist(
  applicationIds: string[]
): Promise<BulkActionResult> {
  return bulkUpdateStatus(applicationIds, "shortlisted");
}

/**
 * Bulk move to stage
 */
export async function bulkMoveToStage(
  applicationIds: string[],
  stage: string
): Promise<BulkActionResult> {
  return bulkUpdateStatus(applicationIds, stage);
}
