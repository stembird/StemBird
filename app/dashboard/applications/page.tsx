'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Briefcase, Calendar, MapPin, ExternalLink, FileText, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ApplicationDetailView } from '@/components/ApplicationDetailView';

interface Application {
  id: string;
  status: string;
  created_at: string;
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    employment_type: string;
  };
}

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [showDetailView, setShowDetailView] = useState(false);

  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/signin');
        return;
      }

      const { data, error } = await supabase
        .from('job_applications')
        .select(`
          id,
          status,
          created_at,
          job:jobs (
            id,
            title,
            company,
            location,
            employment_type
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      reviewing: 'bg-blue-500',
      shortlisted: 'bg-purple-500',
      interviewed: 'bg-indigo-500',
      offered: 'bg-green-500',
      rejected: 'bg-red-500',
      withdrawn: 'bg-gray-500',
      accepted: 'bg-emerald-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  function handleViewDetails(applicationId: string) {
    setSelectedApplicationId(applicationId);
    setShowDetailView(true);
  }

  function handleCloseDetailView() {
    setShowDetailView(false);
    setSelectedApplicationId(null);
  }

  function handleApplicationUpdate() {
    fetchApplications();
  }

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
        <h1 className="text-3xl font-bold mb-2">My Applications</h1>
        <p className="text-muted-foreground">
          Track the status of your job applications
        </p>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No applications yet</h3>
            <p className="text-muted-foreground mb-4">
              Start applying to jobs to see them here
            </p>
            <Button onClick={() => router.push('/jobs')}>
              Browse Jobs
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <Card key={application.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">
                      {application.job.title}
                    </CardTitle>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {application.job.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {application.job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Applied {formatDistanceToNow(new Date(application.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(application.status)} text-white`}>
                    {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleViewDetails(application.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/jobs/${application.job.id}`)}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View Job
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedApplicationId && (
        <ApplicationDetailView
          applicationId={selectedApplicationId}
          open={showDetailView}
          onClose={handleCloseDetailView}
          onUpdate={handleApplicationUpdate}
        />
      )}
    </div>
  );
}
