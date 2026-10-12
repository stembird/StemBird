'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Download, Star, Trash2, Copy, Edit, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import CVTemplatePreview from '@/components/cv/CVTemplatePreview';
import CVTemplateSelectionDialog from '@/components/cv/CVTemplateSelectionDialog';
import CVEditor from '@/components/cv/CVEditor';
import CVDownloadDialog from '@/components/cv/CVDownloadDialog';
import JobTargetingPanel from '@/components/career-tools/JobTargetingPanel';
import CVShareControls from '@/components/career-tools/CVShareControls';
import {
  getCVTemplates,
  getUserCVs,
  createCV,
  updateCV,
  deleteCV,
  setPrimaryCV,
  type CVTemplate,
  type CandidateCV
} from '@/lib/careerTools';
import { targetingHeadline } from '@/lib/jobTargeting';
import { getTemplateDefaultContent } from '@/data/templateDefaultContent';
import { designFromTemplateData } from '@/lib/cvDesign';
import { PriceTag } from '@/components/payments/PriceTag';
import { productForTemplateName, quoteProductPrice } from '@/lib/pricing';
import { TemplateUnlockDialog, useTemplateUnlock } from '@/hooks/useTemplateUnlock';

const TEMPLATE_SECTIONS = [
  {
    title: 'Professional',
    blurb: 'For experienced professionals — work history, achievements, and leadership.',
    names: ['Classic Professional', 'Modern Professional', 'Executive Leadership'],
  },
  {
    title: 'Entry-Level / Graduate',
    blurb: 'For students and first roles — education, skills, and potential.',
    names: ['Graduate Starter CV', 'Skills-Based (Functional)', 'Internship / Industrial Attachment'],
  },
  {
    title: 'Creative & Digital',
    blurb: 'For designers, creators, and digital roles that need more visual presence.',
    names: ['Creative Portfolio', 'Digital Professional', 'Personal Brand CV'],
  },
  {
    title: 'Specialized',
    blurb: 'Built for academic, technical, and ATS-heavy applications.',
    names: ['Academic / Research CV', 'Technical / Engineering CV', 'International / ATS Optimized CV'],
  },
] as const;

