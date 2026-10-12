/**
 * Standalone logo enrichment script.
 * Run: npx tsx scripts/enrich-logos.mts
 *
 * Connects to Supabase, fetches all companies with null logos,
 * tries to find a real logo for each one, and writes it back.
 */

import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const UA = 'Mozilla/5.0 (compatible; careersasa-logo-bot/1.0)';
// Generic gstatic "unknown domain" placeholder is exactly 726B / 16×16.
// Real logos can be as small as ~900B (e.g. INTERFELK 48×48 JPEG = 1086B).
const MIN_IMAGE_BYTES = 850;
const GENERIC_PLACEHOLDER_BYTES = 726;

// ── Known brand map (subset of companyLogo.ts) ───────────────────────────────
const BRANDS: Record<string, { domain: string; twitter?: string }> = {
  safaricom: { domain: 'safaricom.co.ke', twitter: 'SafaricomPLC' },
  'safaricom plc': { domain: 'safaricom.co.ke', twitter: 'SafaricomPLC' },
  airtel: { domain: 'airtel.ke', twitter: 'airtel_ke' },
  'airtel kenya': { domain: 'airtel.ke', twitter: 'airtel_ke' },
  'telkom kenya': { domain: 'telkom.co.ke', twitter: 'TelkomKenya' },
  andela: { domain: 'andela.com', twitter: 'Andela' },
  twiga: { domain: 'twiga.com', twitter: 'TwigaFoodsLtd' },
  'twiga foods': { domain: 'twiga.com', twitter: 'TwigaFoodsLtd' },
  branch: { domain: 'branch.co', twitter: 'BranchApp' },
  tala: { domain: 'tala.co', twitter: 'Tala_app' },
  'equity bank': { domain: 'equitybank.co.ke', twitter: 'EquityBank' },
  'equity bank kenya': { domain: 'equitybank.co.ke', twitter: 'EquityBank' },
  'equity group': { domain: 'equitygroupholdings.com', twitter: 'EquityBank' },
  'equity group holdings': { domain: 'equitygroupholdings.com', twitter: 'EquityBank' },
  kcb: { domain: 'kcbbankgroup.com', twitter: 'KCBGroup' },
  'kcb bank': { domain: 'kcbbankgroup.com', twitter: 'KCBGroup' },
  'kcb group': { domain: 'kcbbankgroup.com', twitter: 'KCBGroup' },
  'kenya commercial bank': { domain: 'kcbbankgroup.com', twitter: 'KCBGroup' },
  'co-operative bank': { domain: 'co-opbank.co.ke', twitter: 'CoopBankKenya' },
  'co-op bank': { domain: 'co-opbank.co.ke', twitter: 'CoopBankKenya' },
  'coop bank': { domain: 'co-opbank.co.ke', twitter: 'CoopBankKenya' },
  'co-operative bank of kenya': { domain: 'co-opbank.co.ke', twitter: 'CoopBankKenya' },
  ncba: { domain: 'ncbagroup.com', twitter: 'NCBABank' },
  'ncba bank': { domain: 'ncbagroup.com', twitter: 'NCBABank' },
  'ncba group': { domain: 'ncbagroup.com', twitter: 'NCBABank' },
  absa: { domain: 'absa.africa', twitter: 'AbsaKenya' },
  'absa bank': { domain: 'absa.africa', twitter: 'AbsaKenya' },
  'absa bank kenya': { domain: 'absa.africa', twitter: 'AbsaKenya' },
  'standard chartered': { domain: 'standardchartered.co.ke', twitter: 'StanChartKenya' },
  'standard chartered bank': { domain: 'standardchartered.co.ke', twitter: 'StanChartKenya' },
  'stanbic bank': { domain: 'stanbicbank.co.ke', twitter: 'StanbicBankKE' },
  'i and m bank': { domain: 'imbank.com', twitter: 'IM_Bank' },
  'i&m bank': { domain: 'imbank.com', twitter: 'IM_Bank' },
  dtb: { domain: 'dtbafrica.com', twitter: 'DTBKenya' },
  'diamond trust bank': { domain: 'dtbafrica.com', twitter: 'DTBKenya' },
  'family bank': { domain: 'familybank.co.ke', twitter: 'FamilyBankLtd' },
  britam: { domain: 'britam.com', twitter: 'britam_insure' },
  jubilee: { domain: 'jubileeinsurance.com', twitter: 'JubileeKenya' },
  'jubilee insurance': { domain: 'jubileeinsurance.com', twitter: 'JubileeKenya' },
  'cic insurance': { domain: 'cic.co.ke', twitter: 'CICGroupKenya' },
  'cic group': { domain: 'cic.co.ke', twitter: 'CICGroupKenya' },
  sanlam: { domain: 'sanlam.com', twitter: 'Sanlam' },
  icea: { domain: 'icealion.com', twitter: 'IceaLion' },
  'icea lion': { domain: 'icealion.com', twitter: 'IceaLion' },
  centum: { domain: 'centum.co.ke', twitter: 'centum_ke' },
  'centum investment': { domain: 'centum.co.ke', twitter: 'centum_ke' },
  'kenya airways': { domain: 'kenya-airways.com', twitter: 'KenyaAirways' },
  kq: { domain: 'kenya-airways.com', twitter: 'KenyaAirways' },
  'kenya power': { domain: 'kplc.co.ke', twitter: 'KenyaPower_care' },
  kplc: { domain: 'kplc.co.ke', twitter: 'KenyaPower_care' },
  kra: { domain: 'kra.go.ke' },
  'kenya revenue authority': { domain: 'kra.go.ke' },
  psc: { domain: 'publicservice.go.ke' },
  'public service commission': { domain: 'publicservice.go.ke' },
  'public service commission of kenya': { domain: 'publicservice.go.ke' },
  kengen: { domain: 'kengen.co.ke', twitter: 'KenGen_Kenya' },
  nhif: { domain: 'nhif.or.ke' },
  nssf: { domain: 'nssf.or.ke' },
  undp: { domain: 'undp.org', twitter: 'UNDP' },
  unicef: { domain: 'unicef.org', twitter: 'UNICEF' },
  'world bank': { domain: 'worldbank.org', twitter: 'WorldBank' },
  usaid: { domain: 'usaid.gov', twitter: 'USAID' },
  giz: { domain: 'giz.de', twitter: 'giz_gmbh' },
  'giz kenya': { domain: 'giz.de', twitter: 'giz_gmbh' },
  'british council': { domain: 'britishcouncil.org', twitter: 'BritishCouncil' },
  'kenya red cross': { domain: 'redcross.or.ke', twitter: 'kenyaredcross' },
  'kenya red cross society': { domain: 'redcross.or.ke', twitter: 'kenyaredcross' },
  'save the children': { domain: 'savethechildren.org', twitter: 'SavetheChildren' },
  wfp: { domain: 'wfp.org', twitter: 'WFP' },
  'one acre fund': { domain: 'oneacrefund.org', twitter: 'OneAcreFund' },
  'living goods': { domain: 'livinggoods.org', twitter: 'LivingGoods_' },
  inkomoko: { domain: 'inkomoko.com', twitter: 'Inkomoko' },
  givedirectly: { domain: 'givedirectly.org', twitter: 'GiveDirectly' },
  'give directly': { domain: 'givedirectly.org', twitter: 'GiveDirectly' },
  'nation media': { domain: 'nation.africa', twitter: 'nationafrica' },
  'nation media group': { domain: 'nation.africa', twitter: 'nationafrica' },
  'standard media': { domain: 'standardmedia.co.ke', twitter: 'StandardMediaGrp' },
  'standard group': { domain: 'standardmedia.co.ke', twitter: 'StandardMediaGrp' },
  'royal media': { domain: 'royalmedia.co.ke', twitter: 'royalmediakenya' },
  'royal media services': { domain: 'royalmedia.co.ke', twitter: 'royalmediakenya' },
  eabl: { domain: 'eabl.com', twitter: 'EABLplc' },
  'east african breweries': { domain: 'eabl.com', twitter: 'EABLplc' },
  bat: { domain: 'bat.com', twitter: 'BATplc' },
  'british american tobacco': { domain: 'bat.com', twitter: 'BATplc' },
  bidco: { domain: 'bidcoafrica.com', twitter: 'Bidco_Africa' },
  'bidco africa': { domain: 'bidcoafrica.com', twitter: 'Bidco_Africa' },
  carrefour: { domain: 'carrefour.ke', twitter: 'CarrefourKenya' },
  'carrefour kenya': { domain: 'carrefour.ke', twitter: 'CarrefourKenya' },
  naivas: { domain: 'naivas.co.ke', twitter: 'NaivasSupermark' },
  'naivas supermarket': { domain: 'naivas.co.ke', twitter: 'NaivasSupermark' },
  quickmart: { domain: 'quickmart.co.ke', twitter: 'QuickmartSM' },
  'java house': { domain: 'javahouse.africa', twitter: 'JavaHouseAfrica' },
  dhl: { domain: 'dhl.com', twitter: 'DHLglobal' },
  microsoft: { domain: 'microsoft.com', twitter: 'Microsoft' },
  google: { domain: 'google.com', twitter: 'Google' },
  ibm: { domain: 'ibm.com', twitter: 'IBM' },
  'nairobi hospital': { domain: 'nairobihospital.org', twitter: 'NrbHospital' },
  'sarova hotels': { domain: 'sarovahotels.com', twitter: 'SarovaHotels' },
  'serena hotels': { domain: 'serenahotels.com', twitter: 'SerenaHotels' },
  'bamburi cement': { domain: 'bamburicement.com', twitter: 'BamburiCement' },
};

