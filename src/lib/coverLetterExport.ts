import { coverLetterClosing, coverLetterPlaintext, hydrateCoverLetter } from '@/lib/coverLetterContent';
import type { CandidateCoverLetter } from '@/lib/careerTools';

export type PlannedCoverLetterWord = {
  name: string;
  contact: string;
  extras: string[];
  date: string;
  recipient: string[];
  greeting: string;
  paragraphs: string[];
  closing: string;
};

function line(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function planCoverLetterWord(
  fields: Record<string, string>,
  templateName: string,
): PlannedCoverLetterWord {
  const paragraphs = [fields.paragraph1, fields.paragraph2, fields.paragraph3]
    .map(line)
    .filter(Boolean);
  return {
    name: line(fields.name),
    contact: [fields.phone, fields.email, fields.location].map(line).filter(Boolean).join('  |  '),
    extras: [fields.institution, fields.course, fields.attachmentPeriod, fields.keySkills]
      .map(line)
      .filter(Boolean),
    date: line(fields.date),
    recipient: [fields.hiringManager, fields.company, fields.companyAddress].map(line).filter(Boolean),
    greeting: `Dear ${line(fields.hiringManager) || 'Hiring Manager'},`,
    paragraphs,
    closing: coverLetterClosing(templateName),
  };
}

export function letterPlaintextForApply(
  letter: Pick<CandidateCoverLetter, 'content' | 'content_json'>,
  fallbackTemplateName = 'Classic Professional Cover Letter',
): string {
  if (letter.content?.trim()) return letter.content;
  const hydrated = hydrateCoverLetter(letter, fallbackTemplateName);
  return coverLetterPlaintext(hydrated.fields, hydrated.templateName);
}

export async function buildCoverLetterWordBlob(
  fields: Record<string, string>,
  templateName: string,
): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import('docx');
  const planned = planCoverLetterWord(fields, templateName);
  const font = 'Calibri';
  const children: InstanceType<typeof Paragraph>[] = [];

  if (planned.name) {
    children.push(new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: planned.name, bold: true, size: 32, font })],
    }));
  }
  if (planned.contact) {
    children.push(new Paragraph({
      spacing: { after: planned.extras.length ? 20 : 160 },
      children: [new TextRun({ text: planned.contact, size: 20, color: '444444', font })],
    }));
  }
  planned.extras.forEach((extra, index) => {
    children.push(new Paragraph({
      spacing: { after: index === planned.extras.length - 1 ? 160 : 20 },
      children: [new TextRun({ text: extra, size: 20, color: '444444', font })],
    }));
  });
  if (planned.date) {
    children.push(new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: planned.date, font, size: 22 })],
    }));
  }
  planned.recipient.forEach((row, index) => {
    children.push(new Paragraph({
      spacing: { after: index === planned.recipient.length - 1 ? 200 : 20 },
      children: [new TextRun({ text: row, font, size: 22 })],
    }));
  });
  children.push(new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({ text: planned.greeting, font, size: 22 })],
  }));
  planned.paragraphs.forEach((paragraph) => {
    children.push(new Paragraph({
      spacing: { after: 200 },
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({ text: paragraph, font, size: 22 })],
    }));
  });
  children.push(new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text: planned.closing, font, size: 22 })],
  }));
  if (planned.name) {
    children.push(new Paragraph({
      children: [new TextRun({ text: planned.name, font, size: 22 })],
    }));
  }

  const doc = new Document({
    styles: { default: { document: { run: { font, size: 22 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 864, right: 864, bottom: 864, left: 864 },
        },
      },
      children,
    }],
  });

  return Packer.toBlob(doc);
}
