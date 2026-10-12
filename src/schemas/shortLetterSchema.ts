import { FieldSchema } from './classicLetterSchema';

export const shortLetterSchema: Record<string, FieldSchema> = {
  name:           { label: 'Full Name',           type: 'text',     placeholder: 'e.g. David Otieno Mwangi' },
  phone:          { label: 'Phone Number',         type: 'text',     placeholder: 'e.g. +254 700 123 456' },
  email:          { label: 'Email Address',        type: 'text',     placeholder: 'e.g. david@email.com' },
  location:       { label: 'Location',             type: 'text',     placeholder: 'e.g. Nairobi, Kenya' },
  date:           { label: 'Date',                 type: 'text',     placeholder: 'e.g. 24 March 2026' },
  hiringManager:  { label: 'Hiring Manager Name',  type: 'text',     placeholder: 'e.g. Hiring Manager' },
  company:        { label: 'Company Name',         type: 'text',     placeholder: 'e.g. TechNova Ltd' },
  companyAddress: { label: 'Company Address',      type: 'text',     placeholder: 'e.g. P.O. Box 98765, Nairobi' },
  paragraph1: {
    label: 'Opening — Who you are & the role',
    type: 'textarea',
    placeholder: 'State the role, your experience, and one key result.',
    hint: 'Keep to 2–3 lines. Lead with impact.',
  },
  paragraph2: {
    label: 'Middle — What you bring',
    type: 'textarea',
    placeholder: 'Highlight your strongest skill or achievement.',
    hint: 'Keep to 2–3 lines. Be specific and confident.',
  },
  paragraph3: {
    label: 'Closing — Why this company',
    type: 'textarea',
    placeholder: 'Show enthusiasm and invite a conversation.',
    hint: 'Keep to 1–2 lines. End with energy.',
  },
};