export default function CVBuilder({
  initialJobId = null,
  initialCvId = null,
}: {
  initialJobId?: string | null;
  initialCvId?: string | null;
}) {
  const [cvs, setCvs] = useState<CandidateCV[]>([]);
  const [templates, setTemplates] = useState<CVTemplate[]>([]);
  const [selectedCV, setSelectedCV] = useState<CandidateCV | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<CVTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadCV, setDownloadCV] = useState<CandidateCV | null>(null);
  const [switchTemplateCV, setSwitchTemplateCV] = useState<CandidateCV | null>(null);
  const [isSwitchingTemplate, setIsSwitchingTemplate] = useState(false);
  const [loading, setLoading] = useState(true);
  const autoOpenedRef = useRef(false);
  const { toast } = useToast();
  const router = useRouter();
  const {
    products,
    offers,
    purchasedSkus,
    refreshPurchases,
    requireUnlock,
    checkout,
    setCheckout,
    handlePaid,
  } = useTemplateUnlock();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (loading || cvs.length === 0 || autoOpenedRef.current) return;
    if (initialCvId) {
      const match = cvs.find((cv) => cv.id === initialCvId);
      if (match) {
        autoOpenedRef.current = true;
        setSelectedCV(match);
        setIsEditing(true);
        return;
      }
    }
    if (initialJobId) {
      const targeted = cvs.find((cv) => cv.target_job_id === initialJobId);
      if (targeted) {
        autoOpenedRef.current = true;
        setSelectedCV(targeted);
        setIsEditing(true);
      }
    }
  }, [loading, cvs, initialCvId, initialJobId]);

  function requireAuth(actionLabel = 'use CV templates') {
    toast({
      title: 'Sign in required',
      description: `Create a free account or sign in to ${actionLabel}.`,
    });
    router.push('/auth');
  }

  async function loadData() {
    try {
      // Templates are public (RLS allows anonymous read of active templates).
      // Only the user's saved CVs require a session.
      const templatesData = await getCVTemplates();
      setTemplates(templatesData);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const cvsData = await getUserCVs(user.id);
        setCvs(cvsData);
        await refreshPurchases(user.id);
      } else {
        setCvs([]);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCV(formData: FormData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        requireAuth('create a CV');
        return;
      }

      const title = formData.get('title') as string;
      const templateId = formData.get('template_id') as string;

      const newCV = await createCV({
        user_id: user.id,
        template_id: templateId || null,
        title,
        content: {
          personal: {},
          experience: [],
          education: [],
          skills: [],
          certifications: []
        },
        is_primary: cvs.length === 0
      });

      setCvs([newCV, ...cvs]);
      setIsCreating(false);
      toast({
        title: 'Success',
        description: 'CV created successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  }

  async function handleSetPrimary(cvId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await setPrimaryCV(user.id, cvId);
      await loadData();
      toast({
        title: 'Success',
        description: 'Primary CV updated'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  }

  async function handleDeleteCV(cvId: string) {
    if (!confirm('Are you sure you want to delete this CV?')) return;

    try {
      await deleteCV(cvId);
      setCvs(cvs.filter(cv => cv.id !== cvId));
      toast({
        title: 'Success',
        description: 'CV deleted successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  }

  async function handleDuplicateCV(cv: CandidateCV) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newCV = await createCV({
        user_id: user.id,
        template_id: cv.template_id,
        title: `${cv.title} (Copy)`,
        content: cv.content,
        is_primary: false
      });

      setCvs([newCV, ...cvs]);
      toast({
        title: 'Success',
        description: 'CV duplicated successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  }

  function handleCvUpdated(updated: CandidateCV) {
    setCvs((prev) => {
      const exists = prev.some((cv) => cv.id === updated.id);
      return exists ? prev.map((cv) => (cv.id === updated.id ? updated : cv)) : [updated, ...prev];
    });
    if (selectedCV?.id === updated.id || !selectedCV) setSelectedCV(updated);
  }

  function handleEditCV(cv: CandidateCV) {
    setSelectedCV(cv);
    setIsEditing(true);
  }

  function handleEditorSave() {
    setIsEditing(false);
    setSelectedCV(null);
    loadData();
  }

  function handleEditorCancel() {
    setIsEditing(false);
    setSelectedCV(null);
  }

  function handleDownload(cv: CandidateCV) {
    const templateName = getTemplateName(cv.template_id);
    if (requireUnlock('cv_template', templateName, () => handleDownload(cv))) return;
    setDownloadCV(cv);
    setIsDownloading(true);
  }

  function handleSwitchTemplateClick(cv: CandidateCV) {
    setSwitchTemplateCV(cv);
    setIsSwitchingTemplate(true);
  }

  async function handleSwitchTemplate(newTemplateId: string) {
    if (!switchTemplateCV) return;
    try {
      const updated = await updateCV(switchTemplateCV.id, { template_id: newTemplateId });
      setCvs(cvs.map(c => c.id === updated.id ? updated : c));
      // If this CV is currently open in the editor, refresh it
      if (selectedCV?.id === updated.id) setSelectedCV(updated);
      setIsSwitchingTemplate(false);
      setSwitchTemplateCV(null);
      toast({ title: 'Template switched', description: 'Your content is unchanged — only the design changed.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }

  function handleTemplateClick(template: CVTemplate) {
    setSelectedTemplate(template);
    setShowTemplateDialog(true);
  }

  async function handleCreateNewCV(cvName: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!selectedTemplate) return;
      if (!user) {
        setShowTemplateDialog(false);
        requireAuth('use this template');
        return;
      }

      const newCV = await createCV({
        user_id: user.id,
        template_id: selectedTemplate.id,
        title: cvName,
        content: {
          ...getTemplateDefaultContent(selectedTemplate.name),
          design: designFromTemplateData(selectedTemplate.template_data, selectedTemplate.name),
        },
        is_primary: cvs.length === 0
      });

      setCvs([newCV, ...cvs]);
      setSelectedCV(newCV);
      setIsEditing(true);
      
      toast({
        title: 'Success',
        description: 'CV created successfully. You can now edit it.'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  }

  async function handleUploadExistingCV(cvName: string, parsedData: any) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!selectedTemplate) return;
      if (!user) {
        setShowTemplateDialog(false);
        requireAuth('upload a CV');
        return;
      }

      // Map parsed data to CV content structure
      const cvContent = {
        personal: {
          name: parsedData.basicInfo?.full_name || '',
          title: parsedData.professional?.current_title || '',
          phone: parsedData.basicInfo?.phone || '',
          email: '', // Not typically in CV
          linkedin: parsedData.basicInfo?.linkedin_url || '',
          location: parsedData.basicInfo?.location || '',
          profile: parsedData.basicInfo?.bio || ''
        },
        experience: parsedData.workExperience?.map((exp: any) => ({
          jobTitle: exp.job_title,
          company: exp.company_name,
          location: exp.location || '',
          dates: `${exp.start_date} – ${exp.end_date || 'Present'}`,
          details: exp.achievements || [exp.description || '']
        })) || [],
        education: parsedData.education?.map((edu: any) => ({
          degree: `${edu.degree_type} in ${edu.field_of_study}`,
          institution: edu.institution_name,
          dates: `${edu.start_date} – ${edu.end_date || 'Present'}`
        })) || [],
        skills: parsedData.skills?.map((skill: any) => skill.skill_name) || [],
        certifications: [],
        achievements: [],
        languages: [],
        tools: [],
        design: designFromTemplateData(selectedTemplate.template_data, selectedTemplate.name),
      };

      const newCV = await createCV({
        user_id: user.id,
        template_id: selectedTemplate.id,
        title: cvName,
        content: cvContent,
        is_primary: cvs.length === 0
      });

      setCvs([newCV, ...cvs]);
      setSelectedCV(newCV);
      setIsEditing(true);
      
      toast({
        title: 'Success',
        description: 'CV imported and mapped to template. You can now edit it.'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  }

  function getTemplateName(templateId: string | null): string {
    if (!templateId) return 'Classic Professional';
    const template = templates.find(t => t.id === templateId);
    return template?.name || 'Classic Professional';
  }

  function renderTemplateCard(template: CVTemplate) {
    return (
      <button
        key={template.id}
        type="button"
        onClick={() => handleTemplateClick(template)}
        className="group w-full text-left rounded-xl border border-border/80 bg-background p-3 sm:p-4 transition-all hover:border-[#0A66C2]/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2]/40"
      >
        <div className="relative overflow-hidden rounded-lg">
          <CVTemplatePreview templateName={template.name} showDescription={false} />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#0A66C2]/0 opacity-0 transition-all group-hover:bg-[#0A66C2]/25 group-hover:opacity-100">
            <span className="rounded-md bg-[#0A66C2] px-4 py-2 text-sm font-semibold text-white shadow-sm">
              Use template
            </span>
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-[#0A66C2] sm:text-base">{template.name}</h4>
            {template.is_premium && (
              <Badge variant="secondary" className="shrink-0 text-[10px]">Premium</Badge>
            )}
          </div>
          <CVTemplatePreview templateName={template.name} showDescription={true} descriptionOnly={true} />
          {(() => {
            const product = productForTemplateName('cv_template', template.name, products);
            const quote = product ? quoteProductPrice(product, offers) : null;
            if (!quote) return null;
            return (
              <PriceTag
                amount={quote.amount}
                compareAt={quote.compareAtPrice}
                badge={purchasedSkus.has(product!.sku) ? 'Purchased' : quote.offer?.badge_text || 'Pay to download'}
                className="items-start"
              />
            );
          })()}
          <span className="inline-flex text-sm font-medium text-[#0A66C2] sm:hidden">
            Tap to use →
          </span>
        </div>
      </button>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-4 w-72 max-w-full rounded bg-muted" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-[3/4] rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-[#0A66C2] sm:text-2xl">
          CV Templates
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          ATS-friendly designs for the Kenyan job market. Build and preview for free — pay when you download, share, or apply.
        </p>
      </div>

      <JobTargetingPanel
        cvs={cvs}
        activeCv={isEditing ? selectedCV : null}
        initialJobId={initialJobId}
        onCvUpdated={handleCvUpdated}
        onOpenCv={handleEditCV}
      />

      {cvs.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">My CVs</h3>
              <p className="text-xs text-muted-foreground">
                {cvs.length} saved {cvs.length === 1 ? 'version' : 'versions'}
              </p>
            </div>
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  New CV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New CV</DialogTitle>
                  <DialogDescription>
                    Choose a template and give your CV a descriptive name
                  </DialogDescription>
                </DialogHeader>
                <form action={handleCreateCV} className="space-y-4">
                  <div>
                    <Label htmlFor="title">CV Title</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="e.g., Software Engineer CV"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="template_id">Template</Label>
                    <Select name="template_id">
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                            {template.is_premium && (
                              <Badge variant="secondary" className="ml-2">Premium</Badge>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create CV</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cvs.map(cv => (
              <Card key={cv.id} className="relative shadow-none">
                {cv.is_primary && (
                  <Badge className="absolute top-2 right-2" variant="default">
                    <Star className="h-3 w-3 mr-1" />
                    Primary
                  </Badge>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-base pr-16">{cv.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {getTemplateName(cv.template_id)} · Updated {new Date(cv.updated_at).toLocaleDateString()}
                  </CardDescription>
                  {(cv.target_job_id || cv.target_jd_text) && (
                    <Badge variant="outline" className="mt-2 w-fit border-[#0A66C2]/30 text-[#0A66C2]">
                      Targeted: {targetingHeadline(cv.target_jd_text) || 'this job'}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEditCV(cv)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDownload(cv)}>
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleSwitchTemplateClick(cv)}>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Template
                    </Button>
                    {!cv.is_primary && (
                      <Button size="sm" variant="outline" onClick={() => handleSetPrimary(cv.id)}>
                        <Star className="h-4 w-4 mr-1" />
                        Primary
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleDuplicateCV(cv)}>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                    <CVShareControls
                      cv={cv}
                      onUpdated={handleCvUpdated}
                      onBeforeShare={(proceed) => {
                        const templateName = getTemplateName(cv.template_id);
                        return !requireUnlock('cv_template', templateName, proceed);
                      }}
                    />
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteCV(cv.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-10">
        {TEMPLATE_SECTIONS.map((section) => {
          const sectionTemplates = templates.filter((t) =>
            (section.names as readonly string[]).includes(t.name)
          );
          if (sectionTemplates.length === 0) return null;
          return (
            <section key={section.title} className="space-y-4">
              <div className="border-b border-border/60 pb-3">
                <h3 className="text-base font-semibold text-[#0A66C2] sm:text-lg">{section.title}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground max-w-2xl">{section.blurb}</p>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {sectionTemplates.map(renderTemplateCard)}
              </div>
            </section>
          );
        })}

        {templates.length === 0 && (
          <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Templates unavailable right now</p>
            <p className="mt-1 text-sm text-muted-foreground">Please refresh and try again.</p>
          </div>
        )}
      </div>

      {cvs.length === 0 && templates.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Your saved CVs will show up here once you pick a template above.
        </p>
      )}

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Edit CV: {selectedCV?.title}</DialogTitle>
            <DialogDescription>
              Add, remove, or edit your CV sections. The live preview on the right shows exactly how your download will look.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col">
            {selectedCV && (
              <>
                <div className="px-6 pb-3 max-h-[34%] overflow-y-auto">
                  <JobTargetingPanel
                    cvs={cvs}
                    activeCv={selectedCV}
                    initialJobId={initialJobId || selectedCV.target_job_id}
                    onCvUpdated={handleCvUpdated}
                  />
                </div>
                <div className="flex-1 overflow-hidden">
                  <CVEditor
                    cv={selectedCV}
                    templateName={getTemplateName(selectedCV.template_id)}
                    templateData={templates.find((template) => template.id === selectedCV.template_id)?.template_data}
                    jdText={selectedCV.target_jd_text}
                    onSave={handleEditorSave}
                    onCancel={handleEditorCancel}
                  />
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* CV Download Dialog */}
      {downloadCV && (
        <CVDownloadDialog
          open={isDownloading}
          onOpenChange={setIsDownloading}
          cv={downloadCV}
          templateName={getTemplateName(downloadCV.template_id)}
        />
      )}

      {/* CV Template Selection Dialog */}
      {selectedTemplate && (
        <CVTemplateSelectionDialog
          open={showTemplateDialog}
          onOpenChange={setShowTemplateDialog}
          templateId={selectedTemplate.id}
          templateName={selectedTemplate.name}
          onCreateNew={handleCreateNewCV}
          onUploadExisting={handleUploadExistingCV}
        />
      )}

      {/* Switch Template Dialog */}
      <Dialog open={isSwitchingTemplate} onOpenChange={setIsSwitchingTemplate}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Switch Template</DialogTitle>
            <DialogDescription>
              Choose a new design for <span className="font-medium">{switchTemplateCV?.title}</span>. Your content stays exactly the same — only the look changes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4 max-h-[60vh] overflow-y-auto">
            {templates.map(template => {
              const isCurrent = template.id === switchTemplateCV?.template_id;
              return (
                <button
                  key={template.id}
                  onClick={() => handleSwitchTemplate(template.id)}
                  disabled={isCurrent}
                  className={`text-left rounded-lg border-2 p-3 transition-all hover:border-primary hover:shadow-md ${
                    isCurrent ? 'border-primary bg-primary/5 opacity-60 cursor-default' : 'border-border'
                  }`}
                >
                  <div className="text-sm font-medium">{template.name}</div>
                  {isCurrent && <div className="text-xs text-primary mt-0.5">Current template</div>}
                  {template.is_premium && <Badge variant="secondary" className="mt-1 text-xs">Premium</Badge>}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <TemplateUnlockDialog
        checkout={checkout}
        onOpenChange={(open) => {
          if (!open) setCheckout(null);
        }}
        onSuccess={handlePaid}
      />
    </div>
  );
}
