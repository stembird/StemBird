/**
 * Classic Professional Cover Letter Template
 * Formal, single-column layout for government, NGO, banking, and corporate roles.
 * A4 size: 794px × 1123px — matches CV template dimensions exactly.
 */

import React from 'react';

export interface ClassicLetterData {
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
  data: ClassicLetterData;
}

export default function ClassicProfessionalLetter({ data }: Props) {
  return (
    <div className="w-[794px] h-[1123px] bg-white px-16 py-14 font-serif text-gray-900 shadow-lg print:shadow-none overflow-hidden">

      {/* Header — name + contact */}
      <header className="mb-7 border-b border-gray-300 pb-5">
        <h1 className="text-2xl font-bold tracking-tight mb-1">{data.name}</h1>
        <div className="text-sm text-gray-600 space-y-0.5">
          <p>{data.phone}</p>
          <p>{data.email}</p>
          <p>{data.location}</p>
        </div>
      </header>

      {/* Date */}
      <p className="text-sm mb-6">{data.date}</p>

      {/* Employer block */}
      <div className="text-sm mb-7 space-y-0.5">
        <p className="font-semibold">{data.hiringManager || 'Hiring Manager'}</p>
        <p>{data.company}</p>
        <p className="text-gray-600">{data.companyAddress}</p>
      </div>

      {/* Salutation */}
      <p className="text-sm mb-6">
        Dear {data.hiringManager || 'Hiring Manager'},
      </p>

      {/* Body paragraphs */}
      <div className="text-sm space-y-5 mb-8 leading-relaxed">
        <p className="text-justify">{data.paragraph1}</p>
        <p className="text-justify">{data.paragraph2}</p>
        <p className="text-justify">{data.paragraph3}</p>
      </div>

      {/* Closing */}
      <div className="text-sm">
        <p className="mb-10">Sincerely,</p>
        <p className="font-semibold">{data.name}</p>
      </div>
    </div>
  );
}
