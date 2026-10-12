import { defaultCvId, sortLettersForJob } from '@/lib/applyDocuments';
import type { CandidateCoverLetter, CandidateCV } from '@/lib/careerTools';

export type SavedJobDocuments = {
  cv: CandidateCV | null;
  letter: CandidateCoverLetter | null;
  cvIsTargeted: boolean;
  extraTargetedCount: number;
};

export function pickCvForJob<T extends Pick<CandidateCV, 'id' | 'is_primary' | 'target_job_id' | 'updated_at'>>(
  cvs: T[],
  jobId: string,
): T | null {
  const targeted = cvs
    .filter((cv) => cv.target_job_id === jobId)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  if (targeted[0]) return targeted[0];
  const fallbackId = defaultCvId(cvs);
  return cvs.find((cv) => cv.id === fallbackId) || null;
}

export function pickLetterForJob<T extends Pick<CandidateCoverLetter, 'id' | 'job_id' | 'updated_at'>>(
  letters: T[],
  jobId: string,
): T | null {
  return sortLettersForJob(letters, jobId).find((letter) => letter.job_id === jobId) || null;
}

export function documentsForSavedJob(
  jobId: string,
  cvs: CandidateCV[],
  letters: CandidateCoverLetter[],
): SavedJobDocuments {
  const targeted = cvs.filter((cv) => cv.target_job_id === jobId);
  const cv = pickCvForJob(cvs, jobId);
  const letter = pickLetterForJob(letters, jobId);
  return {
    cv,
    letter,
    cvIsTargeted: Boolean(cv && cv.target_job_id === jobId),
    extraTargetedCount: Math.max(0, targeted.length - (cv && cv.target_job_id === jobId ? 1 : 0)),
  };
}

export function applyHrefForJob(
  job: { id: string; job_slug?: string | null },
  docs: Pick<SavedJobDocuments, 'cv' | 'letter'>,
): string {
  const path = `/jobs/${job.job_slug || job.id}`;
  const params = new URLSearchParams();
  if (docs.cv?.id) params.set('cvId', docs.cv.id);
  if (docs.letter?.id) params.set('letterId', docs.letter.id);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function careerToolsHrefForJob(jobId: string, cvId?: string | null): string {
  const params = new URLSearchParams({ jobId });
  if (cvId) params.set('cvId', cvId);
  return `/dashboard/career-tools?${params.toString()}`;
}
