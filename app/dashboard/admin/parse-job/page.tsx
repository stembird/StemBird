"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import JobTextParser from "@/components/JobTextParser";
import JobPostingForm from "@/components/JobPostingForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ParsedJobData {
  title: string;
  company: string;
  description: string;
  responsibilities: string;
  required_qualifications: string;
  software_skills?: string;
  employment_type: string;
  employment_types?: string[];
  job_location_type: string;
  job_location_types?: string[];
  job_location_country: string;
  job_location_county?: string;
  job_location_city?: string;
  additional_locations?: Array<{ county: string; city: string }>;
  industry: string;
  industries?: string[];
  education_level_name?: string;
  education_level_id?: string;
  area_of_study?: string;
  field_of_study?: string;
  education_requirements?: string;
  experience_level: string;
  language_requirements?: string;
  salary_min?: string;
  salary_max?: string;
  salary_period?: string;
  salary_currency?: string;
  minimum_experience?: string;
  apply_email?: string;
  apply_link?: string;
  application_url?: string;
  additional_info?: string;
  tags?: string;
  job_function?: string;
  job_functions?: string[];
  valid_through?: string;
}

const ParseJobPage = () => {
  const router = useRouter();
  const [parsedData, setParsedData] = useState<ParsedJobData | null>(null);
  const [parseSessionId, setParseSessionId] = useState(0);
  const [showForm, setShowForm] = useState(false);

  const handleParsed = async (data: ParsedJobData) => {
    // Convert education_level_name to education_level_id with fuzzy matching
    if (data.education_level_name) {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        // Fetch all education levels for fuzzy matching
        const { data: allLevels } = await supabase
          .from("education_levels")
          .select("id, name");
        
        if (allLevels && allLevels.length > 0) {
          const parsed = data.education_level_name!.toLowerCase().trim();
          
          // Try exact match first
          let match = allLevels.find(l => l.name.toLowerCase().trim() === parsed);
          
          // Try substring match
          if (!match) {
            match = allLevels.find(l => {
              const dbName = l.name.toLowerCase().trim();
              return dbName.includes(parsed) || parsed.includes(dbName);
            });
          }
          
          // Try word overlap
          if (!match) {
            const parsedWords = parsed.split(/\s+/).filter(w => w.length > 2);
            let bestMatch: typeof allLevels[0] | null = null;
            let bestScore = 0;
            for (const level of allLevels) {
              const dbWords = level.name.toLowerCase().trim().split(/\s+/).filter(w => w.length > 2);
              const overlap = parsedWords.filter(pw => dbWords.includes(pw)).length;
              if (overlap > bestScore) {
                bestScore = overlap;
                bestMatch = level;
              }
            }
            if (bestScore > 0) match = bestMatch;
          }
          
          if (match) {
            (data as any).education_level_id = String(match.id);
          }
        }
      } catch (error) {
        console.error("Error fetching education level:", error);
      }
    }
    
    const {
      status: _status,
      job_status: _jobStatus,
      direct_apply: _directApply,
      ...cleanData
    } = data as ParsedJobData & {
      status?: string;
      job_status?: string;
      direct_apply?: boolean;
    };
    setParsedData(cleanData);
    setParseSessionId((id) => id + 1);
    setShowForm(true);
  };

  const handleReset = () => {
    setParsedData(null);
    setParseSessionId(0);
    setShowForm(false);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Parse & Post Job</h1>
          <p className="text-muted-foreground">
            Use AI to automatically extract job information from text and create a structured job posting
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>How it works:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Paste your pre-cleaned job text (90%+ ready)</li>
              <li>AI extracts structured information</li>
              <li>Review and edit the parsed data in the form</li>
              <li>Review the form (defaults to Active / Publish) and submit</li>
            </ol>
          </AlertDescription>
        </Alert>

        {!showForm ? (
          <JobTextParser onParsed={handleParsed} />
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Review & Edit Parsed Job</CardTitle>
                <CardDescription>
                  The AI has extracted the following information. Review and edit as needed before saving.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  onClick={handleReset}
                  className="mb-4"
                >
                  Parse Another Job
                </Button>
              </CardContent>
            </Card>

            {parsedData && (
              <>
                <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <CardHeader>
                    <CardTitle className="text-green-800 dark:text-green-200">
                      ✓ Successfully Parsed
                    </CardTitle>
                    <CardDescription className="text-green-700 dark:text-green-300">
                      Extracted the following information:
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      {parsedData.title && (
                        <div>
                          <span className="font-medium">Title:</span> {parsedData.title}
                        </div>
                      )}
                      {parsedData.company && (
                        <div>
                          <span className="font-medium">Company:</span> {parsedData.company}
                        </div>
                      )}
                      {(parsedData.industries?.length || parsedData.industry) && (
                        <div>
                          <span className="font-medium">Industry:</span>{' '}
                          {parsedData.industries?.length
                            ? parsedData.industries.join(', ')
                            : parsedData.industry}
                        </div>
                      )}
                      {(parsedData.job_functions?.length || parsedData.job_function) && (
                        <div>
                          <span className="font-medium">Job Function:</span>{' '}
                          {parsedData.job_functions?.length
                            ? parsedData.job_functions.join(', ')
                            : parsedData.job_function}
                        </div>
                      )}
                      {parsedData.employment_type && (
                        <div>
                          <span className="font-medium">Type:</span> {parsedData.employment_type}
                        </div>
                      )}
                      {parsedData.job_location_city && (
                        <div>
                          <span className="font-medium">Location:</span> {parsedData.job_location_city}
                        </div>
                      )}
                      {parsedData.salary_min && parsedData.salary_max && (
                        <div>
                          <span className="font-medium">Salary:</span> {parsedData.salary_currency} {parsedData.salary_min} - {parsedData.salary_max}
                        </div>
                      )}
                      {parsedData.additional_info && (
                        <div className="col-span-2 md:col-span-3">
                          <span className="font-medium">Additional information:</span>{' '}
                          {/how to apply/i.test(parsedData.additional_info) ? 'How to Apply' : 'Included'}
                          {/<strong>\s*\d+\s*[.)]/i.test(parsedData.additional_info)
                            ? ' + career tips'
                            : ''}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <JobPostingFormWrapper initialData={parsedData} parseSessionId={parseSessionId} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Wrapper component to pass initial data to JobPostingForm
const JobPostingFormWrapper = ({
  initialData,
  parseSessionId,
}: {
  initialData: ParsedJobData;
  parseSessionId: number;
}) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <JobPostingForm
          key={`parsed-job-${parseSessionId}`}
          initialData={{ ...initialData, status: "active", direct_apply: false }}
          isParsedData={true}
        />
      </CardContent>
    </Card>
  );
};

export default ParseJobPage;
