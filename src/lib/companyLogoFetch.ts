/**
 * Server-side company logo fetcher.
 *
 * Tries multiple sources in priority order, verifies the image is real
 * (checks content-type + minimum byte size), and returns the working URL.
 *
 * HARD RULE: never invent a logo URL. Only return URLs that verify as real images.
 * Prefer known-brand domains over wrong/dead website hints.
 *
 * THIS FILE must only be imported from server-side code (API routes, cron).
 * It uses Node.js fetch which is not available in edge runtime.
 */

import { extractDomain, lookupBrand } from './companyLogo';
import { lookupOfficialLogo } from './officialCompanyLogos';
import { normalizeHostname } from './domainVerification';

const UA = 'Mozilla/5.0 (compatible; careersasa-bot/1.0; +https://careersasa.co.ke)';

// Generic gstatic "unknown domain" placeholder is 726B / 16×16.
// Real logos can be ~900–1400B (e.g. INTERFELK 48×48 JPEG ≈ 1086B).
const MIN_IMAGE_BYTES = 850;
const GENERIC_PLACEHOLDER_BYTES = 726;

interface FetchLogoResult {
  url: string;
  source: string;
  domain?: string;
}

/**
 * WordPress and other CMS pages often emit HTML-encoded URL bits
 * (e.g. &#038; for &). Decode those before probing, or verify fails.
 */
