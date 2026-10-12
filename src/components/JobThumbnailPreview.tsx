import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye } from 'lucide-react';
import { useJobThumbnail } from '@/hooks/useJobThumbnail';
import { JobThumbnailData, generateThumbnailFilename, downloadBlob } from '@/lib/thumbnailUtils';
import { toast } from 'sonner';

interface JobThumbnailPreviewProps {
  jobData: JobThumbnailData;
  className?: string;
}

const JobThumbnailPreview: React.FC<JobThumbnailPreviewProps> = ({ 
  jobData,
  className = ''
}) => {
  const { generateThumbnail, isGenerating, error } = useJobThumbnail();
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const generatePreview = async () => {
      if (showPreview && !thumbnailUrl) {
        try {
          const blob = await generateThumbnail(jobData);
          if (blob) {
            const url = URL.createObjectURL(blob);
            setThumbnailUrl(url);
          }
        } catch (err) {
          console.error('Error generating thumbnail:', err);
          toast.error('Failed to generate thumbnail preview');
        }
      }
    };

    generatePreview();
  }, [showPreview, thumbnailUrl, generateThumbnail, jobData]);

  const handleDownload = async () => {
    try {
      const blob = await generateThumbnail(jobData);
      if (blob) {
        const filename = generateThumbnailFilename(jobData.jobTitle, jobData.company);
        downloadBlob(blob, filename);
        toast.success('Thumbnail downloaded successfully!');
      } else {
        toast.error('Failed to generate thumbnail');
      }
    } catch (err) {
      console.error('Error downloading thumbnail:', err);
      toast.error('Failed to download thumbnail');
    }
  };

  if (!showPreview) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Social Media Thumbnail</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Generate a professional thumbnail for sharing this job on social media platforms.
          </p>
          <Button 
            onClick={() => setShowPreview(true)} 
            className="w-full"
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview Thumbnail
          </Button>
          <Button 
            onClick={handleDownload} 
            variant="outline"
            disabled={isGenerating}
            className="w-full"
          >
            <Download className="mr-2 h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Download Thumbnail'}
          </Button>
          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Social Media Thumbnail</CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setShowPreview(false);
              if (thumbnailUrl) {
                URL.revokeObjectURL(thumbnailUrl);
                setThumbnailUrl(null);
              }
            }}
          >
            Hide Preview
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {thumbnailUrl ? (
          <>
            <div className="border rounded-lg overflow-hidden">
              <img 
                src={thumbnailUrl} 
                alt="Job thumbnail preview" 
                className="w-full h-auto"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleDownload} 
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button 
                onClick={() => {
                  setShowPreview(false);
                  if (thumbnailUrl) {
                    URL.revokeObjectURL(thumbnailUrl);
                    setThumbnailUrl(null);
                  }
                }} 
                variant="outline"
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-48">
            {isGenerating ? (
              <p>Generating thumbnail...</p>
            ) : (
              <p>Error generating thumbnail</p>
            )}
          </div>
        )}
        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default JobThumbnailPreview;