import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a SEO-friendly slug from a title and optional company name
 * @param title - The job title
 * @param company - Optional company name
 * @returns A clean, URL-safe slug
 */
export function generateSlug(title: string, company?: string | null): string {
  // Combine title and company if provided
  let text = title;
  if (company) {
    // Use only the first part of company name (before space or dash) to keep slug short
    const companyPart = company.split(/[\s-]/)[0];
    text = `${title} ${companyPart}`;
  }
  
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}