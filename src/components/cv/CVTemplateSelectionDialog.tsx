'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUp, FilePlus, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parseCVFile } from '@/lib/cvParsing';

interface CVTemplateSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  templateName: string;
  onCreateNew: (cvName: string) => void;
  onUploadExisting: (cvName: string, parsedData: any) => void;
}

export default function CVTemplateSelectionDialog({
  open,
  onOpenChange,
  templateId,
  templateName,
  onCreateNew,
  onUploadExisting
}: CVTemplateSelectionDialogProps) {
  const [step, setStep] = useState<'choose' | 'create' | 'upload'>('choose');
  const [cvName, setCvName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleReset = () => {
    setStep('choose');
    setCvName('');
    setSelectedFile(null);
    setUploading(false);
  };

  const handleCreateNew = () => {
    if (!cvName.trim()) {
      toast({
        title: 'CV Name Required',
        description: 'Please enter a name for your CV',
        variant: 'destructive'
      });
      return;
    }
    onCreateNew(cvName);
    handleReset();
    onOpenChange(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a PDF, Word document, or text file',
          variant: 'destructive'
        });
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Please upload a file smaller than 5MB',
          variant: 'destructive'
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUploadExisting = async () => {
    if (!cvName.trim()) {
      toast({
        title: 'CV Name Required',
        description: 'Please enter a name for your CV',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: 'File Required',
        description: 'Please select a CV file to upload',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      // Parse the CV file
      const parsedData = await parseCVFile(selectedFile);
      
      toast({
        title: 'CV Parsed Successfully',
        description: 'Your CV has been imported and mapped to the template'
      });

      onUploadExisting(cvName, parsedData);
      handleReset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error parsing CV:', error);
      toast({
        title: 'Parsing Failed',
        description: 'Failed to parse your CV. Please try again or create a new CV.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) handleReset();
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create CV with {templateName}</DialogTitle>
          <DialogDescription>
            Choose how you want to create your CV
          </DialogDescription>
        </DialogHeader>

        {step === 'choose' && (
          <div className="grid gap-4 py-4">
            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col items-center gap-3 hover:border-primary hover:bg-primary/5"
              onClick={() => setStep('create')}
            >
              <FilePlus className="h-8 w-8 text-primary" />
              <div className="text-center">
                <div className="font-semibold text-base">Create New CV</div>
                <div className="text-sm text-muted-foreground">Start from scratch with this template</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col items-center gap-3 hover:border-primary hover:bg-primary/5"
              onClick={() => setStep('upload')}
            >
              <FileUp className="h-8 w-8 text-primary" />
              <div className="text-center">
                <div className="font-semibold text-base">Upload Existing CV</div>
                <div className="text-sm text-muted-foreground">Import from PDF, Word, or text file</div>
              </div>
            </Button>
          </div>
        )}

        {step === 'create' && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cv-name">CV Name</Label>
              <Input
                id="cv-name"
                placeholder="e.g., My Professional CV"
                value={cvName}
                onChange={(e) => setCvName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNew();
                }}
              />
              <p className="text-xs text-muted-foreground">
                Give your CV a name to help you identify it later
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep('choose')}>
                Back
              </Button>
              <Button onClick={handleCreateNew}>
                Create CV
              </Button>
            </div>
          </div>
        )}

        {step === 'upload' && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cv-name-upload">CV Name</Label>
              <Input
                id="cv-name-upload"
                placeholder="e.g., My Professional CV"
                value={cvName}
                onChange={(e) => setCvName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cv-file">Upload CV File</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="cv-file"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
              </div>
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Supported formats: PDF, Word (.doc, .docx), Text (.txt) - Max 5MB
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep('choose')} disabled={uploading}>
                Back
              </Button>
              <Button onClick={handleUploadExisting} disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing CV...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload & Parse
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
