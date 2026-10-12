/**
 * Cover Letter Template Registry
 * Maps template names to their React components, preview data, and schemas.
 * Add new templates here as they are built.
 */

import type { ComponentType } from 'react';
import ClassicProfessionalLetter from '@/components/cover-letter/templates/ClassicProfessionalLetter';
import { classicLetterPreviewData } from './classicLetterPreviewData';
import { classicLetterSchema } from '@/schemas/classicLetterSchema';

import ModernProfessionalLetter from '@/components/cover-letter/templates/ModernProfessionalLetter';
import { modernLetterPreviewData } from './modernLetterPreviewData';
import { modernLetterSchema } from '@/schemas/modernLetterSchema';
import ShortDirectLetter from '@/components/cover-letter/templates/ShortDirectLetter';
import { shortLetterPreviewData } from './shortLetterPreviewData';
import { shortLetterSchema } from '@/schemas/shortLetterSchema';

import GraduateLetter from '@/components/cover-letter/templates/GraduateLetter';
import { graduateLetterPreviewData } from './graduateLetterPreviewData';
import { graduateLetterSchema } from '@/schemas/graduateLetterSchema';

import InternshipLetter from '@/components/cover-letter/templates/InternshipLetter';
import { internshipLetterPreviewData } from './internshipLetterPreviewData';
import { internshipLetterSchema } from '@/schemas/internshipLetterSchema';

import SkillsEntryLetter from '@/components/cover-letter/templates/SkillsEntryLetter';
import { skillsEntryLetterPreviewData } from './skillsEntryLetterPreviewData';
import { skillsEntryLetterSchema } from '@/schemas/skillsEntryLetterSchema';

export interface CoverLetterTemplateConfig {
  id: string;
  name: string;
  category: 'professional' | 'entry-level' | 'specialized';
  description: string;
  why: string;
  bestFor: string[];
  component: ComponentType<{ data: any }>;
  defaultData: Record<string, string>;
  schema: Record<string, { label: string; type: 'text' | 'textarea'; placeholder?: string; hint?: string }>;
  isPremium: boolean;
}

export const coverLetterTemplateRegistry: Record<string, CoverLetterTemplateConfig> = {
  'Classic Professional Cover Letter': {
    id: 'classic-professional',
    name: 'Classic Professional Cover Letter',
    category: 'professional',
    description:
      'A formal, structured cover letter with traditional formatting. The safest option — works for government, NGOs, banking, corporate, and administrative roles.',
    why: 'Safest option — works everywhere',
    bestFor: ['Government jobs', 'NGOs', 'Banking', 'Corporate roles', 'Administrative positions'],
    component: ClassicProfessionalLetter,
    defaultData: classicLetterPreviewData as unknown as Record<string, string>,
    schema: classicLetterSchema,
    isPremium: false,
  },
  'Modern Professional Cover Letter': {
    id: 'modern-professional',
    name: 'Modern Professional Cover Letter',
    category: 'professional',
    description:
      'Cleaner layout with better spacing and a contemporary tone. Ideal for private sector, marketing, business, and mid-level professional roles.',
    why: 'Feels current without being risky',
    bestFor: ['Private sector', 'Marketing', 'Business roles', 'Mid-level professionals', 'Corporate upgrades'],
    component: ModernProfessionalLetter,
    defaultData: modernLetterPreviewData as unknown as Record<string, string>,
    schema: modernLetterSchema,
    isPremium: false,
  },
  'Short & Direct Cover Letter': {
    id: 'short-direct',
    name: 'Short & Direct Cover Letter',
    category: 'professional',
    description:
      'Concise 3-paragraph format built for impact. Ideal for startups, tech companies, online applications, and busy recruiters who skim quickly.',
    why: 'Matches modern hiring behavior',
    bestFor: ['Startups', 'Tech companies', 'Online applications', 'Busy recruiters'],
    component: ShortDirectLetter,
    defaultData: shortLetterPreviewData as unknown as Record<string, string>,
    schema: shortLetterSchema,
    isPremium: false,
  },
  'Graduate / Entry-Level Cover Letter': {
    id: 'graduate-entry-level',
    name: 'Graduate / Entry-Level Cover Letter',
    category: 'entry-level',
    description:
      'Focuses on education, projects, and potential instead of experience. Solves the "I don\'t have experience" problem for fresh graduates and first-time job seekers.',
    why: "Solves \"I don't have experience\" problem",
    bestFor: ['Fresh graduates', 'First-time job seekers', 'Graduate trainee programmes', 'Entry-level roles'],
    component: GraduateLetter,
    defaultData: graduateLetterPreviewData as unknown as Record<string, string>,
    schema: graduateLetterSchema,
    isPremium: false,
  },
  'Internship / Attachment Cover Letter': {
    id: 'internship-attachment',
    name: 'Internship / Attachment Cover Letter',
    category: 'entry-level',
    description:
      'Built for university and TVET students seeking industrial attachment. Highlights course, institution, and availability period — exactly what supervisors look for.',
    why: 'Very relevant in Kenya — huge volume use case',
    bestFor: ['University students', 'TVET students', 'Industrial attachment', 'Internship applications'],
    component: InternshipLetter,
    defaultData: internshipLetterPreviewData as unknown as Record<string, string>,
    schema: internshipLetterSchema,
    isPremium: false,
  },

  'Skills-Focused Entry-Level Cover Letter': {
    id: 'skills-entry-level',
    name: 'Skills-Focused Entry-Level Cover Letter',
    category: 'entry-level',
    description:
      'For candidates with little or no formal experience who have real, demonstrable skills. Ideal for self-taught professionals, freelancers, and hustlers who can do the work.',
    why: 'Shows you can do the work without a traditional career story',
    bestFor: ['Self-taught professionals', 'Freelancers', 'Career starters', 'Digital creatives', 'No formal experience'],
    component: SkillsEntryLetter,
    defaultData: skillsEntryLetterPreviewData as unknown as Record<string, string>,
    schema: skillsEntryLetterSchema,
    isPremium: false,
  },

  // 'Career Change Cover Letter': { ... },
  // 'Personal Brand Cover Letter': { ... },
  // 'International / ATS-Friendly Cover Letter': { ... },
};

export function getCoverLetterTemplateConfig(
  templateName: string
): CoverLetterTemplateConfig | undefined {
  return coverLetterTemplateRegistry[templateName];
}

export function coverLetterTemplatesByCategory(
  category: CoverLetterTemplateConfig['category']
): CoverLetterTemplateConfig[] {
  return Object.values(coverLetterTemplateRegistry).filter((t) => t.category === category);
}

export function emptyCoverLetterFields(templateName: string): Record<string, string> {
  const config = getCoverLetterTemplateConfig(templateName);
  return { ...((config?.defaultData || {}) as Record<string, string>) };
}
