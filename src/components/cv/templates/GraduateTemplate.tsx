import React from "react";

interface ContactInfo {
  location: string;
  phone: string;
  email: string;
  linkedin: string;
}

interface Education {
  degree: string;
  institution: string;
  dates: string;
}

interface Project {
  title: string;
  dates: string;
  description: string;
}

interface Internship {
  role: string;
  company: string;
  location: string;
  dates: string;
  details: string[];
}

interface GraduateTemplateData {
  name: string;
  title: string;
  contact: ContactInfo;
  objective: string;
  education: Education[];
  projects?: Project[];
  internships?: Internship[];
  skills: string[];
  activities?: string[];
  photoUrl?: string;
}

interface GraduateTemplateProps {
  data: GraduateTemplateData;
}

export default function GraduateTemplate({ data }: GraduateTemplateProps) {
  return (
    <div className="w-[794px] min-h-[1123px] bg-white p-10 text-gray-800 overflow-visible">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-start gap-4">
          {data.photoUrl && (
            <img src={data.photoUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover border border-gray-300 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{data.name}</h1>
            <p className="text-lg text-gray-700 mt-1">{data.title}</p>
            <p className="text-sm text-gray-600 mt-2">
              {data.contact.location} | {data.contact.phone} | {data.contact.email} |{" "}
              {data.contact.linkedin}
            </p>
          </div>
        </div>
      </header>

      <hr className="border-gray-300 mb-6" />

      {/* Career Objective */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2 border-b border-gray-200 pb-1">
          Career Objective
        </h2>
        <p className="text-sm leading-relaxed">{data.objective}</p>
      </section>

      {/* Education */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2 border-b border-gray-200 pb-1">
          Education
        </h2>
        {data.education.map((edu, index) => (
          <div key={index} className="mb-3">
            <p className="text-sm font-semibold text-gray-900">{edu.degree}</p>
            <p className="text-sm text-gray-700">{edu.institution}</p>
            <p className="text-xs text-gray-500 mt-0.5">{edu.dates}</p>
          </div>
        ))}
      </section>

      {/* Academic Projects */}
      {data.projects && data.projects.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2 border-b border-gray-200 pb-1">
            Academic Projects
          </h2>
          {data.projects.map((project, index) => (
            <div key={index} className="mb-3">
              <p className="text-sm font-semibold text-gray-900">{project.title}</p>
              <p className="text-xs text-gray-500 mb-1">{project.dates}</p>
              <p className="text-sm leading-relaxed">{project.description}</p>
            </div>
          ))}
        </section>
      )}

      {/* Internship / Attachment */}
      {data.internships && data.internships.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2 border-b border-gray-200 pb-1">
            Internship / Industrial Attachment
          </h2>
          {data.internships.map((intern, index) => (
            <div key={index} className="mb-3">
              <p className="text-sm font-semibold text-gray-900">
                {intern.role} — {intern.company}
              </p>
              <p className="text-xs text-gray-500 mb-1">
                {intern.location} | {intern.dates}
              </p>
              <ul className="list-disc list-inside text-sm space-y-0.5">
                {intern.details.map((item, i) => (
                  <li key={i} className="leading-relaxed">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* Skills */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2 border-b border-gray-200 pb-1">
          Key Skills
        </h2>
        <ul className="list-disc list-inside text-sm space-y-1">
          {data.skills.map((skill, index) => (
            <li key={index}>{skill}</li>
          ))}
        </ul>
      </section>

      {/* Extracurricular Activities */}
      {data.activities && data.activities.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2 border-b border-gray-200 pb-1">
            Extracurricular Activities
          </h2>
          <ul className="list-disc list-inside text-sm space-y-1">
            {data.activities.map((activity, index) => (
              <li key={index}>{activity}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Referees */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-2 border-b border-gray-200 pb-1">
          Referees
        </h2>
        <p className="text-sm text-gray-700">Available upon request.</p>
      </section>
    </div>
  );
}
