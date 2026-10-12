/**
 * Modern Professional Cover Letter Template
 * Clean, sans-serif layout with structured spacing and polished hierarchy.
 * A4 size: 794px × 1123px — matches CV template dimensions exactly.
 * Ideal for private sector, marketing, business, and mid-level professional roles.
 */

import React from 'react';

export interface ModernLetterData {
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
  data: ModernLetterData;
}

export default function ModernProfessionalLetter({ data }: Props) {
  return (
    <div className="w-[794px] h-[1123px] bg-white px-16 py-14 font-sans text-gray-800 shadow-lg print:shadow-none overflow-hidden">

      {/* Header — name prominent, contact grouped cleanly below */}
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">
          {data.name}
        </h1>
        <div className="flex gap-6 text-sm text-gray-500 flex-wrap">
          <span>{data.phone}</span>
          <span>{data.email}</span>
          <span>{data.location}</span>
        </div>
        {/* Accent line under header */}
        <div className="mt-4 h-[2px] w-16 bg-gray-800 rounded" />
      </header>

      {/* Date */}
      <p className="text-sm text-gray-500 mb-8">{data.date}</p>

      {/* Employer block */}
      <div className="text-sm text-gray-700 mb-9 space-y-0.5">
        <p className="font-semibold text-gray-900">{data.hiringManager || 'Hiring Manager'}</p>
        <p>{data.company}</p>
        <p className="text-gray-500">{data.companyAddress}</p>
      </div>

      {/* Salutation */}
      <p className="text-sm mb-7">
        Dear {data.hiringManager || 'Hiring Manager'},
      </p>

      {/* Body paragraphs */}
      <div className="text-sm space-y-6 mb-10 leading-relaxed text-gray-800">
        <p>{data.paragraph1}</p>
        <p>{data.paragraph2}</p>
        <p>{data.paragraph3}</p>
      </div>

      {/* Closing */}
      <div className="text-sm">
        <p className="mb-10 text-gray-700">Sincerely,</p>
        <p className="font-semibold text-gray-900">{data.name}</p>
      </div>

    </div>
  );
}
