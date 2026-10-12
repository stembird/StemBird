import { supabase } from "@/integrations/supabase/client";

export interface JobAnalytics {
  job_id: string;
  title: string;
  status: string;
  posted_at: string;
  total_views: number;
  total_applications: number;
  shortlisted_count: number;
  interview_count: number;
  offered_count: number;
  hired_count: number;
  rejected_count: number;
  conversion_rate: number;
  first_application_at: string | null;
  last_application_at: string | null;
}

export interface ApplicationFunnelData {
  stage: string;
  count: number;
  percentage: number;
}

export interface SourceAnalytics {
  source_type: string;
  source_name: string;
  count: number;
  percentage: number;
}

export interface TimeToHireData {
  job_id: string;
  job_title: string;
  days_to_first_application: number | null;
  days_to_hire: number | null;
  total_applicants: number;
}

export interface DemographicsData {
  experience_level: string;
  count: number;
}

/**
 * Fetch analytics summary for all jobs of an employer
 */
export async function getEmployerAnalytics(employerId: string): Promise<JobAnalytics[]> {
  // Use type assertion to bypass type checking for materialized view
  const supabaseAny = supabase as any;
  const { data, error } = await supabaseAny
    .from("job_analytics_summary")
    .select("*")
    .eq("employer_id", employerId)
    .order("posted_at", { ascending: false });

  if (error) {
    console.error("Error fetching employer analytics:", error);
    throw error;
  }

  return (data || []) as JobAnalytics[];
}

/**
 * Fetch analytics for a specific job
 */
export async function getJobAnalytics(jobId: string): Promise<JobAnalytics | null> {
  // Use type assertion to bypass type checking for materialized view
  const supabaseAny = supabase as any;
  const { data, error } = await supabaseAny
    .from("job_analytics_summary")
    .select("*")
    .eq("job_id", jobId)
    .single();

  if (error) {
    console.error("Error fetching job analytics:", error);
    return null;
  }

  return data as JobAnalytics | null;
}

/**
 * Get application funnel data for a job
 */
export async function getApplicationFunnel(jobId: string): Promise<ApplicationFunnelData[]> {
  const { data, error } = await supabase
    .from("job_applications")
    .select("status")
    .eq("job_id", jobId);

  if (error) {
    console.error("Error fetching application funnel:", error);
    return [];
  }

  const total = data.length;
  const statusCounts: Record<string, number> = {};

  data.forEach((app) => {
    statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
  });

  const funnelStages = [
    "pending",
    "reviewing",
    "shortlisted",
    "interviewed",
    "offered",
    "accepted",
  ];

  return funnelStages.map((stage) => ({
    stage,
    count: statusCounts[stage] || 0,
    percentage: total > 0 ? ((statusCounts[stage] || 0) / total) * 100 : 0,
  }));
}

/**
 * Get source analytics for applications
 */
export async function getSourceAnalytics(jobId?: string, employerId?: string): Promise<SourceAnalytics[]> {
  const supabaseAny = supabase as any;
  let query = supabaseAny
    .from("application_sources")
    .select(`
      source_type,
      source_name,
      application_id,
      job_applications!inner(job_id, jobs!inner(user_id))
    `);

  if (jobId) {
    query = query.eq("job_applications.job_id", jobId);
  } else if (employerId) {
    query = query.eq("job_applications.jobs.user_id", employerId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching source analytics:", error);
    return [];
  }

  const sourceCounts: Record<string, { type: string; name: string; count: number }> = {};
  const total = data.length;

  data.forEach((item: any) => {
    const key = `${item.source_type}-${item.source_name}`;
    if (!sourceCounts[key]) {
      sourceCounts[key] = {
        type: item.source_type || "unknown",
        name: item.source_name || "Direct",
        count: 0,
      };
    }
    sourceCounts[key].count++;
  });

  return Object.values(sourceCounts).map((source) => ({
    source_type: source.type,
    source_name: source.name,
    count: source.count,
    percentage: total > 0 ? (source.count / total) * 100 : 0,
  }));
}

/**
 * Get time-to-hire metrics
 */
export async function getTimeToHireMetrics(employerId: string): Promise<TimeToHireData[]> {
  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(`
      id,
      title,
      created_at,
      job_applications(created_at, status)
    `)
    .eq("user_id", employerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching time-to-hire metrics:", error);
    return [];
  }

  return jobs.map((job: any) => {
    const applications = job.job_applications || [];
    const hiredApp = applications.find((app: any) => app.status === "accepted");
    const firstApp = applications.length > 0 ? applications[0] : null;

    const jobCreatedAt = new Date(job.created_at);
    const firstAppDate = firstApp ? new Date(firstApp.created_at) : null;
    const hiredDate = hiredApp ? new Date(hiredApp.created_at) : null;

    return {
      job_id: job.id,
      job_title: job.title,
      days_to_first_application: firstAppDate
        ? Math.ceil((firstAppDate.getTime() - jobCreatedAt.getTime()) / (1000 * 60 * 60 * 24))
        : null,
      days_to_hire: hiredDate
        ? Math.ceil((hiredDate.getTime() - jobCreatedAt.getTime()) / (1000 * 60 * 60 * 24))
        : null,
      total_applicants: applications.length,
    };
  });
}

/**
 * Get candidate demographics for a job or employer
 */
export async function getCandidateDemographics(
  jobId?: string,
  employerId?: string
): Promise<DemographicsData[]> {
  let query = supabase
    .from("job_applications")
    .select(`
      years_experience,
      jobs!inner(user_id)
    `);

  if (jobId) {
    query = query.eq("job_id", jobId);
  } else if (employerId) {
    query = query.eq("jobs.user_id", employerId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching candidate demographics:", error);
    return [];
  }

  const experienceBuckets: Record<string, number> = {
    "0-2 years": 0,
    "3-5 years": 0,
    "6-10 years": 0,
    "10+ years": 0,
    "Not specified": 0,
  };

  data.forEach((app: any) => {
    const years = app.years_experience;
    if (years === null || years === undefined) {
      experienceBuckets["Not specified"]++;
    } else if (years <= 2) {
      experienceBuckets["0-2 years"]++;
    } else if (years <= 5) {
      experienceBuckets["3-5 years"]++;
    } else if (years <= 10) {
      experienceBuckets["6-10 years"]++;
    } else {
      experienceBuckets["10+ years"]++;
    }
  });

  return Object.entries(experienceBuckets).map(([level, count]) => ({
    experience_level: level,
    count,
  }));
}

/**
 * Track a job view
 */
export async function trackJobView(
  jobId: string,
  metadata?: {
    referrer?: string;
    sessionId?: string;
  }
) {
  const supabaseAny = supabase as any;
  const { error } = await supabaseAny.from("job_views").insert({
    job_id: jobId,
    referrer: metadata?.referrer,
    session_id: metadata?.sessionId,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  });

  if (error) {
    console.error("Error tracking job view:", error);
  }
}

/**
 * Track application source
 */
export async function trackApplicationSource(
  applicationId: string,
  source: {
    source_type?: string;
    source_name?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    referrer?: string;
  }
) {
  const supabaseAny = supabase as any;
  const { error } = await supabaseAny.from("application_sources").insert({
    application_id: applicationId,
    ...source,
  });

  if (error) {
    console.error("Error tracking application source:", error);
  }
}

/**
 * Refresh analytics materialized view
 */
export async function refreshAnalytics() {
  const supabaseAny = supabase as any;
  const { error } = await supabaseAny.rpc("refresh_job_analytics");

  if (error) {
    console.error("Error refreshing analytics:", error);
    throw error;
  }
}
