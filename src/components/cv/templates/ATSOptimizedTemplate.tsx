import React from "react";

interface ATSOptimizedData {
  name: string;
  title: string;
  contact: {
    location: string;
    phone: string;
    email: string;
    linkedin?: string;
  };
  summary: string;
  skills: string[];
  experience: Array<{
    role: string;
    company: string;
    location: string;
    dates: string;
    responsibilities: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    dates: string;
  }>;
  certifications: string[];
  additional: string[];
  photoUrl?: string;
}

interface ATSOptimizedTemplateProps {
  data: ATSOptimizedData;
}

export default function ATSOptimizedTemplate({ data }: ATSOptimizedTemplateProps) {
  return (
    <div className="w-[794px] min-h-[1123px] bg-white p-10 text-gray-900 overflow-visible">

      {/* Header */}
      <header className="mb-6">
        <div className="flex items-start gap-4">
          {data.photoUrl && (
            <img src={data.photoUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover border border-gray-300 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{data.name}</h1>
            <p className="text-sm mt-1 text-gray-700">{data.title}</p>
            <div className="text-sm mt-2 text-gray-700 space-y-0.5">
              <p>{data.contact.location}</p>
              <p>{data.contact.phone}</p>
              <p>{data.contact.email}</p>
              {data.contact.linkedin && <p>{data.contact.linkedin}</p>}
            </div>
          </div>
        </div>
      </header>

      {/* Professional Summary */}
      <section className="mb-5">
        <h2 className="text-base font-semibold border-b border-gray-400 pb-1 mb-2 uppercase tracking-wide">
          Professional Summary
        </h2>
        <p className="text-sm leading-relaxed">{data.summary}</p>
      </section>

      {/* Core Skills */}
      <section className="mb-5">
        <h2 className="text-base font-semibold border-b border-gray-400 pb-1 mb-2 uppercase tracking-wide">
          Core Skills
        </h2>
        <ul className="grid grid-cols-2 text-sm gap-y-1">
          {data.skills.map((skill, index) => (
            <li key={index}>• {skill}</li>
          ))}
        </ul>
      </section>

      {/* Professional Experience */}
      <section className="mb-5">
        <h2 className="text-base font-semibold border-b border-gray-400 pb-1 mb-2 uppercase tracking-wide">
          Professional Experience
        </h2>
        {data.experience.map((job, index) => (
          <div key={index} className="mb-4">
            <p className="text-sm font-semibold">
              {job.role} — {job.company}
            </p>
            <p className="text-xs text-gray-600 mb-1">
              {job.location} | {job.dates}
            </p>
            <ul className="text-sm list-disc ml-5 space-y-0.5">
              {job.responsibilities.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* Education */}
      <section className="mb-5">
        <h2 className="text-base font-semibold border-b border-gray-400 pb-1 mb-2 uppercase tracking-wide">
          Education
        </h2>
        {data.education.map((edu, index) => (
          <div key={index} className="mb-2">
            <p className="text-sm font-semibold">{edu.degree}</p>
            <p className="text-sm">{edu.institution}</p>
            <p className="text-xs text-gray-600">{edu.dates}</p>
          </div>
        ))}
      </section>

      {/* Certifications */}
      {data.certifications.length > 0 && (
        <section className="mb-5">
          <h2 className="text-base font-semibold border-b border-gray-400 pb-1 mb-2 uppercase tracking-wide">
            Certifications
          </h2>
          <ul className="text-sm list-disc ml-5 space-y-0.5">
            {data.certifications.map((cert, index) => (
              <li key={index}>{cert}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Additional Information */}
      {data.additional.length > 0 && (
        <section>
          <h2 className="text-base font-semibold border-b border-gray-400 pb-1 mb-2 uppercase tracking-wide">
            Additional Information
          </h2>
          <ul className="text-sm list-disc ml-5 space-y-0.5">
            {data.additional.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}
