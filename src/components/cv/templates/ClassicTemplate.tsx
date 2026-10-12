/**
 * Classic Professional CV Template
 * Designed for Kenyan candidates with ATS-friendly layout
 * A4 size: 794px × 1123px
 */

import React from 'react';

interface ContactInfo {
  phone: string;
  email: string;
  linkedin?: string;
  location: string;
}

interface Experience {
  jobTitle: string;
  company: string;
  location: string;
  dates: string;
  details: string[];
}

interface Education {
  degree: string;
  institution: string;
  dates: string;
}

interface CVData {
  name: string;
  title: string;
  contact: ContactInfo;
  profile: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  certifications?: string[];
  achievements?: string[];
  referees?: string;
  photoUrl?: string;
}

interface ClassicTemplateProps {
  data: CVData;
}

export default function ClassicTemplate({ data }: ClassicTemplateProps) {
  return (
    <div className="w-[794px] min-h-[1123px] bg-white p-8 text-gray-900 overflow-visible shadow-lg print:shadow-none">
      {/* Header Section */}
      <header className="mb-5 border-b-2 border-gray-800 pb-3">
        <div className="flex items-start gap-4">
          {data.photoUrl && (
            <img src={data.photoUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover border border-gray-300 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">
              {data.name}
            </h1>
            <p className="text-xl text-gray-700 font-medium mb-3">
              {data.title}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
              <span className="flex items-center">
                <span className="font-medium mr-1">📍</span>
                {data.contact.location}
              </span>
              <span className="flex items-center">
                <span className="font-medium mr-1">📞</span>
                {data.contact.phone}
              </span>
              <span className="flex items-center">
                <span className="font-medium mr-1">✉️</span>
                {data.contact.email}
              </span>
              {data.contact.linkedin && (
                <span className="flex items-center">
                  <span className="font-medium mr-1">🔗</span>
                  <a
                    href={`https://${data.contact.linkedin}`}
                    className="text-blue-700 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {data.contact.linkedin}
                  </a>
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Professional Summary Section */}
      <section className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-wide border-b border-gray-300 pb-1">
          Professional Summary
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed text-justify">
          {data.profile}
        </p>
      </section>

      {/* Key Skills Section */}
      <section className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-wide border-b border-gray-300 pb-1">
          Key Skills
        </h2>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
          {data.skills.map((skill, index) => (
            <li key={index} className="text-sm text-gray-700 flex items-start">
              <span className="mr-2 text-gray-500">•</span>
              <span>{skill}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Professional Experience Section */}
      <section className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-wide border-b border-gray-300 pb-1">
          Professional Experience
        </h2>
        <div className="space-y-4">
          {data.experience.map((job, index) => (
            <div key={index}>
              <div className="mb-2">
                <h3 className="text-sm font-bold text-gray-900">
                  {job.jobTitle}
                </h3>
                <p className="text-sm text-gray-700 font-medium">
                  {job.company}, {job.location}
                </p>
                <p className="text-xs text-gray-500 italic mt-1">
                  {job.dates}
                </p>
              </div>
              <ul className="space-y-1 ml-1">
                {job.details.map((detail, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start leading-relaxed">
                    <span className="mr-2 text-gray-500 mt-0.5">•</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Education Section */}
      <section className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-wide border-b border-gray-300 pb-1">
          Education
        </h2>
        <div className="space-y-2">
          {data.education.map((edu, index) => (
            <div key={index}>
              <h3 className="text-sm font-bold text-gray-900">
                {edu.degree}
              </h3>
              <p className="text-sm text-gray-700">
                {edu.institution}
              </p>
              <p className="text-xs text-gray-500 italic">
                {edu.dates}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Professional Certifications Section (Optional) */}
      {data.certifications && data.certifications.length > 0 && (
        <section className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-wide border-b border-gray-300 pb-1">
            Professional Certifications
          </h2>
          <ul className="space-y-1">
            {data.certifications.map((cert, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start">
                <span className="mr-2 text-gray-500">•</span>
                <span>{cert}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Professional Achievements Section (Optional) */}
      {data.achievements && data.achievements.length > 0 && (
        <section className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-wide border-b border-gray-300 pb-1">
            Professional Achievements
          </h2>
          <ul className="space-y-1">
            {data.achievements.map((achievement, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start">
                <span className="mr-2 text-gray-500">•</span>
                <span>{achievement}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Referees Section */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-wide border-b border-gray-300 pb-1">
          Referees
        </h2>
        <p className="text-sm text-gray-700 italic">
          {data.referees || 'Available upon request.'}
        </p>
      </section>
    </div>
  );
}
