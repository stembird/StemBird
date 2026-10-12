// Career Tools Library - CV Builder, Cover Letters, Assessments, Career Paths, Salary Insights

import { supabase } from '@/integrations/supabase/client';
import { isMissingDbColumnError } from '@/lib/applyDocuments';
import { normalizeCVContent } from '@/lib/cvContent';
import { isShareColumnMissing, withoutShareFields } from '@/lib/cvShare';
import { tailoredCvTitle, withoutTargetingFields } from '@/lib/jobTargeting';
import type { CoverLetterContentJson } from '@/types/careerDocuments';

// ============================================================================
// TYPES
// ============================================================================

export interface CVTemplate {
  id: string;
  name: string;
  description: string | null;
  category: 'professional' | 'creative' | 'modern' | 'classic';
  thumbnail_url: string | null;
  template_data: any;
  is_premium: boolean;
  price_kes?: number | null;
}

export interface CandidateCV {
  id: string;
  user_id: string;
  template_id: string | null;
  title: string;
  content: any;
  is_primary: boolean;
  version: number;
  file_url: string | null;
  last_generated_at: string | null;
  parent_cv_id?: string | null;
  target_job_id?: string | null;
  target_jd_text?: string | null;
  share_token?: string | null;
  is_public?: boolean | null;
  shared_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoverLetterTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  template_text: string;
  placeholders: any;
  is_premium: boolean;
  usage_count: number;
  price_kes?: number | null;
}

