import type { CandidateCoverLetter, CandidateCV } from '@/lib/careerTools';

export type ApplicationMethod = 'profile' | 'cv' | 'career_tools';

export function isBuilderPdfCacheFresh(cv: Pick<CandidateCV, 'file_url' | 'last_generated_at' | 'updated_at'>): boolean {
  if (!cv.file_url || !cv.last_generated_at) return false;
  return new Date(cv.last_generated_at).getTime() >= new Date(cv.updated_at).getTime() - 2000;
}

export function sortLettersForJob<T extends { job_id: string | null; updated_at: string }>(
  letters: T[],
  jobId: string,
): T[] {
  return [...letters].sort((a, b) => {
    const aMatch = a.job_id === jobId ? 0 : 1;
    const bMatch = b.job_id === jobId ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

export function defaultCvId(cvs: Pick<CandidateCV, 'id' | 'is_primary'>[]): string {
  const primary = cvs.find((cv) => cv.is_primary);
  return primary?.id || cvs[0]?.id || '';
}

export function isMissingDbColumnError(error: { message?: string } | null, column: string): boolean {
  const message = error?.message || '';
  return new RegExp(column, 'i').test(message) && /column/i.test(message);
}

export type ApplicationDocumentIds = {
  candidate_cv_id?: string | null;
  candidate_cover_letter_id?: string | null;
};

/** Drop builder document FKs when the migration has not been applied yet. */
export function applicationInsertWithoutDocumentFks<T extends ApplicationDocumentIds>(row: T): Omit<T, 'candidate_cv_id' | 'candidate_cover_letter_id'> {
  const { candidate_cv_id: _cv, candidate_cover_letter_id: _letter, ...rest } = row;
  return rest;
}

export function pickLetterForPrefill(
  letters: CandidateCoverLetter[],
  jobId: string,
  preferredId?: string | null,
): CandidateCoverLetter | null {
  if (preferredId) {
    return letters.find((l) => l.id === preferredId) || null;
  }
  const sorted = sortLettersForJob(letters, jobId);
  return sorted.find((l) => l.job_id === jobId) || null;
}
