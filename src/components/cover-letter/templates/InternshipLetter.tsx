/**
 * Internship / Attachment Cover Letter Template
 * Tailored for university and TVET students applying for industrial attachment.
 * Key fields: course, institution, attachmentPeriod.
 * A4 size: 794px x 1123px — matches CV template dimensions exactly.
 * Tone: Motivated, student-appropriate, professional yet accessible.
 */

import React from 'react';

export interface InternshipLetterData {
  name: string;
  phone: string;
  email: string;
  location: string;
  date: string;
  hiringManager: string;
  company: string;
  companyAddress: string;
  course: string;
  institution: string;
  attachmentPeriod: string;
  paragraph1: string;
  paragraph2: string;
  paragraph3: string;
}

interface Props {
  data: InternshipLetterData;
}

export default function InternshipLetter({ data }: Props) {
  return (
    <div className="w-[794px] h-[1123px] bg-white px-16 py-14 font-sans text-gray-800 shadow-lg print:shadow-none overflow-hidden">

      {/* Header */}
      <header className="mb-9">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1.5">
          {data.name}
        </h1>
        {/* Course + institution line — key student context */}
        {(data.course || data.institution) && (
          <p className="text-sm text-gray-600 italic mb-2">
            {[data.course, data.institution].filter(Boolean).join(' — ')}
          </p>
        )}
        <div className="flex gap-5 text-sm text-gray-500 flex-wrap">
          <span>{data.phone}</span>
          <span>{data.email}</span>
          <span>{data.location}</span>
        </div>
        <div className="mt-4 h-[1.5px] w-12 bg-gray-400 rounded" />
      </header>

      {/* Date */}
      <p className="text-sm text-gray-500 mb-8">{data.date}</p>

      {/* Employer block */}
      <div className="text-sm text-gray-700 mb-9 space-y-0.5">
        <p className="font-semibold text-gray-900">{data.hiringManager || 'The Attachment Supervisor'}</p>
        <p>{data.company}</p>
        <p className="text-gray-500">{data.companyAddress}</p>
      </div>

      {/* Salutation */}
      <p className="text-sm mb-7">
        Dear {data.hiringManager || 'Sir/Madam'},
      </p>

      {/* Body */}
      <div className="text-sm space-y-6 mb-12 leading-[1.85] text-gray-800">
        <p>{data.paragraph1}</p>
        <p>{data.paragraph2}</p>
        <p>{data.paragraph3}</p>
      </div>

      {/* Closing */}
      <div className="text-sm">
        <p className="mb-10 text-gray-700">Yours faithfully,</p>
        <p className="font-semibold text-gray-900">{data.name}</p>
      </div>

    </div>
  );
}
