/**
 * Executive Leadership CV Template
 * Premium layout for senior executives emphasizing leadership and strategic impact
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
  achievements: string[];
  experience: Experience[];
  boardMemberships?: string[];
  education: Education[];
  certifications?: string[];
  strategicInitiatives?: string[];
  photoUrl?: string;
}

interface ExecutiveTemplateProps {
  data: CVData;
}

export default function ExecutiveTemplate({ data }: ExecutiveTemplateProps) {
  return (
    <div className="w-[794px] min-h-[1123px] bg-white p-8 text-gray-900 overflow-visible shadow-lg print:shadow-none">
      {/* Header Section */}
      <header className="mb-5 pb-3 border-b-2 border-gray-900">
        <div className="flex items-start gap-4">
          {data.photoUrl && (
            <img src={data.photoUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover border border-gray-300 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h1 className="text-4xl font-bold tracking-wide text-gray-900 mb-1">
              {data.name}
            </h1>
            <p className="text-xl text-gray-700 font-medium mb-2">
              {data.title}
            </p>
            <div className="flex flex-wrap gap-x-3 text-xs text-gray-600">
              <span>{data.contact.location}</span>
              <span>•</span>
              <span>{data.contact.phone}</span>
              <span>•</span>
              <span>{data.contact.email}</span>
              {data.contact.linkedin && (
                <>
                  <span>•</span>
                  <a
                    href={`https://${data.contact.linkedin}`}
                    className="text-blue-700 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {data.contact.linkedin}
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Leadership Profile Section */}
      <section className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-wider">
          Leadership Profile
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed text-justify font-sans">
          {data.profile}
        </p>
      </section>

      {/* Key Leadership Achievements Section */}
      <section className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-wider">
          Key Leadership Achievements
        </h2>
        <ul className="space-y-1 font-sans">
          {data.achievements.map((achievement, index) => (
            <li key={index} className="text-sm text-gray-700 flex items-start">
              <span className="mr-2 text-gray-500 font-bold">▪</span>
              <span>{achievement}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Strategic Leadership Experience Section */}
      <section className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-wider">
          Strategic Leadership Experience
        </h2>
        <div className="space-y-3 font-sans">
          {data.experience.map((job, index) => (
            <div key={index}>
              <div className="mb-1">
                <h3 className="text-sm font-bold text-gray-900">
                  {job.jobTitle}
                </h3>
                <p className="text-sm text-gray-700 font-medium">
                  {job.company} — {job.location}
                </p>
                <p className="text-xs text-gray-500 italic mt-0.5">
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

      {/* Board Memberships Section (Optional) */}
      {data.boardMemberships && data.boardMemberships.length > 0 && (
        <section className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-wider">
            Board Memberships & Advisory Roles
          </h2>
          <ul className="space-y-1 font-sans">
            {data.boardMemberships.map((board, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start">
                <span className="mr-2 text-gray-500">•</span>
                <span>{board}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Strategic Initiatives Section (Optional) */}
      {data.strategicInitiatives && data.strategicInitiatives.length > 0 && (
        <section className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-wider">
            Strategic Initiatives
          </h2>
          <ul className="space-y-1 font-sans">
            {data.strategicInitiatives.map((initiative, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start">
                <span className="mr-2 text-gray-500">•</span>
                <span>{initiative}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Education Section */}
      <section className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-wider">
          Education
        </h2>
        <div className="space-y-2 font-sans">
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
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-wider">
            Professional Certifications & Executive Education
          </h2>
          <ul className="space-y-1 font-sans">
            {data.certifications.map((cert, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start">
                <span className="mr-2 text-gray-500">•</span>
                <span>{cert}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
