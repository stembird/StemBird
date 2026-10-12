export type ScraperAdapterType =
  | 'workable'
  | 'smartrecruiters'
  | 'greenhouse'
  | 'taleo'
  | 'taleo_be'
  | 'oracle_cloud'
  | 'psc'
  | 'psc_pdf'
  | 'brightermonday'
  | 'fuzu'
  | 'myjobmag'
  | 'html'
  | 'unknown'

export type ScraperSourceCategory = 'government' | 'employer' | 'ngo' | 'other'

export function getAdapterType(selectors: unknown): ScraperAdapterType {
  const type = (selectors as { type?: string })?.type
  if (
    type === 'workable' ||
    type === 'smartrecruiters' ||
    type === 'greenhouse' ||
    type === 'taleo' ||
    type === 'taleo_be' ||
    type === 'oracle_cloud' ||
    type === 'psc' ||
    type === 'psc_pdf' ||
    type === 'brightermonday' ||
    type === 'fuzu' ||
    type === 'myjobmag'
  ) {
    return type
  }
  if (type) return 'html'
  return 'unknown'
}

export function getSourceCategory(selectors: unknown): ScraperSourceCategory {
  const category = (selectors as { category?: string })?.category
  if (category === 'government' || category === 'employer' || category === 'ngo') return category
  return 'other'
}

export const ADAPTER_LABELS: Record<ScraperAdapterType, string> = {
  workable: 'Workable ATS',
  smartrecruiters: 'SmartRecruiters ATS',
  greenhouse: 'Greenhouse ATS',
  taleo: 'Oracle Taleo Enterprise',
  taleo_be: 'Oracle Taleo Business Edition',
  oracle_cloud: 'Oracle Cloud HCM',
  psc: 'PSC Portal (listing table)',
  psc_pdf: 'PSC PDF Adverts (full detail)',
  brightermonday: 'BrighterMonday (JSON-LD)',
  fuzu: 'Fuzu (JSON-LD)',
  myjobmag: 'MyJobMag (JSON-LD / HTML)',
  html: 'HTML / CSS',
  unknown: 'Unknown',
}

export const CATEGORY_LABELS: Record<ScraperSourceCategory, string> = {
  government: 'Government',
  employer: 'Employer',
  ngo: 'NGO',
  other: 'Other',
}
