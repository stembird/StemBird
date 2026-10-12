export type ExtraFieldKind = 'strings' | 'projects' | 'skillCategories' | 'experience';

export interface ExtraFieldDef {
  key: string;
  label: string;
  kind: ExtraFieldKind;
  hint?: string;
}

const ACADEMIC: ExtraFieldDef[] = [
  { key: 'researchInterests', label: 'Research Interests', kind: 'strings' },
  { key: 'publications', label: 'Publications', kind: 'strings' },
  { key: 'conferences', label: 'Conferences', kind: 'strings' },
  { key: 'grants', label: 'Grants & Funding', kind: 'strings' },
];

const FUNCTIONAL: ExtraFieldDef[] = [
  { key: 'skillCategories', label: 'Skill Categories', kind: 'skillCategories', hint: 'Group related skills the way a functional CV should.' },
];

const PROJECTS: ExtraFieldDef[] = [
  { key: 'projects', label: 'Projects', kind: 'projects' },
];

const EXECUTIVE: ExtraFieldDef[] = [
  { key: 'boardMemberships', label: 'Board Memberships', kind: 'strings' },
  { key: 'strategicInitiatives', label: 'Strategic Initiatives', kind: 'strings' },
];

const GRADUATE: ExtraFieldDef[] = [
  { key: 'projects', label: 'Academic Projects', kind: 'projects' },
  { key: 'internships', label: 'Internships', kind: 'experience' },
  { key: 'activities', label: 'Activities', kind: 'strings' },
];

const INTERNSHIP: ExtraFieldDef[] = [
  { key: 'projects', label: 'Academic Projects', kind: 'projects' },
  { key: 'internships', label: 'Industrial Attachment', kind: 'experience' },
  { key: 'activities', label: 'Activities', kind: 'strings' },
];

const PERSONAL_BRAND: ExtraFieldDef[] = [
  { key: 'social', label: 'Online Presence', kind: 'strings' },
  { key: 'speaking', label: 'Speaking', kind: 'strings' },
  { key: 'mediaFeatures', label: 'Media Features', kind: 'strings' },
];

const TECHNICAL: ExtraFieldDef[] = [
  { key: 'projects', label: 'Engineering Projects', kind: 'projects' },
];

const CREATIVE: ExtraFieldDef[] = [
  { key: 'projects', label: 'Portfolio Projects', kind: 'projects' },
];

/** Extra editor fields that the current template actually renders. */
export function extraFieldsForTemplate(templateName?: string): ExtraFieldDef[] {
  switch (templateName) {
    case 'Academic / Research CV':
    case 'Academic / Research':
      return ACADEMIC;
    case 'Skills-Based (Functional)':
    case 'Functional / Skills-Based':
      return FUNCTIONAL;
    case 'Creative Portfolio':
      return CREATIVE;
    case 'Executive Leadership':
      return EXECUTIVE;
    case 'Graduate Starter CV':
    case 'Graduate Starter':
      return GRADUATE;
    case 'Internship / Industrial Attachment':
    case 'Internship / Attachment':
      return INTERNSHIP;
    case 'Personal Brand CV':
    case 'Personal Brand':
      return PERSONAL_BRAND;
    case 'Technical / Engineering CV':
    case 'Technical / Engineering':
      return TECHNICAL;
    default:
      return [];
  }
}

export function extraFieldKeys(templateName?: string): string[] {
  return extraFieldsForTemplate(templateName).map((field) => field.key);
}
