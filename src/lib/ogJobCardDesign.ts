/**
 * Design tokens + helpers for CareerSasa social / OG job cards.
 * Tuned for @vercel/og (Satori): flexbox + inline styles only.
 */

import { OG_FETCH_TIMEOUT_MS, fetchWithTimeout } from '@/lib/ogFetch';

export const OG_COLORS = {
  /** CareerSasa primary — LinkedIn / corporate blue family */
  primaryBlue: '#1565C0',
  linkedinBlue: '#0077B5',
  primaryBlueDeep: '#0D47A1',
  primaryBlueMid: '#1976D2',
  /** CareerSasa secondary */
  accentOrange: '#FF7A00',
  accentOrangeDeep: '#E86A00',
  white: '#FFFFFF',
  lightBlue: '#EAF3FF',
  textMuted: '#5B6B7C',
  borderSubtle: 'rgba(255,255,255,0.35)',
  chipBg: 'rgba(255,255,255,0.10)',
} as const;

export type OgCardSize = 'og' | 'square' | 'portrait' | 'landscape';

export const OG_CARD_SIZES: Record<
  OgCardSize,
  { width: number; height: number; label: string }
> = {
  og: { width: 1200, height: 630, label: 'Facebook / LinkedIn' },
  square: { width: 1080, height: 1080, label: 'Instagram' },
  portrait: { width: 1080, height: 1350, label: 'Portrait' },
  landscape: { width: 1920, height: 1080, label: 'Landscape' },
};

export function resolveOgCardSize(raw?: string | null): OgCardSize {
  const key = (raw || 'og').toLowerCase();
  if (key in OG_CARD_SIZES) return key as OgCardSize;
  if (key === 'facebook' || key === 'linkedin' || key === '1200x628' || key === '1200x630') {
    return 'og';
  }
  if (key === 'instagram' || key === '1080x1080') return 'square';
  if (key === '1080x1350') return 'portrait';
  if (key === '1920x1080') return 'landscape';
  return 'og';
}

/** Left-edge category strip — recognizable before reading the title */
export function getCategoryStripColor(jobFunction?: string | null, title?: string | null): string {
  const hay = `${jobFunction || ''} ${title || ''}`.toLowerCase();

  if (
    /health|medical|nurse|doctor|clinical|pharma|physio|hospital|wellness/.test(hay)
  ) {
    return '#2E7D32'; // green
  }
  if (/engineer(?!ing manager)|mechanical|electrical|civil|architect|construction/.test(hay)) {
    return '#FF7A00'; // orange
  }
  if (/finance|bank|account|audit|invest|insurance|credit|treasury/.test(hay)) {
    return '#7B1FA2'; // purple
  }
  if (/educat|teach|lectur|train|research|academic|school|university/.test(hay)) {
    return '#00897B'; // teal
  }
  if (/market|communicat|media|pr |brand|content|creative|design/.test(hay)) {
    return '#C62828'; // red
  }
  if (/sales|customer|retail|commercial/.test(hay)) {
    return '#EF6C00'; // deep orange
  }
  if (/hr |human resource|people|recruit|talent/.test(hay)) {
    return '#6A1B9A'; // violet
  }
  if (/legal|law|compliance|govern|public|policy/.test(hay)) {
    return '#455A64'; // blue-grey
  }
  if (
    /it |software|tech|cyber|data|developer|engineer|digital|information|computer|network|cloud|ai /.test(
      hay,
    )
  ) {
    return '#1565C0'; // brand blue — IT
  }
  if (/driv|logistics|transport|fleet|warehouse|supply/.test(hay)) {
    return '#5D4037'; // brown
  }
  return '#1565C0';
}

export function formatEmploymentType(raw?: string | null): string | null {
  if (!raw) return null;
  const key = raw.toUpperCase().replace(/[\s-]+/g, '_');
  const map: Record<string, string> = {
    FULL_TIME: 'Full Time',
    PART_TIME: 'Part Time',
    CONTRACT: 'Contract',
    TEMPORARY: 'Temporary',
    INTERN: 'Internship',
    INTERNSHIP: 'Internship',
    CASUAL: 'Casual',
    FREELANCE: 'Freelance',
    VOLUNTEER: 'Volunteer',
  };
  if (map[key]) return map[key];
  return raw
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function truncateWords(text: string, maxLength: number): string {
  const value = (text || '').trim();
  if (value.length <= maxLength) return value;
  const cut = value.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > Math.floor(maxLength * 0.55) ? cut.slice(0, lastSpace) : cut;
  return `${base.trimEnd()}...`;
}

/** Scale factor relative to 1200×630 OG canvas */
export function getLayoutScale(size: OgCardSize): number {
  const { width, height } = OG_CARD_SIZES[size];
  return Math.min(width / 1200, height / 630);
}

export type OgJobCardData = {
  title: string;
  companyName: string;
  location: string | null;
  employmentType: string | null;
  jobFunction: string | null;
  companyLogoSrc: string | null;
  personImageSrc: string | null;
  brandLogoSrc: string | null;
  showVerified: boolean;
  categoryColor: string;
  size: OgCardSize;
  /** Optional QR (data URL) for high-contrast template footer */
  qrCodeSrc?: string | null;
  jobUrl?: string | null;
};

export async function loadPublicAssetDataUrl(
  path: string,
  origin: string,
  fallbackOrigin = 'https://www.careersasa.co.ke',
): Promise<string | null> {
  const bases = [origin.replace(/\/$/, ''), fallbackOrigin.replace(/\/$/, '')];
  const unique = [...new Set(bases)];
  for (const base of unique) {
    try {
      const res = await fetchWithTimeout(
        `${base}${path.startsWith('/') ? path : `/${path}`}`,
        OG_FETCH_TIMEOUT_MS.asset,
      );
      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') || 'image/png';
      if (!contentType.startsWith('image/')) continue;
      const buffer = await res.arrayBuffer();
      if (!buffer.byteLength) continue;
      return `data:${contentType};base64,${arrayBufferToBase64(buffer)}`;
    } catch {
      // try next origin
    }
  }
  return null;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** Load Inter TTF weights for @vercel/og. Skip 400 — cards use 600/700/800. */
export async function loadInterFonts(): Promise<
  { name: string; data: ArrayBuffer; weight: 600 | 700 | 800; style: 'normal' }[]
> {
  const weights: Array<600 | 700 | 800> = [600, 700, 800];
  const fonts: { name: string; data: ArrayBuffer; weight: 600 | 700 | 800; style: 'normal' }[] =
    [];

  await Promise.all(
    weights.map(async (weight) => {
      try {
        const url = `https://cdn.jsdelivr.net/fontsource/fonts/inter@5.2.5/latin-${weight}-normal.ttf`;
        const res = await fetchWithTimeout(url, OG_FETCH_TIMEOUT_MS.font);
        if (!res.ok) return;
        const data = await res.arrayBuffer();
        if (!data.byteLength) return;
        fonts.push({ name: 'Inter', data, weight, style: 'normal' });
      } catch {
        // fall back to system sans if font CDN fails
      }
    }),
  );

  return fonts;
}
