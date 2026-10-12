import React from "react";

interface Contact {
  location: string;
  phone: string;
  email: string;
  linkedin?: string;
}

interface Education {
  program: string;
  institution: string;
  dates: string;
}

interface Project {
  title: string;
  dates: string;
  description: string;
}

interface Attachment {
  role: string;
  organization: string;
  location: string;
  dates: string;
  details: string[];
}

interface InternshipTemplateData {
  name: string;
  title: string;
  contact: Contact;
  objective: string;
  education: Education[];
  skills: string[];
  projects?: Project[];
  attachment?: Attachment[];
  activities?: string[];
  photoUrl?: string;
}

interface InternshipTemplateProps {
  data: InternshipTemplateData;
}

export default function InternshipTemplate({ data }: InternshipTemplateProps) {
  return (
    <div className="w-[794px] min-h-[1123px] bg-white p-10 text-gray-800 overflow-visible">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-start gap-4">
          {data.photoUrl && (
            <img src={data.photoUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover border border-gray-300 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{data.name}</h1>
            <p className="text-lg text-gray-700">{data.title}</p>
            <p className="text-sm text-gray-600 mt-2">
              {data.contact.location} | {data.contact.phone} | {data.contact.email}
              {data.contact.linkedin && ` | ${data.contact.linkedin}`}
            </p>
          </div>
        </div>
      </header>

      <hr className="mb-6"/>

      {/* Career Objective */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Career Objective</h2>
        <p className="text-sm">{data.objective}</p>
      </section>

      {/* Education */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Education</h2>
        
        {data.education.map((edu, index) => (
          <div key={index} className="mb-3">
            <p className="text-sm font-semibold">{edu.program || (edu as { degree?: string }).degree}</p>
            <p className="text-sm">{edu.institution}</p>
            <p className="text-xs text-gray-500">{edu.dates}</p>
          </div>
        ))}
      </section>

      {/* Technical Skills */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Technical Skills</h2>
        
        <ul className="list-disc list-inside text-sm">
          {data.skills.map((skill, index) => (
            <li key={index}>{skill}</li>
          ))}
        </ul>
      </section>

      {/* Academic Projects / Labs */}
      {data.projects && data.projects.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Academic Projects</h2>
          
          {data.projects.map((project, index) => (
            <div key={index} className="mb-3">
              <p className="text-sm font-semibold">{project.title}</p>
              <p className="text-xs text-gray-500">{project.dates}</p>
              <p className="text-sm">{project.description}</p>
            </div>
          ))}
        </section>
      )}

      {/* Internship / Attachment */}
      {data.attachment && data.attachment.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Industrial Attachment</h2>
          
          {data.attachment.map((item, index) => (
            <div key={index} className="mb-3">
              
              <p className="text-sm font-semibold">
                {item.role} — {item.organization}
              </p>
              
              <p className="text-xs text-gray-500">
                {item.location} | {item.dates}
              </p>
              
              <ul className="list-disc list-inside text-sm mt-1">
                {item.details.map((task, i) => (
                  <li key={i}>{task}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* Activities */}
      {data.activities && data.activities.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-2">
            Extracurricular Activities
          </h2>
          
          <ul className="list-disc list-inside text-sm">
            {data.activities.map((activity, index) => (
              <li key={index}>{activity}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Referees */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Referees</h2>
        <p className="text-sm">Available upon request.</p>
      </section>
    </div>
  );
}
