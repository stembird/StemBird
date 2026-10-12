import { collectCvPlaintext, stripJdPlaintext } from '@/lib/jobTargeting';
import { normalizeCVContent } from '@/lib/cvContent';

export const SUGGEST_KINDS = ['summary', 'experience_bullets', 'skills', 'letter_paragraph'] as const;
export type SuggestKind = (typeof SUGGEST_KINDS)[number];

export const DAILY_SUGGEST_LIMIT = 20;

export type SuggestRequest = {
  kind: SuggestKind;
  cv?: unknown;
  jdText?: string | null;
  experienceIndex?: number;
  letterField?: string;
  currentText?: string;
  letterFields?: Record<string, string>;
};

export type SuggestUsage = {
  used: number;
  limit: number;
  remaining: number;
};

export function isSuggestKind(value: unknown): value is SuggestKind {
  return typeof value === 'string' && (SUGGEST_KINDS as readonly string[]).includes(value);
}

export function parseSuggestRequest(body: unknown): SuggestRequest | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Request body is required' };
  const raw = body as Record<string, unknown>;
  if (!isSuggestKind(raw.kind)) {
    return { error: `kind must be one of: ${SUGGEST_KINDS.join(', ')}` };
  }

  const request: SuggestRequest = {
    kind: raw.kind,
    cv: raw.cv,
    jdText: typeof raw.jdText === 'string' ? raw.jdText : null,
    currentText: typeof raw.currentText === 'string' ? raw.currentText : undefined,
    letterField: typeof raw.letterField === 'string' ? raw.letterField : undefined,
    letterFields:
      raw.letterFields && typeof raw.letterFields === 'object' && !Array.isArray(raw.letterFields)
        ? Object.fromEntries(
            Object.entries(raw.letterFields as Record<string, unknown>).map(([key, value]) => [
              key,
              typeof value === 'string' ? value : '',
            ]),
          )
        : undefined,
  };

  if (typeof raw.experienceIndex === 'number' && Number.isInteger(raw.experienceIndex) && raw.experienceIndex >= 0) {
    request.experienceIndex = raw.experienceIndex;
  }

  return request;
}

export function usageSnapshot(used: number, limit = DAILY_SUGGEST_LIMIT): SuggestUsage {
  const safeUsed = Math.max(0, used);
  return {
    used: safeUsed,
    limit,
    remaining: Math.max(0, limit - safeUsed),
  };
}

export function canConsumeUsage(used: number, limit = DAILY_SUGGEST_LIMIT): boolean {
  return used < limit;
}

