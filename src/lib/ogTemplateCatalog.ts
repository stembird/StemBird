/**
 * Catalog of CareerSasa job OG / social card templates.
 * Accepted for social shares: 2, 4, 5 (stable pseudo-random pick per job).
 */

export type OgTemplateId = '2' | '4' | '5';

export type OgTemplateReviewStatus =
  | 'pending'
  | 'approved'
  | 'needs_changes'
  | 'rejected';

export type OgTemplateReview = {
  status: OgTemplateReviewStatus;
  notes: string;
  updatedAt: string | null;
};

export type OgTemplateReviewsMap = Partial<Record<OgTemplateId, OgTemplateReview>>;

/** app_settings key that stores JSON reviews for all OG templates */
export const OG_TEMPLATE_REVIEWS_SETTING_KEY = 'og_template_reviews';

/** Templates used when a job link is shared (no explicit ?template= override). */
export const ACCEPTED_SHARE_TEMPLATES: readonly OgTemplateId[] = ['2', '4', '5'];

export const OG_TEMPLATE_CATALOG: Array<{
  id: OgTemplateId;
  name: string;
  description: string;
  /** Query value for /api/og/job/{id}?template= */
  queryValue: OgTemplateId;
  accent: string;
}> = [
  {
    id: '2',
    name: 'Light Split Panel',
    description:
      'White left / blue diagonal right, MetaTiles, orange arc, “Don’t wait” text. In share rotation.',
    queryValue: '2',
    accent: 'bg-sky-100 text-sky-800',
  },
  {
    id: '4',
    name: 'Light Hex Frame',
    description:
      'Light editorial card with CareerSasa blue hexagonal portrait frame. In share rotation.',
    queryValue: '4',
    accent: 'bg-indigo-100 text-indigo-800',
  },
  {
    id: '5',
    name: 'LinkedIn Blue',
    description:
      'Medium LinkedIn-blue gradient, circular portrait, white footer. In share rotation.',
    queryValue: '5',
    accent: 'bg-cyan-100 text-cyan-900',
  },
];

/**
 * Stable pseudo-random template pick for a job.
 * Same job id/slug always maps to the same template (good for social caches);
 * different jobs spread across ACCEPTED_SHARE_TEMPLATES.
 */
export function pickOgTemplateForJob(jobIdOrSlug: string): OgTemplateId {
  const key = (jobIdOrSlug || '').trim() || 'careersasa';
  // FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const idx = Math.abs(hash) % ACCEPTED_SHARE_TEMPLATES.length;
  return ACCEPTED_SHARE_TEMPLATES[idx];
}

/** Honor explicit ?template= when accepted; otherwise rotate by job. */
export function resolveOgTemplateSelection(
  jobIdOrSlug: string,
  requested?: string | null,
): OgTemplateId {
  if (requested === '2' || requested === '4' || requested === '5') {
    return requested;
  }
  return pickOgTemplateForJob(jobIdOrSlug);
}

export function buildOgPreviewUrl(
  jobIdOrSlug: string,
  templateId: OgTemplateId,
  size: string = 'og',
  bustCache = true,
): string {
  const params = new URLSearchParams();
  params.set('template', templateId);
  if (size && size !== 'og') params.set('size', size);
  if (bustCache) params.set('t', String(Date.now()));
  return `/api/og/job/${encodeURIComponent(jobIdOrSlug)}?${params.toString()}`;
}

/**
 * Canonical share image path.
 *
 * Always the file-like `/og/jobs/{id}.png` URL (rewritten to the generator).
 * Facebook's crawler often skips or times out `/api/og/...` URLs without an
 * image extension; Buffer warms this same path before publishing.
 */
export function buildShareOgImagePath(jobIdOrSlug: string): string {
  const template = pickOgTemplateForJob(jobIdOrSlug);
  return `/og/jobs/${encodeURIComponent(jobIdOrSlug)}.png?template=${template}`;
}

/**
 * File-like PNG URL for Buffer / LinkedIn / Facebook.
 * Same as buildShareOgImagePath — kept as an alias so existing callers stay clear.
 */
export function buildShareOgImageFilePath(jobIdOrSlug: string): string {
  return buildShareOgImagePath(jobIdOrSlug);
}

export function emptyReview(): OgTemplateReview {
  return { status: 'pending', notes: '', updatedAt: null };
}

export function parseOgTemplateReviews(raw: string | null | undefined): OgTemplateReviewsMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as OgTemplateReviewsMap;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}
