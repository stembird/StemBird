import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getSavedRecommendations } from '@/lib/jobRecommendations';
import { Sparkles, MapPin, Briefcase, DollarSign, TrendingUp, Eye, X, Brain } from 'lucide-react';
import Link from 'next/link';

interface JobMatch {
  id: string;
  job_id: string;
  match_score: number;
  skills_match_score: number;
  experience_match_score: number;
  location_match_score: number;
  salary_match_score: number;
  match_details: any;
  match_reason?: string;
  viewed: boolean;
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    employment_type: string;
    salary_min: number;
    salary_max: number;
    salary_currency: string;
    created_at: string;
  };
}

export function JobMatches() {
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadMatches();
  }, []);

  async function loadMatches() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // Try to get saved matches first
      const saved = await getSavedRecommendations(user.id, false);

      if (saved.length > 0) {
        setMatches(saved);
      } else {
        // Generate new matches via AI
        await findMatches();
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  }

  async function findMatches() {
    try {
      setGenerating(true);

      const res = await fetch('/api/job-matches', { method: 'POST' });
      const json = await res.json();

      if (!json.success) {
        toast({
          title: 'No matches found',
          description: json.message || 'Complete your profile to get personalized job matches.',
        });
        return;
      }

      // Reload from database (API route caches results)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const saved = await getSavedRecommendations(user.id, false);
        setMatches(saved);
      }

      toast({
        title: 'Matches updated',
        description: json.count
          ? `Found ${json.count} jobs that match your profile.`
          : 'Job matches have been updated.',
      });
    } catch (error) {
      console.error('Error finding matches:', error);
      toast({
        title: 'Error',
        description: 'Unable to find matches right now. Try again later.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  }

  async function markAsViewed(matchId: string, jobId: string) {
    try {
      await supabase
        .from('job_recommendations')
        .update({ viewed: true, viewed_at: new Date().toISOString() })
        .eq('id', matchId);

      setMatches(prev =>
        prev.map(m => m.id === matchId ? { ...m, viewed: true } : m)
      );
    } catch (error) {
      console.error('Error marking as viewed:', error);
    }
  }

  async function dismissMatch(matchId: string) {
    try {
      await supabase
        .from('job_recommendations')
        .update({ dismissed: true, dismissed_at: new Date().toISOString() })
        .eq('id', matchId);

      setMatches(prev => prev.filter(m => m.id !== matchId));

      toast({
        title: 'Match dismissed',
        description: 'This job will no longer appear in your matches.',
      });
    } catch (error) {
      console.error('Error dismissing match:', error);
    }
  }

  function getMatchColor(score: number): string {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-gray-600';
  }

  function getMatchBadgeVariant(score: number): 'default' | 'secondary' | 'outline' {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'outline';
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Job Matches
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Job Matches
              <Badge variant="outline" className="ml-1 text-xs gap-1">
                <Brain className="h-3 w-3" />
                AI-powered
              </Badge>
            </CardTitle>
            <CardDescription>
              Jobs matched to your profile using AI analysis
            </CardDescription>
          </div>
          <Button
            onClick={findMatches}
            disabled={generating}
            variant="outline"
            size="sm"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            {generating ? 'Finding Matches...' : 'Find Matches'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">No matches yet</p>
            <p className="text-sm">Complete your profile to get personalized job matches</p>
            <Button
              onClick={findMatches}
              className="mt-4"
              disabled={generating}
            >
              Find Matches
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <div
                key={match.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow relative"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => dismissMatch(match.id)}
                >
                  <X className="h-4 w-4" />
                </Button>

                <div className="flex items-start justify-between mb-3 pr-8">
                  <div className="flex-1">
                    <Link
                      href={`/jobs/${match.job.id}`}
                      onClick={() => markAsViewed(match.id, match.job_id)}
                      className="hover:underline"
                    >
                      <h3 className="font-semibold text-lg">{match.job.title}</h3>
                    </Link>
                    <p className="text-sm text-muted-foreground">{match.job.company}</p>
                  </div>
                  <Badge
                    variant={getMatchBadgeVariant(match.match_score)}
                    className={getMatchColor(match.match_score)}
                  >
                    {Math.round(match.match_score)}% Match
                  </Badge>
                </div>

                {/* AI match reason */}
                {match.match_details?.reason && (
                  <p className="text-sm text-primary/80 italic mb-3 flex items-start gap-1.5">
                    <Brain className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {match.match_details.reason}
                  </p>
                )}

                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {match.job.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    {match.job.employment_type || 'Full-time'}
                  </div>
                  {match.job.salary_min && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {match.job.salary_currency} {match.job.salary_min.toLocaleString()}
                      {match.job.salary_max && ` - ${match.job.salary_max.toLocaleString()}`}
                    </div>
                  )}
                </div>

                {/* Match breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Skills</span>
                    <span className={`font-semibold ${getMatchColor(match.skills_match_score)}`}>
                      {Math.round(match.skills_match_score)}%
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Experience</span>
                    <span className={`font-semibold ${getMatchColor(match.experience_match_score)}`}>
                      {Math.round(match.experience_match_score)}%
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Location</span>
                    <span className={`font-semibold ${getMatchColor(match.location_match_score)}`}>
                      {Math.round(match.location_match_score)}%
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Salary</span>
                    <span className={`font-semibold ${getMatchColor(match.salary_match_score)}`}>
                      {Math.round(match.salary_match_score)}%
                    </span>
                  </div>
                </div>

                {match.match_details?.matchedSkills?.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Matched Skills:</p>
                    <div className="flex flex-wrap gap-1">
                      {match.match_details.matchedSkills.slice(0, 5).map((skill: string) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <Link href={`/jobs/${match.job.id}`} className="flex-1">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={() => markAsViewed(match.id, match.job_id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Job
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
