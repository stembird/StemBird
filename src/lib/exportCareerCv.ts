'use client';

import { createElement } from 'react';
import { resolveCVTemplate } from '@/components/cv/resolveCVTemplate';
import { supabase } from '@/integrations/supabase/client';
import { isBuilderPdfCacheFresh } from '@/lib/applyDocuments';
import { updateCV, type CandidateCV } from '@/lib/careerTools';
import { toTemplateProps } from '@/lib/cvContent';
import { mergeDesign } from '@/lib/cvDesign';
import { pdfFilename, renderReactElementToPdfBlob } from '@/lib/documentPdf';
import CVStudioFrame from '@/components/cv/CVStudioFrame';
import type { CVDesign } from '@/types/careerDocuments';

export async function generateCareerCvPdfBlob(
  cv: CandidateCV,
  templateName: string,
): Promise<Blob> {
  const Template = await resolveCVTemplate(templateName);
  const design = mergeDesign(undefined, (cv.content as { design?: CVDesign } | null)?.design);
  return renderReactElementToPdfBlob({
    element: createElement(CVStudioFrame, {
      design,
      children: createElement(Template, { data: toTemplateProps(cv.content, templateName) }),
    }),
    filename: pdfFilename(cv.title),
    waitMs: 500,
  });
}

export async function ensureCareerCvApplicationFile(
  userId: string,
  cv: CandidateCV,
  templateName: string,
): Promise<{ url: string; name: string; size: number | null }> {
  const name = pdfFilename(cv.title);

  if (isBuilderPdfCacheFresh(cv) && cv.file_url) {
    return { url: cv.file_url, name, size: null };
  }

  const blob = await generateCareerCvPdfBlob(cv, templateName);
  const fileName = `${userId}/builder/${cv.id}-${Date.now()}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from('application-cvs')
    .upload(fileName, blob, { contentType: 'application/pdf', upsert: false });

  if (uploadError) {
    throw new Error('Failed to upload Career Tools CV');
  }

  const { data: { publicUrl } } = supabase.storage
    .from('application-cvs')
    .getPublicUrl(fileName);

  const generatedAt = new Date().toISOString();
  try {
    await updateCV(cv.id, { file_url: publicUrl, last_generated_at: generatedAt });
  } catch (error) {
    console.error('Failed to cache generated CV URL', error);
  }

  return { url: publicUrl, name, size: blob.size };
}
