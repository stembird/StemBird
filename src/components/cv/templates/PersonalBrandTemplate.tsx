import React from "react";

interface PersonalBrandData {
  name: string;
  tagline: string;
  contact: {
    location: string;
    phone: string;
    email: string;
  };
  social: string[];
  profile: string;
  skills: string[];
  publications: Array<string | {
    title?: string;
    platform?: string;
    year?: string;
  }>;
  speaking: Array<string | {
    event?: string;
    location?: string;
    year?: string;
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
  certifications?: string[];
  awards?: string[];
  mediaFeatures?: string[];
  clientTestimonials?: string[];
  professionalAffiliations?: string[];
  photoUrl?: string;
}

interface PersonalBrandTemplateProps {
  data: PersonalBrandData;
}

export default function PersonalBrandTemplate({ data }: PersonalBrandTemplateProps) {
  return (
    <div className="w-[794px] min-h-[1123px] bg-white text-gray-800 overflow-visible">
      {/* Header */}
      <header className="bg-indigo-600 text-white p-6">
        <div className="flex items-center gap-4">
          {data.photoUrl && (
            <img src={data.photoUrl} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-white flex-shrink-0" />
          )}
          <div>
            <h1 className="text-3xl font-bold">{data.name}</h1>
            <p className="text-lg mt-1">{data.tagline}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-3">
        {/* Sidebar */}
        <aside className="col-span-1 bg-gray-100 p-6">
          <section className="mb-5">
            <h2 className="font-semibold text-sm mb-2 text-indigo-700">CONTACT</h2>
            <p className="text-xs leading-relaxed">{data.contact.location}</p>
            <p className="text-xs leading-relaxed">{data.contact.phone}</p>
            <p className="text-xs leading-relaxed break-words">{data.contact.email}</p>
          </section>

          {data.social?.length > 0 && (
          <section className="mb-5">
            <h2 className="font-semibold text-sm mb-2 text-indigo-700">ONLINE PRESENCE</h2>
            <ul className="text-xs space-y-1">
              {data.social.map((item, index) => (
                <li key={index} className="break-words leading-relaxed">{item}</li>
              ))}
            </ul>
          </section>
          )}

          <section className="mb-5">
            <h2 className="font-semibold text-sm mb-2 text-indigo-700">KEY SKILLS</h2>
            <ul className="text-xs space-y-1">
              {data.skills.map((skill, index) => (
                <li key={index}>• {skill}</li>
              ))}
            </ul>
          </section>

          {data.certifications && data.certifications.length > 0 && (
            <section>
              <h2 className="font-semibold text-sm mb-2 text-indigo-700">CERTIFICATIONS</h2>
              <ul className="text-xs space-y-1">
                {data.certifications.map((cert, index) => (
                  <li key={index} className="leading-relaxed">• {cert}</li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        {/* Main Content */}
        <main className="col-span-2 p-6">
          {/* Profile */}
          <section className="mb-5">
            <h2 className="text-base font-semibold border-b-2 border-indigo-600 pb-1 mb-2">
              PERSONAL PROFILE
            </h2>
            <p className="text-xs leading-relaxed">{data.profile}</p>
          </section>

          {data.publications?.length > 0 && (
          <section className="mb-5">
            <h2 className="text-base font-semibold border-b-2 border-indigo-600 pb-1 mb-2">
              PUBLICATIONS & MEDIA
            </h2>
            {data.publications.map((item, index) => (
              <div key={index} className="mb-2">
                {typeof item === 'string' ? (
                  <p className="text-xs font-semibold">{item}</p>
                ) : (
                  <>
                    <p className="text-xs font-semibold">{item.title}</p>
                    <p className="text-xs text-gray-600">
                      {[item.platform, item.year].filter(Boolean).join(' | ')}
                    </p>
                  </>
                )}
              </div>
            ))}
          </section>
          )}

          {data.speaking?.length > 0 && (
          <section className="mb-5">
            <h2 className="text-base font-semibold border-b-2 border-indigo-600 pb-1 mb-2">
              SPEAKING ENGAGEMENTS
            </h2>
            {data.speaking.map((talk, index) => (
              <div key={index} className="mb-2">
                {typeof talk === 'string' ? (
                  <p className="text-xs font-semibold">{talk}</p>
                ) : (
                  <>
                    <p className="text-xs font-semibold">{talk.event}</p>
                    <p className="text-xs text-gray-600">
                      {[talk.location, talk.year].filter(Boolean).join(' | ')}
                    </p>
                  </>
                )}
              </div>
            ))}
          </section>
          )}

          {/* Experience */}
          <section className="mb-5">
            <h2 className="text-base font-semibold border-b-2 border-indigo-600 pb-1 mb-2">
              PROFESSIONAL EXPERIENCE
            </h2>
            {data.experience.map((job, index) => (
              <div key={index} className="mb-3">
                <p className="text-xs font-semibold">
                  {job.role} — {job.company}
                </p>
                <p className="text-xs text-gray-600 mb-1">
                  {job.location} | {job.dates}
                </p>
                {job.description && (
                  <p className="text-xs leading-relaxed">{job.description}</p>
                )}
              </div>
            ))}
          </section>

          {/* Education */}
          <section className="mb-5">
            <h2 className="text-base font-semibold border-b-2 border-indigo-600 pb-1 mb-2">
              EDUCATION
            </h2>
            {data.education.map((edu, index) => (
              <div key={index} className="mb-2">
                <p className="text-xs font-semibold">{edu.degree}</p>
                <p className="text-xs">{edu.institution}</p>
                <p className="text-xs text-gray-600">{edu.dates}</p>
              </div>
            ))}
          </section>

          {/* Awards */}
          {data.awards && data.awards.length > 0 && (
            <section className="mb-5">
              <h2 className="text-base font-semibold border-b-2 border-indigo-600 pb-1 mb-2">
                AWARDS & RECOGNITION
              </h2>
              <ul className="text-xs space-y-1">
                {data.awards.map((award, index) => (
                  <li key={index} className="leading-relaxed">• {award}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Media Features */}
          {data.mediaFeatures && data.mediaFeatures.length > 0 && (
            <section className="mb-5">
              <h2 className="text-base font-semibold border-b-2 border-indigo-600 pb-1 mb-2">
                MEDIA FEATURES
              </h2>
              <ul className="text-xs space-y-1">
                {data.mediaFeatures.map((feature, index) => (
                  <li key={index} className="leading-relaxed">• {feature}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Client Testimonials */}
          {data.clientTestimonials && data.clientTestimonials.length > 0 && (
            <section className="mb-5">
              <h2 className="text-base font-semibold border-b-2 border-indigo-600 pb-1 mb-2">
                CLIENT TESTIMONIALS
              </h2>
              {data.clientTestimonials.map((testimonial, index) => (
                <p key={index} className="text-xs leading-relaxed mb-2 italic">
                  "{testimonial}"
                </p>
              ))}
            </section>
          )}

          {/* Professional Affiliations */}
          {data.professionalAffiliations && data.professionalAffiliations.length > 0 && (
            <section>
              <h2 className="text-base font-semibold border-b-2 border-indigo-600 pb-1 mb-2">
                PROFESSIONAL AFFILIATIONS
              </h2>
              <ul className="text-xs space-y-1">
                {data.professionalAffiliations.map((affiliation, index) => (
                  <li key={index} className="leading-relaxed">• {affiliation}</li>
                ))}
              </ul>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
