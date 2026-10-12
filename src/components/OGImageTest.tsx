"use client";

import React, { useState } from 'react';

const OGImageTest: React.FC = () => {
  const [jobId, setJobId] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const generateImage = () => {
    if (jobId) {
      // Add timestamp for cache busting
      const timestamp = Date.now();
      const url = `/api/og/job/${jobId}?t=${timestamp}`;
      setImageUrl(url);
    }
  };

  // Example job IDs for quick testing
  const exampleJobIds = [
    'software-engineer-at-techcorp-kenya',
    'marketing-manager-at-brandkenya-ltd',
    'senior-accountant-at-big-four-firm'
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">OG Image Test</h2>
      
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <label htmlFor="jobId" className="block text-sm font-medium mb-2">
          Job ID or Slug
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            id="jobId"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter job ID or slug"
          />
          <button
            onClick={generateImage}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Generate
          </button>
        </div>
        
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">Quick test examples:</p>
          <div className="flex flex-wrap gap-2">
            {exampleJobIds.map((id, index) => (
              <button
                key={index}
                onClick={() => {
                  setJobId(id);
                  // Auto-generate after setting ID
                  setTimeout(() => {
                    const timestamp = Date.now();
                    const url = `/api/og/job/${id}?t=${timestamp}`;
                    setImageUrl(url);
                  }, 100);
                }}
                className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-md transition"
              >
                {id.substring(0, 20)}...
              </button>
            ))}
          </div>
        </div>
      </div>

      {imageUrl && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-3">Generated OG Image</h3>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
            <img 
              src={imageUrl} 
              alt="Generated OG" 
              className="w-full max-w-2xl mx-auto border rounded-lg shadow-lg"
            />
            <div className="mt-3 text-center">
              <a 
                href={imageUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 text-sm"
              >
                Open image in new tab
              </a>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">Testing Tips</h4>
        <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
          <li>Use actual job slugs from your database for realistic testing</li>
          <li>Refresh the image by clicking "Generate" again if needed</li>
          <li>Check that all text is clearly readable and properly positioned</li>
          <li>Verify the color scheme matches the brand guidelines</li>
        </ul>
      </div>
    </div>
  );
};

export default OGImageTest;