/**
 * Curated, verified logo URLs for high-trust employers.
 *
 * Only include URLs that have been checked to return a real image
 * (PNG/JPEG/SVG/ICO) belonging to that brand — never job-board scrapes
 * or Twitter avatars.
 *
 * Kept separate from companyLogo.ts to avoid circular imports with the fetcher.
 */

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

/** Official / Wikimedia / brand-site logos verified at write time. */
export const OFFICIAL_COMPANY_LOGOS: Record<string, string> = {
  // Banking
  'equity bank':
    'https://upload.wikimedia.org/wikipedia/commons/1/15/Equity_Group_Logo.png',
  'equity bank kenya':
    'https://upload.wikimedia.org/wikipedia/commons/1/15/Equity_Group_Logo.png',
  'equity bank rwanda':
    'https://upload.wikimedia.org/wikipedia/commons/1/15/Equity_Group_Logo.png',
  'equity group':
    'https://upload.wikimedia.org/wikipedia/commons/1/15/Equity_Group_Logo.png',
  'equity group holdings':
    'https://upload.wikimedia.org/wikipedia/commons/1/15/Equity_Group_Logo.png',
  'absa bank limited':
    'https://www.absa.africa/wp-content/themes/absa/assets/images/ico/favicon.ico',
  'absa bank':
    'https://www.absa.africa/wp-content/themes/absa/assets/images/ico/favicon.ico',
  absa:
    'https://www.absa.africa/wp-content/themes/absa/assets/images/ico/favicon.ico',
  'kcb group':
    'https://www.myjobmag.co.ke/company_logo/5276KCB%20Bank%20Kenya.png',
  'kcb bank':
    'https://www.myjobmag.co.ke/company_logo/5276KCB%20Bank%20Kenya.png',
  'kcb bank kenya':
    'https://www.myjobmag.co.ke/company_logo/5276KCB%20Bank%20Kenya.png',
  kcb:
    'https://www.myjobmag.co.ke/company_logo/5276KCB%20Bank%20Kenya.png',
  // UN / multilateral
  'un women':
    'https://www.unwomen.org/sites/default/files/UN%20Women%20Logos/UN-Women-logo-social-media-1024x512-en.png',
  unicef:
    'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://unicef.org&size=128',
  'united nations environment programme (unep)':
    'https://www.unep.org/themes/custom/UNEP_3Spot/favicon.ico',
  'united nations environment programme unep':
    'https://www.unep.org/themes/custom/UNEP_3Spot/favicon.ico',
  unep:
    'https://www.unep.org/themes/custom/UNEP_3Spot/favicon.ico',
  unops:
    'https://upload.wikimedia.org/wikipedia/commons/5/57/UNOPS_logo_2016_website_blue_304x53.png',
  'united nations office for project services unops':
    'https://upload.wikimedia.org/wikipedia/commons/5/57/UNOPS_logo_2016_website_blue_304x53.png',
  'united nations office for project services (unops)':
    'https://upload.wikimedia.org/wikipedia/commons/5/57/UNOPS_logo_2016_website_blue_304x53.png',
  'world food programme (wfp)':
    'https://cdn.wfp.org/guides/ui/assets/v0.0.1/favicons/apple-touch-icon-180-precomposed.png',
  'world food programme':
    'https://cdn.wfp.org/guides/ui/assets/v0.0.1/favicons/apple-touch-icon-180-precomposed.png',
  wfp:
    'https://cdn.wfp.org/guides/ui/assets/v0.0.1/favicons/apple-touch-icon-180-precomposed.png',
  unhcr:
    'https://www.unhcr.org/themes/custom/project/favicon.ico',
  undp:
    'https://upload.wikimedia.org/wikipedia/commons/9/9f/UNDP_logo.svg',
  'united nations development programme':
    'https://upload.wikimedia.org/wikipedia/commons/9/9f/UNDP_logo.svg',
  'united nations':
    'https://www.un.org/sites/un2.un.org/files/un0803480.jpg',

  // HR / staffing
  amsol:
    'https://amsol.africa/assets/amsolLogo2-CVlLDaHI.jpeg',
  'africa management solutions':
    'https://amsol.africa/assets/amsolLogo2-CVlLDaHI.jpeg',
  'africa management solutions limited amsol':
    'https://amsol.africa/assets/amsolLogo2-CVlLDaHI.jpeg',
  'africa management solutions limited':
    'https://amsol.africa/assets/amsolLogo2-CVlLDaHI.jpeg',

  // Telecom (verified gstatic)
  safaricom:
    'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://safaricom.co.ke&size=128',
  'safaricom plc':
    'https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://safaricom.co.ke&size=128',
};

