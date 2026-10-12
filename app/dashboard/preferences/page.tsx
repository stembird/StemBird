'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, Settings } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export default function PreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [preferences, setPreferences] = useState({
    preferred_job_functions: [] as string[],
    preferred_industries: [] as string[],
    preferred_locations: [] as string[],
    preferred_employment_types: [] as string[],
    preferred_work_schedule: [] as string[],
    min_salary: '',
    max_salary: '',
    salary_currency: 'NGN',
    salary_negotiable: true,
    willing_to_relocate: false,
    available_to_start: 'immediate',
    job_alert_frequency: 'daily',
    recommendation_emails: true,
    application_updates: true
  });

  const [emailPrefs, setEmailPrefs] = useState({
    transactional_emails: true,
    marketing_emails: false,
    job_alert_emails: true,
    weekly_digest: true
  });

  const jobFunctions = [
    'Software Development',
    'Product Management',
    'Design',
    'Marketing',
    'Sales',
    'Customer Support',
    'Human Resources',
    'Finance',
    'Operations',
    'Data Science',
    'Engineering',
    'Legal'
  ];

  const industries = [
    'Technology',
    'Finance',
    'Healthcare',
    'Education',
    'E-commerce',
    'Manufacturing',
    'Consulting',
    'Media',
    'Telecommunications',
    'Real Estate',
    'Energy',
    'Transportation'
  ];

  const locations = [
    'Lagos',
    'Abuja',
    'Port Harcourt',
    'Ibadan',
    'Kano',
    'Remote',
    'Hybrid'
  ];

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Load email preferences from user_profiles (cast for new columns not yet in generated types)
      const { data: profileRaw } = await (supabase as any)
        .from('user_profiles')
        .select('transactional_emails, marketing_emails, job_alert_emails, weekly_digest')
        .eq('id', user.id)
        .maybeSingle();

      const profile = profileRaw as Record<string, unknown> | null;
      if (profile) {
        setEmailPrefs({
          transactional_emails: (profile.transactional_emails as boolean) ?? true,
          marketing_emails: (profile.marketing_emails as boolean) ?? false,
          job_alert_emails: (profile.job_alert_emails as boolean) ?? true,
          weekly_digest: (profile.weekly_digest as boolean) ?? true,
        });
      }

      const { data, error } = await supabase
        .from('candidate_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Handle table not existing or no data found
      if (error) {
        if (error.code === 'PGRST116') {
          // No data found - this is fine, user hasn't set preferences yet
          console.log('No preferences found for user');
        } else if (error.code === '42P01') {
          // Table doesn't exist
          console.warn('candidate_preferences table does not exist yet. Please run migration.');
          toast({
            title: 'Feature not available',
            description: 'Job preferences feature is being set up. Please check back later.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        setLoading(false);
        return;
      }

      if (data) {
        setPreferences({
          preferred_job_functions: data.preferred_job_functions || [],
          preferred_industries: data.preferred_industries || [],
          preferred_locations: data.preferred_locations || [],
          preferred_employment_types: data.preferred_employment_types || [],
          preferred_work_schedule: data.preferred_work_schedule || [],
          min_salary: data.min_salary?.toString() || '',
          max_salary: data.max_salary?.toString() || '',
          salary_currency: data.salary_currency || 'NGN',
          salary_negotiable: data.salary_negotiable ?? true,
          willing_to_relocate: data.willing_to_relocate ?? false,
          available_to_start: data.available_to_start || 'immediate',
          job_alert_frequency: data.job_alert_frequency || 'daily',
          recommendation_emails: data.recommendation_emails ?? true,
          application_updates: data.application_updates ?? true
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load preferences.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const preferencesData = {
        user_id: user.id,
        preferred_job_functions: preferences.preferred_job_functions,
        preferred_industries: preferences.preferred_industries,
        preferred_locations: preferences.preferred_locations,
        preferred_employment_types: preferences.preferred_employment_types,
        preferred_work_schedule: preferences.preferred_work_schedule,
        min_salary: preferences.min_salary ? parseFloat(preferences.min_salary) : null,
        max_salary: preferences.max_salary ? parseFloat(preferences.max_salary) : null,
        salary_currency: preferences.salary_currency,
        salary_negotiable: preferences.salary_negotiable,
        willing_to_relocate: preferences.willing_to_relocate,
        available_to_start: preferences.available_to_start,
        job_alert_frequency: preferences.job_alert_frequency,
        recommendation_emails: preferences.recommendation_emails,
        application_updates: preferences.application_updates
      };

      // Save email preferences to user_profiles (cast for new columns not yet in generated types)
      const { error: emailPrefError } = await (supabase as any)
        .from('user_profiles')
        .update({
          transactional_emails: emailPrefs.transactional_emails,
          marketing_emails: emailPrefs.marketing_emails,
          job_alert_emails: emailPrefs.job_alert_emails,
          weekly_digest: emailPrefs.weekly_digest,
        })
        .eq('id', user.id);

      if (emailPrefError) console.warn('Email prefs save warning:', emailPrefError);

      const { error } = await supabase
        .from('candidate_preferences')
        .upsert([preferencesData], { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Your preferences have been saved.',
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  function toggleArrayItem(array: string[], item: string): string[] {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    }
    return [...array, item];
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <p>Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Job Preferences
          </h1>
          <p className="text-muted-foreground mt-2">
            Set your job preferences to get better recommendations and alerts
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Job Preferences</CardTitle>
            <CardDescription>What kind of jobs are you looking for?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Preferred Job Functions</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {jobFunctions.map((func) => (
                  <div key={func} className="flex items-center space-x-2">
                    <Checkbox
                      id={`func-${func}`}
                      checked={preferences.preferred_job_functions.includes(func)}
                      onCheckedChange={() =>
                        setPreferences({
                          ...preferences,
                          preferred_job_functions: toggleArrayItem(preferences.preferred_job_functions, func)
                        })
                      }
                    />
                    <label
                      htmlFor={`func-${func}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {func}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Preferred Industries</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {industries.map((industry) => (
                  <div key={industry} className="flex items-center space-x-2">
                    <Checkbox
                      id={`ind-${industry}`}
                      checked={preferences.preferred_industries.includes(industry)}
                      onCheckedChange={() =>
                        setPreferences({
                          ...preferences,
                          preferred_industries: toggleArrayItem(preferences.preferred_industries, industry)
                        })
                      }
                    />
                    <label
                      htmlFor={`ind-${industry}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {industry}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Preferred Locations</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {locations.map((location) => (
                  <div key={location} className="flex items-center space-x-2">
                    <Checkbox
                      id={`loc-${location}`}
                      checked={preferences.preferred_locations.includes(location)}
                      onCheckedChange={() =>
                        setPreferences({
                          ...preferences,
                          preferred_locations: toggleArrayItem(preferences.preferred_locations, location)
                        })
                      }
                    />
                    <label
                      htmlFor={`loc-${location}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {location}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Employment Type</Label>
              <div className="grid grid-cols-2 gap-3">
                {['Full-time', 'Part-time', 'Contract', 'Freelance'].map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`emp-${type}`}
                      checked={preferences.preferred_employment_types.includes(type)}
                      onCheckedChange={() =>
                        setPreferences({
                          ...preferences,
                          preferred_employment_types: toggleArrayItem(preferences.preferred_employment_types, type)
                        })
                      }
                    />
                    <label
                      htmlFor={`emp-${type}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {type}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Work Schedule</Label>
              <div className="grid grid-cols-3 gap-3">
                {['Remote', 'Hybrid', 'Onsite'].map((schedule) => (
                  <div key={schedule} className="flex items-center space-x-2">
                    <Checkbox
                      id={`sched-${schedule}`}
                      checked={preferences.preferred_work_schedule.includes(schedule)}
                      onCheckedChange={() =>
                        setPreferences({
                          ...preferences,
                          preferred_work_schedule: toggleArrayItem(preferences.preferred_work_schedule, schedule)
                        })
                      }
                    />
                    <label
                      htmlFor={`sched-${schedule}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {schedule}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Salary Expectations</CardTitle>
            <CardDescription>Your expected salary range</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary_currency">Currency</Label>
                <Select
                  value={preferences.salary_currency}
                  onValueChange={(value) => setPreferences({ ...preferences, salary_currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NGN">NGN</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_salary">Minimum</Label>
                <Input
                  id="min_salary"
                  type="number"
                  placeholder="e.g., 100000"
                  value={preferences.min_salary}
                  onChange={(e) => setPreferences({ ...preferences, min_salary: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_salary">Maximum</Label>
                <Input
                  id="max_salary"
                  type="number"
                  placeholder="e.g., 500000"
                  value={preferences.max_salary}
                  onChange={(e) => setPreferences({ ...preferences, max_salary: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="salary_negotiable"
                checked={preferences.salary_negotiable}
                onCheckedChange={(checked) => setPreferences({ ...preferences, salary_negotiable: checked })}
              />
              <Label htmlFor="salary_negotiable">Salary is negotiable</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Work Preferences</CardTitle>
            <CardDescription>Additional work-related preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="willing_to_relocate"
                checked={preferences.willing_to_relocate}
                onCheckedChange={(checked) => setPreferences({ ...preferences, willing_to_relocate: checked })}
              />
              <Label htmlFor="willing_to_relocate">Willing to relocate</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="available_to_start">Available to Start</Label>
              <Select
                value={preferences.available_to_start}
                onValueChange={(value) => setPreferences({ ...preferences, available_to_start: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediately</SelectItem>
                  <SelectItem value="2_weeks">2 Weeks Notice</SelectItem>
                  <SelectItem value="1_month">1 Month Notice</SelectItem>
                  <SelectItem value="3_months">3 Months Notice</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Preferences</CardTitle>
            <CardDescription>Control which emails you receive from CareerSasa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="transactional_emails" className="font-medium">Transactional Emails</Label>
                <p className="text-xs text-muted-foreground">Application confirmations, status updates, messages (always recommended)</p>
              </div>
              <Switch
                id="transactional_emails"
                checked={emailPrefs.transactional_emails}
                onCheckedChange={(checked) => setEmailPrefs({ ...emailPrefs, transactional_emails: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="job_alert_emails" className="font-medium">Job Alert Emails</Label>
                <p className="text-xs text-muted-foreground">Notifications when new jobs match your saved searches</p>
              </div>
              <Switch
                id="job_alert_emails"
                checked={emailPrefs.job_alert_emails}
                onCheckedChange={(checked) => setEmailPrefs({ ...emailPrefs, job_alert_emails: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="weekly_digest" className="font-medium">Weekly Digest</Label>
                <p className="text-xs text-muted-foreground">Weekly summary of featured jobs and career tips</p>
              </div>
              <Switch
                id="weekly_digest"
                checked={emailPrefs.weekly_digest}
                onCheckedChange={(checked) => setEmailPrefs({ ...emailPrefs, weekly_digest: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="marketing_emails" className="font-medium">Marketing & Newsletter</Label>
                <p className="text-xs text-muted-foreground">Promotions, announcements, career resources</p>
              </div>
              <Switch
                id="marketing_emails"
                checked={emailPrefs.marketing_emails}
                onCheckedChange={(checked) => setEmailPrefs({ ...emailPrefs, marketing_emails: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>How often do you want to receive job alerts?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="job_alert_frequency">Job Alert Frequency</Label>
              <Select
                value={preferences.job_alert_frequency}
                onValueChange={(value) => setPreferences({ ...preferences, job_alert_frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Instant</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="recommendation_emails"
                checked={preferences.recommendation_emails}
                onCheckedChange={(checked) => setPreferences({ ...preferences, recommendation_emails: checked })}
              />
              <Label htmlFor="recommendation_emails">Receive job recommendation emails</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="application_updates"
                checked={preferences.application_updates}
                onCheckedChange={(checked) => setPreferences({ ...preferences, application_updates: checked })}
              />
              <Label htmlFor="application_updates">Receive application status updates</Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </div>
  );
}
