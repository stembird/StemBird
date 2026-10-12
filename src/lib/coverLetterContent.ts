import type { CoverLetterContentJson } from '@/types/careerDocuments';

export function coverLetterClosing(templateName: string): string {
  if (templateName.includes('Internship')) return 'Yours faithfully,';
  if (templateName.includes('Graduate')) return 'Yours sincerely,';
  if (templateName.includes('Short')) return 'Best regards,';
  return 'Sincerely,';
}

export function coverLetterPlaintext(
  fields: Record<string, string>,
  templateName: string,
): string {
  const closing = coverLetterClosing(templateName);
  const extra = [
    fields.institution,
    fields.course,
    fields.attachmentPeriod,
    fields.keySkills,
  ].filter((line) => typeof line === 'string' && line.trim());

  return [
    fields.name,
    fields.phone,
    fields.email,
    fields.location,
    ...extra,
    '',
    fields.date,
    '',
    fields.hiringManager,
    fields.company,
    fields.companyAddress,
    '',
    `Dear ${fields.hiringManager || 'Hiring Manager'},`,
    '',
    fields.paragraph1,
    '',
    fields.paragraph2,
    '',
    fields.paragraph3,
    '',
    closing,
    fields.name,
  ]
    .map((line) => (line == null ? '' : String(line)))
    .join('\n');
}

export function isCoverLetterContentJson(value: unknown): value is CoverLetterContentJson {
  if (!value || typeof value !== 'object') return false;
  const v = value as CoverLetterContentJson;
  return typeof v.templateName === 'string' && v.fields != null && typeof v.fields === 'object';
}

/**
 * Restore editor state from a saved letter.
 * Prefers content_json; falls back to plaintext in paragraph1 for older rows.
 */
export function hydrateCoverLetter(
  letter: {
    content?: string | null;
    content_json?: unknown;
  },
  fallbackTemplateName = 'Classic Professional Cover Letter',
): CoverLetterContentJson {
  if (isCoverLetterContentJson(letter.content_json)) {
    const name = letter.content_json.templateName || fallbackTemplateName;
    return {
      templateName: name,
      fields: { ...letter.content_json.fields },
    };
  }

  const content = (letter.content || '').trim();
  return {
    templateName: fallbackTemplateName,
    fields: content ? { paragraph1: content } : {},
  };
}

export function toCoverLetterContentJson(
  templateName: string,
  fields: Record<string, string>,
): CoverLetterContentJson {
  return { templateName, fields: { ...fields } };
}
