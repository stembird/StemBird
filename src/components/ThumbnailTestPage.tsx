"use client";

import React, { useState } from 'react';
import JobThumbnailGenerator from '@/components/JobThumbnailGenerator';
import { JobThumbnailData } from '@/lib/thumbnailUtils';

const ThumbnailTestPage: React.FC = () => {
  const [jobData, setJobData] = useState<JobThumbnailData>({
    jobTitle: 'Software Engineer',
    company: 'TechCorp Kenya',
    location: 'Nairobi, Kenya',
    jobId: 'test-job-123'
  });
  
  const [generatedThumbnail, setGeneratedThumbnail] = useState<Blob | null>(null);
  
  const handleThumbnailGenerated = (blob: Blob) => {
    setGeneratedThumbnail(blob);
  };
  
  const handleDownload = () => {
    if (generatedThumbnail) {
      const url = URL.createObjectURL(generatedThumbnail);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'test-thumbnail.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Thumbnail Generation Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Job Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Job Title</label>
              <input
                type="text"
                value={jobData.jobTitle}
                onChange={(e) => setJobData({...jobData, jobTitle: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Company</label>
              <input
                type="text"
                value={jobData.company}
                onChange={(e) => setJobData({...jobData, company: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <input
                type="text"
                value={jobData.location}
                onChange={(e) => setJobData({...jobData, location: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Test Job Categories</h3>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setJobData({
                  jobTitle: 'Medical Doctor',
                  company: 'Kenyatta National Hospital',
                  location: 'Nairobi, Kenya',
                  jobId: 'health-001'
                })}
                className="px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 rounded-md transition"
              >
                Healthcare
              </button>
              <button 
                onClick={() => setJobData({
                  jobTitle: 'Software Developer',
                  company: 'Andela Kenya',
                  location: 'Nairobi, Kenya',
                  jobId: 'tech-001'
                })}
                className="px-3 py-2 text-sm bg-green-100 hover:bg-green-200 rounded-md transition"
              >
                Technology
              </button>
              <button 
                onClick={() => setJobData({
                  jobTitle: 'High School Teacher',
                  company: 'Kenya High School',
                  location: 'Nairobi, Kenya',
                  jobId: 'edu-001'
                })}
                className="px-3 py-2 text-sm bg-yellow-100 hover:bg-yellow-200 rounded-md transition"
              >
                Education
              </button>
              <button 
                onClick={() => setJobData({
                  jobTitle: 'Agricultural Officer',
                  company: 'Ministry of Agriculture',
                  location: 'Nakuru, Kenya',
                  jobId: 'agri-001'
                })}
                className="px-3 py-2 text-sm bg-purple-100 hover:bg-purple-200 rounded-md transition"
              >
                Agriculture
              </button>
            </div>
          </div>
        </div>
        
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Generated Thumbnail</h2>
          
          <div className="flex flex-col items-center">
            <JobThumbnailGenerator
              jobTitle={jobData.jobTitle}
              company={jobData.company}
              location={jobData.location}
              onThumbnailGenerated={handleThumbnailGenerated}
            />
            
            {generatedThumbnail ? (
              <>
                <img
                  src={URL.createObjectURL(generatedThumbnail)}
                  alt="Generated thumbnail"
                  className="max-w-full h-auto border rounded-lg shadow-lg mb-4"
                />
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Download Thumbnail
                </button>
              </>
            ) : (
              <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <p>Generating thumbnail...</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium mb-2">Testing Instructions</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Modify the job details to test different categories</li>
          <li>Use the preset buttons to quickly test different job types</li>
          <li>Verify that the correct industry-specific image is used</li>
          <li>Check that the "Apply Now" button appears correctly</li>
          <li>Confirm that brand colors are applied consistently</li>
          <li>Ensure no text duplication occurs</li>
        </ul>
      </div>
    </div>
  );
};

export default ThumbnailTestPage;