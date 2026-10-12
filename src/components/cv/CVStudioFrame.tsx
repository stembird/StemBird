'use client';

import type { ReactNode } from 'react';
import { designCssVars, mergeDesign } from '@/lib/cvDesign';
import type { CVDesign } from '@/types/careerDocuments';

export default function CVStudioFrame({
  design,
  children,
}: {
  design?: CVDesign;
  children: ReactNode;
}) {
  const merged = mergeDesign(undefined, design);
  return (
    <div
      className="cv-studio-doc"
      data-font={merged.fontFamily || 'sans'}
      data-size={merged.fontSize || 'md'}
      style={{
        ...designCssVars(merged),
        fontFamily: 'var(--cv-font)',
        lineHeight: 'var(--cv-line-height)',
        zoom: 'var(--cv-size-zoom)',
        borderTop: '6px solid var(--cv-primary)',
      }}
    >
      <style>{`
        .cv-studio-doc > * { font-family: inherit; }
        .cv-studio-doc header { border-color: var(--cv-primary) !important; }
        .cv-studio-doc p, .cv-studio-doc li { line-height: inherit; }
      `}</style>
      {children}
    </div>
  );
}
