'use client';

import { useState, useEffect, createElement } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Copy, Trash2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import CoverLetterTemplatePreview from '@/components/cover-letter/CoverLetterTemplatePreview';
import {
  coverLetterTemplatesByCategory,
  emptyCoverLetterFields,
  getCoverLetterTemplateConfig,
  type CoverLetterTemplateConfig,
} from '@/data/coverLetterTemplates';
import SuggestFieldButton from '@/components/career-tools/SuggestFieldButton';
import {
  getCoverLetterTemplates,
  getUserCVs,
  getUserCoverLetters,
  createCoverLetter,
  updateCoverLetter,
  deleteCoverLetter,
  type CandidateCV,
  type CoverLetterTemplate,
  type CandidateCoverLetter,
} from '@/lib/careerTools';
import type { SuggestUsage } from '@/lib/careerSuggest';
import { fetchSuggestUsage } from '@/lib/requestCareerSuggest';
import {
  coverLetterPlaintext,
  hydrateCoverLetter,
  toCoverLetterContentJson,
} from '@/lib/coverLetterContent';
import CoverLetterDownloadDialog from '@/components/cover-letter/CoverLetterDownloadDialog';
import { buildCoverLetterWordBlob, letterPlaintextForApply } from '@/lib/coverLetterExport';
import { downloadBlob, wordFilename } from '@/lib/downloadBlob';
import { downloadReactElementAsPdf, pdfFilename } from '@/lib/documentPdf';
import { PriceTag } from '@/components/payments/PriceTag';
import { productForTemplateName, quoteProductPrice } from '@/lib/pricing';
import { TemplateUnlockDialog, useTemplateUnlock } from '@/hooks/useTemplateUnlock';

function templateNameForLetter(
  letter: CandidateCoverLetter,
  dbTemplates: CoverLetterTemplate[],
): string {
  if (letter.content_json?.templateName) return letter.content_json.templateName;
  const matched = dbTemplates.find((t) => t.id === letter.template_id);
  return matched?.name || 'Classic Professional Cover Letter';
}

function hydrateWithDefaults(
  letter: CandidateCoverLetter,
  dbTemplates: CoverLetterTemplate[],
): { templateName: string; fields: Record<string, string> } {
  const templateName = templateNameForLetter(letter, dbTemplates);
  const hydrated = hydrateCoverLetter(letter, templateName);
  return {
    templateName: hydrated.templateName,
    fields: { ...emptyCoverLetterFields(hydrated.templateName), ...hydrated.fields },
  };
}

