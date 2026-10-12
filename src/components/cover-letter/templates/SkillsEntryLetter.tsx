/**
 * Skills-Focused Entry-Level Cover Letter Template
 * For candidates with little or no formal experience but real, demonstrable skills.
 * A4 size: 794px x 1123px — matches CV template dimensions exactly.
 * Tone: Confident, capable, beginner-friendly.
 */

import React from 'react';

export interface SkillsEntryLetterData {
  name: string;
  phone: string;
  email: string;
  location: string;
  date: string;
  hiringManager: string;
  company: string;
  companyAddress: string;
  keySkills: string;
  paragraph1: string;
  paragraph2: string;
  paragraph3: string;
}

interface Props {
  data: SkillsEntryLetterData;
}

export default function SkillsEntryLetter({ data }: Props) {
  return (
    <div className="w-[794px] h-[1123px] bg-white px-16 py-12 font-sans text-gray-800 shadow-lg print:shadow-none overflow-hidden">

      {/* Header — name + accent bar */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
          {data.name}
        </h1>
        {/* Accent underline — signals confidence and capability */}
        <div className="w-12 h-1 bg-blue-500 rounded mb-3" />
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

      {/* Body — relaxed spacing, confident tone */}
      <div className="text-sm space-y-5 mb-8 leading-relaxed text-gray-800">
        <p>{data.paragraph1}</p>
        <p>{data.paragraph2}</p>
        <p>{data.paragraph3}</p>
      </div>

      {/* Key Skills Section — visual highlight */}
      {data.keySkills && (
        <div className="mb-8 p-4 bg-gray-50 rounded border border-gray-200">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Key Skills
          </p>
          <p className="text-sm text-gray-800">{data.keySkills}</p>
        </div>
      )}

      {/* Closing */}
      <div className="text-sm">
        <p className="mb-8 text-gray-700">Sincerely,</p>
        <p className="font-semibold text-gray-900">{data.name}</p>
      </div>

    </div>
  );
}
