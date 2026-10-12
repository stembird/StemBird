/**
 * Utility functions for Open Graph tags and social media sharing
 */

import { buildShareOgImagePath } from '@/lib/ogTemplateCatalog';

/**
 * Generate the URL for a job's Open Graph thumbnail.
 * Picks a stable template from the accepted share set (2 / 4 / 5) per job.
 */
export const getJobThumbnailUrl = (jobId: string): string => {
  const path = buildShareOgImagePath(jobId);

  if (process.env.NODE_ENV === 'development') {
    return path;
  }

  return `https://www.careersasa.co.ke${path}`;
};

/**
 * Generate the URL for the default Open Graph thumbnail
 */
export const getDefaultThumbnailUrl = (): string => {
  if (process.env.NODE_ENV === 'development') {
    return '/og-image.svg';
  }

  return 'https://www.careersasa.co.ke/og-image.svg';
};
