/**
 * Save a generated file on desktop and mobile.
 * iOS Safari often ignores <a download> for blob URLs, so phones get the share
 * sheet (Save to Files / WhatsApp / email). PDFs also open in a new tab.
 */

export const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function fileBasename(title: string, ext: string): string {
  const cleanExt = ext.replace(/^\./, '');
  const base = title.trim().replace(/\s+/g, '_') || 'document';
  return base.toLowerCase().endsWith(`.${cleanExt.toLowerCase()}`) ? base : `${base}.${cleanExt}`;
}

export function wordFilename(title: string): string {
  return fileBasename(title, 'docx');
}

export function textFilename(title: string): string {
  return fileBasename(title, 'txt');
}

export function mimeForFilename(filename: string, fallback?: string): string {
  if (/\.pdf$/i.test(filename)) return 'application/pdf';
  if (/\.docx$/i.test(filename)) return DOCX_MIME;
  if (/\.txt$/i.test(filename)) return 'text/plain;charset=utf-8';
  return fallback || 'application/octet-stream';
}

export function isLikelyIos(userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent): boolean {
  if (/iPad|iPhone|iPod/i.test(userAgent)) return true;
  if (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
    return true;
  }
  return false;
}

export function isLikelyMobile(userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent): boolean {
  return isLikelyIos(userAgent) || /Android|Mobile/i.test(userAgent);
}

function canShareFile(file: File): boolean {
  const nav = typeof navigator === 'undefined' ? null : navigator;
  if (!nav || typeof nav.share !== 'function') return false;
  if (typeof nav.canShare !== 'function') return false;
  try {
    return nav.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const type = blob.type && blob.type !== 'application/octet-stream'
    ? blob.type
    : mimeForFilename(filename);
  const file = new File([blob], filename, { type });
  const typed = blob.type === type ? blob : new Blob([blob], { type });

  if (isLikelyMobile() && canShareFile(file)) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
    }
  }

  const url = URL.createObjectURL(typed);
  const isPdf = type === 'application/pdf';

  if (isLikelyIos() && isPdf) {
    const opened = window.open(url, '_blank', 'noopener');
    if (!opened) {
      window.location.href = url;
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}
