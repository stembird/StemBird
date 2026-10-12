import { FieldSchema } from './classicLetterSchema';

export const modernLetterSchema: Record<string, FieldSchema> = {
  name:           { label: 'Full Name',           type: 'text',     placeholder: 'e.g. Grace Wanjiku Mwangi' },
  phone:          { label: 'Phone Number',         type: 'text',     placeholder: 'e.g. +254 712 555 444' },
  email:          { label: 'Email Address',        type: 'text',     placeholder: 'e.g. grace@email.com' },
  location:       { label: 'Location',             type: 'text',     placeholder: 'e.g. Nairobi, Kenya' },
  date:           { label: 'Date',                 type: 'text',     placeholder: 'e.g. 24 March 2026' },
  hiringManager:  { label: 'Hiring Manager Name',  type: 'text',     placeholder: 'e.g. Hiring Manager' },
  company:        { label: 'Company Name',         type: 'text',     placeholder: 'e.g. BrightWave Marketing Ltd' },
  companyAddress: { label: 'Company Address',      type: 'text',     placeholder: 'e.g. P.O. Box 67890, Nairobi' },
  paragraph1: {
    label: 'Opening Paragraph',
    type: 'textarea',
    placeholder: 'Introduce yourself and state the role you are applying for.',
    hint: 'Keep this 3–5 lines. State the role and your key qualification.',
  },
  paragraph2: {
    label: 'Body Paragraph',
    type: 'textarea',
    placeholder: 'Highlight your most relevant experience and achievements.',
    hint: 'Keep this 3–5 lines. Focus on one or two concrete achievements.',
  },
  paragraph3: {
    label: 'Closing Paragraph',
    type: 'textarea',
    placeholder: 'Express your interest in the company and call to action.',
    hint: 'Keep this 2–3 lines. Show enthusiasm and invite a conversation.',
  },
};
