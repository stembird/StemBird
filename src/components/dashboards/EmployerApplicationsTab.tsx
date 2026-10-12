import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  FileText, 
  Download, 
  Eye, 
  Calendar, 
  MapPin, 
  Briefcase, 
  GraduationCap,
  User,
  Phone,
  Mail,
  CalendarClock,
  Filter
} from "lucide-react";
import { Database } from "@/integrations/supabase/types";

interface ApplicationWithJob {
  id: string;
  job_id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  years_experience: number | null;
  cover_letter: string | null;
  expected_salary_min: number | null;
  expected_salary_max: number | null;
  salary_negotiable: boolean | null;
  application_method: string | null;
  cv_file_url: string | null;
  cv_file_name: string | null;
  cv_file_size: number | null;
  candidate_profile_id: string | null;
  notes: string | null;
  status: Database['public']['Enums']['application_status'];
  created_at: string;
  updated_at: string | null;
  jobs: {
    id: string;
    title: string;
    company: string;
    location: string;
    employment_type: string;
  } | null;
}

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  employment_type: string;
}

const EmployerApplicationsTab = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithJob | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [jobFilter, setJobFilter] = useState<string>("all");

  const fetchApplications = useCallback(async () => {
    if (!user) return;

    try {
      // First get all jobs for this employer
      const { data: employerJobs, error: jobsError } = await supabase
        .from("jobs")
        .select("id, title, company, location, employment_type")
        .eq("user_id", user.id);

      if (jobsError) throw jobsError;
      setJobs(employerJobs || []);

      // Get applications for all jobs
      const { data, error } = await supabase
        .from("job_applications")
        .select(`
          *,
          jobs (
            id,
            title,
            company,
            location,
            employment_type
          )
        `)
        .in("job_id", employerJobs?.map(job => job.id) || [])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user, fetchApplications]);

  const handleStatusChange = async (applicationId: string, newStatus: Database['public']['Enums']['application_status']) => {
    try {
      const { error } = await supabase
        .from("job_applications")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", applicationId);

      if (error) throw error;

      // Update local state
      setApplications(prev => 
        prev.map(app => 
          app.id === applicationId 
            ? { ...app, status: newStatus, updated_at: new Date().toISOString() }
            : app
        )
      );

      toast.success("Application status updated successfully");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update application status");
    }
  };

  const downloadCV = async (cvUrl: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('application-cvs')
        .download(cvUrl.replace('/storage/v1/object/public/application-cvs/', ''));

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading CV:", error);
      toast.error("Failed to download CV");
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500",
      reviewing: "bg-blue-500",
      shortlisted: "bg-purple-500",
      interviewed: "bg-indigo-500",
      offered: "bg-green-500",
      rejected: "bg-red-500",
      withdrawn: "bg-gray-500",
      accepted: "bg-emerald-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getStatusVariant = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      reviewing: "secondary",
      shortlisted: "default",
      interviewed: "default",
      offered: "default",
      rejected: "destructive",
      withdrawn: "outline",
      accepted: "default",
    };
    return variants[status] || "secondary";
  };

  const filteredApplications = applications.filter(app => {
    const statusMatch = statusFilter === "all" || app.status === statusFilter;
    const jobMatch = jobFilter === "all" || app.job_id === jobFilter;
    return statusMatch && jobMatch;
  });

  const getStatusCounts = () => {
    const counts: Record<string, number> = {
      all: applications.length,
      pending: 0,
      reviewing: 0,
      shortlisted: 0,
      interviewed: 0,
      offered: 0,
      rejected: 0,
      withdrawn: 0,
      accepted: 0
    };

    applications.forEach(app => {
      counts[app.status] = (counts[app.status] || 0) + 1;
    });

    return counts;
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return <div className="flex items-center justify-center py-12">Loading applications...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Job Applications</h2>
          <p className="text-muted-foreground">Manage applications for your job postings</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({statusCounts.all})</SelectItem>
                  <SelectItem value="pending">Pending ({statusCounts.pending})</SelectItem>
                  <SelectItem value="reviewing">Reviewing ({statusCounts.reviewing})</SelectItem>
                  <SelectItem value="shortlisted">Shortlisted ({statusCounts.shortlisted})</SelectItem>
                  <SelectItem value="interviewed">Interviewed ({statusCounts.interviewed})</SelectItem>
                  <SelectItem value="offered">Offered ({statusCounts.offered})</SelectItem>
                  <SelectItem value="rejected">Rejected ({statusCounts.rejected})</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn ({statusCounts.withdrawn})</SelectItem>
                  <SelectItem value="accepted">Accepted ({statusCounts.accepted})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Job</label>
              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs ({applications.length})</SelectItem>
                  {jobs.map(job => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title} ({applications.filter(app => app.job_id === job.id).length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Applications ({filteredApplications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredApplications.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No applications found</h3>
              <p className="text-muted-foreground">
                {statusFilter !== "all" || jobFilter !== "all"
                  ? "Try adjusting your filters to see more applications."
                  : "Applications to your job postings will appear here."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{application.jobs?.title || "N/A"}</div>
                          <div className="text-sm text-muted-foreground">
                            {application.jobs?.company}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {application.full_name || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {application.years_experience || "N/A"} years
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(application.status)}>
                          {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(application.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedApplication(application)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Application Details</DialogTitle>
                              </DialogHeader>
                              {selectedApplication && (
                                <div className="space-y-6">
                                  {/* Candidate Info */}
                                  <div>
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                      <User className="h-5 w-5" />
                                      Candidate Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                                        <p className="font-medium">
                                          {selectedApplication.full_name || "N/A"}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                                        <p className="font-medium">
                                          {selectedApplication.email || "N/A"}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Phone</label>
                                        <p className="font-medium">
                                          {selectedApplication.phone || "N/A"}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Years of Experience</label>
                                        <p className="font-medium">
                                          {selectedApplication.years_experience || "N/A"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Job Info */}
                                  <div>
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                      <Briefcase className="h-5 w-5" />
                                      Job Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Job Title</label>
                                        <p className="font-medium">{selectedApplication.jobs?.title || "N/A"}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Company</label>
                                        <p className="font-medium">{selectedApplication.jobs?.company || "N/A"}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Location</label>
                                        <p className="font-medium">{selectedApplication.jobs?.location || "N/A"}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Employment Type</label>
                                        <p className="font-medium">{selectedApplication.jobs?.employment_type || "N/A"}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Application Details */}
                                  <div>
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                      <FileText className="h-5 w-5" />
                                      Application Details
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Application Method</label>
                                        <p className="font-medium capitalize">{selectedApplication.application_method || "N/A"}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                                        <div className="mt-1">
                                          <Select
                                            value={selectedApplication.status}
                                            onValueChange={(value: Database['public']['Enums']['application_status']) => 
                                              handleStatusChange(selectedApplication.id, value)
                                            }
                                          >
                                            <SelectTrigger className="w-full">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="pending">Pending</SelectItem>
                                              <SelectItem value="reviewing">Reviewing</SelectItem>
                                              <SelectItem value="shortlisted">Shortlisted</SelectItem>
                                              <SelectItem value="interviewed">Interviewed</SelectItem>
                                              <SelectItem value="offered">Offered</SelectItem>
                                              <SelectItem value="rejected">Rejected</SelectItem>
                                              <SelectItem value="withdrawn">Withdrawn</SelectItem>
                                              <SelectItem value="accepted">Accepted</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Expected Salary</label>
                                        <p className="font-medium">
                                          {selectedApplication.expected_salary_min 
                                            ? `KES ${selectedApplication.expected_salary_min.toLocaleString()}${selectedApplication.expected_salary_max ? ` - ${selectedApplication.expected_salary_max.toLocaleString()}` : ''}`
                                            : "N/A"}
                                          {selectedApplication.salary_negotiable ? " (Negotiable)" : ""}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-muted-foreground">Applied Date</label>
                                        <p className="font-medium">
                                          {new Date(selectedApplication.created_at).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Cover Letter */}
                                  {selectedApplication.cover_letter && (
                                    <div>
                                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Cover Letter
                                      </h3>
                                      <div className="bg-muted p-4 rounded-lg">
                                        <p className="whitespace-pre-wrap">{selectedApplication.cover_letter}</p>
                                      </div>
                                    </div>
                                  )}

                                  {/* CV Download */}
                                  {selectedApplication.cv_file_url && (
                                    <div>
                                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <Download className="h-5 w-5" />
                                        CV/Resume
                                      </h3>
                                      <Button
                                        onClick={() => downloadCV(selectedApplication.cv_file_url!, selectedApplication.cv_file_name || "resume.pdf")}
                                        className="flex items-center gap-2"
                                      >
                                        <Download className="h-4 w-4" />
                                        Download CV ({selectedApplication.cv_file_size ? `${(selectedApplication.cv_file_size / 1024).toFixed(1)} KB` : "N/A"})
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployerApplicationsTab;