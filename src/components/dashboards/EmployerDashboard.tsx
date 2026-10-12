import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import CompanyProfileForm from "@/components/CompanyProfileForm";
import EmployerApplicationsTab from "@/components/dashboards/EmployerApplicationsTab";
import EmployerAnalyticsDashboard from "@/components/dashboards/EmployerAnalyticsDashboard";
import { JobManagementDashboard } from "@/components/JobManagementDashboard";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  created_at: string;
  employment_type: string;
  status: string;
  applications_count: number;
  views_count: number;
  education_levels?: {
    name: string;
  } | null | any;
}

const EmployerDashboard = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobFilter, setJobFilter] = useState<"all" | "active" | "draft">("all");

  const fetchJobs = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("jobs")
      .select(`
        id, 
        title, 
        company, 
        location, 
        created_at, 
        employment_type, 
        status, 
        applications_count, 
        views_count,
        education_levels (name)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load jobs");
      console.error(error);
    } else {
      setJobs(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchJobs();
    }
  }, [user, fetchJobs]);

  const handleDelete = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job?")) return;

    const { error } = await supabase.from("jobs").delete().eq("id", jobId);

    if (error) {
      toast.error("Failed to delete job");
    } else {
      toast.success("Job deleted successfully");
      fetchJobs();
    }
  };

  const handlePublish = async (jobId: string) => {
    const { error } = await supabase
      .from("jobs")
      .update({ status: "active" })
      .eq("id", jobId);

    if (error) {
      toast.error("Failed to publish job");
    } else {
      toast.success("Job published successfully!");
      fetchJobs();
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (jobFilter === "all") return true;
    if (jobFilter === "active") return job.status === "active";
    if (jobFilter === "draft") return job.status === "draft";
    return true;
  });

  const draftCount = jobs.filter((j) => j.status === "draft").length;
  const activeCount = jobs.filter((j) => j.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold">Employer Dashboard</h1>
        <Link href="/post-job">
          <Button className="bg-gradient-primary hover:opacity-90 w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Post New Job
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="jobs" className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-full sm:w-auto inline-flex min-w-full sm:min-w-0">
            <TabsTrigger value="jobs" className="flex-1 sm:flex-none whitespace-nowrap">My Jobs</TabsTrigger>
            <TabsTrigger value="manage" className="flex-1 sm:flex-none whitespace-nowrap">Job Management</TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1 sm:flex-none whitespace-nowrap">Analytics</TabsTrigger>
            <TabsTrigger value="applications" className="flex-1 sm:flex-none whitespace-nowrap">Applications</TabsTrigger>
            <TabsTrigger value="company" className="flex-1 sm:flex-none whitespace-nowrap">Company Profile</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                My Job Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  variant={jobFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setJobFilter("all")}
                  className="flex-1 sm:flex-none"
                >
                  All ({jobs.length})
                </Button>
                <Button
                  variant={jobFilter === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setJobFilter("active")}
                  className="flex-1 sm:flex-none"
                >
                  Active ({activeCount})
                </Button>
                <Button
                  variant={jobFilter === "draft" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setJobFilter("draft")}
                  className="flex-1 sm:flex-none"
                >
                  Drafts ({draftCount})
                </Button>
              </div>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : filteredJobs.length === 0 ? (
                <p className="text-muted-foreground">
                  {jobFilter === "draft" 
                    ? "No draft jobs. Save a job as draft to see it here." 
                    : jobFilter === "active"
                    ? "No active jobs. Publish a job to see it here."
                    : "No jobs posted yet. Create your first job posting!"}
                </p>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block md:hidden space-y-4">
                    {filteredJobs.map((job) => (
                      <Card key={job.id} className="border">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div>
                              <Link href={`/jobs/${job.id}`} className="font-medium hover:underline text-lg">
                                {job.title}
                              </Link>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="outline">{job.employment_type?.replace(/_/g, ' ')}</Badge>
                                <Badge variant={job.status === 'active' ? 'default' : job.status === 'draft' ? 'secondary' : 'outline'}>
                                  {job.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div>Education: {job.education_levels?.name || 'Not specified'}</div>
                              <div>Applications: {job.applications_count || 0} • Views: {job.views_count || 0}</div>
                              <div>Posted: {new Date(job.created_at).toLocaleDateString()}</div>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                              {job.status === "draft" && (
                                <>
                                  <Link href={`/post-job/${job.id}`} className="flex-1">
                                    <Button variant="outline" size="sm" className="w-full">Edit</Button>
                                  </Link>
                                  <Button 
                                    variant="default" 
                                    size="sm" 
                                    onClick={() => handlePublish(job.id)}
                                    className="flex-1"
                                  >
                                    Publish
                                  </Button>
                                </>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(job.id)} className={job.status === "draft" ? "w-full" : "flex-1"}>
                                Delete
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
                          <TableHead>Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Education</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Applications</TableHead>
                          <TableHead>Views</TableHead>
                          <TableHead>Posted</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredJobs.map((job) => (
                          <TableRow key={job.id}>
                            <TableCell className="font-medium">
                              <Link href={`/jobs/${job.id}`} className="hover:underline">{job.title}</Link>
                            </TableCell>
                            <TableCell><Badge variant="outline">{job.employment_type?.replace(/_/g, ' ')}</Badge></TableCell>
                            <TableCell>{job.education_levels?.name || 'Not specified'}</TableCell>
                            <TableCell>
                              <Badge variant={job.status === 'active' ? 'default' : job.status === 'draft' ? 'secondary' : 'outline'}>
                                {job.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{job.applications_count || 0}</TableCell>
                            <TableCell>{job.views_count || 0}</TableCell>
                            <TableCell>{new Date(job.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {job.status === "draft" && (
                                  <>
                                    <Link href={`/post-job/${job.id}`}>
                                      <Button variant="outline" size="sm">Edit</Button>
                                    </Link>
                                    <Button 
                                      variant="default" 
                                      size="sm" 
                                      onClick={() => handlePublish(job.id)}
                                    >
                                      Publish
                                    </Button>
                                  </>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(job.id)}>Delete</Button>
                              </div>
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
        </TabsContent>

        <TabsContent value="manage">
          <JobManagementDashboard />
        </TabsContent>

        <TabsContent value="analytics">
          <EmployerAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="applications">
          <EmployerApplicationsTab />
        </TabsContent>

        <TabsContent value="company">
          <CompanyProfileForm />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployerDashboard;