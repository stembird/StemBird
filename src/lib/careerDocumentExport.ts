import { toTemplateProps } from '@/lib/cvContent';
import { mergeDesign, normalizeHexColor } from '@/lib/cvDesign';
import { extraFieldsForTemplate } from '@/lib/cvTemplateExtras';
import type { CVDesign } from '@/types/careerDocuments';

export type PlannedCvItem =
  | { type: 'p'; text: string }
  | { type: 'role'; title: string; company: string; dates: string; bullets: string[] }
  | { type: 'edu'; degree: string; institution: string; dates: string; extra?: string }
  | { type: 'project'; title: string; meta: string; description: string }
  | { type: 'bullet'; text: string };

export type PlannedCvSection = {
  heading: string;
  items: PlannedCvItem[];
};

export type PlannedCvWord = {
  name: string;
  title: string;
  contact: string;
  headingColor: string;
  font: 'Calibri' | 'Georgia';
  sections: PlannedCvSection[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function labeledLine(item: unknown): string {
  if (typeof item === 'string') return item.trim();
  const record = asRecord(item);
  const parts = [
    record.title,
    record.event,
    record.name,
    record.platform,
    record.location,
    record.year,
  ]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean);
  if (parts.length) return parts.join(' — ');
  return Object.values(record)
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(' — ');
}

function stringLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(labeledLine).filter(Boolean);
}

function pushBullets(sections: PlannedCvSection[], heading: string, lines: string[]) {
  if (!lines.length) return;
  sections.push({ heading, items: lines.map((text) => ({ type: 'bullet', text })) });
}

function roleItems(rows: unknown[]): PlannedCvItem[] {
  return rows.map((row) => {
    const r = asRecord(row);
    const bullets = Array.isArray(r.details)
      ? r.details.map((d) => String(d)).filter(Boolean)
      : Array.isArray(r.responsibilities)
        ? r.responsibilities.map((d) => String(d)).filter(Boolean)
        : [];
    const company = [r.company || r.organization, r.location].filter(Boolean).join(' — ');
    return {
      type: 'role' as const,
      title: String(r.jobTitle || r.role || ''),
      company,
      dates: String(r.dates || ''),
      bullets,
    };
  }).filter((item) => item.title || item.company || item.bullets.length);
}

function extraHeading(templateName: string | undefined, key: string, fallback: string): string {
  const match = extraFieldsForTemplate(templateName).find((field) => field.key === key);
  return match?.label.toUpperCase() || fallback;
}

/**
 * Structured CV sections for Word / plaintext. Uses the same visible fields as
 * the on-screen template (hidden studio sections stay empty).
 */
