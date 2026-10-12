'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, Minus, Search, Pencil, Trash2, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  getUserSalaryExpectations,
  setSalaryExpectation,
  deleteSalaryExpectation,
  updateSalaryExpectation,
  type SalaryInsight
} from '@/lib/careerTools';

export default function SalaryInsights() {
  const [searchParams, setSearchParams] = useState({
    jobTitle: '',
    location: '',
    experienceLevel: 'any'
  });
  const [insights, setInsights] = useState<SalaryInsight | null>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [expectations, setExpectations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ job_title: string; min_salary: string; max_salary: string }>({ job_title: '', min_salary: '', max_salary: '' });
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    loadExpectations();
  }, []);

  async function loadExpectations() {
    try {
      setLoadError(false);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const data = await getUserSalaryExpectations(user.id);
      setExpectations(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('SalaryInsights loadExpectations error:', error);
      setLoadError(true);
      setExpectations([]);
    }
  }

  async function handleSearch() {
    if (!searchParams.jobTitle) {
      toast({
        title: 'Required',
        description: 'Please enter a job title',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setAiGenerated(false);
    try {
      const expLevel = searchParams.experienceLevel && searchParams.experienceLevel !== 'any'
        ? searchParams.experienceLevel
        : undefined;

      const res = await fetch('/api/salary-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: searchParams.jobTitle,
          location: searchParams.location || undefined,
          experienceLevel: expLevel,
        }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        setInsights(json.data);
        setAiGenerated(json.source === 'ai');
        setComparison(null);
      } else {
        setInsights(null);
        const msg = json.reason
          ? 'Search failed. Try again later.'
          : 'No salary data available for this search. Try a different job title.';
        toast({
          title: 'No Data',
          description: msg,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Search Failed',
        description: 'Search failed. Try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCompare(userSalary: number) {
    if (!insights || !searchParams.jobTitle || isNaN(userSalary) || userSalary <= 0) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid salary amount.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/salary-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: searchParams.jobTitle,
          userSalary,
          location: searchParams.location || undefined,
          experienceLevel: searchParams.experienceLevel !== 'any' ? searchParams.experienceLevel : undefined,
          marketData: {
            min_salary: insights.min_salary,
            median_salary: insights.median_salary,
            max_salary: insights.max_salary,
            percentile_25: insights.percentile_25,
            percentile_75: insights.percentile_75,
            currency: insights.currency,
          },
        }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        setComparison(json.data);
      } else {
        toast({
          title: 'Error',
          description: json.message || 'Comparison failed. Try again later.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Comparison failed. Try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveExpectation(formData: FormData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Sign in required',
          description: 'Create a free account or sign in to save salary expectations.',
        });
        router.push('/auth');
        return;
      }

      await setSalaryExpectation({
        user_id: user.id,
        job_title: formData.get('job_title') as string,
        min_salary: parseInt(formData.get('min_salary') as string),
        max_salary: parseInt(formData.get('max_salary') as string),
        currency: formData.get('currency') as string || 'USD',
        is_negotiable: formData.get('is_negotiable') === 'true'
      });

      await loadExpectations();
      toast({
        title: 'Success',
        description: 'Salary expectation saved'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  }

  async function handleDeleteExpectation(id: string) {
    if (!confirm('Delete this salary expectation?')) return;
    try {
      await deleteSalaryExpectation(id);
      await loadExpectations();
      toast({ title: 'Deleted', description: 'Salary expectation removed.' });
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to delete expectation.', variant: 'destructive' });
    }
  }

  function startEditing(exp: any) {
    setEditingId(exp.id);
    setEditValues({ job_title: exp.job_title, min_salary: String(exp.min_salary), max_salary: String(exp.max_salary) });
  }

  async function handleUpdateExpectation(id: string) {
    const min = parseInt(editValues.min_salary);
    const max = parseInt(editValues.max_salary);
    if (!editValues.job_title || isNaN(min) || isNaN(max)) {
      toast({ title: 'Invalid', description: 'Please fill in all fields.', variant: 'destructive' });
      return;
    }
    try {
      await updateSalaryExpectation(id, { job_title: editValues.job_title, min_salary: min, max_salary: max });
      setEditingId(null);
      await loadExpectations();
      toast({ title: 'Updated', description: 'Salary expectation saved.' });
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to update expectation.', variant: 'destructive' });
    }
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-[#0A66C2] sm:text-2xl">
          Salary Insights
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Research market pay for roles across Kenya — no account needed to search.
        </p>
      </div>

      <Card className="shadow-none">
        <CardContent className="pt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                placeholder="e.g., Software Engineer"
                value={searchParams.jobTitle}
                onChange={(e) => setSearchParams({ ...searchParams, jobTitle: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Nairobi"
                value={searchParams.location}
                onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="experienceLevel">Experience</Label>
              <Select
                value={searchParams.experienceLevel}
                onValueChange={(value) => setSearchParams({ ...searchParams, experienceLevel: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="entry">Entry Level</SelectItem>
                  <SelectItem value="mid">Mid Level</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="mt-4 w-full sm:w-auto" onClick={handleSearch} disabled={loading}>
            <Search className="h-4 w-4 mr-2" />
            {loading ? 'Searching...' : 'Search Salaries'}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {insights && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Market Data</CardTitle>
              {aiGenerated && (
                <Badge variant="secondary" className="text-xs">Smart Estimate</Badge>
              )}
            </div>
            <CardDescription>
              {aiGenerated
                ? 'Smart estimate for the Kenyan market'
                : `Based on ${insights.sample_size} data points`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Minimum</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(insights.min_salary, insights.currency)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Median</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(insights.median_salary, insights.currency)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Maximum</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(insights.max_salary, insights.currency)}
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Salary Range Distribution</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>25th Percentile</span>
                  <span className="font-semibold">
                    {formatCurrency(insights.percentile_25, insights.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>50th Percentile (Median)</span>
                  <span className="font-semibold">
                    {formatCurrency(insights.median_salary, insights.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>75th Percentile</span>
                  <span className="font-semibold">
                    {formatCurrency(insights.percentile_75, insights.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Compare Your Salary */}
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Compare Your Salary</h4>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter your salary"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCompare(parseInt((e.target as HTMLInputElement).value));
                    }
                  }}
                />
                <Button
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    handleCompare(parseInt(input.value));
                  }}
                >
                  Compare
                </Button>
              </div>
            </div>

            {comparison && (
              <div className="mt-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Your Position</h4>
                  <Badge
                    variant={
                      comparison.status === 'above' ? 'default' :
                      comparison.status === 'below' ? 'destructive' :
                      'secondary'
                    }
                  >
                    {comparison.status === 'above' && <TrendingUp className="h-3 w-3 mr-1" />}
                    {comparison.status === 'below' && <TrendingDown className="h-3 w-3 mr-1" />}
                    {comparison.status === 'at' && <Minus className="h-3 w-3 mr-1" />}
                    {comparison.percentile}th Percentile
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your salary is {formatCurrency(Math.abs(comparison.difference), insights.currency)}
                  {' '}({Math.abs(comparison.differencePercentage)}%)
                  {' '}{comparison.status === 'above' ? 'above' : comparison.status === 'below' ? 'below' : 'at'}
                  {' '}the market median
                </p>
                {comparison.aiAnalysis && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-primary/90 italic flex items-start gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {comparison.aiAnalysis}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">My Salary Expectations</CardTitle>
          <CardDescription className="text-xs">
            Save target ranges for roles you’re applying to
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadError && (
            <div className="mb-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
              Unable to load saved salary expectations. You can still search for market salaries above.
            </div>
          )}
          <form action={handleSaveExpectation} className="space-y-4 mb-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label htmlFor="exp_job_title">Job Title</Label>
                <Input
                  id="exp_job_title"
                  name="job_title"
                  placeholder="e.g., Senior Developer"
                  required
                />
              </div>
              <div>
                <Label htmlFor="min_salary">Min Salary</Label>
                <Input
                  id="min_salary"
                  name="min_salary"
                  type="number"
                  placeholder="100000"
                  required
                />
              </div>
              <div>
                <Label htmlFor="max_salary">Max Salary</Label>
                <Input
                  id="max_salary"
                  name="max_salary"
                  type="number"
                  placeholder="150000"
                  required
                />
              </div>
            </div>
            <Button type="submit">Save Expectation</Button>
          </form>

          {expectations.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold">Saved Expectations</h4>
              {expectations.map((exp) => (
                <div key={exp.id} className="p-3 border rounded-lg">
                  {editingId === exp.id ? (
                    <div className="space-y-2">
                      <div className="grid gap-2 md:grid-cols-3">
                        <Input
                          value={editValues.job_title}
                          onChange={(e) => setEditValues({ ...editValues, job_title: e.target.value })}
                          placeholder="Job title"
                        />
                        <Input
                          type="number"
                          value={editValues.min_salary}
                          onChange={(e) => setEditValues({ ...editValues, min_salary: e.target.value })}
                          placeholder="Min salary"
                        />
                        <Input
                          type="number"
                          value={editValues.max_salary}
                          onChange={(e) => setEditValues({ ...editValues, max_salary: e.target.value })}
                          placeholder="Max salary"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdateExpectation(exp.id)}>
                          <Check className="h-4 w-4 mr-1" /> Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{exp.job_title}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(exp.min_salary, exp.currency)} - {formatCurrency(exp.max_salary, exp.currency)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {exp.is_negotiable && (
                          <Badge variant="outline">Negotiable</Badge>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => startEditing(exp)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteExpectation(exp.id)} aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
