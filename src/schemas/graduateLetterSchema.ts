import { FieldSchema } from './classicLetterSchema';

export const graduateLetterSchema: Record<string, FieldSchema> = {
  name:           { label: 'Full Name',           type: 'text',     placeholder: 'e.g. Faith Wanjiru Njeri' },
  phone:          { label: 'Phone Number',         type: 'text',     placeholder: 'e.g. +254 712 888 222' },
  email:          { label: 'Email Address',        type: 'text',     placeholder: 'e.g. faith.njeri@email.com' },
  location:       { label: 'Location',             type: 'text',     placeholder: 'e.g. Nairobi, Kenya' },
  date:           { label: 'Date',                 type: 'text',     placeholder: 'e.g. 24 March 2026' },
  hiringManager:  { label: 'Hiring Manager Name',  type: 'text',     placeholder: 'e.g. Hiring Manager' },
  company:        { label: 'Company Name',         type: 'text',     placeholder: 'e.g. ABC Company Ltd' },
  companyAddress: { label: 'Company Address',      type: 'text',     placeholder: 'e.g. P.O. Box 12345, Nairobi' },
  paragraph1: {
    label: 'Opening — Who you are & the role',
    type: 'textarea',
    placeholder: 'State the role you are applying for and your degree/qualification.',
    hint: 'Mention your degree, university, and why you are excited about this role.',
  },
  paragraph2: {
    label: 'Middle — Projects, coursework & skills',
    type: 'textarea',
    placeholder: 'Describe academic projects, coursework, or skills relevant to the role.',
    hint: "Mention projects, coursework, or skills if you don't have work experience.",
  },
  paragraph3: {
    label: 'Closing — Motivation & eagerness to grow',
    type: 'textarea',
    placeholder: 'Express your enthusiasm and willingness to learn and contribute.',
    hint: 'Show genuine interest in the company and your eagerness to grow professionally.',
  },
};