export function planCvWordSections(raw: unknown, templateName?: string): PlannedCvWord {
  const props = toTemplateProps(raw, templateName);
  const design = mergeDesign(undefined, props.design as CVDesign | undefined);
  const source = asRecord(raw);
  const hasOwnInternships = Array.isArray(source.internships) || Array.isArray(source.attachment);
  const contact = [
    props.contact.location,
    props.contact.phone,
    props.contact.email,
    props.contact.linkedin,
    props.contact.website,
    props.contact.github !== props.contact.website ? props.contact.github : '',
  ].filter(Boolean).join('  |  ');

  const sections: PlannedCvSection[] = [];
  const summary = props.profile || props.summary || props.objective;
  if (summary) {
    sections.push({ heading: 'PROFESSIONAL SUMMARY', items: [{ type: 'p', text: summary }] });
  }

  if (Array.isArray(props.skillCategories) && props.skillCategories.length) {
    const items: PlannedCvItem[] = [];
    for (const category of props.skillCategories) {
      const title = String(category?.title || '').trim();
      const skills = Array.isArray(category?.skills) ? category.skills.filter(Boolean) : [];
      if (title) items.push({ type: 'p', text: title });
      skills.forEach((skill) => items.push({ type: 'bullet', text: skill }));
    }
    if (items.length) sections.push({ heading: extraHeading(templateName, 'skillCategories', 'SKILLS'), items });
  } else {
    const researchAsSkills = extraFieldsForTemplate(templateName).some((field) => field.key === 'researchInterests')
      && props.skills.length > 0
      && (props.researchInterests || []).join('\n') === props.skills.join('\n');
    pushBullets(
      sections,
      researchAsSkills ? extraHeading(templateName, 'researchInterests', 'RESEARCH INTERESTS') : 'KEY SKILLS',
      props.skills,
    );
  }

  pushBullets(sections, 'TOOLS & PLATFORMS', props.tools);
  pushBullets(sections, 'LANGUAGES', props.languages);

  const experience = roleItems(props.experience);
  if (experience.length) sections.push({ heading: 'PROFESSIONAL EXPERIENCE', items: experience });

  if (hasOwnInternships) {
    const internships = roleItems(props.internships);
    if (internships.length) {
      sections.push({
        heading: extraHeading(templateName, 'internships', 'INTERNSHIPS'),
        items: internships,
      });
    }
  }

  const projects = (props.projects || []).map((project) => {
    const meta = [project.client || project.company, project.year || project.dates, project.tech]
      .filter(Boolean)
      .join('  ·  ');
    return {
      type: 'project' as const,
      title: project.title || project.name || '',
      meta,
      description: project.description || '',
    };
  }).filter((item) => item.title || item.description);
  if (projects.length) {
    sections.push({
      heading: extraHeading(templateName, 'projects', 'PROJECTS'),
      items: projects,
    });
  }

  const education = props.education.map((edu) => ({
    type: 'edu' as const,
    degree: edu.degree || edu.program || '',
    institution: edu.institution || '',
    dates: edu.dates || '',
    extra: [edu.grade, edu.thesis].filter(Boolean).join(' · ') || undefined,
  })).filter((item) => item.degree || item.institution);
  if (education.length) sections.push({ heading: 'EDUCATION', items: education });

  pushBullets(sections, extraHeading(templateName, 'publications', 'PUBLICATIONS'), stringLines(props.publications));
  pushBullets(sections, extraHeading(templateName, 'conferences', 'CONFERENCES'), props.conferences || []);
  const ownGrants = Array.isArray(asRecord(raw).grants) ? props.grants || [] : [];
  pushBullets(sections, extraHeading(templateName, 'grants', 'GRANTS & FUNDING'), ownGrants);
  pushBullets(sections, 'CERTIFICATIONS', props.certifications);
  pushBullets(sections, 'PROFESSIONAL ACHIEVEMENTS', props.achievements);
  if ((props.awards || []).some((award) => !props.achievements.includes(award))) {
    pushBullets(sections, 'AWARDS', (props.awards || []).filter((award) => !props.achievements.includes(award)));
  }
  pushBullets(sections, extraHeading(templateName, 'activities', 'ACTIVITIES'), props.activities || []);
  if ((props.researchInterests || []).some((item) => !props.skills.includes(item))) {
    pushBullets(
      sections,
      extraHeading(templateName, 'researchInterests', 'RESEARCH INTERESTS'),
      (props.researchInterests || []).filter((item) => !props.skills.includes(item)),
    );
  }
  pushBullets(sections, extraHeading(templateName, 'speaking', 'SPEAKING'), stringLines(props.speaking));
  pushBullets(sections, extraHeading(templateName, 'mediaFeatures', 'MEDIA FEATURES'), props.mediaFeatures || []);
  pushBullets(sections, extraHeading(templateName, 'social', 'ONLINE PRESENCE'), props.social || []);
  pushBullets(sections, extraHeading(templateName, 'boardMemberships', 'BOARD MEMBERSHIPS'), props.boardMemberships || []);
  pushBullets(sections, extraHeading(templateName, 'strategicInitiatives', 'STRATEGIC INITIATIVES'), props.strategicInitiatives || []);

  sections.push({
    heading: 'REFEREES',
    items: [{ type: 'p', text: 'Available upon request.' }],
  });

  return {
    name: props.name || '',
    title: props.title || '',
    contact,
    headingColor: normalizeHexColor(design.primaryColor).replace('#', ''),
    font: design.fontFamily === 'serif' ? 'Georgia' : 'Calibri',
    sections,
  };
}

