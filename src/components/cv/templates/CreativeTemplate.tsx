import React from "react";

interface CreativeTemplateProps {
  data: {
    name: string;
    tagline: string;
    contact: {
      location: string;
      phone: string;
      email: string;
      website: string;
    };
    profile: string;
    skills: string[];
    tools: string[];
    projects: Array<{
      title: string;
      client: string;
      year: string;
      description: string;
    }>;
    experience: Array<{
      role: string;
      company: string;
      location: string;
      dates: string;
      description?: string;
    }>;
    education: Array<{
      degree: string;
      institution: string;
      dates: string;
    }>;
    awards?: string[];
    languages?: string[];
    interests?: string[];
    clients?: string[];
    professionalMemberships?: string[];
    photoUrl?: string;
  };
}

export default function CreativeTemplate({ data }: CreativeTemplateProps) {
  return (
    <div className="w-[794px] min-h-[1123px] bg-white grid grid-cols-3 overflow-visible">
      {/* Sidebar */}
      <aside className="col-span-1 bg-indigo-600 text-white p-8">
        {data.photoUrl && (
          <div className="flex justify-center mb-4">
            <img src={data.photoUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-indigo-300" />
          </div>
        )}
        <h1 className="text-2xl font-bold leading-tight">{data.name}</h1>
        <p className="text-sm opacity-90 mb-6 mt-2">{data.tagline}</p>

        <div className="text-sm mb-6 space-y-1">
          <p>{data.contact.location}</p>
          <p>{data.contact.phone}</p>
          <p className="break-words">{data.contact.email}</p>
          <p className="break-words">{data.contact.website}</p>
        </div>

        {/* Skills */}
        <section className="mb-6">
          <h2 className="font-semibold mb-2 text-base">Core Skills</h2>
          <ul className="text-sm space-y-1">
            {data.skills.map((skill, index) => (
              <li key={index}>• {skill}</li>
            ))}
          </ul>
        </section>

        {/* Tools */}
        <section className="mb-6">
          <h2 className="font-semibold mb-2 text-base">Design Tools</h2>
          <ul className="text-sm space-y-1">
            {data.tools.map((tool, index) => (
              <li key={index}>• {tool}</li>
            ))}
          </ul>
        </section>

        {/* Languages */}
        {data.languages && data.languages.length > 0 && (
          <section className="mb-6">
            <h2 className="font-semibold mb-2 text-base">Languages</h2>
            <ul className="text-sm space-y-1">
              {data.languages.map((lang, index) => (
                <li key={index}>{lang}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Interests */}
        {data.interests && data.interests.length > 0 && (
          <section>
            <h2 className="font-semibold mb-2 text-base">Interests</h2>
            <ul className="text-sm space-y-1">
              {data.interests.map((interest, index) => (
                <li key={index}>• {interest}</li>
              ))}
            </ul>
          </section>
        )}
      </aside>

      {/* Main Content */}
      <main className="col-span-2 p-10 text-gray-800">
        {/* Profile */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold border-b-2 border-indigo-600 pb-1 mb-2">
            Creative Profile
          </h2>
          <p className="text-sm leading-relaxed">{data.profile}</p>
        </section>

        {data.projects?.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold border-b-2 border-indigo-600 pb-1 mb-3">
            Portfolio Projects
          </h2>

          {data.projects.map((project, index) => (
            <div key={index} className="mb-4">
              <p className="font-semibold text-sm">{project.title}</p>
              <p className="text-xs text-gray-500 mb-1">
                {project.client} | {project.year}
              </p>
              <p className="text-sm leading-relaxed">{project.description}</p>
            </div>
          ))}
        </section>
        )}

        {/* Work Experience */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold border-b-2 border-indigo-600 pb-1 mb-2">
            Work Experience
          </h2>

          {data.experience.map((job, index) => (
            <div key={index} className="mb-3">
              <p className="text-sm font-semibold">
                {job.role} — {job.company}
              </p>
              <p className="text-xs text-gray-500 mb-1">
                {job.location} | {job.dates}
              </p>
              {job.description && (
                <p className="text-sm leading-relaxed">{job.description}</p>
              )}
            </div>
          ))}
        </section>

        {/* Education */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold border-b-2 border-indigo-600 pb-1 mb-2">
            Education
          </h2>

          {data.education.map((edu, index) => (
            <div key={index}>
              <p className="text-sm font-semibold">{edu.degree}</p>
              <p className="text-sm">{edu.institution}</p>
              <p className="text-xs text-gray-500">{edu.dates}</p>
            </div>
          ))}
        </section>

        {/* Awards */}
        {data.awards && data.awards.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold border-b-2 border-indigo-600 pb-1 mb-2">
              Awards & Recognition
            </h2>
            <ul className="text-sm space-y-1">
              {data.awards.map((award, index) => (
                <li key={index}>• {award}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Notable Clients */}
        {data.clients && data.clients.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold border-b-2 border-indigo-600 pb-1 mb-2">
              Notable Clients
            </h2>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              {data.clients.map((client, index) => (
                <div key={index}>• {client}</div>
              ))}
            </div>
          </section>
        )}

        {/* Professional Memberships */}
        {data.professionalMemberships && data.professionalMemberships.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold border-b-2 border-indigo-600 pb-1 mb-2">
              Professional Memberships
            </h2>
            <ul className="text-sm space-y-1">
              {data.professionalMemberships.map((membership, index) => (
                <li key={index}>• {membership}</li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
