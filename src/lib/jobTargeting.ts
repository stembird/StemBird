import { normalizeCVContent } from '@/lib/cvContent';
import { stripHtmlTags } from '@/lib/textUtils';
import type { CVContent, CVEducation, CVExperience, CVProject } from '@/types/careerDocuments';

export const TARGETING_COLUMN_KEYS = ['parent_cv_id', 'target_job_id', 'target_jd_text'] as const;

export type JobTargetingFields = {
  parent_cv_id?: string | null;
  target_job_id?: string | null;
  target_jd_text?: string | null;
};

export type KeywordGap = {
  keywords: string[];
  matched: string[];
  missing: string[];
  matchedCount: number;
  missingCount: number;
  totalCount: number;
};

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'so', 'as', 'at', 'by', 'for',
  'from', 'in', 'into', 'of', 'on', 'onto', 'to', 'up', 'with', 'without', 'within',
  'over', 'under', 'after', 'before', 'between', 'about', 'across', 'through', 'during',
  'including', 'via', 'per', 'vs', 'etc', 'eg', 'ie',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'should',
  'may', 'might', 'must', 'shall',
  'this', 'that', 'these', 'those', 'it', 'its', 'we', 'our', 'you', 'your', 'they',
  'their', 'them', 'he', 'she', 'his', 'her',
  'not', 'no', 'yes', 'also', 'than', 'such', 'other', 'more', 'most', 'any', 'all',
  'each', 'both', 'few', 'own', 'same', 'very', 'just', 'only',
  'job', 'jobs', 'role', 'roles', 'position', 'opportunity', 'candidate', 'candidates',
  'applicant', 'applicants', 'application', 'apply', 'please', 'looking', 'join',
  'company', 'organisation', 'organization', 'team', 'person', 'people',
  'work', 'working', 'works', 'worker', 'experience', 'experienced',
  'ability', 'able', 'strong', 'excellent', 'good', 'great', 'high', 'highly',
  'proven', 'well', 'using', 'use', 'used', 'including', 'related', 'relevant',
  'required', 'requirement', 'requirements', 'responsibilities', 'responsibility',
  'qualification', 'qualifications', 'duties', 'duty', 'skills', 'skill',
  'kenyan', 'kenya', 'nairobi', 'mombasa', 'kisumu',
  'year', 'years', 'month', 'months', 'day', 'days', 'time', 'times',
  'minimum', 'least', 'plus', 'one', 'two', 'three', 'four', 'five',
  'new', 'key', 'ensure', 'ensuring', 'provide', 'providing', 'support',
  'supporting', 'manage', 'managing', 'develop', 'developing', 'implement',
  'implementing', 'maintain', 'maintaining', 'report', 'reporting',
  'knowledge', 'understanding', 'familiarity', 'demonstrated', 'track', 'record',
  'environment', 'based', 'level', 'type', 'full', 'part', 'contract',
  'salary', 'benefit', 'benefits', 'package', 'closing', 'deadline',
  'end', 'nice', 'close',
]);

const SHORT_KEEP = new Set([
  'sql', 'aws', 'gcp', 'azure', 'ui', 'ux', 'hr', 'it', 'qa', 'qc', 'css', 'html',
  'php', 'go', 'r', 'c', 'js', 'ts', 'ci', 'cd', 'ml', 'ai', 'bi', 'erp', 'crm',
  'sap', 'cpa', 'cpsb', 'kra', 'vat', 'nhif', 'nssf', 'helb', 'ifrs', 'gaap',
  'pmp', 'prm', 'gis', 'iot', 'api', 'sdk', 'ios', 'os', 'db',
]);

const MAX_KEYWORDS = 28;

export function stripJdPlaintext(htmlOrText: string | null | undefined): string {
  if (!htmlOrText) return '';
  return stripHtmlTags(String(htmlOrText));
}

function qualificationText(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((item) => qualificationText(item)).join(' ');
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map(qualificationText).join(' ');
  return String(value);
}

export function buildJobDescriptionText(job: {
  title?: string | null;
  company?: string | null;
  description?: string | null;
  responsibilities?: string | null;
  required_qualifications?: unknown;
  qualifications?: string | null;
  additional_info?: string | null;
}): string {
  const parts = [
    [job.title, job.company].filter(Boolean).join(' at '),
    stripJdPlaintext(job.description),
    stripJdPlaintext(job.responsibilities),
    stripJdPlaintext(qualificationText(job.required_qualifications)),
    stripJdPlaintext(job.qualifications),
    stripJdPlaintext(job.additional_info),
  ].filter((part) => part.trim().length > 0);
  return parts.join('\n\n');
}

