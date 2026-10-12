"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, X, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getSavedJobs } from "@/lib/savedJobs";
import { resolveJobSalaryDisplay } from "@/lib/kenyanSalaryEstimate";

// ComparisonRow component defined outside of render
const ComparisonRow = ({ 
  label, 
  getValue, 
  selectedJobs 
}: { 
  label: string; 
  getValue: (job: any) => any;
  selectedJobs: any[];
}) => (
  <div className="grid grid-cols-4 gap-4 py-3 border-b">
    <div className="font-medium text-sm">{label}</div>
    {selectedJobs.map((job) => (
      <div key={job.id} className="text-sm">
        {getValue(job) || "N/A"}
      </div>
    ))}
    {Array.from({ length: 3 - selectedJobs.length }).map((_, i) => (
      <div key={`empty-${i}`} className="text-sm text-muted-foreground">-</div>
    ))}
  </div>
);

export default function CompareJobsPage() {
  const [selectedJobs, setSelectedJobs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: savedJobs, isLoading } = useQuery({
    queryKey: ["savedJobs"],
    queryFn: getSavedJobs,
  });

  const addJob = (job: any) => {
    if (selectedJobs.length >= 3) {
      return;
    }
    if (!selectedJobs.find((j) => j.id === job.id)) {
      setSelectedJobs([...selectedJobs, job]);
    }
  };

  const removeJob = (jobId: string) => {
    setSelectedJobs(selectedJobs.filter((j) => j.id !== jobId));
  };

  const filteredJobs = savedJobs?.filter((savedJob) =>
    savedJob.jobs?.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Scale className="h-8 w-8 text-primary" />
          Compare Jobs
        </h1>
        <p className="text-muted-foreground">
          Compare up to 3 jobs side by side
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job Selection Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Select Jobs to Compare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search saved jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredJobs?.map((savedJob) => {
                const job = savedJob.jobs;
                if (!job) return null;

                const isSelected = selectedJobs.find((j) => j.id === job.id);

                return (
                  <div
                    key={job.id}
                    className={`p-3 border rounded-md cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => !isSelected && addJob(job)}
                  >
                    <p className="font-medium text-sm line-clamp-1">{job.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {job.companies?.name || job.company}
                    </p>
                    {isSelected && (
                      <Badge variant="secondary" className="mt-2">
                        Selected
                      </Badge>
                    )}
                  </div>
                );
              })}

              {(!filteredJobs || filteredJobs.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No saved jobs found. Save some jobs first to compare them.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Comparison Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedJobs.length === 0 ? (
              <div className="text-center py-12">
                <Scale className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Select jobs from the left panel to start comparing
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selected Jobs Headers */}
                <div className="grid grid-cols-4 gap-4 pb-4 border-b">
                  <div className="font-semibold">Criteria</div>
                  {selectedJobs.map((job) => (
                    <div key={job.id} className="space-y-2">
                      <div className="flex items-start justify-between">
                        <p className="font-semibold text-sm line-clamp-2">{job.title}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeJob(job.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {job.companies?.name || job.company}
                      </p>
                    </div>
                  ))}
                  {Array.from({ length: 3 - selectedJobs.length }).map((_, i) => (
                    <div key={`empty-header-${i}`} className="text-sm text-muted-foreground">
                      Empty Slot
                    </div>
                  ))}
                </div>

                {/* Comparison Rows */}
                <div className="space-y-0">
                  <ComparisonRow
                    label="Location"
                    getValue={(job) => job.location}
                    selectedJobs={selectedJobs}
                  />
                  <ComparisonRow
                    label="Employment Type"
                    getValue={(job) => job.employment_type?.replace(/_/g, " ")}
                    selectedJobs={selectedJobs}
                  />
                  <ComparisonRow
                    label="Location Type"
                    getValue={(job) => job.job_location_type?.replace(/_/g, " ")}
                    selectedJobs={selectedJobs}
                  />
                  <ComparisonRow
                    label="Experience Level"
                    getValue={(job) => job.experience_level}
                    selectedJobs={selectedJobs}
                  />
                  <ComparisonRow
                    label="Salary Range"
                    getValue={(job) =>
                      resolveJobSalaryDisplay({
                        salaryMin: job.salary_min,
                        salaryMax: job.salary_max,
                        salary: job.salary,
                        salaryCurrency: job.salary_currency,
                        salaryPeriod: job.salary_period,
                        salaryIsEstimated: job.salary_is_estimated,
                        salaryVisibility: job.salary_visibility,
                        title: job.title,
                        experienceLevel: job.experience_level,
                        locationCountry: job.job_location_country || "Kenya",
                      }).display
                    }
                    selectedJobs={selectedJobs}
                  />
                  <ComparisonRow
                    label="Industry"
                    getValue={(job) => job.industry}
                    selectedJobs={selectedJobs}
                  />
                  <ComparisonRow
                    label="Job Function"
                    getValue={(job) => job.job_function}
                    selectedJobs={selectedJobs}
                  />
                  <ComparisonRow
                    label="Posted Date"
                    getValue={(job) =>
                      job.date_posted
                        ? new Date(job.date_posted).toLocaleDateString()
                        : "N/A"
                    }
                    selectedJobs={selectedJobs}
                  />
                  <ComparisonRow
                    label="Application Deadline"
                    getValue={(job) =>
                      job.valid_through
                        ? new Date(job.valid_through).toLocaleDateString()
                        : "N/A"
                    }
                    selectedJobs={selectedJobs}
                  />
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                  <div></div>
                  {selectedJobs.map((job) => (
                    <Button
                      key={job.id}
                      asChild
                      size="sm"
                      className="w-full"
                    >
                      <a href={`/jobs/${job.job_slug || job.id}`} target="_blank">
                        View Details
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
