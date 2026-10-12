/**
 * Example usage of ClassicTemplate component
 * This file demonstrates how to use the Classic Professional CV template
 */

import React from 'react';
import ClassicTemplate from './ClassicTemplate';

// Sample data for a Kenyan candidate
const sampleCVData = {
  name: "John Mwangi Kariuki",
  title: "Administrative Officer",
  contact: {
    phone: "+254712345678",
    email: "johnmwangi@email.com",
    linkedin: "linkedin.com/in/johnmwangi",
    location: "Nairobi, Kenya"
  },
  profile: "Results-driven administrative professional with 5+ years of experience in office management, records administration, and customer service. Proven track record of streamlining operations, improving efficiency, and maintaining accurate documentation systems. Skilled in coordinating multi-departmental activities and providing executive-level support in fast-paced environments.",
  skills: [
    "Office Administration",
    "Records Management",
    "Customer Service Excellence",
    "Meeting Coordination & Scheduling",
    "Report Preparation & Documentation",
    "Microsoft Office Suite (Word, Excel, PowerPoint)",
    "Database Management",
    "Budget Tracking & Expense Management",
    "Communication & Interpersonal Skills",
    "Time Management & Organization"
  ],
  experience: [
    {
      jobTitle: "Administrative Officer",
      company: "ABC Logistics Ltd",
      location: "Nairobi",
      dates: "March 2021 – Present",
      details: [
        "Coordinate daily office operations and administrative activities for a team of 25+ staff members",
        "Prepare comprehensive reports, meeting minutes, and official correspondence for senior management",
        "Manage document filing systems and maintain accurate company records in compliance with regulatory requirements",
        "Oversee procurement of office supplies and equipment, achieving 15% cost reduction through vendor negotiations",
        "Provide executive support to the Operations Manager, including calendar management and travel arrangements"
      ]
    },
    {
      jobTitle: "Administrative Assistant",
      company: "XYZ Consulting Group",
      location: "Nairobi",
      dates: "June 2018 – February 2021",
      details: [
        "Managed front desk operations and provided exceptional customer service to clients and visitors",
        "Maintained and updated client databases with 99% accuracy using CRM software",
        "Coordinated meetings, conferences, and events for up to 50 participants",
        "Processed invoices, expense reports, and maintained petty cash records",
        "Assisted in the preparation of proposals and presentations for client meetings"
      ]
    }
  ],
  education: [
    {
      degree: "Bachelor of Business Administration",
      institution: "University of Nairobi",
      dates: "2014 – 2018"
    },
    {
      degree: "Kenya Certificate of Secondary Education (KCSE)",
      institution: "Nairobi School",
      dates: "2010 – 2013"
    }
  ],
  certifications: [
    "Certificate in Project Management – Kenya Institute of Management, 2020",
    "Advanced Microsoft Excel Training – Strathmore University, 2019",
    "Customer Service Excellence – Kenya School of Professional Studies, 2018"
  ]
};

// Example component showing how to use the template
export default function ClassicTemplateExample() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2">Classic Professional CV Template</h1>
          <p className="text-gray-600">Preview of the CV template with sample data</p>
        </div>
        
        {/* CV Preview */}
        <div className="flex justify-center">
          <ClassicTemplate data={sampleCVData} />
        </div>

        {/* Print Instructions */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Usage Instructions</h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">1. Import the component:</h3>
              <pre className="bg-gray-100 p-3 rounded overflow-x-auto">
                <code>{`import ClassicTemplate from '@/components/cv/templates/ClassicTemplate';`}</code>
              </pre>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">2. Prepare your data object:</h3>
              <pre className="bg-gray-100 p-3 rounded overflow-x-auto">
                <code>{`const cvData = {
  name: "Your Name",
  title: "Your Job Title",
  contact: { ... },
  profile: "Your summary...",
  skills: [...],
  experience: [...],
  education: [...],
  certifications: [...]
};`}</code>
              </pre>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">3. Use the component:</h3>
              <pre className="bg-gray-100 p-3 rounded overflow-x-auto">
                <code>{`<ClassicTemplate data={cvData} />`}</code>
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4. Print to PDF:</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Use browser's Print function (Ctrl+P / Cmd+P)</li>
                <li>Select "Save as PDF" as destination</li>
                <li>Set paper size to A4</li>
                <li>Disable headers and footers</li>
                <li>Enable background graphics</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
