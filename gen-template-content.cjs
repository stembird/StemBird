const fs = require('fs');
const path = require('path');

const content = `import { classicPreviewData } from './classicPreviewData';
import { modernPreviewData } from './modernPreviewData';
import { executivePreviewData } from './executivePreviewData';
import { graduatePreviewData } from './graduatePreviewData';
import { functionalPreviewData } from './functionalPreviewData';
import { internshipPreviewData } from './internshipPreviewData';
import { creativePreviewData } from './creativePreviewData';
import { digitalProfessionalPreviewData } from './digitalProfessionalPreviewData';
import { personalBrandPreviewData } from './personalBrandPreviewData';
import { academicPreviewData } from './academicPreviewData';
import { technicalEngineeringPreviewData } from './technicalEngineeringPreviewData';
import { atsPreviewData } from './atsPreviewData';

export interface CVPersonal {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  website?: string;
  summary?: string;
}

export interface CVExperience {
  jobTitle?: string;
  company?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  details?: string[];
}

export interface CVEducation {
  degree?: string;
  institution?: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
}

export interface CVContent {
  personal: CVPersonal;
  skills: string[];
  experience: CVExperience[];
  education: CVEducation[];
  certifications: string[];
  achievements: string[];
  languages: string[];
  tools: string[];
}

const empty: CVContent = {
  personal: {},
  skills: [],
  experience: [],
  education: [],
  certifications: [],
  achievements: [],
  languages: [],
  tools: [],
};

function mapDates(dates?: string): { startDate: string; endDate: string; current: boolean } {
  if (!dates) return { startDate: '', endDate: '', current: false };
  const current = dates.toLowerCase().includes('present');
  const parts = dates.split(/[–-]/);
  return {
    startDate: parts[0]?.trim() || '',
    endDate: current ? '' : (parts[1]?.trim() || ''),
    current,
  };
}

const defaults: Record<string, CVContent> = {
  'Classic Professional': {
    personal: {
      name: classicPreviewData.name,
      title: classicPreviewData.title,
      email: classicPreviewData.contact.email,
      phone: classicPreviewData.contact.phone,
      location: classicPreviewData.contact.location,
      linkedin: classicPreviewData.contact.linkedin,
      summary: classicPreviewData.profile,
    },
    skills: classicPreviewData.skills,
    experience: classicPreviewData.experience.map(e => ({
      jobTitle: e.jobTitle,
      company: e.company,
      location: e.location,
      ...mapDates(e.dates),
      details: e.details,
    })),
    education: classicPreviewData.education.map(e => ({
      degree: e.degree,
      institution: e.institution,
      ...mapDates(e.dates),
    })),
    certifications: classicPreviewData.certifications || [],
    achievements: classicPreviewData.achievements || [],
    languages: [],
    tools: [],
  },
  'Modern Professional': {
    personal: {
      name: modernPreviewData.name,
      title: modernPreviewData.title,
      email: modernPreviewData.contact.email,
      phone: modernPreviewData.contact.phone,
      location: modernPreviewData.contact.location,
      linkedin: modernPreviewData.contact.linkedin,
      summary: modernPreviewData.profile,
    },
    skills: modernPreviewData.skills,
    experience: modernPreviewData.experience.map(e => ({
      jobTitle: e.jobTitle,
      company: e.company,
      location: e.location,
      ...mapDates(e.dates),
      details: e.details,
    })),
    education: modernPreviewData.education.map(e => ({
      degree: e.degree,
      institution: e.institution,
      ...mapDates(e.dates),
    })),
    certifications: modernPreviewData.certifications || [],
    achievements: modernPreviewData.achievements || [],
    languages: modernPreviewData.languages || [],
    tools: modernPreviewData.tools || [],
  },
  'Executive Leadership': {
    personal: {
      name: executivePreviewData.name,
      title: executivePreviewData.title,
      email: executivePreviewData.contact.email,
      phone: executivePreviewData.contact.phone,
      location: executivePreviewData.contact.location,
      linkedin: executivePreviewData.contact.linkedin,
      summary: executivePreviewData.profile,
    },
    skills: [],
    experience: executivePreviewData.experience.map(e => ({
      jobTitle: e.jobTitle,
      company: e.company,
      location: e.location,
      ...mapDates(e.dates),
      details: e.details,
    })),
    education: executivePreviewData.education.map(e => ({
      degree: e.degree,
      institution: e.institution,
      ...mapDates(e.dates),
    })),
    certifications: executivePreviewData.certifications || [],
    achievements: executivePreviewData.achievements || [],
    languages: [],
    tools: [],
  },
  'Graduate Starter': {
    personal: {
      name: graduatePreviewData.name,
      title: graduatePreviewData.title,
      email: graduatePreviewData.contact.email,
      phone: graduatePreviewData.contact.phone,
      location: graduatePreviewData.contact.location,
      linkedin: graduatePreviewData.contact.linkedin,
      summary: graduatePreviewData.objective,
    },
    skills: graduatePreviewData.skills,
    experience: (graduatePreviewData.internships || []).map((e: any) => ({
      jobTitle: e.role,
      company: e.company,
      location: e.location,
      ...mapDates(e.dates),
      details: e.details,
    })),
    education: graduatePreviewData.education.map(e => ({
      degree: e.degree,
      institution: e.institution,
      ...mapDates(e.dates),
    })),
    certifications: [],
    achievements: [],
    languages: [],
    tools: [],
  },
  'Functional / Skills-Based': {
    personal: {
      name: functionalPreviewData.name,
      title: functionalPreviewData.title,
      email: functionalPreviewData.contact.email,
      phone: functionalPreviewData.contact.phone,
      location: functionalPreviewData.contact.location,
      linkedin: functionalPreviewData.contact.linkedin,
      summary: functionalPreviewData.summary,
    },
    skills: functionalPreviewData.coreSkills || [],
    experience: (functionalPreviewData.experience || []).map((e: any) => ({
      jobTitle: e.role,
      company: e.company,
      ...mapDates(e.dates),
      details: [],
    })),
    education: functionalPreviewData.education.map(e => ({
      degree: e.degree,
      institution: e.institution,
      ...mapDates(e.dates),
    })),
    certifications: functionalPreviewData.certifications || [],
    achievements: [],
    languages: [],
    tools: [],
  },
  'Internship / Attachment': {
    personal: {
      name: internshipPreviewData.name,
      title: internshipPreviewData.title,
      email: internshipPreviewData.contact.email,
      phone: internshipPreviewData.contact.phone,
      location: internshipPreviewData.contact.location,
      linkedin: internshipPreviewData.contact.linkedin,
      summary: internshipPreviewData.objective,
    },
    skills: internshipPreviewData.skills,
    experience: (internshipPreviewData.attachment || []).map((e: any) => ({
      jobTitle: e.role,
      company: e.organization,
      location: e.location,
      ...mapDates(e.dates),
      details: e.details,
    })),
    education: internshipPreviewData.education.map((e: any) => ({
      degree: e.program || e.degree,
      institution: e.institution,
      ...mapDates(e.dates),
    })),
    certifications: [],
    achievements: [],
    languages: [],
    tools: [],
  },
  'Creative Portfolio': {
    personal: {
      name: creativePreviewData.name,
      title: creativePreviewData.tagline,
      email: creativePreviewData.contact.email,
      phone: creativePreviewData.contact.phone,
      location: creativePreviewData.contact.location,
      website: creativePreviewData.contact.website,
      summary: creativePreviewData.profile,
    },
    skills: creativePreviewData.skills,
    experience: creativePreviewData.experience.map((e: any) => ({
      jobTitle: e.role,
      company: e.company,
      location: e.location,
      ...mapDates(e.dates),
      description: e.description,
      details: [],
    })),
    education: creativePreviewData.education.map(e => ({
      degree: e.degree,
      institution: e.institution,
      ...mapDates(e.dates),
    })),
    certifications: [],
    achievements: creativePreviewData.awards || [],
    languages: creativePreviewData.languages || [],
    tools: creativePreviewData.tools || [],
  },
  'Digital Professional': {
    personal: {
      name: digitalProfessionalPreviewData.name,
      title: digitalProfessionalPreviewData.title,
      email: digitalProfessionalPreviewData.contact.email,
      phone: digitalProfessionalPreviewData.contact.phone,
      location: digitalProfessionalPreviewData.contact.location,
      linkedin: digitalProfessionalPreviewData.contact.linkedin,
      website: digitalProfessionalPreviewData.contact.github,
      summary: digitalProfessionalPreviewData.summary,
    },
    skills: digitalProfessionalPreviewData.techStack || [],
    experience: digitalProfessionalPreviewData.experience.map((e: any) => ({
      jobTitle: e.role,
      company: e.company,
      location: e.location,
      ...mapDates(e.dates),
      details: e.responsibilities,
    })),
    education: digitalProfessionalPreviewData.education.map(e => ({
      degree: e.degree,
      institution: e.institution,
      ...mapDates(e.dates),
    })),
    certifications: digitalProfessionalPreviewData.certifications || [],
    achievements: digitalProfessionalPreviewData.achievements || [],
    languages: digitalProfessionalPreviewData.languages || [],
    tools: digitalProfessionalPreviewData.tools || [],
  },
  'Personal Brand': {
    personal: {
      name: personalBrandPreviewData.name,
      title: personalBrandPreviewData.tagline,
      email: personalBrandPreviewData.contact.email,
      phone: personalBrandPreviewData.contact.phone,
      location: personalBrandPreviewData.contact.location,
      summary: personalBrandPreviewData.profile,
    },
    skills: personalBrandPreviewData.skills,
    experience: personalBrandPreviewData.experience.map((e: any) => ({
      jobTitle: e.role,
      company: e.company,
      location: e.location,
      ...mapDates(e.dates),
      description: e.description,
      details: [],
    })),
    education: personalBrandPreviewData.education.map(e => ({
      degree: e.degree,
      institution: e.institution,
      ...mapDates(e.dates),
    })),
    certifications: personalBrandPreviewData.certifications || [],
    achievements: personalBrandPreviewData.awards || [],
    languages: [],
    tools: [],
  },
  'Academic / Research': {
    personal: {
      name: academicPreviewData.name,
      title: academicPreviewData.title,
      email: academicPreviewData.contact.email,
      phone: academicPreviewData.contact.phone,
      location: academicPreviewData.contact.location,
      summary: academicPreviewData.profile,
    },
    skills: academicPreviewData.researchInterests || [],
    experience: (academicPreviewData.positions || []).map((e: any) => ({
      jobTitle: e.role,
      company: e.institution,
      location: e.location,
      ...mapDates(e.dates),
      details: [],
    })),
    education: academicPreviewData.education.map(e => ({
      degree: e.degree,
      institution: e.institution,
      ...mapDates(e.dates),
    })),
    certifications: [],
    achievements: academicPreviewData.awards || [],
    languages: [],
    tools: [],
  },
  'Technical / Engineering': {
    personal: {
      name: technicalEngineeringPreviewData.name,
      title: technicalEngineeringPreviewData.title,
      email: technicalEngineeringPreviewData.contact.email,
      phone: technicalEngineeringPreviewData.contact.phone,
      location: technicalEngineeringPreviewData.contact.location,
      linkedin: technicalEngineeringPreviewData.contact.linkedin,
      summary: technicalEngineeringPreviewData.summary,
    },
    skills: technicalEngineeringPreviewData.skills,
    experience: technicalEngineeringPreviewData.experience.map((e: any) => ({
      jobTitle: e.role,
      company: e.company,
      location: e.location,
      ...mapDates(e.dates),
      details: e.responsibilities,
    })),
    education: technicalEngineeringPreviewData.education.map(e => ({
      degree: e.degree,
      institution: e.institution,
      ...mapDates(e.dates),
    })),
    certifications: technicalEngineeringPreviewData.certifications || [],
    achievements: [],
    languages: [],
    tools: technicalEngineeringPreviewData.tools || [],
  },
  'ATS Optimised': {
    personal: {
      name: atsPreviewData.name,
      title: atsPreviewData.title,
      email: atsPreviewData.contact.email,
      phone: atsPreviewData.contact.phone,
      location: atsPreviewData.contact.location,
      linkedin: atsPreviewData.contact.linkedin,
      summary: atsPreviewData.summary,
    },
    skills: atsPreviewData.skills,
    experience: atsPreviewData.experience.map((e: any) => ({
      jobTitle: e.role,
      company: e.company,
      location: e.location,
      ...mapDates(e.dates),
      details: e.responsibilities,
    })),
    education: atsPreviewData.education.map(e => ({
      degree: e.degree,
      institution: e.institution,
      ...mapDates(e.dates),
    })),
    certifications: atsPreviewData.certifications || [],
    achievements: [],
    languages: [],
    tools: [],
  },
};

export function getTemplateDefaultContent(templateName: string): CVContent {
  return defaults[templateName] || empty;
}
`;

const outPath = path.join(__dirname, 'src', 'data', 'templateDefaultContent.ts');
fs.writeFileSync(outPath, content, 'utf8');
console.log('Written:', outPath);
console.log('Size:', fs.statSync(outPath).size, 'bytes');
