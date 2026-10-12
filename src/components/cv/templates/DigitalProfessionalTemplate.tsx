import React from "react";

interface DigitalProfessionalData {
  name: string;
  title: string;
  contact: {
    location: string;
    phone: string;
    email: string;
    github: string;
    linkedin?: string;
  };
  summary: string;
  techStack: string[];
  tools: string[];
  certifications: string[];
  projects: Array<{
    name: string;
    tech: string;
    description: string;
    link?: string;
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
    gpa?: string;
  }>;
  achievements?: string[];
  languages?: string[];
  openSource?: string[];
  technicalWriting?: string[];
  volunteerWork?: string[];
  photoUrl?: string;
}

interface DigitalProfessionalTemplateProps {
  data: DigitalProfessionalData;
}

export default function DigitalProfessionalTemplate({ data }: DigitalProfessionalTemplateProps) {
  return (
    <div className="w-[794px] min-h-[1123px] bg-white grid grid-cols-3 text-gray-800 overflow-visible">
      {/* Sidebar */}
      <aside className="col-span-1 bg-gray-900 text-white p-6">
        {data.photoUrl && (
          <div className="flex justify-center mb-4">
            <img src={data.photoUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-gray-600" />
          </div>
        )}
        <h1 className="text-xl font-bold leading-tight">{data.name}</h1>
        <p className="text-sm text-gray-300 mb-5">{data.title}</p>

        <div className="text-xs mb-5 space-y-1 leading-relaxed">
          <p className="break-words">{data.contact.location}</p>
          <p className="break-words">{data.contact.phone}</p>
          <p className="break-words">{data.contact.email}</p>
          <p className="break-words">{data.contact.github}</p>
          {data.contact.linkedin && (
            <p className="break-words">{data.contact.linkedin}</p>
          )}
        </div>

        {/* Tech Stack */}
        <section className="mb-5">
          <h2 className="font-semibold mb-2 text-sm border-b border-gray-700 pb-1">
            Tech Stack
          </h2>
          <ul className="text-xs space-y-1">
            {data.techStack.map((tech, index) => (
              <li key={index} className="leading-relaxed">
                • {tech}
              </li>
            ))}
          </ul>
        </section>

        {/* Tools */}
        <section className="mb-5">
          <h2 className="font-semibold mb-2 text-sm border-b border-gray-700 pb-1">
            Tools & Platforms
          </h2>
          <ul className="text-xs space-y-1">
            {data.tools.map((tool, index) => (
              <li key={index} className="leading-relaxed">
                • {tool}
              </li>
            ))}
          </ul>
        </section>

        {/* Certifications */}
        <section className="mb-5">
          <h2 className="font-semibold mb-2 text-sm border-b border-gray-700 pb-1">
            Certifications
          </h2>
          <ul className="text-xs space-y-1.5">
            {data.certifications.map((cert, index) => (
              <li key={index} className="leading-relaxed">
                • {cert}
              </li>
            ))}
          </ul>
        </section>

        {/* Languages */}
        {data.languages && data.languages.length > 0 && (
          <section>
            <h2 className="font-semibold mb-2 text-sm border-b border-gray-700 pb-1">
              Languages
            </h2>
            <ul className="text-xs space-y-1">
              {data.languages.map((lang, index) => (
                <li key={index} className="leading-relaxed">
                  {lang}
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>

      {/* Main Content */}
      <main className="col-span-2 p-8">
        {/* Summary */}
        <section className="mb-5">
          <h2 className="text-base font-semibold border-b-2 border-gray-900 pb-1 mb-2">
            Professional Summary
          </h2>
          <p className="text-xs leading-relaxed">{data.summary}</p>
        </section>

        {/* Projects */}
        <section className="mb-5">
          <h2 className="text-base font-semibold border-b-2 border-gray-900 pb-1 mb-2">
            Key Projects
          </h2>

          {data.projects.map((project, index) => (
            <div key={index} className="mb-3">
              <p className="text-xs font-semibold">{project.name}</p>
              <p className="text-[10px] text-gray-600 italic mb-0.5">
                {project.tech}
              </p>
              <p className="text-xs leading-relaxed">{project.description}</p>
              {project.link && (
                <p className="text-[10px] text-gray-600 mt-0.5">{project.link}</p>
              )}
            </div>
          ))}
        </section>

        {/* Experience */}
        <section className="mb-5">
          <h2 className="text-base font-semibold border-b-2 border-gray-900 pb-1 mb-2">
            Professional Experience
          </h2>

          {data.experience.map((job, index) => (
            <div key={index} className="mb-3">
              <p className="text-xs font-semibold">
                {job.role} — {job.company}
              </p>
              <p className="text-[10px] text-gray-600 mb-1">
                {job.location} | {job.dates}
              </p>
              {job.responsibilities && job.responsibilities.length > 0 && (
                <ul className="text-xs space-y-0.5 ml-3">
                  {job.responsibilities.map((resp, idx) => (
                    <li key={idx} className="leading-relaxed">
                      • {resp}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>

        {/* Education */}
        <section className="mb-5">
          <h2 className="text-base font-semibold border-b-2 border-gray-900 pb-1 mb-2">
            Education
          </h2>

          {data.education.map((edu, index) => (
            <div key={index} className="mb-2">
              <p className="text-xs font-semibold">{edu.degree}</p>
              <p className="text-xs">{edu.institution}</p>
              <p className="text-[10px] text-gray-600">
                {edu.dates}
                {edu.gpa && ` | GPA: ${edu.gpa}`}
              </p>
            </div>
          ))}
        </section>

        {/* Achievements */}
        {data.achievements && data.achievements.length > 0 && (
          <section className="mb-5">
            <h2 className="text-base font-semibold border-b-2 border-gray-900 pb-1 mb-2">
              Key Achievements
            </h2>
            <ul className="text-xs space-y-1">
              {data.achievements.map((achievement, index) => (
                <li key={index} className="leading-relaxed">
                  • {achievement}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Open Source Contributions */}
        {data.openSource && data.openSource.length > 0 && (
          <section className="mb-5">
            <h2 className="text-base font-semibold border-b-2 border-gray-900 pb-1 mb-2">
              Open Source Contributions
            </h2>
            <ul className="text-xs space-y-1">
              {data.openSource.map((contribution, index) => (
                <li key={index} className="leading-relaxed">
                  • {contribution}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Technical Writing */}
        {data.technicalWriting && data.technicalWriting.length > 0 && (
          <section className="mb-5">
            <h2 className="text-base font-semibold border-b-2 border-gray-900 pb-1 mb-2">
              Technical Writing & Publications
            </h2>
            <ul className="text-xs space-y-1">
              {data.technicalWriting.map((article, index) => (
                <li key={index} className="leading-relaxed">
                  • {article}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Volunteer Work */}
        {data.volunteerWork && data.volunteerWork.length > 0 && (
          <section>
            <h2 className="text-base font-semibold border-b-2 border-gray-900 pb-1 mb-2">
              Volunteer & Community Work
            </h2>
            <ul className="text-xs space-y-1">
              {data.volunteerWork.map((work, index) => (
                <li key={index} className="leading-relaxed">
                  • {work}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
