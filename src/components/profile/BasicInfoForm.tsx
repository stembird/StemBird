'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import type { CandidateProfile } from '@/hooks/useProfile';

interface BasicInfoFormProps {
  profile: CandidateProfile | null;
  onUpdate: () => void;
}

export default function BasicInfoForm({ profile, onUpdate }: BasicInfoFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Split the stored full name into first/last for the separate inputs.
  const nameParts = (profile?.full_name || '').trim().split(/\s+/);
  const [formData, setFormData] = useState({
    first_name: nameParts[0] || '',
    last_name: nameParts.slice(1).join(' ') || '',
    phone: profile?.phone || '',
    location: profile?.location || '',
    bio: profile?.bio || '',
    current_title: profile?.current_title || '',
    years_experience: profile?.years_experience?.toString() || '',
    expected_salary_min: profile?.expected_salary_min?.toString() || '',
    expected_salary_max: profile?.expected_salary_max?.toString() || '',
    linkedin_url: profile?.linkedin_url || '',
    portfolio_url: profile?.portfolio_url || '',
    github_url: profile?.github_url || '',
    profile_visibility: profile?.profile_visibility || 'private',
    job_alerts_enabled: profile?.job_alerts_enabled ?? true,
    // New fields
    date_of_birth: profile?.date_of_birth || '',
    nationality: profile?.nationality || '',
    gender: profile?.gender || '',
    marital_status: profile?.marital_status || '',
    languages: Array.isArray(profile?.languages) ? (profile.languages as string[]).join(', ') : '',
    highest_education_level: profile?.highest_education_level || '',
    industry: profile?.industry || '',
    notice_period: profile?.notice_period || '',
    work_authorization: profile?.work_authorization || '',
    disability_status: profile?.disability_status || 'prefer_not_to_say',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const profileData = {
        user_id: user.id,
        full_name: `${formData.first_name} ${formData.last_name}`.trim(),
        phone: formData.phone || null,
        location: formData.location || null,
        bio: formData.bio || null,
        current_title: formData.current_title || null,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
        expected_salary_min: formData.expected_salary_min ? parseFloat(formData.expected_salary_min) : null,
        expected_salary_max: formData.expected_salary_max ? parseFloat(formData.expected_salary_max) : null,
        linkedin_url: formData.linkedin_url || null,
        portfolio_url: formData.portfolio_url || null,
        github_url: formData.github_url || null,
        profile_visibility: formData.profile_visibility,
        job_alerts_enabled: formData.job_alerts_enabled,
        // New fields
        date_of_birth: formData.date_of_birth || null,
        nationality: formData.nationality || null,
        gender: formData.gender || null,
        marital_status: formData.marital_status || null,
        languages: formData.languages
          ? formData.languages.split(',').map(l => l.trim()).filter(Boolean)
          : [],
        highest_education_level: formData.highest_education_level || null,
        industry: formData.industry || null,
        notice_period: formData.notice_period || null,
        work_authorization: formData.work_authorization || null,
        disability_status: formData.disability_status || 'prefer_not_to_say',
      };

      if (profile) {
        const { error } = await (supabase as any)
          .from('candidate_profiles')
          .update(profileData)
          .eq('id', profile.id);
        
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('candidate_profiles')
          .insert(profileData);
        
        if (error) throw error;
      }

      // Keep user_profiles in sync so the admin dashboard shows the same
      // name/phone details. Best-effort: don't fail the save if this fails.
      try {
        await (supabase as any)
          .from('user_profiles')
          .upsert(
            {
              id: user.id,
              first_name: formData.first_name,
              last_name: formData.last_name,
              full_name: `${formData.first_name} ${formData.last_name}`.trim(),
              phone: formData.phone || null,
            },
            { onConflict: 'id' }
          );
      } catch (syncError) {
        console.error('Error syncing user_profiles:', syncError);
      }

      toast({
        title: 'Profile updated',
        description: 'Your profile has been saved successfully',
      });
      
      onUpdate();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save profile',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g. Lagos, Nigeria"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself..."
              rows={4}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              {formData.bio.length} characters
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_title">Current Job Title</Label>
              <Input
                id="current_title"
                placeholder="e.g. Software Engineer"
                value={formData.current_title}
                onChange={(e) => setFormData({ ...formData, current_title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="years_experience">Years of Experience</Label>
              <Input
                id="years_experience"
                type="number"
                min="0"
                value={formData.years_experience}
                onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expected_salary_min">Expected Salary (Min)</Label>
              <Input
                id="expected_salary_min"
                type="number"
                min="0"
                placeholder="e.g. 100000"
                value={formData.expected_salary_min}
                onChange={(e) => setFormData({ ...formData, expected_salary_min: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_salary_max">Expected Salary (Max)</Label>
              <Input
                id="expected_salary_max"
                type="number"
                min="0"
                placeholder="e.g. 150000"
                value={formData.expected_salary_max}
                onChange={(e) => setFormData({ ...formData, expected_salary_max: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn URL</Label>
            <Input
              id="linkedin_url"
              type="url"
              placeholder="https://linkedin.com/in/yourprofile"
              value={formData.linkedin_url}
              onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="portfolio_url">Portfolio URL</Label>
              <Input
                id="portfolio_url"
                type="url"
                placeholder="https://yourportfolio.com"
                value={formData.portfolio_url}
                onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="github_url">GitHub URL</Label>
              <Input
                id="github_url"
                type="url"
                placeholder="https://github.com/yourusername"
                value={formData.github_url}
                onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile_visibility">Profile Visibility</Label>
            <Select
              value={formData.profile_visibility}
              onValueChange={(value) => setFormData({ ...formData, profile_visibility: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private (Only you)</SelectItem>
                <SelectItem value="recruiters_only">Recruiters Only</SelectItem>
                <SelectItem value="public">Public (Everyone)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ── Demographics ─────────────────────────────────────────── */}
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Demographics <span className="text-xs font-normal normal-case">(optional)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  placeholder="e.g. Kenyan"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={formData.gender || undefined}
                  onValueChange={(value) => setFormData({ ...formData, gender: (value || '') as 'male' | 'female' | 'other' | 'prefer_not_to_say' })}
                >
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non_binary">Non-binary</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="marital_status">Marital Status</Label>
                <Select
                  value={formData.marital_status || undefined}
                  onValueChange={(value) => setFormData({ ...formData, marital_status: (value || '') as 'single' | 'married' | 'divorced' | 'widowed' | 'prefer_not_to_say' })}
                >
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="languages">Languages Spoken</Label>
              <Input
                id="languages"
                placeholder="e.g. English, Swahili, French"
                value={formData.languages}
                onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Comma-separated list</p>
            </div>
          </div>

          {/* ── Career Preferences ──────────────────────────────────── */}
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Career Preferences <span className="text-xs font-normal normal-case">(optional)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="highest_education_level">Highest Education Level</Label>
                <Select
                  value={formData.highest_education_level || undefined}
                  onValueChange={(value) => setFormData({ ...formData, highest_education_level: value || '' })}
                >
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High School">High School</SelectItem>
                    <SelectItem value="Diploma">Diploma / Certificate</SelectItem>
                    <SelectItem value="Bachelor's">Bachelor’s Degree</SelectItem>
                    <SelectItem value="Master's">Master’s Degree</SelectItem>
                    <SelectItem value="PhD">PhD / Doctorate</SelectItem>
                    <SelectItem value="Professional Certification">Professional Certification</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry / Domain</Label>
                <Input
                  id="industry"
                  placeholder="e.g. Technology, Healthcare, Finance"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="notice_period">Notice Period</Label>
                <Select
                  value={formData.notice_period || undefined}
                  onValueChange={(value) => setFormData({ ...formData, notice_period: value || '' })}
                >
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="2_weeks">2 Weeks</SelectItem>
                    <SelectItem value="1_month">1 Month</SelectItem>
                    <SelectItem value="3_months">3 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="work_authorization">Work Authorization</Label>
                <Select
                  value={formData.work_authorization || undefined}
                  onValueChange={(value) => setFormData({ ...formData, work_authorization: value || '' })}
                >
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="citizen">Citizen</SelectItem>
                    <SelectItem value="permanent_resident">Permanent Resident</SelectItem>
                    <SelectItem value="work_permit">Work Permit Holder</SelectItem>
                    <SelectItem value="visa_sponsored">Requires Visa Sponsorship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="disability_status">Disability Status</Label>
              <Select
                value={formData.disability_status || undefined}
                onValueChange={(value) => setFormData({ ...formData, disability_status: (value || 'prefer_not_to_say') as 'yes' | 'no' | 'prefer_not_to_say' })}
              >
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Voluntary disclosure for inclusive hiring programs
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="job_alerts">Job Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Receive email notifications for matching jobs
              </p>
            </div>
            <Switch
              id="job_alerts"
              checked={formData.job_alerts_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, job_alerts_enabled: checked })}
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Profile
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
