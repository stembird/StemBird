'use client';

import { useState } from 'react';
import { createElement, type ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, FileType } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CVStudioFrame from '@/components/cv/CVStudioFrame';
import { resolveCVTemplate } from '@/components/cv/resolveCVTemplate';
import { toTemplateProps } from '@/lib/cvContent';
import { mergeDesign } from '@/lib/cvDesign';
import { buildCvWordBlob } from '@/lib/careerDocumentExport';
import { downloadBlob, wordFilename } from '@/lib/downloadBlob';
import { downloadReactElementAsPdf, pdfFilename } from '@/lib/documentPdf';
import type { CVDesign } from '@/types/careerDocuments';

export default function PublicCvDownloads({
  title,
  content,
  templateName,
}: {
  title: string;
  content: unknown;
  templateName: string;
}) {
  const [busy, setBusy] = useState<'pdf' | 'word' | null>(null);
  const { toast } = useToast();

  const handlePdf = async () => {
    try {
      setBusy('pdf');
      const Template = (await resolveCVTemplate(templateName)) as ComponentType<{ data: any }>;
      const design = mergeDesign(undefined, (content as { design?: CVDesign } | null)?.design);
      await downloadReactElementAsPdf({
        element: createElement(CVStudioFrame, {
          design,
          children: createElement(Template, { data: toTemplateProps(content, templateName) }),
        }),
        filename: pdfFilename(title),
      });
      toast({ title: 'Ready', description: 'CV saved as a formatted A4 PDF.' });
    } catch (error: any) {
      toast({ title: 'Download failed', description: error.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const handleWord = async () => {
    try {
      setBusy('word');
      const blob = await buildCvWordBlob(content, templateName);
      await downloadBlob(blob, wordFilename(title));
      toast({ title: 'Ready', description: 'CV saved as an editable Word document.' });
    } catch (error: any) {
      toast({ title: 'Download failed', description: error.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" disabled={busy !== null} onClick={handlePdf}>
        <FileText className="h-4 w-4 mr-1 text-red-600" />
        {busy === 'pdf' ? 'Preparing…' : 'Download PDF'}
      </Button>
      <Button size="sm" variant="outline" disabled={busy !== null} onClick={handleWord}>
        <FileType className="h-4 w-4 mr-1 text-blue-600" />
        {busy === 'word' ? 'Preparing…' : 'Download Word'}
      </Button>
    </div>
  );
}
