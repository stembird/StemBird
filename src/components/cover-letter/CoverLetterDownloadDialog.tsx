'use client';

import { useState } from 'react';
import { createElement } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, FileType } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { buildCoverLetterWordBlob } from '@/lib/coverLetterExport';
import { downloadBlob, wordFilename } from '@/lib/downloadBlob';
import { downloadReactElementAsPdf, pdfFilename } from '@/lib/documentPdf';
import type { CoverLetterTemplateConfig } from '@/data/coverLetterTemplates';

export default function CoverLetterDownloadDialog({
  open,
  onOpenChange,
  title,
  templateName,
  fields,
  config,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  templateName: string;
  fields: Record<string, string>;
  config: CoverLetterTemplateConfig | null;
}) {
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();
  const filenameBase = title.trim() || templateName;

  const handlePdf = async () => {
    if (!config) {
      toast({ title: 'Cannot download', description: 'Unknown cover letter template.', variant: 'destructive' });
      return;
    }
    try {
      setDownloading(true);
      await downloadReactElementAsPdf({
        element: createElement(config.component, { data: fields }),
        filename: pdfFilename(filenameBase),
      });
      toast({ title: 'Ready', description: 'Cover letter saved as a formatted A4 PDF.' });
    } catch (error: any) {
      toast({ title: 'Download failed', description: error.message || 'Could not generate PDF', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const handleWord = async () => {
    try {
      setDownloading(true);
      const blob = await buildCoverLetterWordBlob(fields, templateName);
      await downloadBlob(blob, wordFilename(filenameBase));
      toast({ title: 'Ready', description: 'Cover letter saved as an editable Word document.' });
    } catch (error: any) {
      toast({ title: 'Download failed', description: error.message || 'Could not generate Word file', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download cover letter</DialogTitle>
          <DialogDescription>
            Ready-to-use files for {filenameBase}. PDF matches the preview. Word is a standard business letter you can edit.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <Button className="w-full justify-start" variant="outline" onClick={handlePdf} disabled={downloading}>
            <FileText className="h-5 w-5 mr-3 text-red-600" />
            <div className="text-left">
              <div className="font-semibold">PDF — ready to send</div>
              <div className="text-xs text-muted-foreground">Formatted A4 page for email and applications.</div>
            </div>
          </Button>
          <Button className="w-full justify-start" variant="outline" onClick={handleWord} disabled={downloading}>
            <FileType className="h-5 w-5 mr-3 text-blue-600" />
            <div className="text-left">
              <div className="font-semibold">Word (.docx) — editable</div>
              <div className="text-xs text-muted-foreground">Business-letter layout. Open in Word or Google Docs.</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