function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(ltd|limited|plc|inc|corp|corporation|company)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Pre-normalize all brand map keys for consistent lookup
const BRANDS_NORMALIZED: Map<string, { domain: string; twitter?: string }> = new Map(
  Object.entries(BRANDS).map(([k, v]) => [normalizeKey(k), v])
);

function lookupBrand(name: string): { domain: string; twitter?: string } | null {
  const key = normalizeKey(name);
  if (BRANDS_NORMALIZED.has(key)) return BRANDS_NORMALIZED.get(key)!;
  let best: { known: string; entry: { domain: string; twitter?: string } } | null = null;
  for (const [known, entry] of BRANDS_NORMALIZED) {
    if (known.length < 4) continue;
    if (key === known || key.includes(known)) {
      if (!best || known.length > best.known.length) best = { known, entry };
    }
  }
  return best?.entry ?? null;
}

function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    let v = url.trim();
    if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
    const h = new URL(v).hostname.toLowerCase().replace(/^www\./, '');
    if (!h.includes('.')) return null;
    return h;
  } catch { return null; }
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

async function verifyImage(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return false;
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    if (!ct.startsWith('image/') && !ct.includes('svg') && !ct.includes('icon')) return false;
    const buf = await r.arrayBuffer();
    const size = buf.byteLength;
    if (size === GENERIC_PLACEHOLDER_BYTES || size < 500) return false;

    // Prefer dimension checks — reject 16×16 generic icons even if slightly larger
    const dims = pngDims(buf) || jpegDims(buf);
    if (dims) {
      if (dims.w <= 16 || dims.h <= 16) return false;
      return dims.w >= 32 || dims.h >= 32;
    }

    // SVG / ICO / unknown format: accept if big enough to be a real asset
    if (ct.includes('svg')) return size >= 200;
    return size >= MIN_IMAGE_BYTES;
  } catch { return false; }
}

