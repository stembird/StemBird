import type { CSSProperties } from 'react';
import type { CVDesign } from '@/types/careerDocuments';

export const DESIGN_COLOR_PRESETS = [
  '#111827',
  '#1e3a5f',
  '#1a365d',
  '#1d4ed8',
  '#2563eb',
  '#4f46e5',
  '#0f172a',
  '#047857',
  '#7c2d12',
  '#be123c',
] as const;

export const DEFAULT_DESIGN: CVDesign = {
  primaryColor: '#111827',
  fontFamily: 'sans',
  fontSize: 'md',
  lineSpacing: 1.45,
  sectionOrder: [],
  hiddenSections: [],
};

const FONT_STACK = {
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
} as const;

const FONT_SIZE_PX = { sm: '13px', md: '14px', lg: '16px' } as const;
const SIZE_ZOOM = { sm: 0.92, md: 1, lg: 1.08 } as const;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function inferFontFamily(raw: string | undefined, templateName?: string): 'sans' | 'serif' {
  if (raw && /serif|georgia|times|garamond/i.test(raw) && !/sans-serif|sans_serif/i.test(raw)) {
    return 'serif';
  }
  if (templateName && /academic|executive/i.test(templateName)) return 'serif';
  return 'sans';
}

export function normalizeHexColor(value: string | undefined): string {
  if (!value) return DEFAULT_DESIGN.primaryColor as string;
  const hex = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) return hex.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase();
  }
  return DEFAULT_DESIGN.primaryColor as string;
}

/** Seed design from cv_templates.template_data (colors.primary, fonts, sections). */
export function designFromTemplateData(templateData: unknown, templateName?: string): CVDesign {
  const data = asRecord(templateData);
  const colors = asRecord(data.colors);
  const fonts = asRecord(data.fonts);
  const primary =
    (typeof colors.primary === 'string' && colors.primary) ||
    (typeof colors.accent === 'string' && colors.accent) ||
    (typeof data.primaryColor === 'string' && data.primaryColor) ||
    DEFAULT_DESIGN.primaryColor;
  const fontRaw =
    (typeof fonts.primary === 'string' && fonts.primary) ||
    (typeof fonts.body === 'string' && fonts.body) ||
    (typeof data.fontFamily === 'string' && data.fontFamily) ||
    undefined;
  const sections = Array.isArray(data.sections)
    ? data.sections.filter((item): item is string => typeof item === 'string')
    : [];

  return {
    primaryColor: normalizeHexColor(primary),
    fontFamily: inferFontFamily(fontRaw, templateName),
    fontSize: 'md',
    lineSpacing: 1.45,
    sectionOrder: sections,
    hiddenSections: [],
  };
}

export function mergeDesign(base?: CVDesign, override?: CVDesign): CVDesign {
  return {
    ...DEFAULT_DESIGN,
    ...base,
    ...override,
    sectionOrder: override?.sectionOrder ?? base?.sectionOrder ?? [],
    hiddenSections: override?.hiddenSections ?? base?.hiddenSections ?? [],
  };
}

export function isSectionHidden(design: CVDesign | undefined, key: string): boolean {
  return Boolean(design?.hiddenSections?.includes(key));
}

export function designCssVars(design?: CVDesign): CSSProperties {
  const merged = mergeDesign(undefined, design);
  const size = merged.fontSize === 'sm' || merged.fontSize === 'lg' ? merged.fontSize : 'md';
  const family = merged.fontFamily === 'serif' ? 'serif' : 'sans';
  const spacing = typeof merged.lineSpacing === 'number' && merged.lineSpacing > 0
    ? merged.lineSpacing
    : 1.45;

  return {
    '--cv-primary': normalizeHexColor(merged.primaryColor),
    '--cv-font': FONT_STACK[family],
    '--cv-font-size': FONT_SIZE_PX[size],
    '--cv-line-height': String(spacing),
    '--cv-size-zoom': String(SIZE_ZOOM[size]),
  } as CSSProperties;
}

export function emptyHiddenSections(design: CVDesign | undefined, values: Record<string, unknown>) {
  if (!design?.hiddenSections?.length) return values;
  const next = { ...values };
  for (const key of design.hiddenSections) {
    if (key in next) next[key] = Array.isArray(next[key]) ? [] : next[key];
  }
  return next;
}
