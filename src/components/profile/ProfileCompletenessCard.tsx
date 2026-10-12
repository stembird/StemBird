'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle } from 'lucide-react';

interface ProfileCompletenessCardProps {
  completeness: number;
  profile: any;
  workExperience: any[];
  education: any[];
  skills: any[];
}

export default function ProfileCompletenessCard({
  completeness,
  profile,
  workExperience,
  education,
  skills,
}: ProfileCompletenessCardProps) {
  const tasks = [
    { label: 'Add basic information', completed: !!(profile?.full_name && profile?.phone && profile?.location) },
    { label: 'Write a bio', completed: !!(profile?.bio && profile.bio.length > 50) },
    { label: 'Add professional details', completed: !!(profile?.current_title && profile?.years_experience !== null) },
    { label: 'Add work experience', completed: workExperience.length > 0 },
    { label: 'Add education', completed: education.length > 0 },
    { label: 'Add at least 5 skills', completed: skills.length >= 5 },
    { label: 'Add social links', completed: !!(profile?.linkedin_url || profile?.portfolio_url || profile?.github_url) },
  ];

  const getCompletenessColor = () => {
    if (completeness >= 80) return 'text-green-600';
    if (completeness >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCompletenessMessage = () => {
    if (completeness >= 80) return 'Excellent! Your profile is looking great.';
    if (completeness >= 50) return 'Good progress! Keep adding more details.';
    return 'Let\'s complete your profile to attract employers.';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Profile Completeness</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-bold ${getCompletenessColor()}`}>
              {completeness}%
            </span>
            <span className="text-sm text-muted-foreground">
              {getCompletenessMessage()}
            </span>
          </div>
          <Progress value={completeness} className="h-2" />
        </div>

        <div className="space-y-2">
          {tasks.map((task, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              {task.completed ? (
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <span className={task.completed ? 'text-muted-foreground line-through' : ''}>
                {task.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