function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(/[a-z][a-z0-9+#.]*(?:\+\+|#)?/g) || [];
  return matches.map((token) => token.replace(/\.+$/, ''));
}

function keepToken(token: string): boolean {
  if (!token) return false;
  if (STOPWORDS.has(token)) return false;
  if (/^\d+$/.test(token)) return false;
  if (SHORT_KEEP.has(token)) return true;
  if (token.length <= 2) return false;
  if (token.length === 3 && !/[0-9+#]/.test(token) && token !== token.toLowerCase()) return true;
  return token.length >= 3;
}

export function extractJdKeywords(jdText: string): string[] {
  const plain = stripJdPlaintext(jdText);
  if (!plain) return [];

  const rawTokens = tokenize(plain);
  const counts = new Map<string, number>();
  const bump = (term: string, weight = 1) => {
    counts.set(term, (counts.get(term) || 0) + weight);
  };

  for (let i = 0; i < rawTokens.length; i += 1) {
    const token = rawTokens[i];
    if (keepToken(token)) bump(token, 1);
    const next = rawTokens[i + 1];
    if (next && keepToken(token) && keepToken(next)) {
      bump(`${token} ${next}`, 2);
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => {
    const aPhrase = a[0].includes(' ') ? 1 : 0;
    const bPhrase = b[0].includes(' ') ? 1 : 0;
    if (aPhrase !== bPhrase) return aPhrase - bPhrase;
    return b[1] - a[1] || b[0].length - a[0].length || a[0].localeCompare(b[0]);
  }).map(([term]) => term);

  const selected: string[] = [];
  for (const term of sorted) {
    if (selected.length >= MAX_KEYWORDS) break;
    if (term.includes(' ')) {
      const [left, right] = term.split(' ');
      if (selected.includes(left) && selected.includes(right)) continue;
    }
    selected.push(term);
  }
  return selected;
}

function pushText(parts: string[], value: unknown) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((item) => pushText(parts, item));
    return;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) parts.push(trimmed);
  }
}

function experienceText(items: CVExperience[] | undefined) {
  const parts: string[] = [];
  for (const item of items || []) {
    pushText(parts, item.jobTitle);
    pushText(parts, item.role);
    pushText(parts, item.company);
    pushText(parts, item.organization);
    pushText(parts, item.description);
    pushText(parts, item.details);
    pushText(parts, item.responsibilities);
  }
  return parts;
}

function educationText(items: CVEducation[] | undefined) {
  const parts: string[] = [];
  for (const item of items || []) {
    pushText(parts, item.degree);
    pushText(parts, item.institution);
    pushText(parts, item.thesis);
  }
  return parts;
}

function projectText(items: CVProject[] | undefined) {
  const parts: string[] = [];
  for (const item of items || []) {
    pushText(parts, item.title);
    pushText(parts, item.name);
    pushText(parts, item.tech);
    pushText(parts, item.description);
  }
  return parts;
}

export function collectCvPlaintext(content: unknown): string {
  const cv: CVContent = normalizeCVContent(content);
  const parts: string[] = [];
  pushText(parts, cv.personal.title);
  pushText(parts, cv.personal.summary);
  pushText(parts, cv.personal.profile);
  pushText(parts, cv.personal.objective);
  pushText(parts, cv.skills);
  pushText(parts, cv.tools);
  pushText(parts, cv.languages);
  pushText(parts, cv.certifications);
  pushText(parts, cv.achievements);
  pushText(parts, cv.activities);
  pushText(
    parts,
    (cv.publications || []).map((item) =>
      typeof item === 'string'
        ? item
        : [item.title, item.platform, item.year].filter(Boolean).join(' '),
    ),
  );
  pushText(parts, cv.conferences);
  pushText(parts, cv.grants);
  pushText(parts, cv.awards);
  pushText(parts, cv.boardMemberships);
  pushText(parts, cv.strategicInitiatives);
  pushText(parts, cv.researchInterests);
  parts.push(...experienceText(cv.experience));
  parts.push(...experienceText(cv.internships));
  parts.push(...educationText(cv.education));
  parts.push(...projectText(cv.projects));
  return parts.join(' ');
}

function hasKeyword(haystack: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, 'i').test(haystack);
}

export function compareCvToJd(cvContent: unknown, jdText: string): KeywordGap {
  const keywords = extractJdKeywords(jdText);
  const cvText = collectCvPlaintext(cvContent);
  const matched: string[] = [];
  const missing: string[] = [];
  for (const keyword of keywords) {
    if (hasKeyword(cvText, keyword)) matched.push(keyword);
    else missing.push(keyword);
  }
  return {
    keywords,
    matched,
    missing,
    matchedCount: matched.length,
    missingCount: missing.length,
    totalCount: keywords.length,
  };
}

export function targetingHeadline(jdText: string | null | undefined): string {
  if (!jdText) return '';
  const firstLine = String(jdText).split(/\r?\n/)[0] || '';
  return stripJdPlaintext(firstLine).slice(0, 120);
}

export function tailoredCvTitle(sourceTitle: string, jobTitle?: string | null): string {
  const base = sourceTitle.replace(/\s+—\s+.*$/, '').trim() || 'CV';
  const job = (jobTitle || 'target job').replace(/\s+/g, ' ').trim().slice(0, 60);
  return `${base} — ${job}`.slice(0, 120);
}

export function withoutTargetingFields<T extends JobTargetingFields>(row: T): Omit<T, keyof JobTargetingFields> {
  const next = { ...row };
  for (const key of TARGETING_COLUMN_KEYS) {
    delete (next as JobTargetingFields)[key];
  }
  return next;
}
