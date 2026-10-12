'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TrendingUp, Target, Clock, DollarSign, CheckCircle, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useRouter } from 'next/navigation';
import {
  suggestCareerPaths,
  getCareerPaths,
  getUserCareerGoals,
  createCareerGoal,
  updateCareerGoal,
} from '@/lib/careerTools';

export default function CareerPathPlanner() {
  const [suggestedPaths, setSuggestedPaths] = useState<any[]>([]);
  const [myGoals, setMyGoals] = useState<any[]>([]);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Public paths still browseable without a session.
        const pathsResult = await getCareerPaths().catch((err) => {
          console.error('Failed to load career paths:', err);
          return [];
        });
        setSuggestedPaths(Array.isArray(pathsResult) ? pathsResult.slice(0, 6) : []);
        setMyGoals([]);
        return;
      }

      // Load paths and goals independently so one failure doesn't block the other
      const pathsResult = await suggestCareerPaths(user.id).catch((err) => {
        console.error('Failed to load career paths:', err);
        return getCareerPaths().catch(() => []);
      });

      const goalsResult = await getUserCareerGoals(user.id).catch((err) => {
        console.error('Failed to load career goals:', err);
        return [];
      });

      const paths = Array.isArray(pathsResult) ? pathsResult : [];
      setSuggestedPaths(paths.length ? paths : await getCareerPaths().catch(() => []));
      setMyGoals(Array.isArray(goalsResult) ? goalsResult : []);
    } catch (error: any) {
      console.error('CareerPathPlanner loadData error:', error);
      setSuggestedPaths([]);
      setMyGoals([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGoal(formData: FormData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Sign in required',
          description: 'Create a free account or sign in to set career goals.',
        });
        router.push('/auth');
        return;
      }

      const goal = await createCareerGoal({
        user_id: user.id,
        user_current_role: formData.get('current_role') as string,
        target_role: formData.get('target_role') as string,
        target_timeline_months: parseInt(formData.get('timeline') as string),
        notes: formData.get('notes') as string,
        is_active: true
      });

      setMyGoals([goal, ...myGoals]);
      setIsCreatingGoal(false);
      toast({
        title: 'Success',
        description: 'Career goal created successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  }

  async function handleUpdateProgress(goalId: string, progress: number) {
    try {
      await updateCareerGoal(goalId, { progress_percentage: progress });
      setMyGoals(myGoals.map(g => g.id === goalId ? { ...g, progress_percentage: progress } : g));
      toast({
        title: 'Progress Updated',
        description: 'Your career goal progress has been updated'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500';
      case 'moderate': return 'bg-yellow-500';
      case 'challenging': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-4 w-64 max-w-full rounded bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const goalDialog = (
    <Dialog open={isCreatingGoal} onOpenChange={setIsCreatingGoal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Career Goal</DialogTitle>
          <DialogDescription>
            Set a new career objective to track
          </DialogDescription>
        </DialogHeader>
        <form action={handleCreateGoal} className="space-y-4">
          <div>
            <Label htmlFor="current_role">Current Role</Label>
            <Input
              id="current_role"
              name="current_role"
              placeholder="e.g., Junior Developer"
              required
            />
          </div>
          <div>
            <Label htmlFor="target_role">Target Role</Label>
            <Input
              id="target_role"
              name="target_role"
              placeholder="e.g., Senior Developer"
              required
            />
          </div>
          <div>
            <Label htmlFor="timeline">Timeline (months)</Label>
            <Input
              id="timeline"
              name="timeline"
              type="number"
              placeholder="24"
              required
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Any additional notes or milestones..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsCreatingGoal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Goal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-[#0A66C2] sm:text-2xl">
            Career Path
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Explore common role transitions and set goals to track your progress.
          </p>
        </div>
        <Button size="sm" onClick={() => setIsCreatingGoal(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Goal
        </Button>
      </div>
      {goalDialog}

      <section className="space-y-4">
        <div className="border-b border-border/60 pb-3">
          <h3 className="text-base font-semibold text-[#0A66C2] sm:text-lg">Suggested paths</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Common transitions you can work toward
          </p>
        </div>
        {suggestedPaths.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
            <TrendingUp className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No path suggestions yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete your profile for personalized recommendations, or create a goal manually.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {suggestedPaths.map((path, idx) => (
              <Card key={idx} className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {path.from_role} → {path.to_role}
                  </CardTitle>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {path.difficulty && (
                      <Badge className={`${getDifficultyColor(path.difficulty)} text-[10px]`}>
                        {path.difficulty}
                      </Badge>
                    )}
                    {path.match_score > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {path.match_score}% Match
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {path.duration_months != null && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{path.duration_months} months typical</span>
                    </div>
                  )}
                  {path.salary_increase_percentage && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>+{path.salary_increase_percentage}% salary increase</span>
                    </div>
                  )}
                  <Button size="sm" className="w-full" onClick={() => setIsCreatingGoal(true)}>
                    <Target className="h-4 w-4 mr-2" />
                    Set as Goal
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {myGoals.filter(g => g.is_active).length > 0 ? (
        <section className="space-y-3">
          <div>
            <h3 className="text-base font-semibold">My Goals</h3>
            <p className="text-xs text-muted-foreground">Track progress toward your next role</p>
          </div>
          <div className="space-y-3">
            {myGoals.filter(g => g.is_active).map(goal => (
              <Card key={goal.id} className="shadow-none">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">
                        {goal.user_current_role} → {goal.target_role}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {goal.target_timeline_months} months timeline
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {goal.progress_percentage}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={goal.progress_percentage} />

                  {goal.career_paths && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Recommended Steps</h4>
                      {goal.career_paths.steps?.steps?.map((step: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{step.title}</p>
                            <p className="text-muted-foreground text-xs">
                              {step.duration_months} months · {step.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {goal.notes && (
                    <p className="text-sm text-muted-foreground">{goal.notes}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateProgress(goal.id, Math.min(100, goal.progress_percentage + 10))}
                    >
                      Update Progress
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateCareerGoal(goal.id, { is_active: false }).then(loadData)}
                    >
                      Mark Complete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Your goals will appear here after you set one.
        </p>
      )}
    </div>
  );
}
