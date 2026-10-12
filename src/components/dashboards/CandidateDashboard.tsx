import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, Bookmark, Trash2, Search, Scale, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { JobMatches } from "@/components/JobMatches";
import { JobAlerts } from "@/components/JobAlerts";

interface Application {
  id: string;
  job_id: string;
  status: string;
  created_at: string;
  jobs: {
    title: string;
    company: string;
    location: string;
  };
}

interface SavedJob {
  id: string;
  job_id: string;
  created_at: string;
  jobs: {
    id: string;
    title: string;
    company: string;
    location: string;
  };
}

const CandidateDashboard = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const [appsResult, savedResult] = await Promise.all([
      supabase
        .from("job_applications")
        .select("id, job_id, status, created_at, jobs(title, company, location)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("saved_jobs")
        .select("id, job_id, created_at, jobs(id, title, company, location)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (appsResult.error) {
      toast.error("Failed to load applications");
    } else {
      setApplications(appsResult.data || []);
    }

    if (savedResult.error) {
      toast.error("Failed to load saved jobs");
    } else {
      setSavedJobs(savedResult.data || []);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const handleUnsave = async (savedJobId: string) => {
    const { error } = await supabase.from("saved_jobs").delete().eq("id", savedJobId);

    if (error) {
      toast.error("Failed to unsave job");
    } else {
      toast.success("Job removed from saved");
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold">Job Seeker Dashboard</h1>
        <div className="relative">
          <div className="flex overflow-x-auto scrollbar-hide sm:flex-row gap-2 pb-1 -mx-1 px-1 snap-x">
            <Link href="/dashboard/career-tools" className="shrink-0 snap-start">
              <Button variant="default" className="w-full whitespace-nowrap">
                <Briefcase className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Career Tools</span>
                <span className="sm:hidden">Tools</span>
              </Button>
            </Link>
            <Link href="/dashboard/profile" className="shrink-0 snap-start">
              <Button variant="outline" className="w-full whitespace-nowrap">
                <FileText className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">My Profile</span>
                <span className="sm:hidden">Profile</span>
              </Button>
            </Link>
            <Link href="/dashboard/applications" className="shrink-0 snap-start">
              <Button variant="outline" className="w-full whitespace-nowrap">
                <FileText className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">All Applications</span>
                <span className="sm:hidden">Applications</span>
              </Button>
            </Link>
            <Link href="/dashboard/saved-jobs" className="shrink-0 snap-start">
              <Button variant="outline" className="w-full whitespace-nowrap">
                <Bookmark className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Saved Jobs</span>
                <span className="sm:hidden">Saved</span>
              </Button>
            </Link>
            <Link href="/dashboard/saved-searches" className="shrink-0 snap-start">
              <Button variant="outline" className="w-full whitespace-nowrap">
                <Search className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Saved Searches</span>
                <span className="sm:hidden">Searches</span>
              </Button>
            </Link>
            <Link href="/dashboard/compare-jobs" className="shrink-0 snap-start">
              <Button variant="outline" className="w-full whitespace-nowrap">
                <Scale className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Compare Jobs</span>
                <span className="sm:hidden">Compare</span>
              </Button>
            </Link>
          </div>
          {/* Scroll hint fade on mobile */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none sm:hidden" />
        </div>
      </div>

      {/* Job Matches Section */}
      <JobMatches />

      {/* Job Alerts Section */}
      <JobAlerts />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            My Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : applications.length === 0 ? (
            <p className="text-muted-foreground">
              No applications yet. <Link href="/jobs" className="text-primary underline">Browse jobs</Link> to apply.
            </p>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-4">
                {applications.slice(0, 5).map((app) => (
                  <Card key={app.id} className="border">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <Link href={`/jobs/${app.job_id}`} className="font-medium hover:underline text-lg block">
                          {app.jobs?.title || "N/A"}
                        </Link>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>Company: {app.jobs?.company || "N/A"}</div>
                          <div>Location: {app.jobs?.location || "N/A"}</div>
                          <div>Applied: {new Date(app.created_at).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <span className="capitalize px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                            {app.status}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.slice(0, 5).map((app) => (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium">
                          <Link href={`/jobs/${app.job_id}`} className="hover:underline">
                            {app.jobs?.title || "N/A"}
                          </Link>
                        </TableCell>
                        <TableCell>{app.jobs?.company || "N/A"}</TableCell>
                        <TableCell>{app.jobs?.location || "N/A"}</TableCell>
                        <TableCell>
                          <span className="capitalize px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                            {app.status}
                          </span>
                        </TableCell>
                        <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {applications.length > 5 && (
                <div className="mt-4 text-center">
                  <Link href="/dashboard/applications">
                    <Button variant="outline">View All Applications ({applications.length})</Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              Saved Jobs
            </CardTitle>
            <Link href="/dashboard/saved-jobs">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : savedJobs.length === 0 ? (
            <p className="text-muted-foreground">
              No saved jobs yet. <Link href="/jobs" className="text-primary underline">Browse jobs</Link> and save your favorites.
            </p>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-4">
                {savedJobs.slice(0, 5).map((saved) => (
                  <Card key={saved.id} className="border">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <Link href={`/jobs/${saved.jobs?.id}`} className="font-medium hover:underline text-lg block">
                          {saved.jobs?.title || "N/A"}
                        </Link>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>Company: {saved.jobs?.company || "N/A"}</div>
                          <div>Location: {saved.jobs?.location || "N/A"}</div>
                          <div>Saved: {new Date(saved.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className="pt-2">
                          <Button variant="outline" size="sm" onClick={() => handleUnsave(saved.id)} className="w-full">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Saved</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedJobs.slice(0, 5).map((saved) => (
                      <TableRow key={saved.id}>
                        <TableCell className="font-medium">
                          <Link href={`/jobs/${saved.jobs?.id}`} className="hover:underline">
                            {saved.jobs?.title || "N/A"}
                          </Link>
                        </TableCell>
                        <TableCell>{saved.jobs?.company || "N/A"}</TableCell>
                        <TableCell>{saved.jobs?.location || "N/A"}</TableCell>
                        <TableCell>{new Date(saved.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleUnsave(saved.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CandidateDashboard;