export function sanitizeLogoCandidateUrl(raw: string, domain?: string): string | null {
  if (!raw?.trim()) return null;
  let value = raw.trim();

  // Decode common HTML entities (named + numeric)
  value = value
    .replace(/&amp;/gi, '&')
    .replace(/&#0*38;/g, '&')
    .replace(/&#x0*26;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#x0*27;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

  // Strip trailing junk left by broken entity decoding (e.g. "...svg&#")
  value = value.replace(/&#+$/g, '').replace(/&+$/g, '');

  if (value.startsWith('//')) value = `https:${value}`;
  if (!/^https?:\/\//i.test(value) && domain) {
    value = `https://${domain}${value.startsWith('/') ? '' : '/'}${value}`;
  }

  try {
    const parsed = new URL(value);
    if (!/^https?:$/i.test(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function pngDims(buf: ArrayBuffer): { w: number; h: number } | null {
  const u8 = new Uint8Array(buf);
  if (u8.length < 24) return null;
  if (u8[0] !== 0x89 || u8[1] !== 0x50 || u8[2] !== 0x4e || u8[3] !== 0x47) return null;
  const view = new DataView(buf);
  return { w: view.getUint32(16), h: view.getUint32(20) };
}

function jpegDims(buf: ArrayBuffer): { w: number; h: number } | null {
  const u8 = new Uint8Array(buf);
  if (u8.length < 4 || u8[0] !== 0xff || u8[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < u8.length) {
    if (u8[i] !== 0xff) { i++; continue; }
    const marker = u8[i + 1];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      return { h: (u8[i + 5] << 8) | u8[i + 6], w: (u8[i + 7] << 8) | u8[i + 8] };
    }
    const len = (u8[i + 2] << 8) | u8[i + 3];
    i += 2 + len;
  }
  return null;
}

/** Check that a URL returns a real image (not a generic 16×16 placeholder). */
export async function verifyImageUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return false;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.startsWith('image/') && !ct.includes('svg') && !ct.includes('icon')) return false;
    const buf = await res.arrayBuffer();
    const size = buf.byteLength;
    if (size === GENERIC_PLACEHOLDER_BYTES || size < 500) return false;

    const dims = pngDims(buf) || jpegDims(buf);
    if (dims) {
      if (dims.w <= 16 || dims.h <= 16) return false;
      return dims.w >= 32 || dims.h >= 32;
    }
    if (ct.includes('svg')) return size >= 200;
    return size >= MIN_IMAGE_BYTES;
  } catch {
    return false;
  }
}

/** Try the gstatic faviconV2 service for a domain. Returns URL if real image found. */
async function trygstatic(domain: string): Promise<string | null> {
  const url = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${encodeURIComponent(domain)}&size=128`;
  if (await verifyImageUrl(url)) return url;
  return null;
}

/**
 * icon.horse often returns a real brand icon, but also recycles placeholders.
 * We reject tiny / 16×16 images via verifyImageUrl; cron/script does hash dedupe.
 */
async function tryIconHorse(domain: string): Promise<string | null> {
  const url = `https://icon.horse/icon/${domain}`;
  if (await verifyImageUrl(url)) return url;
  return null;
}

/** Try Clearbit logo API (free, no key). Works from Vercel production IPs. */
async function tryClearbit(domain: string): Promise<string | null> {
  const url = `https://logo.clearbit.com/${domain}?size=128`;
  if (await verifyImageUrl(url)) return url;
  return null;
}

/** Try Logo.dev when a token is configured (higher hit-rate for known brands). */
async function tryLogoDev(domain: string): Promise<string | null> {
  const token = process.env.LOGO_DEV_API_KEY || process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN;
  if (!token) return null;
  const url = `https://img.logo.dev/${encodeURIComponent(domain)}?token=${encodeURIComponent(token)}&size=128&format=png`;
  if (await verifyImageUrl(url)) return url;
  return null;
}

/** Try fetching well-known logo asset paths directly from the company website. */
async function tryDirectAssets(domain: string): Promise<string | null> {
  const paths = [
    '/apple-touch-icon.png',
    '/apple-touch-icon-precomposed.png',
    '/android-chrome-192x192.png',
    '/favicon-196x196.png',
    '/favicon-192x192.png',
    '/favicon-128x128.png',
    '/logo.png',
    '/logo.svg',
  ];
  for (const p of paths) {
    const url = `https://${domain}${p}`;
    if (await verifyImageUrl(url)) return url;
  }
  return null;
}

/** Scrape the company homepage for icon/OG image link tags. */
async function scrapeWebsiteForLogo(domain: string): Promise<string | null> {
  try {
    const res = await fetch(`https://${domain}`, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(12000),
      redirect: 'follow',
    });
    if (!res.ok) return null;

    const html = await res.text();

    // Collect candidate URLs from <link> and <meta og:image>
    const candidates: string[] = [];

    // apple-touch-icon (highest quality)
    for (const m of html.matchAll(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*href=["']([^"']+)["']/gi)) {
      candidates.push(m[1]);
    }
    // Large favicons
    for (const m of html.matchAll(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+(?:sizes=["']([0-9]+x[0-9]+)["'][^>]*)?href=["']([^"']+)["']/gi)) {
      const size = m[1] ? parseInt(m[1]) : 0;
      if (size >= 96 || !m[1]) candidates.push(m[2]);
    }
    // og:image
    for (const m of html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi)) {
      candidates.push(m[1]);
    }
    // twitter:image (often same as og:image but sometimes higher quality)
    for (const m of html.matchAll(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/gi)) {
      candidates.push(m[1]);
    }
    // Inline logo assets (e.g. AMSOL ships brand mark as /assets/*Logo*.jpeg)
    for (const m of html.matchAll(/<img[^>]+src=["']([^"']*[Ll]ogo[^"']*)["']/gi)) {
      candidates.push(m[1]);
    }
    for (const m of html.matchAll(/["'](\/assets\/[^"']*[Ll]ogo[^"']+\.(?:png|jpe?g|svg|webp))["']/gi)) {
      candidates.push(m[1]);
    }

    for (const candidate of candidates) {
      const absolute = sanitizeLogoCandidateUrl(candidate, domain);
      if (!absolute) continue;

      // Skip obvious page banners / photos masquerading as logos
      if (
        /website-thumbnail|_1200x630_crop|scaled|household|banner|hero|cover|splash|preview_image/i.test(
          absolute,
        )
      ) {
        continue;
      }

      if (await verifyImageUrl(absolute)) {
        return absolute;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Try all logo sources for a single domain. Never returns Twitter/unavatar. */
async function fetchLogoForDomain(domain: string): Promise<FetchLogoResult | null> {
  const scraped = await scrapeWebsiteForLogo(domain);
  if (scraped) return { url: scraped, source: 'scraped', domain };

  const direct = await tryDirectAssets(domain);
  if (direct) return { url: direct, source: 'direct-asset', domain };

  const logoDev = await tryLogoDev(domain);
  if (logoDev) return { url: logoDev, source: 'logo.dev', domain };

  const clearbit = await tryClearbit(domain);
  if (clearbit) return { url: clearbit, source: 'clearbit', domain };

  const gstatic = await trygstatic(domain);
  if (gstatic) return { url: gstatic, source: 'gstatic', domain };

  // Do NOT use icon.horse here — it recycles the same placeholder PNG across
  // many unrelated Kenyan domains (looked "real" at 256×256 but wrong brand).
  return null;
}

function uniqueDomains(
  ...values: Array<string | null | undefined>
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const host = normalizeHostname(raw) || (raw ? extractDomain(raw) : null);
    if (!host || seen.has(host)) continue;
    seen.add(host);
    out.push(host);
  }
  return out;
}

/**
 * Fetch the best available logo URL for a company.
 * Tries sources in priority order; returns the first verified result.
 *
 * Domain order: known brand domain FIRST, then any provided domain.
 * This fixes the case where a wrong/dead website blocked real brand logos.
 *
 * @param domain  - company's primary domain (e.g. "equitybank.co.ke") — may be wrong
 * @param companyName - used to look up known brand domain + Twitter handle
 */
export async function fetchCompanyLogoUrl(
  domain: string | null | undefined,
  companyName?: string | null
): Promise<FetchLogoResult | null> {
  // 0. Curated official logos (Equity, UN agencies, etc.)
  const official = lookupOfficialLogo(companyName);
  if (official && (await verifyImageUrl(official))) {
    return { url: official, source: 'official', domain: extractDomain(official) || undefined };
  }

  const brand = companyName ? lookupBrand(companyName) : null;
  const candidates = uniqueDomains(brand?.domain, domain);

  for (const candidate of candidates) {
    const found = await fetchLogoForDomain(candidate);
    if (found) return found;
  }

  // Do NOT fall back to Twitter/unavatar — those caused wrong logos (e.g. Equity).
  // Callers should leave companies.logo null → UI shows initials.
  return null;
}
