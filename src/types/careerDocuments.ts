/**
 * Canonical shapes for Career Tools CVs and cover letters.
 * Templates are views of this JSON. Extra keys are preserved on round-trip.
 */

export interface CVDesign {
  primaryColor?: string;
  fontFamily?: 'sans' | 'serif';
  fontSize?: 'sm' | 'md' | 'lg';
  lineSpacing?: number;
  sectionOrder?: string[];
  hiddenSections?: string[];
}

export interface CVPersonal {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  website?: string;
  github?: string;
  summary?: string;
  profile?: string;
  objective?: string;
  photoUrl?: string;
}

export interface CVExperience {
  jobTitle?: string;
  role?: string;
  company?: string;
  organization?: string;
  location?: string;
  dates?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  details?: string[];
  responsibilities?: string[];
}

export interface CVEducation {
  degree?: string;
  institution?: string;
  dates?: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
  thesis?: string;
}

export interface CVProject {
  title?: string;
  name?: string;
  client?: string;
  year?: string;
  dates?: string;
  tech?: string;
  description?: string;
  link?: string;
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
  projects?: CVProject[];
  internships?: CVExperience[];
  activities?: string[];
  publications?: Array<string | { title?: string; platform?: string; year?: string }>;
  conferences?: string[];
  grants?: string[];
  awards?: string[];
  boardMemberships?: string[];
  strategicInitiatives?: string[];
  researchInterests?: string[];
  skillCategories?: Array<{ title?: string; skills?: string[] }>;
  social?: string[];
  speaking?: Array<string | { event?: string; location?: string; year?: string }>;
  mediaFeatures?: string[];
  design?: CVDesign;
  [key: string]: unknown;
}

/** Stored in candidate_cover_letters.content_json so letters can reopen in the editor. */
export interface CoverLetterContentJson {
  templateName: string;
  fields: Record<string, string>;
}
