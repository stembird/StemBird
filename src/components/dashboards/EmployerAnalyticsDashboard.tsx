"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Eye, 
  FileText,
  Target,
  Calendar
} from "lucide-react";
import {
  getEmployerAnalytics,
  getApplicationFunnel,
  getSourceAnalytics,
  getTimeToHireMetrics,
  getCandidateDemographics,
  refreshAnalytics,
  type JobAnalytics,
  type ApplicationFunnelData,
  type SourceAnalytics,
  type TimeToHireData,
  type DemographicsData,
} from "@/lib/employerAnalytics";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EmployerAnalyticsDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<JobAnalytics[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("all");
  const [funnelData, setFunnelData] = useState<ApplicationFunnelData[]>([]);
  const [sourceData, setSourceData] = useState<SourceAnalytics[]>([]);
  const [timeToHireData, setTimeToHireData] = useState<TimeToHireData[]>([]);
  const [demographicsData, setDemographicsData] = useState<DemographicsData[]>([]);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  useEffect(() => {
    if (selectedJobId && selectedJobId !== "all") {
      loadJobSpecificData(selectedJobId);
    } else if (user) {
      loadAggregateData();
    }
  }, [selectedJobId, user]);

  const loadAnalytics = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getEmployerAnalytics(user.id);
      setAnalytics(data);
      
      if (data.length > 0) {
        setSelectedJobId("all");
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const loadJobSpecificData = async (jobId: string) => {
    try {
      const [funnel, sources, demographics] = await Promise.all([
        getApplicationFunnel(jobId),
        getSourceAnalytics(jobId),
        getCandidateDemographics(jobId),
      ]);

      setFunnelData(funnel);
      setSourceData(sources);
      setDemographicsData(demographics);
    } catch (error) {
      console.error("Error loading job-specific data:", error);
    }
  };

  const loadAggregateData = async () => {
    if (!user) return;

    try {
      const [sources, timeToHire, demographics] = await Promise.all([
        getSourceAnalytics(undefined, user.id),
        getTimeToHireMetrics(user.id),
        getCandidateDemographics(undefined, user.id),
      ]);

      setSourceData(sources);
      setTimeToHireData(timeToHire);
      setDemographicsData(demographics);
    } catch (error) {
      console.error("Error loading aggregate data:", error);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refreshAnalytics();
      await loadAnalytics();
      toast.success("Analytics refreshed successfully");
    } catch (error) {
      console.error("Error refreshing analytics:", error);
      toast.error("Failed to refresh analytics");
    } finally {
      setRefreshing(false);
    }
  };

  const totalViews = analytics.reduce((sum, job) => sum + (job.total_views || 0), 0);
  const totalApplications = analytics.reduce((sum, job) => sum + (job.total_applications || 0), 0);
  const avgConversionRate = analytics.length > 0
    ? analytics.reduce((sum, job) => sum + (job.conversion_rate || 0), 0) / analytics.length
    : 0;

  const selectedJob = selectedJobId === "all" 
    ? null 
    : analytics.find(j => j.job_id === selectedJobId);

  if (loading) {
    return <div className="p-6">Loading analytics...</div>;
  }

  if (analytics.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            No analytics data available yet. Post some jobs to see analytics!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Track your job performance and hiring metrics</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <TrendingUp className="mr-2 h-4 w-4" />
          {refreshing ? "Refreshing..." : "Refresh Data"}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Filter by Job:</label>
        <Select value={selectedJobId} onValueChange={setSelectedJobId}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a job" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            {analytics.map((job) => (
              <SelectItem key={job.job_id} value={job.job_id}>
                {job.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {selectedJob ? selectedJob.total_views : totalViews}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedJob ? "For this job" : "Across all jobs"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {selectedJob ? selectedJob.total_applications : totalApplications}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedJob ? "For this job" : "Across all jobs"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {selectedJob 
                ? `${selectedJob.conversion_rate.toFixed(1)}%`
                : `${avgConversionRate.toFixed(1)}%`
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Views to applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hired</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {selectedJob 
                ? selectedJob.hired_count
                : analytics.reduce((sum, job) => sum + (job.hired_count || 0), 0)
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Successful hires
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="funnel" className="w-full">
        <TabsList>
          <TabsTrigger value="funnel">Application Funnel</TabsTrigger>
          <TabsTrigger value="sources">Traffic Sources</TabsTrigger>
          <TabsTrigger value="time">Time to Hire</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
        </TabsList>

        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application Funnel</CardTitle>
              <CardDescription>
                Track candidates through your hiring process
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedJob && funnelData.length > 0 ? (
                <div className="space-y-4">
                  {funnelData.map((stage) => {
                    // Map internal status to display labels
                    const stageLabels: Record<string, string> = {
                      pending: "Pending Review",
                      reviewing: "Under Review",
                      shortlisted: "Shortlisted",
                      interviewed: "Interviewed",
                      offered: "Offered",
                      accepted: "Accepted/Hired",
                    };
                    
                    return (
                      <div key={stage.stage} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{stageLabels[stage.stage] || stage.stage}</span>
                          <span className="text-muted-foreground">
                            {stage.count} ({stage.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${stage.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Select a specific job to view the application funnel
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application Sources</CardTitle>
              <CardDescription>
                Where your applicants are coming from
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sourceData.length > 0 ? (
                <div className="space-y-4">
                  {sourceData.map((source, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{source.source_name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {source.source_type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{source.count}</p>
                        <p className="text-sm text-muted-foreground">
                          {source.percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No source data available yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Time to Hire Metrics</CardTitle>
              <CardDescription>
                Average time from posting to hiring
              </CardDescription>
            </CardHeader>
            <CardContent>
              {timeToHireData.length > 0 ? (
                <div className="space-y-4">
                  {timeToHireData.map((job) => (
                    <div key={job.job_id} className="border-b pb-4 last:border-0">
                      <p className="font-medium mb-2">{job.job_title}</p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">First Application</p>
                          <p className="font-semibold">
                            {job.days_to_first_application !== null
                              ? `${job.days_to_first_application} days`
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Time to Hire</p>
                          <p className="font-semibold">
                            {job.days_to_hire !== null
                              ? `${job.days_to_hire} days`
                              : "Not hired yet"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Applicants</p>
                          <p className="font-semibold">{job.total_applicants}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No time-to-hire data available yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demographics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Candidate Demographics</CardTitle>
              <CardDescription>
                Experience level distribution of applicants
              </CardDescription>
            </CardHeader>
            <CardContent>
              {demographicsData.length > 0 ? (
                <div className="space-y-4">
                  {demographicsData.map((demo) => (
                    <div key={demo.experience_level} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{demo.experience_level}</span>
                        <span className="text-muted-foreground">{demo.count}</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              (demo.count /
                                demographicsData.reduce((sum, d) => sum + d.count, 0)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No demographics data available yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployerAnalyticsDashboard;