export function cvPlaintext(raw: unknown, templateName?: string): string {
  const planned = planCvWordSections(raw, templateName);
  const lines = [planned.name, planned.title, planned.contact, ''];
  for (const section of planned.sections) {
    lines.push(section.heading, '='.repeat(50));
    for (const item of section.items) {
      if (item.type === 'p') lines.push(item.text, '');
      if (item.type === 'bullet') lines.push(`• ${item.text}`);
      if (item.type === 'role') {
        lines.push('', item.title, item.company, item.dates);
        item.bullets.forEach((bullet) => lines.push(`• ${bullet}`));
      }
      if (item.type === 'edu') {
        lines.push('', item.degree, item.institution, item.dates, item.extra || '');
      }
      if (item.type === 'project') {
        lines.push('', item.title, item.meta, item.description);
      }
    }
    lines.push('');
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

export async function buildCvWordBlob(raw: unknown, templateName?: string): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = await import('docx');
  const planned = planCvWordSections(raw, templateName);
  const color = planned.headingColor;

  const sectionHeading = (text: string) => new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color } },
    children: [new TextRun({ text, bold: true, color, font: planned.font, size: 24 })],
  });

  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: planned.name, bold: true, size: 48, font: planned.font, color })],
    }),
  ];

  if (planned.title) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: planned.title, size: 26, font: planned.font, color: '444444' })],
    }));
  }
  if (planned.contact) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 220 },
      children: [new TextRun({ text: planned.contact, size: 20, font: planned.font, color: '555555' })],
    }));
  }

  for (const section of planned.sections) {
    children.push(sectionHeading(section.heading));
    for (const item of section.items) {
      if (item.type === 'p') {
        children.push(new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: item.text, font: planned.font, size: 22 })],
        }));
      }
      if (item.type === 'bullet') {
        children.push(new Paragraph({
          spacing: { after: 40 },
          indent: { left: 360 },
          children: [new TextRun({ text: `• ${item.text}`, font: planned.font, size: 22 })],
        }));
      }
      if (item.type === 'role') {
        if (item.title) {
          children.push(new Paragraph({
            spacing: { before: 140, after: 20 },
            children: [new TextRun({ text: item.title, bold: true, size: 24, font: planned.font })],
          }));
        }
        if (item.company) {
          children.push(new Paragraph({
            spacing: { after: 20 },
            children: [new TextRun({ text: item.company, bold: true, font: planned.font, size: 22 })],
          }));
        }
        if (item.dates) {
          children.push(new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: item.dates, italics: true, color: '666666', size: 20, font: planned.font })],
          }));
        }
        item.bullets.forEach((bullet) => {
          children.push(new Paragraph({
            spacing: { after: 40 },
            indent: { left: 360 },
            children: [new TextRun({ text: `• ${bullet}`, font: planned.font, size: 22 })],
          }));
        });
      }
      if (item.type === 'edu') {
        children.push(new Paragraph({
          spacing: { before: 120, after: 20 },
          children: [new TextRun({ text: item.degree, bold: true, size: 24, font: planned.font })],
        }));
        if (item.institution) {
          children.push(new Paragraph({
            spacing: { after: 20 },
            children: [new TextRun({ text: item.institution, font: planned.font, size: 22 })],
          }));
        }
        if (item.dates) {
          children.push(new Paragraph({
            spacing: { after: 40 },
            children: [new TextRun({ text: item.dates, italics: true, color: '666666', size: 20, font: planned.font })],
          }));
        }
        if (item.extra) {
          children.push(new Paragraph({
            spacing: { after: 40 },
            children: [new TextRun({ text: item.extra, font: planned.font, size: 20, color: '444444' })],
          }));
        }
      }
      if (item.type === 'project') {
        children.push(new Paragraph({
          spacing: { before: 120, after: 20 },
          children: [new TextRun({ text: item.title, bold: true, size: 24, font: planned.font })],
        }));
        if (item.meta) {
          children.push(new Paragraph({
            spacing: { after: 20 },
            children: [new TextRun({ text: item.meta, italics: true, color: '555555', size: 20, font: planned.font })],
          }));
        }
        if (item.description) {
          children.push(new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: item.description, font: planned.font, size: 22 })],
          }));
        }
      }
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: planned.font, size: 22 } },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children,
    }],
  });

  return Packer.toBlob(doc);
}

