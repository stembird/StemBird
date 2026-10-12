import React from "react";

interface TechnicalEngineeringData {
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
  tools: string[];
  certifications: string[];
  projects: Array<{
    title: string;
    company: string;
    year: string;
    description: string;
  }>;
  experience: Array<{
    role: string;
    company: string;
    location: string;
    dates: string;
    responsibilities?: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    dates: string;
  }>;
  photoUrl?: string;
}

interface TechnicalEngineeringTemplateProps {
  data: TechnicalEngineeringData;
}

export default function TechnicalEngineeringTemplate({ data }: TechnicalEngineeringTemplateProps) {
  return (
    <div className="w-[794px] min-h-[1123px] bg-white grid grid-cols-3 text-gray-800 overflow-visible">

      {/* Sidebar */}
      <aside className="col-span-1 bg-gray-100 p-8 overflow-visible">
        {data.photoUrl && (
          <div className="flex justify-center mb-4">
            <img src={data.photoUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-gray-300" />
          </div>
        )}
        <h1 className="text-xl font-bold leading-tight">{data.name}</h1>
        <p className="text-sm text-gray-600 mt-1 mb-5">{data.title}</p>

        <div className="text-xs text-gray-700 mb-6 space-y-0.5">
          <p>{data.contact.location}</p>
          <p>{data.contact.phone}</p>
          <p>{data.contact.email}</p>
          {data.contact.linkedin && <p>{data.contact.linkedin}</p>}
        </div>

        {/* Technical Skills */}
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-400 pb-1 mb-2">
            Technical Skills
          </h2>
          <ul className="text-xs space-y-1 text-gray-700">
            {data.skills.map((skill, index) => (
              <li key={index}>• {skill}</li>
            ))}
          </ul>
        </section>

        {/* Tools & Systems */}
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-400 pb-1 mb-2">
            Tools & Systems
          </h2>
          <ul className="text-xs space-y-1 text-gray-700">
            {data.tools.map((tool, index) => (
              <li key={index}>• {tool}</li>
            ))}
          </ul>
        </section>

        {/* Certifications */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-400 pb-1 mb-2">
            Certifications
          </h2>
          <ul className="text-xs space-y-1 text-gray-700">
            {data.certifications.map((cert, index) => (
              <li key={index}>• {cert}</li>
            ))}
          </ul>
        </section>

      </aside>

      {/* Main Content */}
      <main className="col-span-2 p-10 overflow-visible">

        {/* Summary */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-800 pb-1 mb-2">
            Professional Summary
          </h2>
          <p className="text-xs leading-relaxed text-gray-700">{data.summary}</p>
        </section>

        {data.projects?.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-800 pb-1 mb-3">
            Key Engineering Projects
          </h2>
          {data.projects.map((project, index) => (
            <div key={index} className="mb-3">
              <p className="text-xs font-bold text-gray-900">{project.title}</p>
              <p className="text-[10px] text-gray-500 mb-0.5">
                {project.company} | {project.year}
              </p>
              <p className="text-xs text-gray-700 leading-relaxed">{project.description}</p>
            </div>
          ))}
        </section>
        )}

        {/* Experience */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-800 pb-1 mb-3">
            Professional Experience
          </h2>
          {data.experience.map((job, index) => (
            <div key={index} className="mb-3">
              <p className="text-xs font-bold text-gray-900">
                {job.role} — {job.company}
              </p>
              <p className="text-[10px] text-gray-500 mb-1">
                {job.location} | {job.dates}
              </p>
              {job.responsibilities && (
                <ul className="text-xs text-gray-700 space-y-0.5">
                  {job.responsibilities.map((r, i) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>

        {/* Education */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 border-b-2 border-gray-800 pb-1 mb-3">
            Education
          </h2>
          {data.education.map((edu, index) => (
            <div key={index} className="mb-2">
              <p className="text-xs font-bold text-gray-900">{edu.degree}</p>
              <p className="text-xs text-gray-700">{edu.institution}</p>
              <p className="text-[10px] text-gray-500">{edu.dates}</p>
            </div>
          ))}
        </section>

      </main>
    </div>
  );
}
