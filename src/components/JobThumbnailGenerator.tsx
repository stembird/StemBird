import React, { useEffect } from 'react';
import { useJobThumbnail } from '@/hooks/useJobThumbnail';
import { JobThumbnailData } from '@/lib/thumbnailUtils';

interface JobThumbnailGeneratorProps {
  jobTitle: string;
  company: string;
  location: string;
  onThumbnailGenerated: (blob: Blob) => void;
}

const JobThumbnailGenerator: React.FC<JobThumbnailGeneratorProps> = ({
  jobTitle,
  company,
  location,
  onThumbnailGenerated
}) => {
  const { generateThumbnail } = useJobThumbnail();

  useEffect(() => {
    const generateThumbnailFromHook = async () => {
      const jobData: JobThumbnailData = {
        jobTitle,
        company,
        location,
        jobId: ''
      };

      const blob = await generateThumbnail(jobData);
      if (blob) {
        onThumbnailGenerated(blob);
      }
    };

    generateThumbnailFromHook();
  }, [jobTitle, company, location, onThumbnailGenerated, generateThumbnail]);

  // Hidden div for generating the image - completely hidden from view
  return (
    <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', visibility: 'hidden' }}>
    </div>
  );
};

export default JobThumbnailGenerator;