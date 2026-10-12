import React from "react";

interface Contact {
  location: string;
  phone: string;
  email: string;
  linkedin?: string;
}

interface SkillCategory {
  title: string;
  skills: string[];
}

interface Experience {
  role: string;
  company: string;
  dates: string;
}

interface Education {
  degree: string;
  institution: string;
  dates: string;
}

interface FunctionalTemplateData {
  name: string;
  title: string;
  contact: Contact;
  summary: string;
  coreSkills: string[];
  skillCategories: SkillCategory[];
  experience: Experience[];
  education: Education[];
  certifications?: string[];
  photoUrl?: string;
}

interface FunctionalTemplateProps {
  data: FunctionalTemplateData;
}

export default function FunctionalTemplate({ data }: FunctionalTemplateProps) {
  return (
    <div className="w-[794px] min-h-[1123px] bg-white p-12 text-gray-800 overflow-visible">
      {/* Header */}
      <header className="mb-6 border-b-2 border-gray-300 pb-4">
        <div className="flex items-start gap-4">
          {data.photoUrl && (
            <img src={data.photoUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover border border-gray-300 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-1">{data.name}</h1>
            <p className="text-xl text-blue-700 font-medium mb-3">{data.title}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600">
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {data.contact.location}
          </span>
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            {data.contact.phone}
          </span>
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            {data.contact.email}
          </span>
          {data.contact.linkedin && (
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
              </svg>
              {data.contact.linkedin}
            </span>
          )}
        </div>
          </div>
        </div>
      </header>

      {/* Professional Summary */}
      <section className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-wide border-b border-gray-300 pb-1">
          Professional Summary
        </h2>
        <p className="text-sm leading-relaxed text-gray-700">{data.summary}</p>
      </section>

      {/* Core Competencies */}
      <section className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3 uppercase tracking-wide border-b border-gray-300 pb-1">
          Core Competencies
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {data.coreSkills.map((skill, index) => (
            <div key={index} className="flex items-start">
              <span className="text-blue-600 mr-2 mt-0.5">▪</span>
              <span className="text-sm text-gray-700">{skill}</span>
            </div>
          ))}
        </div>
      </section>

      {data.skillCategories?.length > 0 && (
      <section className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3 uppercase tracking-wide border-b border-gray-300 pb-1">
          Professional Skills
        </h2>
        <div className="space-y-4">
          {data.skillCategories.map((category, index) => (
            <div key={index}>
              <h3 className="text-sm font-bold text-blue-700 mb-2">{category.title}</h3>
              <ul className="space-y-1.5 ml-4">
                {(category.skills || []).map((skill, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start">
                    <span className="text-gray-400 mr-2">•</span>
                    <span>{skill}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* Work Experience (brief) */}
      <section className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3 uppercase tracking-wide border-b border-gray-300 pb-1">
          Relevant Work Experience
        </h2>
        <div className="space-y-2">
          {data.experience.map((job, index) => (
            <div key={index} className="text-sm">
              <span className="font-semibold text-gray-900">{job.role}</span>
              <span className="text-gray-600"> — {job.company}</span>
              <span className="text-gray-500 italic"> ({job.dates})</span>
            </div>
          ))}
        </div>
      </section>

      {/* Education */}
      <section className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3 uppercase tracking-wide border-b border-gray-300 pb-1">
          Education
        </h2>
        <div className="space-y-3">
          {data.education.map((edu, index) => (
            <div key={index}>
              <p className="text-sm font-semibold text-gray-900">{edu.degree}</p>
              <p className="text-sm text-gray-700">{edu.institution}</p>
              <p className="text-xs text-gray-500 italic">{edu.dates}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Certifications */}
      {data.certifications && data.certifications.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3 uppercase tracking-wide border-b border-gray-300 pb-1">
            Certifications
          </h2>
          <ul className="space-y-1.5">
            {data.certifications.map((cert, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                <span>{cert}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
