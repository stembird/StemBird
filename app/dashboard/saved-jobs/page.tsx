"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, FileText, Bookmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getSavedJobs, unsaveJob, updateSavedJobNotes } from "@/lib/savedJobs";
import JobCard from "@/components/JobCard";
import SavedJobDocumentBadges from "@/components/saved-jobs/SavedJobDocumentBadges";
import { getUserCoverLetters, getUserCVs } from "@/lib/careerTools";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export default function SavedJobsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");

  const { data: savedJobs, isLoading, error } = useQuery({
    queryKey: ["savedJobs"],
    queryFn: getSavedJobs,
  });

  const { data: documents } = useQuery({
    queryKey: ["savedJobDocuments"],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { cvs: [], letters: [] };
        const [cvs, letters] = await Promise.all([
          getUserCVs(user.id),
          getUserCoverLetters(user.id),
        ]);
        return { cvs, letters };
      } catch {
        return { cvs: [], letters: [] };
      }
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: unsaveJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedJobs"] });
      toast({
        title: "Job Removed",
        description: "Job removed from your saved list",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove job",
        variant: "destructive",
      });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: ({ jobId, notes }: { jobId: string; notes: string }) =>
      updateSavedJobNotes(jobId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedJobs"] });
      toast({
        title: "Notes Updated",
        description: "Your notes have been saved",
      });
      setEditingNotes(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update notes",
        variant: "destructive",
      });
    },
  });

  const handleEditNotes = (jobId: string, currentNotes?: string) => {
    setEditingNotes(jobId);
    setNotesText(currentNotes || "");
  };

  const handleSaveNotes = (jobId: string) => {
    updateNotesMutation.mutate({ jobId, notes: notesText });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading saved jobs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-32">
        <p className="text-2xl font-semibold mb-2">Error Loading Saved Jobs</p>
        <p className="text-muted-foreground">Please try again later</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Bookmark className="h-8 w-8 text-primary" />
          Saved Jobs
        </h1>
        <p className="text-muted-foreground">
          Jobs you've saved for later review
        </p>
      </div>

      {!savedJobs || savedJobs.length === 0 ? (
        <div className="text-center py-32">
          <div className="inline-flex p-6 rounded-full bg-muted mb-6">
            <FileText className="h-16 w-16 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold mb-2">No Saved Jobs</p>
          <p className="text-muted-foreground text-lg mb-6">
            Start saving jobs to keep track of opportunities you're interested in
          </p>
          <Button asChild>
            <a href="/jobs">Browse Jobs</a>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {savedJobs.map((savedJob) => {
            const job = savedJob.jobs;
            if (!job) return null;

            return (
              <Card key={savedJob.id} className="overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <JobCard
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
                      educationLevel=""
                      locationCountry={job.job_location_country}
                    />
                  </div>

                  <div className="lg:col-span-1 p-6 bg-muted/30 space-y-4">
                    {/* Notes feature temporarily disabled due to Supabase schema cache issue */}
                    {/* Will be re-enabled once schema cache refreshes (24-48 hours after migration) */}
                    {/* 
                    <div>
                      <h3 className="font-semibold mb-2">Your Notes</h3>
                      {editingNotes === job.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={notesText}
                            onChange={(e) => setNotesText(e.target.value)}
                            placeholder="Add notes about this job..."
                            rows={4}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveNotes(job.id)}
                              disabled={updateNotesMutation.isPending}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingNotes(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {savedJob.notes || "No notes yet"}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditNotes(job.id, savedJob.notes || undefined)}
                          >
                            {savedJob.notes ? "Edit Notes" : "Add Notes"}
                          </Button>
                        </div>
                      )}
                    </div>
                    */}

                    <SavedJobDocumentBadges
                      job={job}
                      cvs={documents?.cvs || []}
                      letters={documents?.letters || []}
                    />

                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Saved on {new Date(savedJob.created_at).toLocaleDateString()}
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => unsaveMutation.mutate(job.id)}
                        disabled={unsaveMutation.isPending}
                        className="w-full"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove from Saved
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
