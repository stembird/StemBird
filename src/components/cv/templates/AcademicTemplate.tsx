import React from "react";

interface AcademicData {
  name: string;
  title: string;
  contact: {
    institution: string;
    location: string;
    email: string;
    phone?: string;
    orcid?: string;
    researchgate?: string;
  };
  profile: string;
  researchInterests: string[];
  positions: Array<{
    role: string;
    institution: string;
    department?: string;
    location: string;
    dates: string;
  }>;
  publications: Array<string | { title?: string; platform?: string; year?: string }>;
  conferences: string[];
  education: Array<{
    degree: string;
    institution: string;
    thesis?: string;
    dates: string;
  }>;
  grants?: string[];
  awards?: string[];
  photoUrl?: string;
}

interface AcademicTemplateProps {
  data: AcademicData;
}

export default function AcademicTemplate({ data }: AcademicTemplateProps) {
  return (
    <div className="w-[794px] min-h-[1123px] bg-white p-10 text-gray-900 overflow-visible">
      {/* Header */}
      <header className="mb-5 border-b-2 border-gray-800 pb-4">
        <div className="flex items-start gap-4">
          {data.photoUrl && (
            <img src={data.photoUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover border border-gray-300 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{data.name}</h1>
            <p className="text-sm mt-1 text-gray-700 italic">{data.title}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-gray-600">
          <span>{data.contact.institution}</span>
          <span>{data.contact.location}</span>
          <span>{data.contact.email}</span>
          {data.contact.phone && <span>{data.contact.phone}</span>}
          {data.contact.orcid && <span>ORCID: {data.contact.orcid}</span>}
          {data.contact.researchgate && <span>{data.contact.researchgate}</span>}
        </div>
      </header>

      {/* Academic Profile */}
      <section className="mb-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-800 border-b border-gray-400 pb-1 mb-2">
          Academic Profile
        </h2>
        <p className="text-xs leading-relaxed">{data.profile}</p>
      </section>

      {data.researchInterests?.length > 0 && (
      <section className="mb-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-800 border-b border-gray-400 pb-1 mb-2">
          Research Interests
        </h2>
        <ul className="text-xs list-disc ml-5 space-y-0.5 columns-2">
          {data.researchInterests.map((interest, index) => (
            <li key={index}>{interest}</li>
          ))}
        </ul>
      </section>
      )}

      {/* Academic Positions */}
      <section className="mb-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-800 border-b border-gray-400 pb-1 mb-2">
          Academic Positions
        </h2>
        {data.positions.map((pos, index) => (
          <div key={index} className="mb-2 flex justify-between items-start">
            <div>
              <p className="text-xs font-bold">{pos.role}</p>
              <p className="text-xs">{pos.institution}{pos.department ? `, ${pos.department}` : ""}</p>
              <p className="text-xs text-gray-600">{pos.location}</p>
            </div>
            <p className="text-xs text-gray-600 whitespace-nowrap ml-4">{pos.dates}</p>
          </div>
        ))}
      </section>

      {data.publications?.length > 0 && (
      <section className="mb-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-800 border-b border-gray-400 pb-1 mb-2">
          Selected Publications
        </h2>
        <ol className="text-xs list-decimal ml-5 space-y-1">
          {data.publications.map((pub, index) => (
            <li key={index} className="leading-relaxed">
              {typeof pub === 'string' ? pub : [pub.title, pub.platform, pub.year].filter(Boolean).join(' — ')}
            </li>
          ))}
        </ol>
      </section>
      )}

      {data.conferences?.length > 0 && (
      <section className="mb-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-800 border-b border-gray-400 pb-1 mb-2">
          Conferences & Presentations
        </h2>
        <ul className="text-xs list-disc ml-5 space-y-0.5">
          {data.conferences.map((conf, index) => (
            <li key={index} className="leading-relaxed">{conf}</li>
          ))}
        </ul>
      </section>
      )}

      {/* Education */}
      <section className="mb-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-800 border-b border-gray-400 pb-1 mb-2">
          Education
        </h2>
        {data.education.map((edu, index) => (
          <div key={index} className="mb-2 flex justify-between items-start">
            <div>
              <p className="text-xs font-bold">{edu.degree}</p>
              <p className="text-xs">{edu.institution}</p>
              {edu.thesis && <p className="text-xs text-gray-600 italic">{edu.thesis}</p>}
            </div>
            <p className="text-xs text-gray-600 whitespace-nowrap ml-4">{edu.dates}</p>
          </div>
        ))}
      </section>

      {/* Grants */}
      {data.grants && data.grants.length > 0 && (
        <section className="mb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-800 border-b border-gray-400 pb-1 mb-2">
            Grants & Funding
          </h2>
          <ul className="text-xs list-disc ml-5 space-y-1">
            {data.grants.map((grant, index) => (
              <li key={index} className="leading-relaxed">{grant}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Awards */}
      {data.awards && data.awards.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-800 border-b border-gray-400 pb-1 mb-2">
            Awards & Honours
          </h2>
          <ul className="text-xs list-disc ml-5 space-y-0.5">
            {data.awards.map((award, index) => (
              <li key={index}>{award}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
