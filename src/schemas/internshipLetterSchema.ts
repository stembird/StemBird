import { FieldSchema } from './classicLetterSchema';

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
