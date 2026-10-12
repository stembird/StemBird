/**
 * Modern Professional CV Template
 * Two-column layout with blue color accents for Kenyan candidates
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
  tools?: string[];
  languages?: string[];
  experience: Experience[];
  education: Education[];
  certifications?: string[];
  achievements?: string[];
  referees?: string;
  photoUrl?: string;
}

interface ModernTemplateProps {
  data: CVData;
}

export default function ModernTemplate({ data }: ModernTemplateProps) {
  return (
    <div className="w-[794px] min-h-[1123px] bg-white flex overflow-visible shadow-lg print:shadow-none">
      {/* Left Sidebar - 35% width */}
      <div className="w-[278px] bg-blue-50 p-6">
        {/* Photo */}
        {data.photoUrl && (
          <div className="flex justify-center mb-5">
            <img src={data.photoUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-blue-200" />
          </div>
        )}
        {/* Key Skills Section */}
        <section className="mb-5">
          <h2 className="text-base font-bold text-blue-900 mb-2 uppercase tracking-wide">
            Key Skills
          </h2>
          <ul className="space-y-1.5">
            {data.skills.map((skill, index) => (
              <li key={index} className="text-sm text-gray-800 flex items-start">
                <span className="text-blue-600 mr-2">▪</span>
                <span>{skill}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Tools & Platforms Section */}
        {data.tools && data.tools.length > 0 && (
          <section className="mb-5">
            <h2 className="text-base font-bold text-blue-900 mb-2 uppercase tracking-wide">
              Tools & Platforms
            </h2>
            <ul className="space-y-1.5">
              {data.tools.map((tool, index) => (
                <li key={index} className="text-sm text-gray-800 flex items-start">
                  <span className="text-blue-600 mr-2">▪</span>
                  <span>{tool}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Languages Section */}
        {data.languages && data.languages.length > 0 && (
          <section className="mb-5">
            <h2 className="text-base font-bold text-blue-900 mb-2 uppercase tracking-wide">
              Languages
            </h2>
            <ul className="space-y-1.5">
              {data.languages.map((language, index) => (
                <li key={index} className="text-sm text-gray-800">
                  {language}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Referees Section */}
        <section>
          <h2 className="text-base font-bold text-blue-900 mb-2 uppercase tracking-wide">
            Referees
          </h2>
          <p className="text-sm text-gray-800 italic">
            {data.referees || 'Available upon request.'}
          </p>
        </section>
      </div>

      {/* Right Main Content - 65% width */}
      <div className="flex-1 p-8">
        {/* Header Section */}
        <header className="mb-5 pb-3 border-b-2 border-blue-600">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            {data.name}
          </h1>
          <p className="text-lg text-blue-700 font-medium mb-3">
            {data.title}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
            <span className="flex items-center">
              <span className="mr-1">📍</span>
              {data.contact.location}
            </span>
            <span className="flex items-center">
              <span className="mr-1">📞</span>
              {data.contact.phone}
            </span>
            <span className="flex items-center">
              <span className="mr-1">✉️</span>
              {data.contact.email}
            </span>
            {data.contact.linkedin && (
              <span className="flex items-center">
                <span className="mr-1">🔗</span>
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
        </header>

        {/* Professional Profile Section */}
        <section className="mb-4">
          <h2 className="text-base font-bold text-blue-900 mb-2 uppercase tracking-wide">
            Professional Profile
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed text-justify">
            {data.profile}
          </p>
        </section>

        {/* Professional Experience Section */}
        <section className="mb-4">
          <h2 className="text-base font-bold text-blue-900 mb-2 uppercase tracking-wide">
            Professional Experience
          </h2>
          <div className="space-y-3">
            {data.experience.map((job, index) => (
              <div key={index}>
                <h3 className="text-sm font-bold text-gray-900">
                  {job.jobTitle}
                </h3>
                <p className="text-sm text-blue-700 font-medium">
                  {job.company} – {job.location}
                </p>
                <p className="text-xs text-gray-500 italic mb-2">
                  {job.dates}
                </p>
                <ul className="space-y-1">
                  {job.details.map((detail, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start leading-relaxed">
                      <span className="text-blue-600 mr-2 mt-0.5">▪</span>
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
          <h2 className="text-base font-bold text-blue-900 mb-2 uppercase tracking-wide">
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

        {/* Certifications Section */}
        {data.certifications && data.certifications.length > 0 && (
          <section className="mb-4">
            <h2 className="text-base font-bold text-blue-900 mb-2 uppercase tracking-wide">
              Certifications
            </h2>
            <ul className="space-y-1">
              {data.certifications.map((cert, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start">
                  <span className="text-blue-600 mr-2">▪</span>
                  <span>{cert}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Professional Achievements Section */}
        {data.achievements && data.achievements.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-blue-900 mb-2 uppercase tracking-wide">
              Professional Achievements
            </h2>
            <ul className="space-y-1">
              {data.achievements.map((achievement, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start">
                  <span className="text-blue-600 mr-2">▪</span>
                  <span>{achievement}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
