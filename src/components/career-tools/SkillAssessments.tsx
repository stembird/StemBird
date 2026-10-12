'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, Clock, CheckCircle, XCircle, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  getSkillAssessments,
  getUserAssessmentResults,
  type SkillAssessment
} from '@/lib/careerTools';

export default function SkillAssessments() {
  const [assessments, setAssessments] = useState<SkillAssessment[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Assessments are public; results require a session.
      const assessmentsData = await getSkillAssessments();
      setAssessments(assessmentsData);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const resultsData = await getUserAssessmentResults(user.id);
        setResults(resultsData);
      } else {
        setResults([]);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  const categories = ['all', 'technical', 'soft', 'language', 'tool'];
  const filteredAssessments = selectedCategory === 'all'
    ? assessments
    : assessments.filter(a => a.category === selectedCategory);

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-orange-500';
      case 'expert': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const hasCompletedAssessment = (assessmentId: string) => {
    return results.some(r => r.assessment_id === assessmentId);
  };

  const getAssessmentResult = (assessmentId: string) => {
    return results.find(r => r.assessment_id === assessmentId);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-4 w-64 max-w-full rounded bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-[#0A66C2] sm:text-2xl">
            Skill Assessments
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Practice key skills and earn certificates for your profile.
          </p>
        </div>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1 sm:w-auto">
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat} className="capitalize text-xs sm:text-sm">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {filteredAssessments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center">
          <Award className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">No assessments in this category yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Try another filter or check back soon.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAssessments.map(assessment => {
            const result = getAssessmentResult(assessment.id);
            const completed = hasCompletedAssessment(assessment.id);

            return (
              <Card key={assessment.id} className="relative shadow-none">
                {completed && result?.passed && (
                  <Badge className="absolute top-2 right-2" variant="default">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Passed
                  </Badge>
                )}
                {completed && !result?.passed && (
                  <Badge className="absolute top-2 right-2" variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Failed
                  </Badge>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-base pr-16">{assessment.skill_name}</CardTitle>
                  <CardDescription className="text-xs line-clamp-2">{assessment.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {assessment.category}
                    </Badge>
                    <Badge className={`${getDifficultyColor(assessment.difficulty_level)} text-[10px]`}>
                      {assessment.difficulty_level}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      <Clock className="h-3 w-3 mr-1" />
                      {assessment.duration_minutes} min
                    </Badge>
                  </div>

                  {result && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Score: {result.score}%</span>
                        <span>Pass: {assessment.passing_score}%</span>
                      </div>
                      <Progress value={result.score} />
                    </div>
                  )}

                  <Button
                    className="w-full"
                    variant={completed ? 'outline' : 'default'}
                    onClick={() => {
                      toast({
                        title: 'Coming Soon',
                        description: 'Assessment interface will be available soon'
                      });
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {completed ? 'Retake' : 'Start'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* My Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>My Assessment Results</CardTitle>
            <CardDescription>
              Your completed assessments and certificates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map(result => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${result.passed ? 'bg-green-100' : 'bg-red-100'}`}>
                      {result.passed ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold">
                        {result.skill_assessments?.skill_name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Score: {result.score}% • {new Date(result.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {result.passed && (
                      <Button size="sm" variant="outline">
                        <Award className="h-4 w-4 mr-2" />
                        View Certificate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
