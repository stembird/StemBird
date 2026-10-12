'use client';

import { useEffect, useState, type ComponentType } from 'react';
import Link from 'next/link';
import CVStudioFrame from '@/components/cv/CVStudioFrame';
import PublicCvDownloads from '@/components/cv/PublicCvDownloads';
import { resolveCVTemplate } from '@/components/cv/resolveCVTemplate';
import { toTemplateProps } from '@/lib/cvContent';
import { mergeDesign } from '@/lib/cvDesign';
import type { CVDesign } from '@/types/careerDocuments';

export default function PublicCvView({
  title,
  content,
  templateName,
}: {
  title: string;
  content: unknown;
  templateName: string;
}) {
  const [Template, setTemplate] = useState<ComponentType<{ data: any }> | null>(null);
  const design = mergeDesign(undefined, (content as { design?: CVDesign } | null)?.design);
  const name = (content as { personal?: { name?: string } } | null)?.personal?.name || title;

  useEffect(() => {
    let cancelled = false;
    resolveCVTemplate(templateName).then((Component) => {
      if (!cancelled) setTemplate(() => Component);
    });
    return () => {
      cancelled = true;
    };
  }, [templateName]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">{name}</p>
            <p className="text-xs text-muted-foreground">{title}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PublicCvDownloads title={title} content={content} templateName={templateName} />
            <Link href="/" className="text-xs text-[#0A66C2] hover:underline">
              Shared via CareerSasa
            </Link>
          </div>
        </div>
      </header>
      <div className="overflow-x-auto px-4 py-8">
        <div className="mx-auto bg-white shadow-lg" style={{ width: 794 }}>
          {Template ? (
            <CVStudioFrame design={design}>
              <Template data={toTemplateProps(content, templateName)} />
            </CVStudioFrame>
          ) : (
            <div className="flex h-[400px] items-center justify-center text-sm text-muted-foreground">
              Loading CV…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
