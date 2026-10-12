"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, Bell, BellOff, Search, Eye, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  getSavedSearches,
  deleteSavedSearch,
  updateSavedSearch,
  getJobsForSavedSearch,
} from "@/lib/savedSearches";
import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import JobCard from "@/components/JobCard";

export default function SavedSearchesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewingSearch, setViewingSearch] = useState<string | null>(null);

  const { data: savedSearches, isLoading, error } = useQuery({
    queryKey: ["savedSearches"],
    queryFn: getSavedSearches,
  });

  const { data: searchResults, isLoading: isLoadingResults } = useQuery({
    queryKey: ["searchResults", viewingSearch],
    queryFn: async () => {
      if (!viewingSearch) return null;
      const search = savedSearches?.find((s) => s.id === viewingSearch);
      if (!search || !search.search_params) return null;
      return getJobsForSavedSearch(search.search_params);
    },
    enabled: !!viewingSearch,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSavedSearch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedSearches"] });
      toast({
        title: "Search Deleted",
        description: "Saved search removed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete search",
        variant: "destructive",
      });
    },
  });

  const toggleAlertsMutation = useMutation({
    mutationFn: ({ searchId, enabled }: { searchId: string; enabled: boolean }) =>
      updateSavedSearch(searchId, { email_alerts_enabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedSearches"] });
      toast({
        title: "Alerts Updated",
        description: "Email alert settings updated successfully",
      });
    },
    onError: (error: any) => {
      console.error("Error updating alerts:", error);
      const message = error?.message?.includes('schema cache') 
        ? "Email alerts feature is still initializing. Please try again in 24-48 hours."
        : "Failed to update alerts";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const getSearchSummary = (params: Record<string, any>) => {
    if (!params) return "All jobs";
    
    const parts = [];
    if (params.searchTerm) parts.push(`"${params.searchTerm}"`);
    if (params.location) parts.push(`in ${params.location}`);
    if (params.jobType) parts.push(params.jobType);
    if (params.employmentType) parts.push(params.employmentType.replace(/_/g, " "));
    if (params.experienceLevel) parts.push(params.experienceLevel);
    if (params.remoteOnly) parts.push("Remote");
    return parts.length > 0 ? parts.join(" • ") : "All jobs";
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading saved searches...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-32">
        <p className="text-2xl font-semibold mb-2">Error Loading Saved Searches</p>
        <p className="text-muted-foreground">Please try again later</p>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Search className="h-8 w-8 text-primary" />
            Saved Searches
          </h1>
          <p className="text-muted-foreground">
            Manage your saved job searches and email alerts
          </p>
        </div>

        {!savedSearches || savedSearches.length === 0 ? (
          <div className="text-center py-32">
            <div className="inline-flex p-6 rounded-full bg-muted mb-6">
              <Search className="h-16 w-16 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold mb-2">No Saved Searches</p>
            <p className="text-muted-foreground text-lg mb-6">
              Save your job searches to quickly access them later and get email alerts
            </p>
            <Button asChild>
              <a href="/jobs">Browse Jobs</a>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {savedSearches.map((search) => (
              <Card key={search.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{search.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {getSearchSummary(search.search_params)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                    <div className="flex items-center gap-2">
                      {search.email_alerts_enabled ? (
                        <Bell className="h-4 w-4 text-primary" />
                      ) : (
                        <BellOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium">Email Alerts</p>
                        {search.email_alerts_enabled && search.alert_frequency && (
                          <p className="text-xs text-muted-foreground">
                            {search.alert_frequency} updates
                          </p>
                        )}
                        {!search.email_alerts_enabled && (
                          <p className="text-xs text-muted-foreground">
                            Feature initializing...
                          </p>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={search.email_alerts_enabled || false}
                      onCheckedChange={(checked) =>
                        toggleAlertsMutation.mutate({
                          searchId: search.id,
                          enabled: checked,
                        })
                      }
                      disabled={toggleAlertsMutation.isPending}
                    />
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Created {new Date(search.created_at).toLocaleDateString()}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setViewingSearch(search.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Results
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link
                        href={`/jobs?${new URLSearchParams(
                          search.search_params && typeof search.search_params === 'object'
                            ? Object.entries(search.search_params).reduce(
                                (acc, [key, value]) => {
                                  if (value !== null && value !== undefined && value !== "") {
                                    acc[key] = String(value);
                                  }
                                  return acc;
                                },
                                {} as Record<string, string>
                              )
                            : {}
                        ).toString()}`}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(search.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Search Results Dialog */}
      <Dialog open={!!viewingSearch} onOpenChange={() => setViewingSearch(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {savedSearches?.find((s) => s.id === viewingSearch)?.name}
            </DialogTitle>
            <DialogDescription>
              Matching jobs for this search
            </DialogDescription>
          </DialogHeader>

          {isLoadingResults ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !searchResults || searchResults.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No matching jobs found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {searchResults.map((job: any) => (
                <JobCard
                  key={job.id}
                  id={job.id}
                  title={job.title}
                  company={job.companies?.name || job.company}
                  location={job.location}
                  locationCity={job.job_location_city}
                  locationCounty={job.job_location_county}
                  description={job.description}
                  salary={job.salary || undefined}
                  companyId={job.company_id}
                  companyLogo={job.companies?.logo}
                  companyWebsite={job.companies?.website}
                  industry={job.industry}
                  locationType={job.job_location_type}
                  employmentType={job.employment_type}
                  salaryMin={job.salary_min}
                  salaryMax={job.salary_max}
                  salaryCurrency={job.salary_currency}
                  salaryPeriod={job.salary_period}
                  salaryIsEstimated={job.salary_is_estimated}
                  salaryVisibility={job.salary_visibility}
                  experienceLevel={job.experience_level}
                  datePosted={job.date_posted}
                  validThrough={job.valid_through}
                  applicationUrl={job.application_url}
                  applyEmail={job.apply_email}
                  applyLink={job.apply_link}
                  skillsTop3={undefined}
                  department={job.job_function}
                  jobSlug={job.job_slug}
                  locationCountry={job.job_location_country}
                  educationLevel=""
                />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