export default function CoverLetterGenerator({
  initialJobId = null,
}: {
  initialJobId?: string | null;
}) {
  const [letters, setLetters] = useState<CandidateCoverLetter[]>([]);
  const [dbTemplates, setDbTemplates] = useState<CoverLetterTemplate[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [letterTitle, setLetterTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [downloadLetter, setDownloadLetter] = useState<CandidateCoverLetter | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTemplateName, setActiveTemplateName] = useState('Classic Professional Cover Letter');
  const [formData, setFormData] = useState<Record<string, string>>(() =>
    emptyCoverLetterFields('Classic Professional Cover Letter'),
  );
  const [sourceCv, setSourceCv] = useState<CandidateCV | null>(null);
  const [usage, setUsage] = useState<SuggestUsage | null>(null);
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
    fetchSuggestUsage()
      .then((result) => {
        if (result.usage) setUsage(result.usage);
      })
      .catch(() => undefined);
  }, []);

  async function loadData() {
    try {
      const templatesData = await getCoverLetterTemplates();
      setDbTemplates(templatesData ?? []);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [lettersData, cvsData] = await Promise.all([
          getUserCoverLetters(user.id),
          getUserCVs(user.id).catch(() => [] as CandidateCV[]),
        ]);
        setLetters(lettersData ?? []);
        setSourceCv(cvsData.find((cv) => cv.is_primary) || cvsData[0] || null);
        await refreshPurchases(user.id);
      } else {
        setLetters([]);
        setSourceCv(null);
      }
    } catch (error: any) {
      toast({ title: 'Error loading data', description: error.message, variant: 'destructive' });
    }
  }

  function openEditor(templateName: string) {
    const config = getCoverLetterTemplateConfig(templateName);
    if (!config) return;
    setEditingId(null);
    setActiveTemplateName(templateName);
    setFormData({ ...(config.defaultData as Record<string, string>) });
    setLetterTitle('');
    setShowEditor(true);
  }

  function openSavedLetter(letter: CandidateCoverLetter) {
    const hydrated = hydrateWithDefaults(letter, dbTemplates);
    setEditingId(letter.id);
    setActiveTemplateName(hydrated.templateName);
    setFormData(hydrated.fields);
    setLetterTitle(letter.title);
    setShowEditor(true);
  }

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  const activeConfig = getCoverLetterTemplateConfig(activeTemplateName);

  async function persistLetter() {
    if (!letterTitle.trim()) {
      toast({ title: 'Name required', description: 'Give your cover letter a name.', variant: 'destructive' });
      return;
    }
    if (!activeConfig) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Sign in required',
          description: 'Create a free account or sign in to save cover letters.',
        });
        router.push('/auth');
        return;
      }

      const matchedTpl = dbTemplates.find((t) => t.name === activeTemplateName);
      const content = coverLetterPlaintext(formData, activeTemplateName);
      const content_json = toCoverLetterContentJson(activeTemplateName, formData);

      if (editingId) {
        const existing = letters.find((letter) => letter.id === editingId);
        const updated = await updateCoverLetter(editingId, {
          template_id: matchedTpl?.id ?? null,
          title: letterTitle,
          content,
          content_json,
          ...(initialJobId && !existing?.job_id ? { job_id: initialJobId } : {}),
        });
        setLetters((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
        toast({ title: 'Cover letter updated' });
      } else {
        const created = await createCoverLetter({
          user_id: user.id,
          template_id: matchedTpl?.id ?? null,
          title: letterTitle,
          content,
          content_json,
          job_id: initialJobId || null,
        });
        setLetters((prev) => [created, ...prev]);
        toast({ title: 'Cover letter saved' });
      }
      setShowEditor(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this cover letter?')) return;
    try {
      await deleteCoverLetter(id);
      setLetters(letters.filter((l) => l.id !== id));
      toast({ title: 'Deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }

  function copyToClipboard(letter: CandidateCoverLetter) {
    const templateName = templateNameForLetter(letter, dbTemplates);
    if (requireUnlock('cover_letter_template', templateName, () => copyToClipboard(letter))) return;
    navigator.clipboard.writeText(letterPlaintextForApply(letter, templateName));
    toast({ title: 'Copied to clipboard' });
  }

  function requestLetterDownload(letter: CandidateCoverLetter) {
    const templateName = templateNameForLetter(letter, dbTemplates);
    if (requireUnlock('cover_letter_template', templateName, () => requestLetterDownload(letter))) return;
    setDownloadLetter(letter);
  }

  async function downloadEditorPdf() {
    if (!activeConfig) return;
    if (requireUnlock('cover_letter_template', activeTemplateName, () => { void downloadEditorPdf(); })) return;
    try {
      await downloadReactElementAsPdf({
        element: createElement(activeConfig.component, { data: formData }),
        filename: pdfFilename(letterTitle || activeTemplateName),
      });
      toast({ title: 'Ready', description: 'Cover letter saved as a formatted A4 PDF.' });
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.message || 'Could not generate PDF',
        variant: 'destructive',
      });
    }
  }

  async function downloadEditorWord() {
    if (requireUnlock('cover_letter_template', activeTemplateName, () => { void downloadEditorWord(); })) return;
    try {
      const blob = await buildCoverLetterWordBlob(formData, activeTemplateName);
      await downloadBlob(blob, wordFilename(letterTitle || activeTemplateName));
      toast({ title: 'Ready', description: 'Cover letter saved as an editable Word document.' });
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.message || 'Could not generate Word file',
        variant: 'destructive',
      });
    }
  }

  function renderTemplateGrid(templates: CoverLetterTemplateConfig[]) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((tpl) => (
          <button
            key={tpl.name}
            type="button"
            onClick={() => openEditor(tpl.name)}
            className="group w-full text-left rounded-xl border border-border/80 bg-background p-3 sm:p-4 transition-all hover:border-[#0A66C2]/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A66C2]/40"
          >
            <div className="relative overflow-hidden rounded-lg">
              <CoverLetterTemplatePreview templateName={tpl.name} showDescription={false} />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#0A66C2]/0 opacity-0 transition-all group-hover:bg-[#0A66C2]/25 group-hover:opacity-100">
                <span className="rounded-md bg-[#0A66C2] px-4 py-2 text-sm font-semibold text-white shadow-sm">
                  Use template
                </span>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <h4 className="text-sm font-semibold text-[#0A66C2] sm:text-base">{tpl.name}</h4>
              <CoverLetterTemplatePreview templateName={tpl.name} showDescription={true} descriptionOnly={true} />
              <div className="flex flex-wrap gap-1">
                {tpl.bestFor.slice(0, 3).map((b) => (
                  <Badge key={b} variant="outline" className="text-[10px] font-normal">{b}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{tpl.why}</p>
              {(() => {
                const product = productForTemplateName('cover_letter_template', tpl.name, products);
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
        ))}
      </div>
    );
  }

  const ActiveLetter = activeConfig?.component;
  const downloadHydrated = downloadLetter ? hydrateWithDefaults(downloadLetter, dbTemplates) : null;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-[#0A66C2] sm:text-2xl">
          Cover Letter Templates
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Structured letters for Kenyan applications. Build and preview for free — pay when you download or copy the finished letter.
        </p>
        {initialJobId && (
          <p className="text-xs text-[#0A66C2]">
            New letters saved in this session are linked to the job you opened Career Tools from.
          </p>
        )}
      </div>

      {letters.length > 0 && (
        <section className="space-y-3">
          <div>
            <h3 className="text-base font-semibold">My Cover Letters</h3>
            <p className="text-xs text-muted-foreground">
              {letters.length} saved {letters.length === 1 ? 'letter' : 'letters'}
            </p>
          </div>
          <div className="space-y-3">
            {letters.map((letter) => (
              <Card key={letter.id} className="shadow-none">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{letter.title}</CardTitle>
                      <CardDescription className="text-xs">
                        {templateNameForLetter(letter, dbTemplates)} · {new Date(letter.created_at).toLocaleDateString()}
                      </CardDescription>
                      {letter.job_id && (
                        <Badge variant="outline" className="mt-1 w-fit border-[#0A66C2]/30 text-[#0A66C2]">
                          Linked to a job
                        </Badge>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => openSavedLetter(letter)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(letter)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => requestLetterDownload(letter)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(letter.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground line-clamp-3">
                    {letter.content.substring(0, 300)}{letter.content.length > 300 && '...'}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-10">
        <section className="space-y-4">
          <div className="border-b border-border/60 pb-3">
            <h3 className="text-base font-semibold text-[#0A66C2] sm:text-lg">Professional</h3>
            <p className="mt-0.5 text-sm text-muted-foreground max-w-2xl">
              Corporate, government, NGO, banking, and private-sector applications.
            </p>
          </div>
          {renderTemplateGrid(coverLetterTemplatesByCategory('professional'))}
        </section>

        <section className="space-y-4">
          <div className="border-b border-border/60 pb-3">
            <h3 className="text-base font-semibold text-[#0A66C2] sm:text-lg">Entry-Level</h3>
            <p className="mt-0.5 text-sm text-muted-foreground max-w-2xl">
              For graduates, students, and people with skills but little formal experience.
            </p>
          </div>
          {renderTemplateGrid(coverLetterTemplatesByCategory('entry-level'))}
        </section>
      </div>

      {letters.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Your saved letters will show up here once you pick a template above.
        </p>
      )}

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle>{activeTemplateName}</DialogTitle>
            <DialogDescription>
              Edit your details on the left — the preview updates live on the right.
              {usage ? ` AI ${usage.used}/${usage.limit} today.` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-1 overflow-hidden">
            <div className="w-[340px] flex-shrink-0 border-r overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <Label htmlFor="letter-title" className="text-sm font-semibold">Cover Letter Name</Label>
                <Input
                  id="letter-title"
                  className="mt-1"
                  placeholder="e.g. Application for Finance Manager — KCB"
                  value={letterTitle}
                  onChange={(e) => setLetterTitle(e.target.value)}
                />
              </div>
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Details</p>
                {activeConfig && Object.keys(activeConfig.schema).map((key) => {
                  const field = activeConfig.schema[key];
                  const val = formData[key] ?? '';
                  return (
                    <div key={key} className="mb-3">
                      <Label htmlFor={`letter-${key}`} className="text-sm">{field.label}</Label>
                      {field.type === 'textarea' ? (
                        <>
                          <div className="mt-1 mb-1">
                            <SuggestFieldButton
                              kind="letter_paragraph"
                              label="Rewrite"
                              request={{
                                cv: sourceCv?.content,
                                jdText: sourceCv?.target_jd_text,
                                letterField: key,
                                letterFields: formData,
                                currentText: val,
                              }}
                              onUsage={setUsage}
                              onPick={(text) => updateField(key, text)}
                            />
                          </div>
                          <Textarea
                            id={`letter-${key}`}
                            className="mt-1 text-sm"
                            rows={4}
                            placeholder={field.placeholder}
                            value={val}
                            onChange={(e) => updateField(key, e.target.value)}
                          />
                          {field.hint && <p className="text-xs text-muted-foreground mt-1">{field.hint}</p>}
                        </>
                      ) : (
                        <Input
                          id={`letter-${key}`}
                          className="mt-1 text-sm"
                          placeholder={field.placeholder}
                          value={val}
                          onChange={(e) => updateField(key, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col gap-2 pt-2 pb-4">
                <Button variant="outline" onClick={() => { void downloadEditorPdf(); }}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={() => { void downloadEditorWord(); }}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Word
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowEditor(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={persistLetter} disabled={saving}>
                    {saving ? 'Saving...' : editingId ? 'Update Letter' : 'Save Letter'}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 flex items-start justify-center p-6">
              <div style={{ transform: 'scale(0.75)', transformOrigin: 'top center' }}>
                {ActiveLetter && <ActiveLetter data={formData} />}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {downloadLetter && downloadHydrated && (
        <CoverLetterDownloadDialog
          open
          onOpenChange={(open) => {
            if (!open) setDownloadLetter(null);
          }}
          title={downloadLetter.title}
          templateName={downloadHydrated.templateName}
          fields={downloadHydrated.fields}
          config={getCoverLetterTemplateConfig(downloadHydrated.templateName)}
        />
      )}
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
