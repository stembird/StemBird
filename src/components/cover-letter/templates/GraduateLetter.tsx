/**
 * Graduate / Entry-Level Cover Letter Template
 * Focuses on education, projects, and potential instead of experience.
 * A4 size: 794px x 1123px — matches CV template dimensions exactly.
 * Tone: Eager, growth-oriented, beginner-friendly.
 */

import React from 'react';

export interface GraduateLetterData {
  name: string;
  phone: string;
  email: string;
  location: string;
  date: string;
  hiringManager: string;
  company: string;
  companyAddress: string;
  paragraph1: string;
  paragraph2: string;
  paragraph3: string;
}

interface Props {
  data: GraduateLetterData;
}

export default function GraduateLetter({ data }: Props) {
  return (
    <div className="w-[794px] h-[1123px] bg-white px-16 py-12 font-sans text-gray-800 shadow-lg print:shadow-none overflow-hidden">

      {/* Header — name + accent bar */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
          {data.name}
        </h1>
        {/* Accent underline — signals fresh, modern energy */}
        <div className="w-12 h-1 bg-emerald-500 rounded mb-3" />
        <div className="flex gap-5 text-sm text-gray-500 flex-wrap">
          <span>{data.phone}</span>
          <span>{data.email}</span>
          <span>{data.location}</span>
        </div>
      </header>

      {/* Date */}
      <p className="text-sm text-gray-500 mb-6">{data.date}</p>

      {/* Employer block */}
      <div className="text-sm text-gray-700 mb-7 space-y-0.5">
        <p className="font-medium text-gray-900">{data.hiringManager || 'Hiring Manager'}</p>
        <p>{data.company}</p>
        <p className="text-gray-500">{data.companyAddress}</p>
      </div>

      {/* Salutation */}
      <p className="text-sm mb-6">
        Dear {data.hiringManager || 'Hiring Manager'},
      </p>

      {/* Body — relaxed spacing, warm tone */}
      <div className="text-sm space-y-5 mb-8 leading-relaxed text-gray-800">
        <p>{data.paragraph1}</p>
        <p>{data.paragraph2}</p>
        <p>{data.paragraph3}</p>
      </div>

      {/* Closing */}
      <div className="text-sm">
        <p className="mb-8 text-gray-700">Sincerely,</p>
        <p className="font-semibold text-gray-900">{data.name}</p>
      </div>

    </div>
  );
}
