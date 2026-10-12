'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileType } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type CandidateCV } from '@/lib/careerTools';
import { buildCvWordBlob, cvPlaintext } from '@/lib/careerDocumentExport';
import { downloadBlob, textFilename, wordFilename } from '@/lib/downloadBlob';
import { pdfFilename } from '@/lib/documentPdf';
import { generateCareerCvPdfBlob } from '@/lib/exportCareerCv';

interface CVDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cv: CandidateCV;
  templateName: string;
}

export default function CVDownloadDialog({ open, onOpenChange, cv, templateName }: CVDownloadDialogProps) {
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      const blob = await generateCareerCvPdfBlob(cv, templateName);
      await downloadBlob(blob, pdfFilename(cv.title));
      toast({ title: 'Ready', description: 'CV saved as a formatted A4 PDF.' });
    } catch (error: any) {
      toast({ title: 'Download failed', description: error.message, variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadWord = async () => {
    try {
      setDownloading(true);
      const blob = await buildCvWordBlob(cv.content, templateName);
      await downloadBlob(blob, wordFilename(cv.title));
      toast({ title: 'Ready', description: 'CV saved as an editable Word document.' });
    } catch (error: any) {
      toast({ title: 'Download failed', description: 'Failed to download Word document: ' + error.message, variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadText = async () => {
    try {
      setDownloading(true);
      const text = cvPlaintext(cv.content, templateName);
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      await downloadBlob(blob, textFilename(cv.title));
      toast({ title: 'Ready', description: 'CV saved as a text file.' });
    } catch (error: any) {
      toast({ title: 'Download failed', description: 'Failed to download text file: ' + error.message, variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download CV</DialogTitle>
          <DialogDescription>
            Ready-to-use files for {cv.title}. PDF matches the on-screen template. Word keeps every section, including extras, in an editable A4 layout.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={downloading}
          >
            <FileText className="h-5 w-5 mr-3 text-red-600" />
            <div className="text-left">
              <div className="font-semibold">PDF — ready to send</div>
              <div className="text-xs text-muted-foreground">
                Formatted A4 page. Best for email, apply, and printing.
              </div>
            </div>
          </Button>

          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={handleDownloadWord}
            disabled={downloading}
          >
            <FileType className="h-5 w-5 mr-3 text-blue-600" />
            <div className="text-left">
              <div className="font-semibold">Word (.docx) — editable</div>
              <div className="text-xs text-muted-foreground">
                Same content as the template, including projects, publications, and other extras. Open in Word or Google Docs.
              </div>
            </div>
          </Button>

          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={handleDownloadText}
            disabled={downloading}
          >
            <Download className="h-5 w-5 mr-3 text-gray-600" />
            <div className="text-left">
              <div className="font-semibold">Plain text (.txt)</div>
              <div className="text-xs text-muted-foreground">
                Simple format for ATS paste boxes
              </div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
