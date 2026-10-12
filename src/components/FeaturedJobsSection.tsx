'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getFeaturedJobs } from '@/lib/jobManagement';
import { Star, MapPin, Briefcase, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { resolveJobSalaryDisplay } from '@/lib/kenyanSalaryEstimate';

export function FeaturedJobsSection({ limit = 6 }: { limit?: number }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeaturedJobs();
  }, []);

  async function loadFeaturedJobs() {
    try {
      const data = await getFeaturedJobs(limit);
      setJobs(data);
    } catch (error) {
      console.error('Error loading featured jobs:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <section className="py-6 md:py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center">Loading featured jobs...</div>
        </div>
      </section>
    );
  }

  if (jobs.length === 0) {
    return null;
  }

  return (
    <section className="py-6 md:py-8 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-4 md:mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
            <h2 className="text-3xl font-bold text-[#0A66C2]">Featured Jobs</h2>
          </div>
          <p className="text-muted-foreground">
            Premium opportunities from top employers
          </p>
        </div>

        <div className="grid gap-4 md:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <Card key={job.id} className="group hover:shadow-lg transition-shadow border-2 border-primary/20">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="default" className="gap-1">
                    <Star className="h-3 w-3" />
                    Featured
                  </Badge>
                  {job.is_promoted && (
                    <Badge variant="secondary">Promoted</Badge>
                  )}
                </div>
                <CardTitle className="text-xl text-foreground transition-colors group-hover:text-[#0A66C2] group-active:text-[#0A66C2]">
                  {job.title}
                </CardTitle>
                <CardDescription className="text-foreground font-medium">
                  {job.companies?.name || job.company || 'Company'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{job.job_type || 'Full-time'}</span>
                  </div>
                  {(() => {
                    const salary = resolveJobSalaryDisplay({
                      salaryMin: job.salary_min,
                      salaryMax: job.salary_max,
                      salaryCurrency: job.salary_currency,
                      salaryPeriod: job.salary_period,
                      salaryIsEstimated: job.salary_is_estimated,
                      salaryVisibility: job.salary_visibility,
                      title: job.title,
                      experienceLevel: job.experience_level,
                      locationCountry: job.job_location_country || 'Kenya',
                    });
                    if (salary.display === 'Negotiable') return null;
                    return (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>{salary.display}</span>
                      </div>
                    );
                  })()}
                  {job.tags && job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {job.tags.slice(0, 3).map((tag: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Link href={`/jobs/${job.id}`} className="block mt-4">
                    <Button className="w-full">View Details</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link href="/jobs">
            <Button variant="outline" size="lg">
              View All Jobs
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