/** icon.horse recycles the same PNG for many unknown domains — reject those hashes. */
const iconHorsePlaceholderHashes = new Set<string>();
const iconHorseSeenHashes = new Map<string, string>(); // hash → first domain

async function sha1Hex(buf: ArrayBuffer): Promise<string> {
  return createHash('sha1').update(Buffer.from(buf)).digest('hex');
}

async function warmIconHorsePlaceholders() {
  for (const d of ['unknownxyz123.com', 'notarealcompany999.net', 'zzzzzinvaliddomain.io']) {
    try {
      const r = await fetch(`https://icon.horse/icon/${d}`, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) continue;
      iconHorsePlaceholderHashes.add(await sha1Hex(await r.arrayBuffer()));
    } catch { /* ignore */ }
  }
  console.log(`Icon.horse placeholder hashes loaded: ${iconHorsePlaceholderHashes.size}`);
}

async function tryClearbit(domain: string): Promise<string | null> {
  const url = `https://logo.clearbit.com/${domain}?size=128`;
  return (await verifyImage(url)) ? url : null;
}

async function tryGstatic(domain: string): Promise<string | null> {
  const url = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${encodeURIComponent(domain)}&size=128`;
  return (await verifyImage(url)) ? url : null;
}

async function tryDirectAssets(domain: string): Promise<string | null> {
  for (const host of [domain, domain.startsWith('www.') ? domain : `www.${domain}`]) {
    for (const p of [
      '/apple-touch-icon.png', '/apple-touch-icon-precomposed.png',
      '/android-chrome-192x192.png', '/favicon-192x192.png', '/favicon-196x196.png',
      '/favicon.ico', '/logo.png', '/logo.svg',
    ]) {
      const url = `https://${host}${p}`;
      if (await verifyImage(url)) return url;
    }
  }
  return null;
}

