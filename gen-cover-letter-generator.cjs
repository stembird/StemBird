const fs = require('fs');
const path = require('path');

const content = `'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, Download, Copy, Trash2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import CoverLetterTemplatePreview from '@/components/cover-letter/CoverLetterTemplatePreview';
import ClassicProfessionalLetter, { ClassicLetterData } from '@/components/cover-letter/templates/ClassicProfessionalLetter';
import { classicLetterPreviewData } from '@/data/classicLetterPreviewData';
import { classicLetterSchema } from '@/schemas/classicLetterSchema';
import ModernProfessionalLetter, { ModernLetterData } from '@/components/cover-letter/templates/ModernProfessionalLetter';
import { modernLetterPreviewData } from '@/data/modernLetterPreviewData';
import { modernLetterSchema } from '@/schemas/modernLetterSchema';
import ShortDirectLetter, { ShortDirectLetterData } from '@/components/cover-letter/templates/ShortDirectLetter';
import { shortLetterPreviewData } from '@/data/shortLetterPreviewData';
import { shortLetterSchema } from '@/schemas/shortLetterSchema';
import GraduateLetter, { GraduateLetterData } from '@/components/cover-letter/templates/GraduateLetter';
import { graduateLetterPreviewData } from '@/data/graduateLetterPreviewData';
import { graduateLetterSchema } from '@/schemas/graduateLetterSchema';
import InternshipLetter, { InternshipLetterData } from '@/components/cover-letter/templates/InternshipLetter';
import { internshipLetterPreviewData } from '@/data/internshipLetterPreviewData';
import { internshipLetterSchema } from '@/schemas/internshipLetterSchema';
import {
  getCoverLetterTemplates,
  getUserCoverLetters,
  createCoverLetter,
  type CoverLetterTemplate,
} from '@/lib/careerTools';

type ActiveTemplate = 'classic' | 'modern' | 'short' | 'graduate' | 'internship';

const PROFESSIONAL_TEMPLATES = [
  {
    name: 'Classic Professional Cover Letter',
    key: 'classic' as ActiveTemplate,
    available: true,
    bestFor: ['Government jobs', 'NGOs', 'Banking', 'Corporate roles', 'Administrative positions'],
    why: 'Safest option — works everywhere',
  },
  {
    name: 'Modern Professional Cover Letter',
    key: 'modern' as ActiveTemplate,
    available: true,
    bestFor: ['Private sector jobs', 'Marketing roles', 'Business roles', 'Mid-level professionals'],
    why: 'Feels current without being risky',
  },
  {
    name: 'Short & Direct Cover Letter',
    key: 'short' as ActiveTemplate,
    available: true,
    bestFor: ['Startups', 'Tech companies', 'Busy recruiters', 'Online applications'],
    why: 'Matches modern hiring behavior',
  },
];

const ENTRY_LEVEL_TEMPLATES = [
  {
    name: 'Graduate / Entry-Level Cover Letter',
    key: 'graduate' as ActiveTemplate,
    available: true,
    bestFor: ['Fresh graduates', 'First-time job seekers', 'Graduate trainee programmes'],
    why: "Solves \\"I don't have experience\\" problem",
  },
  {
    name: 'Internship / Attachment Cover Letter',
    key: 'internship' as ActiveTemplate,
    available: true,
    bestFor: ['University students', 'TVET students', 'Industrial attachment'],
    why: 'Very relevant in Kenya — huge volume use case',
  },
];

export default function CoverLetterGenerator() {
  const [letters, setLetters] = useState<any[]>([]);
  const [dbTemplates, setDbTemplates] = useState<CoverLetterTemplate[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [letterTitle, setLetterTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState<ActiveTemplate>('classic');

  const [classicFormData, setClassicFormData] = useState<ClassicLetterData>({ ...classicLetterPreviewData });
  const [modernFormData, setModernFormData] = useState<ModernLetterData>({ ...modernLetterPreviewData });
  const [shortFormData, setShortFormData] = useState<ShortDirectLetterData>({ ...shortLetterPreviewData });
  const [graduateFormData, setGraduateFormData] = useState<GraduateLetterData>({ ...graduateLetterPreviewData });
  const [internshipFormData, setInternshipFormData] = useState<InternshipLetterData>({ ...internshipLetterPreviewData });

  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [lettersData, templatesData] = await Promise.all([
        getUserCoverLetters(user.id),
        getCoverLetterTemplates(),
      ]);
      setLetters(lettersData ?? []);
      setDbTemplates(templatesData ?? []);
    } catch (error: any) {
      toast({ title: 'Error loading data', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  function openEditor(key: ActiveTemplate) {
    setActiveTemplate(key);
    setLetterTitle('');
    setShowEditor(true);
  }

  function updateField(key: ActiveTemplate, field: string, value: string) {
    if (key === 'classic') setClassicFormData(prev => ({ ...prev, [field]: value }));
    else if (key === 'modern') setModernFormData(prev => ({ ...prev, [field]: value }));
    else if (key === 'short') setShortFormData(prev => ({ ...prev, [field]: value }));
    else if (key === 'graduate') setGraduateFormData(prev => ({ ...prev, [field]: value }));
    else if (key === 'internship') setInternshipFormData(prev => ({ ...prev, [field]: value }));
  }

  function getActiveSchema() {
    if (activeTemplate === 'modern') return modernLetterSchema;
    if (activeTemplate === 'short') return shortLetterSchema;
    if (activeTemplate === 'graduate') return graduateLetterSchema;
    if (activeTemplate === 'internship') return internshipLetterSchema;
    return classicLetterSchema;
  }

  function getActiveFormData(): Record<string, string> {
    if (activeTemplate === 'modern') return modernFormData as unknown as Record<string, string>;
    if (activeTemplate === 'short') return shortFormData as unknown as Record<string, string>;
    if (activeTemplate === 'graduate') return graduateFormData as unknown as Record<string, string>;
    if (activeTemplate === 'internship') return internshipFormData as unknown as Record<string, string>;
    return classicFormData as unknown as Record<string, string>;
  }

  function getActiveTemplateName(): string {
    if (activeTemplate === 'modern') return 'Modern Professional Cover Letter';
    if (activeTemplate === 'short') return 'Short & Direct Cover Letter';
    if (activeTemplate === 'graduate') return 'Graduate / Entry-Level Cover Letter';
    if (activeTemplate === 'internship') return 'Internship / Attachment Cover Letter';
    return 'Classic Professional Cover Letter';
  }

  async function handleSave() {
    if (!letterTitle.trim()) {
      toast({ title: 'Name required', description: 'Give your cover letter a name.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const d = getActiveFormData();
      const tplName = getActiveTemplateName();
      const matchedTpl = dbTemplates.find(t => t.name === tplName);
      const closing = activeTemplate === 'internship' ? 'Yours faithfully,' : activeTemplate === 'graduate' ? 'Yours sincerely,' : activeTemplate === 'short' ? 'Best regards,' : 'Sincerely,';
      const content = [
        d.name, d.phone, d.email, d.location,
        ...(d.institution ? [d.institution] : []),
        ...(d.course ? [d.course] : []),
        '',
        d.date, '',
        d.hiringManager, d.company, d.companyAddress, '',
        \`Dear \${d.hiringManager || 'Hiring Manager'},\`, '',
        d.paragraph1, '', d.paragraph2, '', d.paragraph3, '',
        closing, d.name,
      ].join('\\n');
      const newLetter = await createCoverLetter({
        user_id: user.id,
        template_id: matchedTpl?.id ?? null,
        title: letterTitle,
        content,
        job_id: null,
      });
      setLetters([newLetter, ...letters]);
      setShowEditor(false);
      toast({ title: 'Cover letter saved' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this cover letter?')) return;
    try {
      await supabase.from('candidate_cover_letters' as any).delete().eq('id', id);
      setLetters(letters.filter(l => l.id !== id));
      toast({ title: 'Deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }

  function copyToClipboard(content: string) {
    navigator.clipboard.writeText(content);
    toast({ title: 'Copied to clipboard' });
  }

  function renderTemplateGrid(templates: typeof PROFESSIONAL_TEMPLATES) {
    return (
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
        {templates.map(tpl => (
          tpl.available ? (
            <Card
              key={tpl.name}
              className="cursor-pointer hover:border-primary hover:shadow-lg transition-all transform hover:scale-105 group relative"
              onClick={() => openEditor(tpl.key)}
            >
              <CardHeader className="p-4">
                <div className="relative">
                  <CoverLetterTemplatePreview templateName={tpl.name} showDescription={false} />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded pointer-events-none">
                    <div className="bg-orange-500 text-white px-6 py-3 rounded-full font-semibold text-sm shadow-lg">
                      Use This Template
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <CardTitle className="text-base text-[#0A66C2]">{tpl.name}</CardTitle>
                  <CoverLetterTemplatePreview templateName={tpl.name} showDescription={true} descriptionOnly={true} />
                  <div className="pt-1">
                    <p className="text-xs font-medium text-gray-500 mb-1">Best for:</p>
                    <div className="flex flex-wrap gap-1">
                      {tpl.bestFor.map(b => <Badge key={b} variant="outline" className="text-xs">{b}</Badge>)}
                    </div>
                  </div>
                  <p className="text-xs text-green-700 font-medium">👉 {tpl.why}</p>
                </div>
              </CardHeader>
            </Card>
          ) : (
            <Card key={tpl.name} className="relative opacity-75">
              <CardHeader className="p-4">
                <div className="w-full aspect-[3/4] bg-gray-50 border border-dashed border-gray-300 rounded flex flex-col items-center justify-center gap-2">
                  <Clock className="h-8 w-8 text-gray-300" />
                  <span className="text-xs text-gray-400 font-medium">Coming Soon</span>
                </div>
                <div className="mt-4 space-y-2">
                  <CardTitle className="text-base text-gray-400">{tpl.name}</CardTitle>
                  <CoverLetterTemplatePreview templateName={tpl.name} showDescription={true} descriptionOnly={true} />
                  <div className="pt-1">
                    <p className="text-xs font-medium text-gray-400 mb-1">Best for:</p>
                    <div className="flex flex-wrap gap-1">
                      {tpl.bestFor.map(b => <Badge key={b} variant="outline" className="text-xs text-gray-400">{b}</Badge>)}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">👉 {tpl.why}</p>
                </div>
              </CardHeader>
            </Card>
          )
        ))}
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Cover Letters</CardTitle>
          <CardDescription>Your saved cover letters — ready to copy or download.</CardDescription>
        </CardHeader>
        <CardContent>
          {letters.length === 0 ? (
            <div className="text-center py-10">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No cover letters yet</h3>
              <p className="text-muted-foreground text-sm">Pick a template below to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {letters.map(letter => (
                <Card key={letter.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{letter.title}</CardTitle>
                        <CardDescription>{new Date(letter.created_at).toLocaleDateString()}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => copyToClipboard(letter.content)}><Copy className="h-4 w-4" /></Button>
                        <Button size="sm" variant="outline"><Download className="h-4 w-4" /></Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(letter.id)}><Trash2 className="h-4 w-4" /></Button>
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
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-[#0A66C2]">Cover Letter Templates</CardTitle>
          <CardDescription className="text-base mt-2 max-w-3xl mx-auto">
            Choose from professionally designed templates tailored for the Kenyan job market.
            Each template is structured to help you make a strong first impression.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-12">
          <div>
            <div className="mb-6 text-center">
              <h3 className="text-xl font-semibold text-[#0A66C2]">Professional Cover Letters</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-3xl mx-auto">
                The core category — handles 70–80% of all job applications. Suitable for corporate,
                government, NGO, banking, and private sector roles across all experience levels.
              </p>
            </div>
            {renderTemplateGrid(PROFESSIONAL_TEMPLATES)}
          </div>

          <div>
            <div className="mb-6 text-center">
              <h3 className="text-xl font-semibold text-[#0A66C2]">Entry-Level Cover Letters</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-3xl mx-auto">
                Designed for fresh graduates, students, and first-time job seekers. These templates
                focus on education, projects, and potential — not experience.
              </p>
            </div>
            {renderTemplateGrid(ENTRY_LEVEL_TEMPLATES)}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle>{getActiveTemplateName()}</DialogTitle>
            <DialogDescription>Edit your details on the left — the preview updates live on the right.</DialogDescription>
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
                  onChange={e => setLetterTitle(e.target.value)}
                />
              </div>
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Details</p>
                {Object.keys(getActiveSchema()).map(key => {
                  const field = getActiveSchema()[key];
                  const val = getActiveFormData()[key] ?? '';
                  return (
                    <div key={key} className="mb-3">
                      <Label htmlFor={\`\${activeTemplate}-\${key}\`} className="text-sm">{field.label}</Label>
                      {field.type === 'textarea' ? (
                        <>
                          <Textarea
                            id={\`\${activeTemplate}-\${key}\`}
                            className="mt-1 text-sm"
                            rows={4}
                            placeholder={field.placeholder}
                            value={val}
                            onChange={e => updateField(activeTemplate, key, e.target.value)}
                          />
                          {field.hint && <p className="text-xs text-muted-foreground mt-1">{field.hint}</p>}
                        </>
                      ) : (
                        <Input
                          id={\`\${activeTemplate}-\${key}\`}
                          className="mt-1 text-sm"
                          placeholder={field.placeholder}
                          value={val}
                          onChange={e => updateField(activeTemplate, key, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 pt-2 pb-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowEditor(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Letter'}
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 flex items-start justify-center p-6">
              <div style={{ transform: 'scale(0.75)', transformOrigin: 'top center' }}>
                {activeTemplate === 'modern' && <ModernProfessionalLetter data={modernFormData} />}
                {activeTemplate === 'short' && <ShortDirectLetter data={shortFormData} />}
                {activeTemplate === 'graduate' && <GraduateLetter data={graduateFormData} />}
                {activeTemplate === 'internship' && <InternshipLetter data={internshipFormData} />}
                {activeTemplate === 'classic' && <ClassicProfessionalLetter data={classicFormData} />}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
`;

const outPath = path.join(__dirname, 'src', 'components', 'career-tools', 'CoverLetterGenerator.tsx');
fs.writeFileSync(outPath, content, 'utf8');
console.log('Written:', outPath, '— size:', fs.statSync(outPath).size, 'bytes');
