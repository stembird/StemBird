import type { ComponentType } from 'react';

export async function resolveCVTemplate(
  name: string,
): Promise<ComponentType<{ data: any }>> {
  switch (name) {
    case 'Classic Professional':
      return (await import('@/components/cv/templates/ClassicTemplate')).default;
    case 'Modern Professional':
      return (await import('@/components/cv/templates/ModernTemplate')).default;
    case 'Executive Leadership':
      return (await import('@/components/cv/templates/ExecutiveTemplate')).default;
    case 'Graduate Starter CV':
      return (await import('@/components/cv/templates/GraduateTemplate')).default;
    case 'Skills-Based (Functional)':
      return (await import('@/components/cv/templates/FunctionalTemplate')).default;
    case 'Internship / Industrial Attachment':
      return (await import('@/components/cv/templates/InternshipTemplate')).default;
    case 'Creative Portfolio':
      return (await import('@/components/cv/templates/CreativeTemplate')).default;
    case 'Digital Professional':
      return (await import('@/components/cv/templates/DigitalProfessionalTemplate')).default;
    case 'Personal Brand CV':
      return (await import('@/components/cv/templates/PersonalBrandTemplate')).default;
    case 'Academic / Research CV':
      return (await import('@/components/cv/templates/AcademicTemplate')).default;
    case 'Technical / Engineering CV':
      return (await import('@/components/cv/templates/TechnicalEngineeringTemplate')).default;
    case 'International / ATS Optimized CV':
      return (await import('@/components/cv/templates/ATSOptimizedTemplate')).default;
    default:
      return (await import('@/components/cv/templates/ClassicTemplate')).default;
  }
}
