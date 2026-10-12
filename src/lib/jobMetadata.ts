import { createClient } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabaseEnv';
import { isUuid, throwIfSupabaseError } from '@/lib/supabaseRead';

const supabase = createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());

export interface JobMetadata {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  companyId?: string;
  companyLogo?: string;
  jobSlug?: string;
}

export async function getJobMetadata(jobId: string): Promise<JobMetadata | null> {
  try {
    // Try to find by slug first (more user-friendly URLs)
    let { data: job, error } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        company,
        location,
        description,
        company_id,
        job_slug,
        companies (
          id,
          name,
          logo,
          website
        )
      `)
      .eq('job_slug', jobId)
      .maybeSingle();
    
    // If not found by slug, try by ID (uuid column — skip non-UUID paths)
    if (!job && !error && isUuid(jobId)) {
      ({ data: job, error } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          company,
          location,
          description,
          company_id,
          job_slug,
          companies (
            id,
            name,
            logo,
            website
          )
        `)
        .eq('id', jobId)
        .maybeSingle());
    }
    
    throwIfSupabaseError(error, 'Error fetching job metadata');
    if (!job) {
      return null;
    }
    
    // Handle companies relation - it could be an object, array, or null
    const companyData = Array.isArray(job.companies) ? job.companies[0] : job.companies;
    
    return {
      id: job.id,
      title: job.title || 'Job Opening',
      company: companyData?.name || job.company || 'Company',
      location: job.location || 'Kenya',
      description: job.description || `Apply for ${job.title} position at ${companyData?.name || job.company} in ${job.location}. Find more jobs on CareerSasa.`,
      companyId: job.company_id || undefined,
      companyLogo: companyData?.logo || undefined,
      jobSlug: job.job_slug || undefined
    };
  } catch (error) {
    console.error('Error in getJobMetadata:', error);
    throw error;
  }
}