/** True when a *present* URL is known-unreliable and should not be shown. */
export function isUntrustedLogoUrl(url?: string | null): boolean {
  if (!url?.trim()) return false;
  const u = url.trim().toLowerCase();
  if (u.includes('unavatar.io')) return true;
  if (u.includes('website-thumbnail')) return true;
  if (u.includes('_1200x630_crop')) return true;
  if (u.includes('household') && u.includes('scaled')) return true;
  return false;
}

/**
 * Detect MyJobMag (and similar) logos that clearly belong to a different brand.
 * e.g. UN Women stored as ".../25020UNDP.gif"
 */
export function isMismatchedJobBoardLogo(
  companyName: string,
  logoUrl?: string | null,
): boolean {
  if (!logoUrl) return false;
  const u = logoUrl.toLowerCase();
  if (!u.includes('myjobmag.co.ke/company_logo/')) return false;

  const name = normalizeKey(companyName);
  const file = decodeURIComponent(u.split('/').pop() || '');

  const brandTokens: Array<{ nameIncludes: string[]; fileMustNot: string[] }> = [
    { nameIncludes: ['un women'], fileMustNot: ['undp', 'unicef', 'unhcr', 'unops', 'unep', 'wfp'] },
    { nameIncludes: ['unicef'], fileMustNot: ['undp', 'unwomen', 'un women', 'unhcr', 'unops'] },
    { nameIncludes: ['undp'], fileMustNot: ['unicef', 'unwomen', 'unhcr', 'unops', 'wfp'] },
    { nameIncludes: ['unops'], fileMustNot: ['undp', 'unicef', 'unwomen', 'unhcr'] },
    { nameIncludes: ['unep'], fileMustNot: ['undp', 'unicef', 'unops', 'wfp'] },
    { nameIncludes: ['equity'], fileMustNot: ['kcb', 'absa', 'ncba', 'coop'] },
    { nameIncludes: ['kcb'], fileMustNot: ['equity', 'absa', 'ncba'] },
    { nameIncludes: ['safaricom'], fileMustNot: ['airtel', 'telkom'] },
  ];

  for (const rule of brandTokens) {
    if (!rule.nameIncludes.some((t) => name.includes(t))) continue;
    if (rule.fileMustNot.some((t) => file.includes(t.replace(/\s+/g, '')))) {
      return true;
    }
  }
  return false;
}

function keyContainsBrand(companyKey: string, brandKey: string): boolean {
  if (companyKey === brandKey) return true;
  if (!brandKey || brandKey.length < 3) return false;
  const escaped = brandKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`).test(companyKey);
}

export function lookupOfficialLogo(companyName?: string | null): string | null {
  if (!companyName?.trim()) return null;
  const key = normalizeKey(companyName);
  if (!key) return null;
  if (OFFICIAL_COMPANY_LOGOS[key]) return OFFICIAL_COMPANY_LOGOS[key];

  // Whole-word fuzzy match (longest key wins)
  let best: { key: string; logo: string } | null = null;
  for (const [known, logo] of Object.entries(OFFICIAL_COMPANY_LOGOS)) {
    if (known.length < 3) continue;
    if (keyContainsBrand(key, known)) {
      if (!best || known.length > best.key.length) best = { key: known, logo };
    }
  }
  return best?.logo ?? null;
}