async function scrapeWebsite(domain: string): Promise<string | null> {
  for (const host of [domain, `www.${domain}`]) {
    try {
      const res = await fetch(`https://${host}`, {
        headers: { 'User-Agent': UA, Accept: 'text/html' },
        signal: AbortSignal.timeout(15000),
        redirect: 'follow',
      });
      if (!res.ok) continue;
      const html = await res.text();
      const candidates: string[] = [];
      for (const m of html.matchAll(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*href=["']([^"']+)["']/gi)) {
        candidates.push(m[1]);
      }
      for (const m of html.matchAll(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["']/gi)) {
        candidates.push(m[1]);
      }
      for (const m of html.matchAll(/<link[^>]+sizes=["']([0-9]+)x[0-9]+["'][^>]*href=["']([^"']+)["']/gi)) {
        if (parseInt(m[1]) >= 96) candidates.push(m[2]);
      }
      for (const m of html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi)) {
        candidates.push(m[1]);
      }
      for (const m of html.matchAll(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/gi)) {
        candidates.push(m[1]);
      }
      for (const c of candidates) {
        const abs = c.startsWith('http')
          ? c
          : c.startsWith('//')
            ? `https:${c}`
            : `https://${host}${c.startsWith('/') ? '' : '/'}${c}`;
        if (await verifyImage(abs)) return abs;
      }
    } catch { /* try next host */ }
  }
  return null;
}

async function fetchIconHorseMeta(domain: string): Promise<{ url: string; hash: string; ok: boolean } | null> {
  const url = `https://icon.horse/icon/${domain}`;
  try {
    const r = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return null;
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    if (!ct.startsWith('image/') && !ct.includes('icon')) return null;
    const buf = await r.arrayBuffer();
    const size = buf.byteLength;
    if (size < 500 || size === GENERIC_PLACEHOLDER_BYTES) return null;

    const hash = await sha1Hex(buf);
    const dims = pngDims(buf) || jpegDims(buf);
    if (dims) {
      if (dims.w <= 16 || dims.h <= 16) return null;
      if (dims.w < 32 && dims.h < 32) return null;
    } else if (size < MIN_IMAGE_BYTES) {
      return null;
    }
    return { url, hash, ok: true };
  } catch {
    return null;
  }
}

const iconHorseApproved = new Map<string, string>(); // domain → url

/** Pre-scan icon.horse for this batch; mark any reused hash as a placeholder. */
async function prefilterIconHorse(domains: string[]) {
  const hashCounts = new Map<string, number>();
  const byDomain = new Map<string, { url: string; hash: string }>();

  for (const domain of domains) {
    const meta = await fetchIconHorseMeta(domain);
    if (!meta) continue;
    byDomain.set(domain, { url: meta.url, hash: meta.hash });
    hashCounts.set(meta.hash, (hashCounts.get(meta.hash) || 0) + 1);
  }

  for (const [domain, meta] of byDomain) {
    if (iconHorsePlaceholderHashes.has(meta.hash) || (hashCounts.get(meta.hash) || 0) > 1) {
      iconHorsePlaceholderHashes.add(meta.hash);
      continue;
    }
    iconHorseSeenHashes.set(meta.hash, domain);
    iconHorseApproved.set(domain, meta.url);
  }

  console.log(`Icon.horse unique logos in batch: ${iconHorseApproved.size}/${byDomain.size}`);
}

async function tryIconHorse(domain: string): Promise<string | null> {
  return iconHorseApproved.get(domain) || null;
}

async function tryTwitter(handle: string): Promise<string | null> {
  const url = `https://unavatar.io/twitter/${encodeURIComponent(handle)}`;
  // Require at least 5KB to filter generic 1506B placeholder images
  try {
    const r = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') || '';
    if (!ct.startsWith('image/') && !ct.includes('svg')) return null;
    const buf = await r.arrayBuffer();
    return buf.byteLength >= 5000 ? url : null;
  } catch { return null; }
}

async function fetchLogo(domain: string | null, name: string): Promise<{ url: string; src: string } | null> {
  if (domain) {
    // Prefer site-owned assets first — Clearbit is often blocked from this environment
    const sc = await scrapeWebsite(domain);
    if (sc) return { url: sc, src: 'scraped' };

    const da = await tryDirectAssets(domain);
    if (da) return { url: da, src: 'direct' };

    const cb = await tryClearbit(domain);
    if (cb) return { url: cb, src: 'clearbit' };

    const gs = await tryGstatic(domain);
    if (gs) return { url: gs, src: 'gstatic' };

    const ih = await tryIconHorse(domain);
    if (ih) return { url: ih, src: 'iconhorse' };
  }

  const brand = lookupBrand(name);
  if (brand?.twitter) {
    const tw = await tryTwitter(brand.twitter);
    if (tw) return { url: tw, src: 'twitter' };
  }

  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Process: (1) companies with null logo, (2) companies with stale unavatar URLs (may be placeholders)
const [res1, res2] = await Promise.all([
  supabase.from('companies').select('id, name, logo, website').is('logo', null).limit(300),
  supabase.from('companies').select('id, name, logo, website').like('logo', 'https://unavatar.io%').limit(100),
]);

const seen = new Set<string>();
const companies: Array<{ id: string; name: string; logo: string | null; website: string | null }> = [];
for (const row of [...(res1.data || []), ...(res2.data || [])]) {
  if (!seen.has(row.id)) { seen.add(row.id); companies.push(row); }
}

const error = res1.error || res2.error;

if (error) { console.error('Supabase error:', error.message); process.exit(1); }
if (!companies?.length) { console.log('No companies with null logo found.'); process.exit(0); }

await warmIconHorsePlaceholders();
console.log(`\nFound ${companies.length} companies missing logos. Processing...\n`);

const batchDomains = [
  ...new Set(
    companies
      .map((c) => extractDomain(c.website) || lookupBrand(c.name)?.domain || null)
      .filter((d): d is string => !!d),
  ),
];
await prefilterIconHorse(batchDomains);

let updated = 0, notFound = 0, errors = 0;

for (const company of companies) {
  const brand = lookupBrand(company.name);
  const domain = extractDomain(company.website) || brand?.domain || null;
  const websitePatch = !company.website && brand?.domain ? { website: `https://${brand.domain}` } : {};

  process.stdout.write(`  ${company.name.padEnd(40)} `);

  let result: { url: string; src: string } | null = null;
  try {
    result = await fetchLogo(domain, company.name);
  } catch (e) {
    console.log(`ERROR: ${e instanceof Error ? e.message : e}`);
    errors++;
    continue;
  }

  if (result) {
    const patch = { ...websitePatch, logo: result.url };
    const { error: uErr } = await supabase.from('companies').update(patch).eq('id', company.id);
    if (uErr) {
      console.log(`DB error: ${uErr.message}`);
      errors++;
    } else {
      const tag = company.logo ? `${result.src} REPLACED` : result.src;
      console.log(`✓ [${tag}] ${result.url.slice(0, 70)}`);
      updated++;
    }
  } else {
    if (Object.keys(websitePatch).length) {
      await supabase.from('companies').update(websitePatch).eq('id', company.id);
    }
    if (company.logo) {
      console.log(`  kept: ${company.logo.slice(0, 55)}`);
    } else {
      console.log('— no logo found');
      notFound++;
    }
  }
}

console.log(`\n────────────────────────────────────`);
console.log(`Updated:   ${updated}`);
console.log(`Not found: ${notFound}`);
console.log(`Errors:    ${errors}`);
console.log(`────────────────────────────────────`);