export interface CandidateCoverLetter {
  id: string;
  user_id: string;
  template_id: string | null;
  job_id: string | null;
  title: string;
  content: string;
  content_json: CoverLetterContentJson | null;
  generated_content: string | null;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SkillAssessment {
  id: string;
  skill_name: string;
  category: 'technical' | 'soft' | 'language' | 'tool';
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  description: string | null;
  duration_minutes: number;
  passing_score: number;
  questions: any;
}

export interface AssessmentResult {
  id: string;
  user_id: string;
  assessment_id: string;
  score: number;
  passed: boolean;
  time_taken_minutes: number | null;
  answers: any;
  certificate_url: string | null;
  completed_at: string;
  expires_at: string | null;
  is_public: boolean;
}

export interface CareerPath {
  id: string;
  from_role: string;
  to_role: string;
  difficulty: 'easy' | 'moderate' | 'challenging';
  typical_duration_months: number | null;
  required_skills: any;
  recommended_certifications: any;
  salary_increase_percentage: number | null;
  description: string | null;
  steps: any;
  success_rate: number | null;
}

export interface CareerGoal {
  id: string;
  user_id: string;
  user_current_role: string;
  target_role: string;
  target_timeline_months: number | null;
  career_path_id: string | null;
  progress_percentage: number;
  completed_steps: any;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SalaryInsight {
  min_salary: number;
  max_salary: number;
  median_salary: number;
  percentile_25: number;
  percentile_75: number;
  sample_size: number;
  currency: string;
}

// ============================================================================
// CV MANAGEMENT
// ============================================================================

export async function getCVTemplates() {
  const { data, error } = await supabase
    .from('cv_templates' as any)
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as unknown as unknown as CVTemplate[];
}

export async function getUserCVs(userId: string) {
  const { data, error } = await supabase
    .from('candidate_cvs' as any)
    .select('*')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as unknown as CandidateCV[];
}

export async function createCV(cv: Partial<CandidateCV>) {
  const payload = {
    ...cv,
    content: normalizeCVContent(cv.content ?? {}),
  };
  let { data, error } = await supabase
    .from('candidate_cvs' as any)
    .insert(payload)
    .select()
    .single();

  if (
    error &&
    (isMissingDbColumnError(error, 'parent_cv_id') ||
      isMissingDbColumnError(error, 'target_job_id') ||
      isMissingDbColumnError(error, 'target_jd_text') ||
      isShareColumnMissing(error))
  ) {
    const retry = await supabase
      .from('candidate_cvs' as any)
      .insert(withoutShareFields(withoutTargetingFields(payload)))
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;
  return data as unknown as CandidateCV;
}

export async function updateCV(id: string, updates: Partial<CandidateCV>) {
  const payload: Partial<CandidateCV> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };
  if (updates.content !== undefined) {
    payload.content = normalizeCVContent(updates.content);
  }
  let { data, error } = await supabase
    .from('candidate_cvs' as any)
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (
    error &&
    (isMissingDbColumnError(error, 'parent_cv_id') ||
      isMissingDbColumnError(error, 'target_job_id') ||
      isMissingDbColumnError(error, 'target_jd_text') ||
      isShareColumnMissing(error))
  ) {
    const retry = await supabase
      .from('candidate_cvs' as any)
      .update(withoutShareFields(withoutTargetingFields(payload)))
      .eq('id', id)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;
  return data as unknown as CandidateCV;
}

export async function attachJobToCV(
  cvId: string,
  targeting: { target_job_id?: string | null; target_jd_text?: string | null },
) {
  return updateCV(cvId, {
    target_job_id: targeting.target_job_id ?? null,
    target_jd_text: targeting.target_jd_text ?? null,
  });
}

export async function createTargetedCvCopy(
  source: CandidateCV,
  targeting: { target_job_id?: string | null; target_jd_text?: string | null; jobTitle?: string | null },
) {
  const title = tailoredCvTitle(source.title, targeting.jobTitle);
  const payload: Partial<CandidateCV> = {
    user_id: source.user_id,
    template_id: source.template_id,
    title,
    content: source.content,
    is_primary: false,
    parent_cv_id: source.id,
    target_job_id: targeting.target_job_id ?? null,
    target_jd_text: targeting.target_jd_text ?? null,
  };
  try {
    return await createCV(payload);
  } catch (error: any) {
    if (error?.code === '23505') {
      return createCV({
        ...payload,
        title: `${title} (${new Date().toISOString().slice(11, 19)})`.slice(0, 120),
      });
    }
    throw error;
  }
}

export async function deleteCV(id: string) {
  const { error } = await supabase
    .from('candidate_cvs' as any)
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function setPrimaryCV(userId: string, cvId: string) {
  // First, unset all primary CVs for this user
  await supabase
    .from('candidate_cvs' as any)
    .update({ is_primary: false })
    .eq('user_id', userId);

  // Then set the selected CV as primary
  const { data, error } = await supabase
    .from('candidate_cvs' as any)
    .update({ is_primary: true })
    .eq('id', cvId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as CandidateCV;
}

// ============================================================================
// COVER LETTER MANAGEMENT
// ============================================================================

export async function getCoverLetterTemplates() {
  const { data, error } = await supabase
    .from('cover_letter_templates' as any)
    .select('*')
    .eq('is_active', true)
    .order('usage_count', { ascending: false });

  if (error) throw error;
  return data as unknown as CoverLetterTemplate[];
}

export async function getUserCoverLetters(userId: string) {
  const { data, error } = await supabase
    .from('candidate_cover_letters' as any)
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as CandidateCoverLetter[];
}

function isMissingContentJsonColumn(error: { message?: string } | null): boolean {
  const message = error?.message || '';
  return /content_json/i.test(message) && /column/i.test(message);
}

export async function createCoverLetter(letter: Partial<CandidateCoverLetter>) {
  const { data, error } = await supabase
    .from('candidate_cover_letters' as any)
    .insert(letter)
    .select()
    .single();

  if (error && letter.content_json && isMissingContentJsonColumn(error)) {
    const { content_json: _, ...withoutJson } = letter;
    const retry = await supabase
      .from('candidate_cover_letters' as any)
      .insert(withoutJson)
      .select()
      .single();
    if (retry.error) throw retry.error;
    return retry.data as unknown as CandidateCoverLetter;
  }

  if (error) throw error;

  // TODO: Increment template usage count when increment function is available
  // if (letter.template_id) {
  //   await supabase.rpc('increment', {
  //     table_name: 'cover_letter_templates',
  //     row_id: letter.template_id,
  //     column_name: 'usage_count'
  //   });
  // }

  return data as unknown as CandidateCoverLetter;
}

export async function updateCoverLetter(id: string, updates: Partial<CandidateCoverLetter>) {
  const { data, error } = await supabase
    .from('candidate_cover_letters' as any)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error && updates.content_json && isMissingContentJsonColumn(error)) {
    const { content_json: _, ...withoutJson } = updates;
    const retry = await supabase
      .from('candidate_cover_letters' as any)
      .update({ ...withoutJson, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (retry.error) throw retry.error;
    return retry.data as unknown as CandidateCoverLetter;
  }

  if (error) throw error;
  return data as unknown as CandidateCoverLetter;
}

export async function deleteCoverLetter(id: string) {
  const { error } = await supabase
    .from('candidate_cover_letters' as any)
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function generateCoverLetterFromTemplate(
  templateId: string,
  placeholders: Record<string, string>
): Promise<string> {
  const { data: template, error } = await supabase
    .from('cover_letter_templates' as any)
    .select('template_text')
    .eq('id', templateId)
    .single();

  if (error) throw error;

  let content = (template as any).template_text;
  Object.entries(placeholders).forEach(([key, value]) => {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });

  return content;
}

// ============================================================================
// SKILL ASSESSMENTS
// ============================================================================

export async function getSkillAssessments(category?: string) {
  let query = supabase
    .from('skill_assessments' as any)
    .select('*')
    .eq('is_active', true);

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query.order('skill_name', { ascending: true });

  if (error) throw error;
  return data as unknown as SkillAssessment[];
}

export async function getAssessmentById(id: string) {
  const { data, error } = await supabase
    .from('skill_assessments' as any)
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as unknown as SkillAssessment;
}

export async function getUserAssessmentResults(userId: string) {
  const { data, error } = await supabase
    .from('candidate_assessment_results' as any)
    .select('*, skill_assessments(skill_name, category, difficulty_level)')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function submitAssessment(result: Partial<AssessmentResult>) {
  const { data, error } = await supabase
    .from('candidate_assessment_results' as any)
    .insert(result)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as AssessmentResult;
}

export async function calculateAssessmentScore(
  assessment: SkillAssessment,
  userAnswers: any[]
): Promise<{ score: number; passed: boolean }> {
  const questions = assessment.questions.questions;
  let totalPoints = 0;
  let earnedPoints = 0;

  questions.forEach((question: any, index: number) => {
    totalPoints += question.points;
    const userAnswer = userAnswers[index];

    if (question.type === 'multiple_choice') {
      if (userAnswer === question.correct) {
        earnedPoints += question.points;
      }
    }
    // Text answers would need manual review or AI scoring
  });

  const score = Math.round((earnedPoints / totalPoints) * 100);
  const passed = score >= assessment.passing_score;

  return { score, passed };
}

// ============================================================================
// CAREER PATHS
// ============================================================================

export async function getCareerPaths(fromRole?: string, toRole?: string) {
  let query = supabase.from('career_paths' as any).select('*');

  if (fromRole) {
    query = query.ilike('from_role', `%${fromRole}%`);
  }
  if (toRole) {
    query = query.ilike('to_role', `%${toRole}%`);
  }

  const { data, error } = await query.order('success_rate', { ascending: false });

  if (error) throw error;
  return data as unknown as CareerPath[];
}

export async function suggestCareerPaths(userId: string) {
  const { data, error } = await (supabase.rpc as any)('suggest_career_paths', {
    p_user_id: userId
  });

  if (error) throw error;
  return data;
}

export async function getUserCareerGoals(userId: string) {
  const { data, error } = await supabase
    .from('candidate_career_goals' as any)
    .select('*, career_paths(*)')
    .eq('user_id', userId)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createCareerGoal(goal: Partial<CareerGoal>) {
  const { data, error } = await supabase
    .from('candidate_career_goals' as any)
    .insert(goal)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as CareerGoal;
}

export async function updateCareerGoal(id: string, updates: Partial<CareerGoal>) {
  const { data, error } = await supabase
    .from('candidate_career_goals' as any)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as CareerGoal;
}

// ============================================================================
// SALARY INSIGHTS
// ============================================================================

export async function getSalaryInsights(
  jobTitle: string,
  location?: string,
  experienceLevel?: string
): Promise<SalaryInsight | null> {
  const { data, error } = await (supabase.rpc as any)('get_salary_insights', {
    p_job_title: jobTitle,
    p_location: location || null,
    p_experience_level: experienceLevel || null
  });

  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

export async function getUserSalaryExpectations(userId: string) {
  const { data, error } = await supabase
    .from('candidate_salary_expectations' as any)
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

export async function setSalaryExpectation(expectation: {
  user_id: string;
  job_title: string;
  min_salary: number;
  max_salary: number;
  currency?: string;
  is_negotiable?: boolean;
  preferred_benefits?: any;
}) {
  const { data, error } = await supabase
    .from('candidate_salary_expectations' as any)
    .upsert(expectation)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSalaryExpectation(expectationId: string) {
  const { error } = await supabase
    .from('candidate_salary_expectations' as any)
    .delete()
    .eq('id', expectationId);

  if (error) throw error;
}

export async function updateSalaryExpectation(
  expectationId: string,
  updates: {
    job_title?: string;
    min_salary?: number;
    max_salary?: number;
    currency?: string;
    is_negotiable?: boolean;
  },
) {
  const { data, error } = await supabase
    .from('candidate_salary_expectations' as any)
    .update(updates)
    .eq('id', expectationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function compareSalaryToMarket(
  jobTitle: string,
  userSalary: number,
  location?: string,
  experienceLevel?: string
): Promise<{
  userSalary: number;
  marketMedian: number;
  percentile: number;
  difference: number;
  differencePercentage: number;
  status: 'below' | 'at' | 'above';
}> {
  const insights = await getSalaryInsights(jobTitle, location, experienceLevel);

  if (!insights) {
    throw new Error('No salary data available for comparison');
  }

  const difference = userSalary - insights.median_salary;
  const differencePercentage = (difference / insights.median_salary) * 100;

  let percentile = 50;
  if (userSalary <= insights.percentile_25) percentile = 25;
  else if (userSalary >= insights.percentile_75) percentile = 75;
  else {
    // Linear interpolation between 25th and 75th percentile
    const range = insights.percentile_75 - insights.percentile_25;
    const position = userSalary - insights.percentile_25;
    percentile = 25 + (position / range) * 50;
  }

  let status: 'below' | 'at' | 'above' = 'at';
  if (differencePercentage < -10) status = 'below';
  else if (differencePercentage > 10) status = 'above';

  return {
    userSalary,
    marketMedian: insights.median_salary,
    percentile: Math.round(percentile),
    difference,
    differencePercentage: Math.round(differencePercentage),
    status
  };
}
