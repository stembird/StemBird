'use client';

import { useProfile } from '@/hooks/useProfile';
import { Loader2 } from 'lucide-react';
import ProfileCompletenessCard from '@/components/profile/ProfileCompletenessCard';
import BasicInfoForm from '@/components/profile/BasicInfoForm';
import WorkExperienceSection from '@/components/profile/WorkExperienceSection';
import EducationSection from '@/components/profile/EducationSection';
import SkillsSection from '@/components/profile/SkillsSection';
import DocumentsSection from '@/components/profile/DocumentsSection';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { profile, workExperience, education, skills, documents, isLoading, completeness, refetch } = useProfile();
  const { toast } = useToast();

  const handleCVParsed = async (parsedData: any) => {
    if (!profile) return;

    try {
      // Update basic info
      if (parsedData.basicInfo) {
        const updates: any = {};
        if (parsedData.basicInfo.full_name) updates.full_name = parsedData.basicInfo.full_name;
        if (parsedData.basicInfo.phone) updates.phone = parsedData.basicInfo.phone;
        if (parsedData.basicInfo.location) updates.location = parsedData.basicInfo.location;
        if (parsedData.basicInfo.bio) updates.bio = parsedData.basicInfo.bio;
        if (parsedData.basicInfo.linkedin_url) updates.linkedin_url = parsedData.basicInfo.linkedin_url;
        if (parsedData.basicInfo.portfolio_url) updates.portfolio_url = parsedData.basicInfo.portfolio_url;
        if (parsedData.basicInfo.github_url) updates.github_url = parsedData.basicInfo.github_url;

        if (Object.keys(updates).length > 0) {
          await supabase
            .from('candidate_profiles')
            .update(updates)
            .eq('id', profile.id);

          // Keep user_profiles in sync so the admin dashboard shows the same
          // name/phone details. Best-effort: never fail CV parsing over this.
          const profileSync: any = {};
          if (updates.full_name) {
            const parts = String(updates.full_name).trim().split(/\s+/);
            profileSync.first_name = parts[0] || null;
            profileSync.last_name = parts.slice(1).join(' ') || null;
            profileSync.full_name = updates.full_name;
          }
          if (updates.phone) profileSync.phone = updates.phone;

          if (Object.keys(profileSync).length > 0) {
            try {
              await supabase.from('user_profiles').upsert(
                { id: profile.user_id, ...profileSync },
                { onConflict: 'id' }
              );
            } catch (syncError) {
              console.error('Error syncing user_profiles after CV parse:', syncError);
            }
          }
        }
      }

      // Update professional info
      if (parsedData.professional) {
        const updates: any = {};
        if (parsedData.professional.current_title) updates.current_title = parsedData.professional.current_title;
        if (parsedData.professional.years_experience) updates.years_experience = parsedData.professional.years_experience;

        if (Object.keys(updates).length > 0) {
          await supabase
            .from('candidate_profiles')
            .update(updates)
            .eq('id', profile.id);
        }
      }

      // Add work experience
      if (parsedData.workExperience && parsedData.workExperience.length > 0) {
        const workExpData = parsedData.workExperience.map((exp: any) => ({
          candidate_id: profile.id,
          company_name: exp.company_name,
          job_title: exp.job_title,
          employment_type: exp.employment_type || null,
          location: exp.location || null,
          start_date: exp.start_date,
          end_date: exp.end_date || null,
          is_current: exp.is_current || false,
          description: exp.description || null,
          achievements: exp.achievements || null,
        }));

        await supabase
          .from('candidate_work_experience')
          .insert(workExpData);
      }

      // Add education
      if (parsedData.education && parsedData.education.length > 0) {
        const educationData = parsedData.education.map((edu: any) => ({
          candidate_id: profile.id,
          institution_name: edu.institution_name,
          degree_type: edu.degree_type,
          field_of_study: edu.field_of_study,
          location: edu.location || null,
          start_date: edu.start_date,
          end_date: edu.end_date || null,
          is_current: edu.is_current || false,
          grade: edu.grade || null,
          description: edu.description || null,
        }));

        await supabase
          .from('candidate_education')
          .insert(educationData);
      }

      // Add skills
      if (parsedData.skills && parsedData.skills.length > 0) {
        const skillsData = parsedData.skills.map((skill: any) => ({
          candidate_id: profile.id,
          skill_name: skill.skill_name,
          skill_category: skill.skill_category || null,
          proficiency_level: skill.proficiency_level || null,
          years_of_experience: skill.years_of_experience || null,
        }));

        await supabase
          .from('candidate_skills')
          .insert(skillsData);
      }

      // Refresh profile data
      refetch();
    } catch (error: any) {
      console.error('Error applying CV data:', error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your professional profile and increase your visibility to employers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Completeness */}
        <div className="lg:col-span-1">
          <ProfileCompletenessCard
            completeness={completeness}
            profile={profile}
            workExperience={workExperience}
            education={education}
            skills={skills}
          />
        </div>

        {/* Right Column - Forms */}
        <div className="lg:col-span-2 space-y-6">
          <BasicInfoForm profile={profile} onUpdate={refetch} />
          
          {profile && (
            <>
              <DocumentsSection
                candidateId={profile.id}
                documents={documents}
                onUpdate={refetch}
                onCVParsed={handleCVParsed}
              />
              
              <WorkExperienceSection
                candidateId={profile.id}
                experiences={workExperience}
                onUpdate={refetch}
              />
              
              <EducationSection
                candidateId={profile.id}
                education={education}
                onUpdate={refetch}
              />
              
              <SkillsSection
                candidateId={profile.id}
                skills={skills}
                onUpdate={refetch}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
