'use client';

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, ExternalLink, FileText, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { trackApplicationSource } from "@/lib/employerAnalytics";
import {
  getCVTemplates,
  getUserCoverLetters,
  getUserCVs,
  updateCoverLetter,
  type CandidateCoverLetter,
  type CandidateCV,
  type CVTemplate,
} from "@/lib/careerTools";
import {
  applicationInsertWithoutDocumentFks,
  defaultCvId,
  isMissingDbColumnError,
  pickLetterForPrefill,
  sortLettersForJob,
  type ApplicationMethod,
} from "@/lib/applyDocuments";
import { letterPlaintextForApply } from "@/lib/coverLetterExport";
import { ensureCareerCvApplicationFile } from "@/lib/exportCareerCv";
import { TemplateUnlockDialog, useTemplateUnlock } from "@/hooks/useTemplateUnlock";

interface ApplySectionProps {
  job: any;
  /** Skip card chrome when rendered inside a sheet/drawer */
  embedded?: boolean;
  /** When true, applications are closed */
  expired?: boolean;
}

export default function ApplySection({
  job,
  embedded = false,
  expired = false,
}: ApplySectionProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    yearsExperience: '',
    coverLetter: '',
    expectedSalary: '',
    salaryNegotiable: false,
    applicationMethod: 'profile' as ApplicationMethod,
    cvFile: null as File | null,
  });
  const [builderCvs, setBuilderCvs] = useState<CandidateCV[]>([]);
  const [builderLetters, setBuilderLetters] = useState<CandidateCoverLetter[]>([]);
  const [cvTemplates, setCvTemplates] = useState<CVTemplate[]>([]);
  const [selectedCvId, setSelectedCvId] = useState('');
  const [selectedLetterId, setSelectedLetterId] = useState('none');
  const [loadingBuilderDocs, setLoadingBuilderDocs] = useState(true);
  const [builderSignedIn, setBuilderSignedIn] = useState(false);
  const applyFormRef = useRef<HTMLFormElement>(null);
  const {
    refreshPurchases,
    requireUnlock,
    checkout,
    setCheckout,
    handlePaid,
  } = useTemplateUnlock();

  useEffect(() => {
    let cancelled = false;
    async function loadBuilderDocs() {
      setLoadingBuilderDocs(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const templates = await getCVTemplates().catch(() => [] as CVTemplate[]);
        if (cancelled) return;
        setCvTemplates(templates);

        setBuilderSignedIn(!!user);
        if (!user) {
          setBuilderCvs([]);
          setBuilderLetters([]);
          return;
        }

        const [cvs, letters] = await Promise.all([
          getUserCVs(user.id),
          getUserCoverLetters(user.id),
        ]);
        await refreshPurchases(user.id);
        if (cancelled) return;
        setBuilderCvs(cvs);
        setBuilderLetters(sortLettersForJob(letters, job.id));

        const params = new URLSearchParams(window.location.search);
        const cvFromUrl = params.get('cvId');
        const letterFromUrl = params.get('letterId');
        const nextCvId = (cvFromUrl && cvs.some((c) => c.id === cvFromUrl))
          ? cvFromUrl
          : defaultCvId(cvs);
        setSelectedCvId(nextCvId);
        if (cvFromUrl && cvs.some((c) => c.id === cvFromUrl)) {
          setFormData((prev) => ({ ...prev, applicationMethod: 'career_tools' }));
        }

        const preferredLetter = pickLetterForPrefill(letters, job.id, letterFromUrl);
        if (preferredLetter) {
          setSelectedLetterId(preferredLetter.id);
          setFormData((prev) => ({
            ...prev,
            coverLetter: prev.coverLetter || letterPlaintextForApply(preferredLetter),
            applicationMethod: letterFromUrl ? 'career_tools' : prev.applicationMethod,
          }));
        }
      } catch (error) {
        console.error('Failed to load Career Tools documents', error);
      } finally {
        if (!cancelled) setLoadingBuilderDocs(false);
      }
    }
    loadBuilderDocs();
    return () => { cancelled = true; };
  }, [job.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or DOC file",
          variant: "destructive",
        });
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      setFormData(prev => ({ ...prev, cvFile: file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to apply for this job",
          variant: "destructive",
        });
        router.push('/auth');
        return;
      }

      // Get user profile data
      const { data: profile } = await (supabase as any)
        .from('candidate_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      let cvFileUrl = null;
      let cvFileName = null;
      let cvFileSize = null;
      let candidateCvId: string | null = null;
      let candidateCoverLetterId: string | null = null;
      let coverLetterText = formData.coverLetter.trim();

      if (formData.applicationMethod === 'cv' && formData.cvFile) {
        const fileExt = formData.cvFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('application-cvs')
          .upload(fileName, formData.cvFile);

        if (uploadError) {
          throw new Error('Failed to upload CV');
        }

        const { data: { publicUrl } } = supabase.storage
          .from('application-cvs')
          .getPublicUrl(fileName);

        cvFileUrl = publicUrl;
        cvFileName = formData.cvFile.name;
        cvFileSize = formData.cvFile.size;
      }

      if (formData.applicationMethod === 'career_tools') {
        const selectedCv = builderCvs.find((cv) => cv.id === selectedCvId);
        if (!selectedCv) {
          throw new Error('Choose a Career Tools CV, or build one first.');
        }
        const templateName = cvTemplates.find((t) => t.id === selectedCv.template_id)?.name
          || 'Classic Professional';
        const resumeApply = () => applyFormRef.current?.requestSubmit();
        if (requireUnlock('cv_template', templateName, resumeApply)) return;

        if (selectedLetterId !== 'none') {
          const selectedLetter = builderLetters.find((l) => l.id === selectedLetterId);
          const letterTemplateName = selectedLetter?.content_json?.templateName;
          if (letterTemplateName && requireUnlock('cover_letter_template', letterTemplateName, resumeApply)) {
            return;
          }
        }

        const exported = await ensureCareerCvApplicationFile(user.id, selectedCv, templateName);
        cvFileUrl = exported.url;
        cvFileName = exported.name;
        cvFileSize = exported.size;
        candidateCvId = selectedCv.id;

        if (selectedLetterId !== 'none') {
          const selectedLetter = builderLetters.find((l) => l.id === selectedLetterId);
          if (selectedLetter) {
            candidateCoverLetterId = selectedLetter.id;
            if (!coverLetterText) {
              coverLetterText = letterPlaintextForApply(selectedLetter);
            }
            if (!selectedLetter.job_id) {
              try {
                await updateCoverLetter(selectedLetter.id, { job_id: job.id });
              } catch (linkError) {
                console.error('Failed to link cover letter to job', linkError);
              }
            }
          }
        }
      }

      const applicationRow = {
        job_id: job.id,
        user_id: user.id,
        full_name: profile?.full_name || user.email?.split('@')[0],
        email: user.email,
        phone: profile?.phone,
        years_experience: formData.yearsExperience ? parseInt(formData.yearsExperience) : null,
        cover_letter: coverLetterText || null,
        expected_salary_min: formData.expectedSalary ? parseFloat(formData.expectedSalary) : null,
        salary_negotiable: formData.salaryNegotiable,
        application_method: formData.applicationMethod,
        cv_file_url: cvFileUrl,
        cv_file_name: cvFileName,
        cv_file_size: cvFileSize,
        candidate_profile_id: profile?.id,
        candidate_cv_id: candidateCvId,
        candidate_cover_letter_id: candidateCoverLetterId,
        status: 'pending',
      };

      let { data: applicationData, error: applicationError } = await supabase
        .from('job_applications')
        .insert(applicationRow as any)
        .select()
        .single();

      if (
        applicationError &&
        (isMissingDbColumnError(applicationError, 'candidate_cv_id') ||
          isMissingDbColumnError(applicationError, 'candidate_cover_letter_id'))
      ) {
        const retry = await supabase
          .from('job_applications')
          .insert(applicationInsertWithoutDocumentFks(applicationRow) as any)
          .select()
          .single();
        applicationData = retry.data;
        applicationError = retry.error;
      }

      if (applicationError) {
        if (applicationError.code === '23505') {
          toast({
            title: "Already applied",
            description: "You have already applied to this job",
            variant: "destructive",
          });
        } else {
          throw applicationError;
        }
        return;
      }

      // Track application source
      if (applicationData?.id) {
        try {
          // Get UTM parameters from URL if available
          const urlParams = new URLSearchParams(window.location.search);
          await trackApplicationSource(applicationData.id, {
            source_type: urlParams.get('utm_source') ? 'campaign' : 'direct',
            source_name: urlParams.get('utm_source') || 'Direct Application',
            utm_source: urlParams.get('utm_source') || undefined,
            utm_medium: urlParams.get('utm_medium') || undefined,
            utm_campaign: urlParams.get('utm_campaign') || undefined,
            referrer: document.referrer || undefined,
          });
        } catch (trackError) {
          console.error("Failed to track application source:", trackError);
          // Don't fail the application if tracking fails
        }
      }

      // Send notification to employer
      try {
        // Get job owner details
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select(`
            user_id,
            title,
            company
          `)
          .eq('id', job.id)
          .single();

        if (!jobError && jobData) {
          // Create notification for employer
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: jobData.user_id,
              type: 'application_received',
              title: `New Application: ${jobData.title}`,
              message: `${profile?.full_name || user.email?.split('@')[0] || "Candidate"} has applied for ${jobData.title} at ${jobData.company}`,
              data: {
                job_title: jobData.title,
                company_name: jobData.company,
                candidate_name: profile?.full_name || user.email?.split('@')[0] || "Candidate",
                years_experience: formData.yearsExperience ? parseInt(formData.yearsExperience) : 0
              }
            });

          if (notifError) {
            console.error("Failed to create notification:", notifError);
          }
        }
      } catch (notificationError) {
        console.error("Failed to send notification:", notificationError);
        // Don't fail the application if notification fails
      }

      setIsSuccess(true);
      toast({
        title: "Application submitted!",
        description: "Your application has been sent successfully",
      });

      // Redirect to applications page after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/applications');
      }, 2000);

    } catch (error: any) {
      console.error('Application error:', error);
      toast({
        title: "Application failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if there are any external application methods
  const hasExternalMethods = !!(job?.application_url || job?.apply_link || job?.apply_email);
  const hasDirectApply = job?.direct_apply !== false; // Default to true if not explicitly false

  const jobIsExpired =
    expired ||
    (!!job?.valid_through &&
      !Number.isNaN(new Date(job.valid_through).getTime()) &&
      new Date(job.valid_through).getTime() < Date.now());

  if (jobIsExpired) {
    const closedBody = (
      <div className="space-y-3">
        <p className="text-sm font-medium text-orange-700">
          Applications are closed — this job has expired.
        </p>
        <p className="text-sm text-muted-foreground">
          Browse related opportunities below, or explore other open roles.
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push("/jobs")}
        >
          Browse Open Jobs
        </Button>
      </div>
    );

    if (embedded) return closedBody;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-[#0A66C2]">Apply for this Job</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">{closedBody}</CardContent>
      </Card>
    );
  }

  const successBody = (
    <div className="space-y-4">
      {!embedded && (
        <div className="flex items-center gap-2 text-lg font-semibold text-green-600">
          <CheckCircle className="h-6 w-6" />
          Application Submitted!
        </div>
      )}
      {embedded && (
        <div className="flex items-center gap-2 text-base font-semibold text-green-600">
          <CheckCircle className="h-5 w-5" />
          Application Submitted!
        </div>
      )}
      <p className="text-muted-foreground">
        Your application has been successfully submitted. The employer will review your application and contact you if you're a good fit.
      </p>
      <div className="flex gap-2">
        <Button
          onClick={() => router.push("/dashboard/applications")}
          className="flex-1"
        >
          View My Applications
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/jobs")}
          className="flex-1"
        >
          Browse More Jobs
        </Button>
      </div>
    </div>
  );

  // Success state
  if (isSuccess) {
    if (embedded) return successBody;
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">{successBody}</CardContent>
      </Card>
    );
  }

  const formBody = (
    <div className="space-y-4">
        {/* Direct portal application form */}
        {hasDirectApply && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-sm font-medium text-muted-foreground">Apply via Portal</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            
            <form ref={applyFormRef} onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="yearsExp">Years of experience</Label>
                <Input 
                  id="yearsExp" 
                  type="number" 
                  min={0} 
                  placeholder="e.g. 3"
                  value={formData.yearsExperience}
                  onChange={(e) => setFormData(prev => ({ ...prev, yearsExperience: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverLetter">Cover letter</Label>
                <Textarea 
                  id="coverLetter" 
                  placeholder="Write a brief cover letter..." 
                  rows={5}
                  value={formData.coverLetter}
                  onChange={(e) => setFormData(prev => ({ ...prev, coverLetter: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expectedSalary">Expected salary (NGN)</Label>
                  <Input 
                    id="expectedSalary" 
                    type="number" 
                    min={0} 
                    placeholder="e.g. 80000"
                    value={formData.expectedSalary}
                    onChange={(e) => setFormData(prev => ({ ...prev, expectedSalary: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <Checkbox 
                    id="negotiable"
                    checked={formData.salaryNegotiable}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, salaryNegotiable: checked as boolean }))}
                  />
                  <Label htmlFor="negotiable">Negotiable</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Choose how to apply</Label>
                <RadioGroup 
                  value={formData.applicationMethod}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, applicationMethod: value as ApplicationMethod }))}
                  className="grid grid-cols-1 gap-2"
                >
                  <div className="flex items-center space-x-2 border rounded-md p-3">
                    <RadioGroupItem value="profile" id="apply-profile" />
                    <Label htmlFor="apply-profile" className="cursor-pointer">Apply with my profile</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-md p-3">
                    <RadioGroupItem value="career_tools" id="apply-career-tools" />
                    <Label htmlFor="apply-career-tools" className="cursor-pointer">Apply with Career Tools CV</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-md p-3">
                    <RadioGroupItem value="cv" id="apply-cv" />
                    <Label htmlFor="apply-cv" className="cursor-pointer">Apply with uploaded CV</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.applicationMethod === 'career_tools' && (
                <div className="space-y-3 rounded-md border p-3">
                  {loadingBuilderDocs ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading your Career Tools documents…
                    </p>
                  ) : !builderSignedIn ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Sign in to choose a Career Tools CV and optional cover letter. We will generate a PDF for the employer.
                      </p>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/auth">Sign in to continue</Link>
                      </Button>
                    </div>
                  ) : builderCvs.length === 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        You do not have a Career Tools CV yet. Build one, then come back to apply with it.
                      </p>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/career-tools?jobId=${encodeURIComponent(job.id)}`}>
                          <FileText className="h-4 w-4 mr-2" />
                          Open CV builder
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Build and preview templates for free. You&apos;ll be asked to pay only when you apply with one you haven&apos;t unlocked.
                      </p>
                      <div className="space-y-2">
                        <Label>Career Tools CV</Label>
                        <Select value={selectedCvId} onValueChange={setSelectedCvId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a CV" />
                          </SelectTrigger>
                          <SelectContent>
                            {builderCvs.map((cv) => (
                              <SelectItem key={cv.id} value={cv.id}>
                                {cv.title}{cv.is_primary ? ' (Primary)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Cover letter (optional)</Label>
                        <Select
                          value={selectedLetterId}
                          onValueChange={(value) => {
                            setSelectedLetterId(value);
                            if (value === 'none') return;
                            const letter = builderLetters.find((l) => l.id === value);
                            if (letter) {
                              setFormData((prev) => ({
                                ...prev,
                                coverLetter: letterPlaintextForApply(letter),
                              }));
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="No cover letter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No saved letter — use the box above</SelectItem>
                            {builderLetters.map((letter) => (
                              <SelectItem key={letter.id} value={letter.id}>
                                {letter.title}{letter.job_id === job.id ? ' (this job)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Choosing a saved letter fills the cover letter box so you can still edit it before sending.
                        </p>
                      </div>
                      <Link href={`/dashboard/career-tools?jobId=${encodeURIComponent(job.id)}`} className="inline-flex items-center text-sm text-[#0A66C2] hover:underline">
                        <FileText className="h-4 w-4 mr-1" />
                        Edit CVs and letters
                      </Link>
                    </>
                  )}
                </div>
              )}

              {formData.applicationMethod === 'cv' && (
              <div className="space-y-2">
                <Label htmlFor="cv">Upload CV (PDF/DOC) <span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-2">
                  <Input 
                    id="cv" 
                    type="file" 
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    required={formData.applicationMethod === 'cv'}
                  />
                  {formData.cvFile && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      {formData.cvFile.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Max file size: 5MB. Accepted formats: PDF, DOC, DOCX</p>
              </div>
              )}

              <div className="pt-2">
                <Button 
                  type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90"
                  disabled={
                    isSubmitting
                    || (formData.applicationMethod === 'cv' && !formData.cvFile)
                    || (formData.applicationMethod === 'career_tools' && !selectedCvId)
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {formData.applicationMethod === 'career_tools' ? 'Preparing your CV…' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-5 w-5" />
                      Apply Now
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Note: CVs are stored securely in our database.</p>
            </form>
          </div>
        )}

        {/* External application methods */}
        {hasExternalMethods && (
          <div className="space-y-4">
            {hasDirectApply && (
              <div className="flex items-center gap-2 py-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm font-medium text-muted-foreground">Or Apply Externally</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            
            {!hasDirectApply && (
              <div className="flex items-center gap-2 pb-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm font-medium text-muted-foreground">External Application</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}

            {job?.application_url && (
              <Button 
                onClick={() => { if (typeof window !== 'undefined') window.open(job.application_url, "_blank"); }} 
                className="w-full"
                variant={hasDirectApply ? "outline" : "default"}
              >
                <ExternalLink className="mr-2 h-5 w-5" /> Apply on Company Site
              </Button>
            )}

            {job?.apply_link && (
              <Button 
                onClick={() => { if (typeof window !== 'undefined') window.open(job.apply_link, "_blank"); }} 
                className="w-full"
                variant="outline"
              >
                <ExternalLink className="mr-2 h-4 w-4" /> Apply via External Link
              </Button>
            )}

            {job?.apply_email && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => { if (typeof window !== 'undefined') window.location.href = `mailto:${job.apply_email}?subject=Application for ${job.title}`; }}
              >
                <Mail className="mr-2 h-4 w-4" /> Apply via Email
              </Button>
            )}
          </div>
        )}
    </div>
  );

  const applyChrome = (
    <>
      {formBody}
      <TemplateUnlockDialog
        checkout={checkout}
        onOpenChange={(open) => {
          if (!open) setCheckout(null);
        }}
        onSuccess={handlePaid}
      />
    </>
  );

  if (embedded) return applyChrome;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg text-[#0A66C2]">Apply for this Job</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{applyChrome}</CardContent>
    </Card>
  );
}
