'use client';

/**
 * Client-side A4 PDF from a React element (CV or cover letter templates).
 * Uses html2pdf.js so Tailwind classes on the mounted node still apply.
 */

import type { ReactElement } from 'react';
import { downloadBlob } from '@/lib/downloadBlob';

type PdfOptions = {
  element: ReactElement;
  filename: string;
  waitMs?: number;
};

async function renderTemplateElement(element: ReactElement, waitMs: number) {
  const [{ createRoot }] = await Promise.all([import('react-dom/client')]);

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.top = '0';
  wrapper.style.left = '-9999px';
  wrapper.style.width = '794px';
  wrapper.style.zIndex = '-1';
  document.body.appendChild(wrapper);

  const root = createRoot(wrapper);

  try {
    await new Promise<void>((resolve) => {
      root.render(element);
      setTimeout(() => resolve(), waitMs);
    });

    const templateEl = wrapper.firstElementChild as HTMLElement | null;
    if (!templateEl) {
      throw new Error('Nothing rendered to export');
    }

    const unlockOverflow = (el: HTMLElement) => {
      el.style.height = 'auto';
      el.style.maxHeight = 'none';
      el.style.overflow = 'visible';
      Array.from(el.children).forEach((child) => unlockOverflow(child as HTMLElement));
    };
    unlockOverflow(templateEl);
    templateEl.style.minHeight = '1123px';

    return { templateEl, cleanup: () => { root.unmount(); wrapper.remove(); } };
  } catch (error) {
    root.unmount();
    wrapper.remove();
    throw error;
  }
}

function pdfOptions(filename: string) {
  return {
    margin: 0,
    filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true,
      windowWidth: 794,
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };
}

export async function renderReactElementToPdfBlob(options: PdfOptions): Promise<Blob> {
  const { element, filename, waitMs = 500 } = options;
  const html2pdf = (await import('html2pdf.js')).default as any;
  const { templateEl, cleanup } = await renderTemplateElement(element, waitMs);

  try {
    const blob = await html2pdf().set(pdfOptions(filename)).from(templateEl).outputPdf('blob');
    if (!(blob instanceof Blob)) {
      throw new Error('PDF export did not return a file');
    }
    return blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
  } finally {
    cleanup();
  }
}

export async function downloadReactElementAsPdf(options: PdfOptions): Promise<void> {
  const blob = await renderReactElementToPdfBlob(options);
  await downloadBlob(blob, options.filename);
}

export function pdfFilename(title: string): string {
  const base = title.trim().replace(/\s+/g, '_') || 'document';
  return base.endsWith('.pdf') ? base : `${base}.pdf`;
}
