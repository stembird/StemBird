'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CandidateProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  location: string | null;
  bio: string | null;
  current_title: string | null;
  years_experience: number | null;
  expected_salary_min: number | null;
  expected_salary_max: number | null;
  expected_salary_currency: string;
  linkedin_url: string | null;
  portfolio_url: string | null;
  github_url: string | null;
  profile_visibility: 'private' | 'public' | 'recruiters_only';
  job_alerts_enabled: boolean;
  // New fields added 2026-06-14
  date_of_birth: string | null;
  nationality: string | null;
  gender: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | null;
  marital_status: 'single' | 'married' | 'divorced' | 'widowed' | 'prefer_not_to_say' | null;
  languages: string[] | null;
  highest_education_level: string | null;
  industry: string | null;
  job_preferences: Record<string, unknown> | null;
  notice_period: string | null;
  work_authorization: string | null;
  disability_status: 'yes' | 'no' | 'prefer_not_to_say' | null;
  profile_completeness_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface WorkExperience {
  id: string;
  candidate_id: string;
  company_name: string;
  job_title: string;
  employment_type: string | null;
  location: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  achievements: string[] | null;
}

export interface Education {
  id: string;
  candidate_id: string;
  institution_name: string;
  degree_type: string;
  field_of_study: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  grade: string | null;
  description: string | null;
  achievements: string[] | null;
}

export interface Skill {
  id: string;
  candidate_id: string;
  skill_name: string;
  skill_category: string | null;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  years_of_experience: number | null;
  is_verified: boolean;
  endorsed_count: number;
}

export interface Document {
  id: string;
  candidate_id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  is_primary: boolean;
  is_active: boolean;
  uploaded_at: string;
}

export function useProfile() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [workExperience, setWorkExperience] = useState<WorkExperience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completeness, setCompleteness] = useState(0);

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (profile) {
      calculateCompleteness();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, workExperience, education, skills, documents]);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await (supabase as any)
        .from('candidate_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        await fetchWorkExperience(profileData.id);
        await fetchEducation(profileData.id);
        await fetchSkills(profileData.id);
        await fetchDocuments(profileData.id);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkExperience = async (candidateId: string) => {
    const { data } = await (supabase as any)
      .from('candidate_work_experience')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('start_date', { ascending: false });
    
    if (data) setWorkExperience(data);
  };

  const fetchEducation = async (candidateId: string) => {
    const { data } = await (supabase as any)
      .from('candidate_education')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('start_date', { ascending: false });
    
    if (data) setEducation(data);
  };

  const fetchSkills = async (candidateId: string) => {
    const { data } = await (supabase as any)
      .from('candidate_skills')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('skill_name');
    
    if (data) setSkills(data);
  };

  const fetchDocuments = async (candidateId: string) => {
    const { data } = await (supabase as any)
      .from('candidate_documents')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('is_active', true)
      .order('uploaded_at', { ascending: false });
    
    if (data) setDocuments(data);
  };

  const calculateCompleteness = () => {
    let score = 0;

    // Basic info (25%)
    if (profile?.full_name) score += 5;
    if (profile?.phone) score += 5;
    if (profile?.location) score += 5;
    if (profile?.bio && profile.bio.length > 50) score += 7;
    if (profile?.linkedin_url || profile?.portfolio_url || profile?.github_url) score += 3;

    // Professional (15%)
    if (profile?.current_title) score += 7;
    if (profile?.years_experience !== null) score += 4;
    if (profile?.expected_salary_min) score += 4;

    // Demographics (15%)
    if (profile?.date_of_birth) score += 3;
    if (profile?.nationality) score += 3;
    if (Array.isArray(profile?.languages) && (profile.languages as string[]).length > 0) score += 5;
    if (profile?.gender) score += 2;
    if (profile?.marital_status && profile.marital_status !== 'prefer_not_to_say') score += 2;

    // Career preferences (15%)
    if (profile?.highest_education_level) score += 4;
    if (profile?.industry) score += 4;
    if (profile?.notice_period) score += 3;
    if (profile?.work_authorization) score += 4;

    // Work experience (12%)
    if (workExperience.length > 0) score += 6;
    if (workExperience.length >= 2) score += 3;
    if (workExperience.some(exp => exp.description && exp.description.length > 50)) score += 3;

    // Education (8%)
    if (education.length > 0) score += 5;
    if (education.length >= 2) score += 3;

    // Skills (7%)
    if (skills.length >= 3) score += 2;
    if (skills.length >= 5) score += 2;
    if (skills.length >= 10) score += 3;

    // Bonus for CV upload (3%)
    if (documents.some(doc => (doc.document_type === 'cv' || doc.document_type === 'resume') && doc.is_primary)) {
      score += 3;
    }

    setCompleteness(Math.min(score, 100));
  };

  return {
    profile,
    workExperience,
    education,
    skills,
    documents,
    isLoading,
    completeness,
    refetch: fetchProfile,
  };
}
