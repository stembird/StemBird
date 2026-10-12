/**
 * Schema for Skills-Focused Entry-Level Cover Letter
 * Defines form fields and their types for the editor.
 */

export const skillsEntryLetterSchema = {
  name: {
    label: 'Your Full Name',
    type: 'text' as const,
    placeholder: 'e.g., Kevin Otieno Onyango',
  },
  phone: {
    label: 'Phone Number',
    type: 'text' as const,
    placeholder: 'e.g., +254 700 888 111',
  },
  email: {
    label: 'Email Address',
    type: 'text' as const,
    placeholder: 'e.g., kevin.onyango@email.com',
  },
  location: {
    label: 'Location',
    type: 'text' as const,
    placeholder: 'e.g., Nairobi, Kenya',
  },
  date: {
    label: 'Date',
    type: 'text' as const,
    placeholder: 'e.g., 24 March 2026',
  },
  hiringManager: {
    label: 'Hiring Manager Name',
    type: 'text' as const,
    placeholder: 'e.g., Hiring Manager',
    hint: 'If unknown, use "Hiring Manager"',
  },
  company: {
    label: 'Company Name',
    type: 'text' as const,
    placeholder: 'e.g., Digital Solutions Ltd',
  },
  companyAddress: {
    label: 'Company Address',
    type: 'text' as const,
    placeholder: 'e.g., P.O. Box 45678, Nairobi',
  },
  keySkills: {
    label: 'Key Skills',
    type: 'text' as const,
    placeholder: 'e.g., Social Media Management, Content Creation, Canva, Basic SEO',
    hint: 'List your most relevant skills, separated by commas',
  },
  paragraph1: {
    label: 'Opening Paragraph',
    type: 'textarea' as const,
    placeholder: 'Introduce yourself and express interest in the position...',
    hint: 'State the position you\'re applying for and briefly mention your skills',
  },
  paragraph2: {
    label: 'Skills & Experience Paragraph',
    type: 'textarea' as const,
    placeholder: 'Describe your skills and how you developed them...',
    hint: 'Focus on practical skills, projects, freelance work, or self-learning',
  },
  paragraph3: {
    label: 'Closing Paragraph',
    type: 'textarea' as const,
    placeholder: 'Express enthusiasm and willingness to learn...',
    hint: 'Show eagerness to grow and contribute to the team',
  },
};
