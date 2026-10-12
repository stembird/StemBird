"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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
  experience_level: string;
  area_of_study?: string;
  field_of_study?: string;
  education_requirements?: string;
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

interface JobTextParserProps {
  onParsed: (data: ParsedJobData) => void;
}

const EXAMPLE_JOB_TEXT = `Software Engineer at TechCorp Kenya
Location: Nairobi, Kenya
Type: Full-time, On-site
Salary: KES 80,000 - 120,000 per month

About the role:
We are looking for a talented Software Engineer to join our growing team in Nairobi. You will work on cutting-edge web applications and collaborate with a diverse team of developers.

Responsibilities:
- Develop and maintain web applications using React and Node.js
- Collaborate with cross-functional teams to define and ship new features
- Write clean, maintainable, and well-documented code
- Participate in code reviews and mentor junior developers
- Troubleshoot and debug applications

Requirements:
- Bachelor's degree in Computer Science or related field
- 3+ years of experience in software development
- Proficiency in React, Node.js, and TypeScript
- Strong problem-solving skills and attention to detail
- Excellent communication skills in English

How to Apply:
Send your CV and cover letter to careers@techcorp.co.ke or apply at https://techcorp.co.ke/careers`;

const JobTextParser = ({ onParsed }: JobTextParserProps) => {
  const [jobText, setJobText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useStreaming, setUseStreaming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [isCached, setIsCached] = useState(false);

  const loadExample = () => {
    setJobText(EXAMPLE_JOB_TEXT);
    toast.info("Example job text loaded");
  };

  const handleParse = async () => {
    if (!jobText.trim()) {
      toast.error("Please paste job text first");
      return;
    }

    setIsParsing(true);
    setError(null);
    setProgress(0);
    setStatusMessage("");
    setProcessingTime(null);
    setIsCached(false);

    try {
      if (useStreaming) {
        await handleStreamingParse();
      } else {
        await handleDirectParse();
      }
    } catch (err: any) {
      console.error("Parse error:", err);
      const errorMessage = err.message || "Failed to parse job text";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsParsing(false);
      setProgress(0);
      setStatusMessage("");
    }
  };

  const handleDirectParse = async () => {
    const startTime = Date.now();
    
    const response = await fetch("/api/parse-job", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobText }),
    });

    // Check if response is JSON before parsing
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const errorText = await response.text();
      throw new Error(`Invalid response from server: ${errorText || 'Unknown error'}`);
    }

    const result = await response.json();

    if (!response.ok) {
      const errorMsg = result.error || "Failed to parse job text";
      if (result.status === 401) {
        throw new Error(`${errorMsg}

Steps to fix:
1. Verify your API key in Vercel environment variables
2. Check API key is active`);
      } else if (result.status === 402) {
        throw new Error(`${errorMsg}

AI quota or billing may be exhausted (DeepSeek or Gemini).

Options:
1. Check DeepSeek balance / API key in Vercel (DEEPSEEK_API_KEY)
2. Check Gemini quota or enable billing
3. Wait for quota to reset and retry`);
      } else if (result.status === 504) {
        throw new Error(`Request timeout. The AI service took too long to respond. Please try again.`);
      }
      throw new Error(errorMsg);
    }

    if (result.success && result.data) {
      setProcessingTime(result.processingTime || Date.now() - startTime);
      setIsCached(result.cached || false);
      
      const successMsg = result.cached 
        ? "Job text parsed successfully (from cache)!" 
        : "Job text parsed successfully!";
      
      toast.success(successMsg);
      onParsed(result.data);
      setJobText(""); // Clear the text area
    } else {
      throw new Error("Invalid response from parser");
    }
  };

  const handleStreamingParse = async () => {
    const response = await fetch("/api/parse-job/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobText }),
    });

    if (!response.ok) {
      throw new Error("Failed to start streaming parse");
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response stream available");
    }

    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'status':
                case 'progress':
                  setProgress(data.progress || 0);
                  setStatusMessage(data.message || '');
                  break;
                  
                case 'completed':
                  setProgress(100);
                  setStatusMessage('Completed!');
                  toast.success("Job text parsed successfully!");
                  onParsed(data.data);
                  setJobText("");
                  return;
                  
                case 'error':
                case 'timeout':
                  throw new Error(data.error);
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Job Text Parser
        </CardTitle>
        <CardDescription>
          Paste pre-cleaned job text below and let AI extract structured information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium">Job Text</label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setUseStreaming(!useStreaming)}
              disabled={isParsing}
            >
              {useStreaming ? "Direct Mode" : "Stream Mode"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={loadExample}
              disabled={isParsing}
            >
              Load Example
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Textarea
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            placeholder="Paste your job posting text here...

Example:
Software Engineer at TechCorp Kenya
Location: Nairobi, Kenya
Type: Full-time, On-site

About the role:
We are looking for a talented Software Engineer...

Responsibilities:
- Develop and maintain web applications
- Collaborate with cross-functional teams
..."
            className="min-h-[300px] font-mono text-sm"
            disabled={isParsing}
          />
          <p className="text-xs text-muted-foreground">
            Tip: For best results, ensure the text is already cleaned and formatted (90%+ ready)
          </p>
        </div>

        {/* Progress indicator for streaming mode */}
        {isParsing && useStreaming && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{statusMessage}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Performance metrics */}
        {processingTime && !isParsing && (
          <div className="text-xs text-muted-foreground flex gap-4">
            <span>Processing time: {processingTime}ms</span>
            {isCached && <span className="text-green-600">✓ Cached result</span>}
          </div>
        )}

        <Button
          onClick={handleParse}
          disabled={isParsing || !jobText.trim()}
          className="w-full bg-gradient-primary hover:opacity-90"
        >
          {isParsing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {useStreaming ? statusMessage || "Processing..." : "Parsing with AI..."}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              {useStreaming ? "Parse with Streaming" : "Parse Job Text"}
            </>
          )}
        </Button>
        
        {useStreaming && (
          <p className="text-xs text-muted-foreground text-center">
            Streaming mode provides real-time progress updates and handles large jobs better
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default JobTextParser;
