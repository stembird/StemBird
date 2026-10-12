'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, Trash2, Download, Star, Loader2, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import CVParseDialog from './CVParseDialog';

interface Document {
  id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  is_primary: boolean;
  is_active: boolean;
  uploaded_at: string;
}

interface DocumentsSectionProps {
  candidateId: string;
  documents: Document[];
  onUpdate: () => void;
  onCVParsed?: (parsedData: any) => void;
}

export default function DocumentsSection({ candidateId, documents, onUpdate, onCVParsed }: DocumentsSectionProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('cv');
  const [showParseDialog, setShowParseDialog] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a PDF or DOC file',
          variant: 'destructive',
        });
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload a file smaller than 10MB',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    let uploadedFileUrl = '';
    let uploadedFileType = '';

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('candidate-documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('candidate-documents')
        .getPublicUrl(fileName);

      uploadedFileUrl = publicUrl;
      uploadedFileType = selectedFile.type;

      // If this is a CV/resume and it's the first one, make it primary
      const isPrimary = (documentType === 'cv' || documentType === 'resume') && 
        !documents.some(d => (d.document_type === 'cv' || d.document_type === 'resume') && d.is_primary);

      // Save document record
      const { error: dbError } = await supabase
        .from('candidate_documents')
        .insert({
          candidate_id: candidateId,
          document_type: documentType,
          document_name: selectedFile.name,
          file_url: publicUrl,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          is_primary: isPrimary,
          is_active: true,
        });

      if (dbError) {
        // If database insert fails, clean up the uploaded file
        await supabase.storage
          .from('candidate-documents')
          .remove([fileName]);
        throw dbError;
      }

      toast({
        title: 'Document uploaded',
        description: 'Your document has been uploaded successfully',
      });

      setSelectedFile(null);
      setDocumentType('cv');
      onUpdate();

      // Auto-parse CV/Resume
      if (documentType === 'cv' || documentType === 'resume') {
        setShowParseDialog(true);
        setIsParsing(true);
        
        try {
          const response = await fetch('/api/parse-cv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileUrl: uploadedFileUrl,
              fileType: uploadedFileType,
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Failed to parse CV');
          }

          setParsedData(result.data);
          setIsParsing(false);
        } catch (parseError: any) {
          console.error('CV parsing error:', parseError);
          setIsParsing(false);
          setShowParseDialog(false);
          toast({
            title: 'CV parsing failed',
            description: parseError.message || 'Could not automatically parse your CV. You can still fill in your profile manually.',
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      
      let errorMessage = 'Failed to upload document';
      if (error.message) {
        errorMessage = error.message;
      }
      if (error.code === '22001') {
        errorMessage = 'File name or type is too long. Please rename your file to something shorter.';
      }
      
      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmParsedData = async () => {
    if (!parsedData) return;

    try {
      // Call the parent callback to apply parsed data
      if (onCVParsed) {
        await onCVParsed(parsedData);
      }

      toast({
        title: 'Profile updated',
        description: 'Your profile has been populated with CV data. Review and save each section.',
      });

      setShowParseDialog(false);
      setParsedData(null);
    } catch (error: any) {
      toast({
        title: 'Failed to apply data',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCancelParsing = () => {
    setShowParseDialog(false);
    setParsedData(null);
    setIsParsing(false);
  };

  const handleSetPrimary = async (documentId: string) => {
    try {
      // First, unset all primary flags for this document type
      const doc = documents.find(d => d.id === documentId);
      if (!doc) return;

      await supabase
        .from('candidate_documents')
        .update({ is_primary: false })
        .eq('candidate_id', candidateId)
        .eq('document_type', doc.document_type);

      // Then set this one as primary
      const { error } = await supabase
        .from('candidate_documents')
        .update({ is_primary: true })
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: 'Primary document updated',
        description: 'This document is now your primary ' + doc.document_type,
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (documentId: string, fileUrl: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      // Extract file path from URL
      const urlParts = fileUrl.split('/candidate-documents/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage
          .from('candidate-documents')
          .remove([filePath]);
      }

      // Delete database record
      const { error } = await supabase
        .from('candidate_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: 'Document deleted',
        description: 'Your document has been removed',
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <CVParseDialog
        open={showParseDialog}
        onOpenChange={setShowParseDialog}
        parsedData={parsedData}
        isParsing={isParsing}
        onConfirm={handleConfirmParsedData}
        onCancel={handleCancelParsing}
      />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents & CV
          </CardTitle>
          <CardDescription>
            Upload your CV, resume, certificates, and other documents. CVs will be automatically parsed to fill your profile.
          </CardDescription>
        </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Section */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <h3 className="font-medium">Upload New Document</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cv">CV</SelectItem>
                  <SelectItem value="resume">Resume</SelectItem>
                  <SelectItem value="cover_letter">Cover Letter</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="portfolio">Portfolio</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Select File</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </div>
          </div>

          {selectedFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>{selectedFile.name} ({formatFileSize(selectedFile.size)})</span>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            Max file size: 10MB. Accepted formats: PDF, DOC, DOCX
          </p>
        </div>

        {/* Documents List */}
        <div className="space-y-3">
          <h3 className="font-medium">Your Documents</h3>
          
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{doc.document_name}</p>
                        {doc.is_primary && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Primary
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="capitalize">{doc.document_type.replace('_', ' ')}</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>{formatDate(doc.uploaded_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!doc.is_primary && (doc.document_type === 'cv' || doc.document_type === 'resume') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetPrimary(doc.id)}
                        title="Set as primary"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(doc.file_url, '_blank')}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc.id, doc.file_url)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </>
  );
}