function contentTokens(text: string): string[] {
  const matches = stripJdPlaintext(text).toLowerCase().match(/[a-z][a-z0-9+#.]{2,}/g);
  return matches ? Array.from(matches) : [];
}

export function suggestCorpus(request: SuggestRequest): string {
  const parts = [collectCvPlaintext(request.cv)];
  if (request.currentText) parts.push(request.currentText);
  if (request.jdText) parts.push(stripJdPlaintext(request.jdText));
  if (request.letterFields) parts.push(Object.values(request.letterFields).join(' '));
  const cv = normalizeCVContent(request.cv);
  if (request.kind === 'experience_bullets' && request.experienceIndex != null) {
    const role = cv.experience[request.experienceIndex];
    if (role) {
      parts.push([role.jobTitle, role.company, role.description, ...(role.details || [])].filter(Boolean).join(' '));
    }
  }
  return parts.filter(Boolean).join(' ');
}

export function hasEnoughSourceFacts(request: SuggestRequest): boolean {
  return contentTokens(suggestCorpus(request)).length >= 6;
}

export function isGroundedSuggestion(suggestion: string, corpus: string): boolean {
  const suggestionTokens = [...new Set(contentTokens(suggestion))];
  const corpusSet = new Set(contentTokens(corpus));
  if (suggestionTokens.length === 0) return false;
  const overlap = suggestionTokens.filter((token) => corpusSet.has(token)).length;
  return overlap >= 3 || overlap / suggestionTokens.length >= 0.34;
}

export function filterGroundedSuggestions(suggestions: string[], corpus: string): string[] {
  return suggestions
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter((item) => item.length >= 12 && item.length <= 1200)
    .filter((item) => isGroundedSuggestion(item, corpus))
    .slice(0, 3);
}

export function parseSuggestResponse(parsed: unknown): string[] {
  if (!parsed || typeof parsed !== 'object') return [];
  const raw = (parsed as { suggestions?: unknown }).suggestions;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, 4);
}

function experienceBlock(request: SuggestRequest): string {
  const cv = normalizeCVContent(request.cv);
  const role = request.experienceIndex != null ? cv.experience[request.experienceIndex] : null;
  if (!role) return request.currentText || '';
  return JSON.stringify({
    jobTitle: role.jobTitle,
    company: role.company,
    dates: role.dates,
    details: role.details,
  });
}

export function buildSuggestMessages(request: SuggestRequest): { systemPrompt: string; userPrompt: string } {
  const cv = normalizeCVContent(request.cv);
  const jd = request.jdText ? stripJdPlaintext(request.jdText).slice(0, 4000) : '';

  const systemPrompt = [
    'You rewrite CareerSasa CV and cover-letter fields for Kenyan job applications.',
    'Use ONLY facts present in the provided CV JSON, current field text, and optional job description.',
    'Never invent employers, dates, degrees, tools, metrics, awards, or responsibilities.',
    'If the job description has keywords, emphasize ones already supported by the CV. Do not add JD-only claims.',
    'Return JSON: {"suggestions":["..."]} with 1-3 alternatives.',
    'For experience_bullets, each suggestion is one complete rewrite with one bullet per line.',
    'For skills, each suggestion is a comma-separated list of skills already evidenced on the CV.',
    'Keep Kenyan English, concrete, and concise. No markdown.',
  ].join(' ');

  const shared = [
    `KIND: ${request.kind}`,
    `CV_JSON: ${JSON.stringify({
      personal: { title: cv.personal.title, summary: cv.personal.summary, profile: cv.personal.profile },
      skills: cv.skills,
      tools: cv.tools,
      experience: cv.experience.map((role) => ({
        jobTitle: role.jobTitle,
        company: role.company,
        dates: role.dates,
        details: role.details,
      })),
      education: cv.education.map((item) => ({ degree: item.degree, institution: item.institution })),
      certifications: cv.certifications,
    })}`,
    jd ? `JOB_DESCRIPTION:\n${jd}` : 'JOB_DESCRIPTION: (none)',
    request.currentText ? `CURRENT_TEXT:\n${request.currentText}` : 'CURRENT_TEXT: (empty)',
  ];

  let task = 'Rewrite the professional summary in 3-5 sentences from the CV facts.';
  if (request.kind === 'experience_bullets') {
    task = `Rewrite the responsibilities/achievements for this role as 3-5 bullets (one per line). Role: ${experienceBlock(request)}`;
  } else if (request.kind === 'skills') {
    task = 'Rewrite the skills list. Keep only skills evidenced in the CV. Prefer terms that also appear in the job description when they are already on the CV.';
  } else if (request.kind === 'letter_paragraph') {
    task = `Rewrite the cover letter field "${request.letterField || 'paragraph'}" in 2-5 sentences using CV facts and the target role if given. Letter fields: ${JSON.stringify(request.letterFields || {})}`;
  }

  return {
    systemPrompt,
    userPrompt: `${shared.join('\n\n')}\n\nTASK: ${task}`,
  };
}

export function applySuggestionToList(suggestion: string, mode: 'lines' | 'comma'): string[] {
  const parts = mode === 'comma'
    ? suggestion.split(/,|\n/)
    : suggestion.split(/\n+/);
  return parts.map((part) => part.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);
}
