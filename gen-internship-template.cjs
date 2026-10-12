const fs = require('fs');
const path = require('path');

// 1. InternshipLetter.tsx
const component = `/**
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
`;

// 2. internshipLetterSchema.ts
const schema = `import { FieldSchema } from './classicLetterSchema';

export const internshipLetterSchema: Record<string, FieldSchema> = {
  name:             { label: 'Full Name',              type: 'text',     placeholder: 'e.g. Brian Otieno Ochieng' },
  phone:            { label: 'Phone Number',            type: 'text',     placeholder: 'e.g. +254 712 444 999' },
  email:            { label: 'Email Address',           type: 'text',     placeholder: 'e.g. brian.otieno@email.com' },
  location:         { label: 'Location',                type: 'text',     placeholder: 'e.g. Kisumu, Kenya' },
  course:           { label: 'Course / Programme',      type: 'text',     placeholder: 'e.g. Diploma in Electrical Engineering' },
  institution:      { label: 'University / College',    type: 'text',     placeholder: 'e.g. Kenya Technical Trainers College' },
  attachmentPeriod: {
    label: 'Attachment Period',
    type: 'text',
    placeholder: 'e.g. May 2026 – August 2026',
    hint: 'Enter the start and end months of your required attachment period.',
  },
  date:             { label: 'Date',                    type: 'text',     placeholder: 'e.g. 24 March 2026' },
  hiringManager:    { label: 'Recipient Name / Title',  type: 'text',     placeholder: 'e.g. Hiring Manager' },
  company:          { label: 'Company / Organisation',  type: 'text',     placeholder: 'e.g. Kenya Power & Lighting Company' },
  companyAddress:   { label: 'Company Address',         type: 'text',     placeholder: 'e.g. P.O. Box 30099, Nairobi' },
  paragraph1: {
    label: 'Opening — Course, institution & attachment period',
    type: 'textarea',
    placeholder: 'State your course, institution, and the attachment period you are seeking.',
    hint: 'Mention your course, institution, and required attachment period — this is what employers expect to see first.',
  },
  paragraph2: {
    label: 'Middle — Skills & practical knowledge',
    type: 'textarea',
    placeholder: 'Describe relevant skills, lab work, or practical training from your coursework.',
    hint: 'List specific technical skills or hands-on experience from your studies — even lab sessions count.',
  },
  paragraph3: {
    label: 'Closing — Why this organisation',
    type: 'textarea',
    placeholder: 'Show interest in the organisation and express your willingness to learn.',
    hint: 'Keep to 2–3 lines. Mention availability and eagerness to contribute.',
  },
};
`;

// 3. internshipLetterPreviewData.ts
const previewData = `import { InternshipLetterData } from '@/components/cover-letter/templates/InternshipLetter';

export const internshipLetterPreviewData: InternshipLetterData = {
  name: 'Brian Otieno Ochieng',
  phone: '+254 712 444 999',
  email: 'brian.otieno@email.com',
  location: 'Kisumu, Kenya',

  course: 'Diploma in Electrical Engineering',
  institution: 'Kenya Technical Trainers College',
  attachmentPeriod: 'May 2026 – August 2026',

  date: '24 March 2026',

  hiringManager: 'Hiring Manager',
  company: 'Kenya Power & Lighting Company',
  companyAddress: 'P.O. Box 30099, Nairobi',

  paragraph1:
    'I am currently pursuing a Diploma in Electrical Engineering at Kenya Technical Trainers College and am seeking an industrial attachment opportunity at Kenya Power & Lighting Company for the period May 2026 to August 2026. My institution requires students to complete a three-month industrial attachment as part of the programme, and I am eager to gain practical experience in a reputable organisation such as yours.',

  paragraph2:
    'Through my coursework, I have gained practical knowledge in electrical installations, circuit analysis, and equipment maintenance. I have also participated in hands-on laboratory sessions that have strengthened my technical and problem-solving skills. I am proficient in reading electrical diagrams and have a solid understanding of electrical safety procedures.',

  paragraph3:
    'I am eager to gain practical industry experience at Kenya Power & Lighting Company and would greatly appreciate the opportunity to contribute while learning from your experienced team. I am available to start in May 2026 and am committed to making a positive contribution during my attachment period.',
};
`;

const base = path.join(__dirname, 'src');

fs.writeFileSync(path.join(base, 'components', 'cover-letter', 'templates', 'InternshipLetter.tsx'), component, 'utf8');
fs.writeFileSync(path.join(base, 'schemas', 'internshipLetterSchema.ts'), schema, 'utf8');
fs.writeFileSync(path.join(base, 'data', 'internshipLetterPreviewData.ts'), previewData, 'utf8');

console.log('Done. Files written:');
console.log(' - InternshipLetter.tsx:', fs.statSync(path.join(base, 'components', 'cover-letter', 'templates', 'InternshipLetter.tsx')).size, 'bytes');
console.log(' - internshipLetterSchema.ts:', fs.statSync(path.join(base, 'schemas', 'internshipLetterSchema.ts')).size, 'bytes');
console.log(' - internshipLetterPreviewData.ts:', fs.statSync(path.join(base, 'data', 'internshipLetterPreviewData.ts')).size, 'bytes');
