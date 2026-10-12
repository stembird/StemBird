// Job Management Library - Templates, Duplication, Promotion, Auto-expire, Bulk Actions

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type JobTemplate = Database['public']['Tables']['job_templates']['Row'];
type JobTemplateInsert = Database['public']['Tables']['job_templates']['Insert'];
type BulkJobAction = Database['public']['Tables']['bulk_job_actions']['Row'];

// Job Templates
export async function getJobTemplates(employerId: string) {
  const { data, error } = await supabase
    .from('job_templates')
    .select('*')
    .eq('user_id', employerId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createJobTemplate(template: Omit<JobTemplateInsert, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('job_templates')
    .insert(template)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateJobTemplate(id: string, updates: Partial<JobTemplateInsert>) {
  const { data, error } = await supabase
    .from('job_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteJobTemplate(id: string) {
  const { error } = await supabase
    .from('job_templates')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Job Duplication
export async function duplicateJob(jobId: string, newTitle?: string) {
  const { data, error } = await supabase.rpc('duplicate_job', {
    source_job_id: jobId,
    new_title: newTitle || null
  });

  if (error) throw error;
  return data;
}

// Job Promotion
export async function promoteJob(jobId: string, tier: 'basic' | 'premium' | 'enterprise' = 'basic', durationDays: number = 7) {
  const { error } = await supabase.rpc('promote_job', {
    job_id_param: jobId,
    tier,
    duration_days: durationDays
  });

  if (error) throw error;
}

export async function unpromoteJob(jobId: string) {
  const { error } = await supabase
    .from('jobs')
    .update({
      is_promoted: false,
      promotion_tier: null,
      promotion_start_date: null,
      promotion_end_date: null
    })
    .eq('id', jobId);

  if (error) throw error;

  // Log the action
  await supabase.from('job_history').insert({
    job_id: jobId,
    action: 'unpromoted',
    changed_by: (await supabase.auth.getUser()).data.user?.id
  });
}

// Job Featuring
export async function featureJob(jobId: string, durationDays: number = 7) {
  const { error } = await supabase.rpc('feature_job', {
    job_id_param: jobId,
    duration_days: durationDays
  });

  if (error) throw error;
}

export async function unfeatureJob(jobId: string) {
  const { error } = await supabase
    .from('jobs')
    .update({
      is_featured: false,
      featured_until: null
    })
    .eq('id', jobId);

  if (error) throw error;

  // Log the action
  await supabase.from('job_history').insert({
    job_id: jobId,
    action: 'unfeatured',
    changed_by: (await supabase.auth.getUser()).data.user?.id
  });
}

// Job Renewal
export async function renewJob(jobId: string) {
  const { error } = await supabase.rpc('renew_job', {
    job_id_param: jobId
  });

  if (error) throw error;
}

export async function setAutoRenew(jobId: string, autoRenew: boolean, renewalDurationDays?: number) {
  const updates: any = { auto_renew: autoRenew };
  if (renewalDurationDays !== undefined) {
    updates.renewal_duration_days = renewalDurationDays;
  }

  const { error } = await supabase
    .from('jobs')
    .update(updates)
    .eq('id', jobId);

  if (error) throw error;
}

// Job Expiration
export async function setJobExpiration(jobId: string, expiresAt: Date | null) {
  const { error } = await supabase
    .from('jobs')
    .update({ expires_at: expiresAt?.toISOString() || null })
    .eq('id', jobId);

  if (error) throw error;
}

export async function expireJob(jobId: string) {
  const { error } = await supabase
    .from('jobs')
    .update({ status: 'expired' })
    .eq('id', jobId);

  if (error) throw error;

  // Log the action
  await supabase.from('job_history').insert({
    job_id: jobId,
    action: 'expired',
    changed_by: (await supabase.auth.getUser()).data.user?.id
  });
}

// Bulk Job Actions
export async function createBulkJobAction(
  jobIds: string[],
  actionType: 'delete' | 'expire' | 'renew' | 'promote' | 'unpromote' | 'feature' | 'unfeature' | 'update_status',
  parameters?: Record<string, any>
) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('bulk_job_actions')
    .insert({
      user_id: user.user.id,
      action_type: actionType,
      job_ids: jobIds,
      parameters: parameters || {}
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function executeBulkJobAction(actionId: string) {
  const { data, error } = await supabase.rpc('execute_bulk_job_action', {
    action_id_param: actionId
  });

  if (error) throw error;
  return data;
}

export async function getBulkJobActions(employerId: string, limit: number = 50) {
  const { data, error } = await supabase
    .from('bulk_job_actions')
    .select('*')
    .eq('user_id', employerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// Job History
export async function getJobHistory(jobId: string) {
  const { data, error } = await supabase
    .from('job_history')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Helper: Get jobs with promotion/featured status
export async function getPromotedJobs(employerId?: string) {
  let query = supabase
    .from('jobs')
    .select('*')
    .eq('is_promoted', true)
    .gte('promotion_end_date', new Date().toISOString());

  if (employerId) {
    query = query.eq('user_id', employerId);
  }

  const { data, error } = await query.order('promotion_start_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getFeaturedJobs(limit: number = 10) {
  const { data, error } = await supabase
    .from('jobs')
    .select('*, companies(*)')
    .eq('is_featured', true)
    .eq('status', 'active')
    .eq('listing_kind', 'job')
    .gte('featured_until', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// Helper: Get expiring jobs
export async function getExpiringJobs(employerId: string, daysAhead: number = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', employerId)
    .eq('status', 'active')
    .not('expires_at', 'is', null)
    .lte('expires_at', futureDate.toISOString())
    .gte('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true });

  if (error) throw error;
  return data;
}

// Helper: Create job from template
export async function createJobFromTemplate(templateId: string, overrides?: Partial<any>) {
  const { data: template, error: templateError } = await supabase
    .from('job_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (templateError) throw templateError;

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const jobData: any = {
    user_id: user.user.id,
    title: template.title,
    company: '', // Will be filled from user's company profile or overrides
    description: template.description || '',
    requirements: template.requirements || '',
    responsibilities: template.responsibilities || '',
    benefits: template.benefits || '',
    job_type: template.job_type || '',
    experience_level: template.experience_level || '',
    salary_min: template.salary_min,
    salary_max: template.salary_max,
    salary_currency: template.salary_currency || 'USD',
    location: template.location || '',
    remote_type: template.remote_type || '',
    category: template.category || '',
    tags: template.tags || [],
    custom_fields: template.custom_fields || {},
    status: 'draft',
    date_posted: new Date().toISOString(),
    ...overrides
  };
  if (!jobData.date_posted) {
    jobData.date_posted = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('jobs')
    .insert(jobData)
    .select()
    .single();

  if (error) throw error;
  return data;
}
