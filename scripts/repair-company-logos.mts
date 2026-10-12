/**
 * Repair wrong / low-trust company logos and backfill notable employers.
 *
 * Run: npx tsx scripts/repair-company-logos.mts
 *
 * - Applies curated official logos (Equity, UN Women, UNICEF, UNEP, UNOPS, WFP, …)
 * - Clears untrusted stored logos (unavatar, mismatched MyJobMag, website thumbnails)
 * - Re-fetches verified logos where possible
 * - Uses Gemini (DeepSeek if configured) to suggest official domains for notable gaps
 * - Leaves logo NULL when no verifiable mark exists → UI shows initials
 */

import { createClient } from '@supabase/supabase-js';
import { callAI, hasAIConfigured, aiProviderSummary } from '../src/lib/aiProviders';
import { extractDomain, lookupBrand } from '../src/lib/companyLogo';
import {
  isMismatchedJobBoardLogo,
  isUntrustedLogoUrl,
  lookupOfficialLogo,
} from '../src/lib/officialCompanyLogos';
import { fetchCompanyLogoUrl, verifyImageUrl } from '../src/lib/companyLogoFetch';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const NOTABLE_RE =
  /\b(equity|unicef|undp|unhcr|unops|unep|un women|united nations|wfp|world food|safaricom|kcb|absa|airtel|standard chartered|kenya airways|nation media|world bank|afa)\b/i;

function needsRepair(c: { name: string; logo: string | null; website: string | null }): boolean {
  const official = lookupOfficialLogo(c.name);
  if (official && c.logo !== official) return true;
  if (c.logo && isUntrustedLogoUrl(c.logo)) return true;
  if (c.logo && isMismatchedJobBoardLogo(c.name, c.logo)) return true;
  if (NOTABLE_RE.test(c.name) && !c.logo) return true;
  if ((c.logo || '').includes('icon.horse')) return true; // often recycled placeholders
  if ((c.logo || '').includes('website-thumbnail')) return true;
  if ((c.logo || '').includes('_1200x630_crop')) return true;
  return false;
}

async function aiSuggestDomain(name: string): Promise<string | null> {
  if (!hasAIConfigured()) return null;
  try {
    const result = await callAI(
      `Company name: ${name}\nReturn JSON only: {"domain":"example.org"} or {"domain":null} if unknown.`,
      {
        systemPrompt:
          'You identify the official primary website domain for well-known employers (UN agencies, banks, NGOs, Kenyan companies). Return only JSON with key "domain" (hostname without protocol/www, or null). Never invent obscure startups.',
        maxTokens: 80,
        temperature: 0,
        json: true,
      },
    );
    const domain = result.parsed?.domain;
    if (typeof domain === 'string' && domain.includes('.') && !domain.includes(' ')) {
      return domain.replace(/^www\./, '').toLowerCase();
    }
  } catch (e) {
    console.warn('  AI domain suggest failed:', e instanceof Error ? e.message : e);
  }
  return null;
}

console.log(`AI providers: ${aiProviderSummary()}`);

const { data: companies, error } = await sb
  .from('companies')
  .select('id, name, logo, website')
  .order('name')
  .limit(1000);

if (error) {
  console.error(error.message);
  process.exit(1);
}

const targets = (companies || []).filter(needsRepair);
console.log(`\nCompanies needing logo repair: ${targets.length}/${companies?.length}\n`);

let updated = 0;
let cleared = 0;
let unchanged = 0;
let errors = 0;

for (const company of targets) {
  process.stdout.write(`  ${company.name.padEnd(55)} `);

  try {
    const official = lookupOfficialLogo(company.name);
    if (official && (await verifyImageUrl(official))) {
      const website =
        company.website ||
        (lookupBrand(company.name)?.domain
          ? `https://${lookupBrand(company.name)!.domain}`
          : null);
      const patch: { logo: string; website?: string } = { logo: official };
      if (website && !company.website) patch.website = website;
      const { error: uErr } = await sb.from('companies').update(patch).eq('id', company.id);
      if (uErr) throw uErr;
      console.log(`✓ [official] ${official.slice(0, 70)}`);
      updated++;
      continue;
    }

    let domain =
      extractDomain(company.website) || lookupBrand(company.name)?.domain || null;

    if (!domain && NOTABLE_RE.test(company.name)) {
      domain = await aiSuggestDomain(company.name);
      if (domain && !company.website) {
        await sb.from('companies').update({ website: `https://${domain}` }).eq('id', company.id);
      }
    }

    const fetched = await fetchCompanyLogoUrl(domain, company.name);
    if (fetched) {
      const patch: { logo: string; website?: string } = { logo: fetched.url };
      if (!company.website && fetched.domain) patch.website = `https://${fetched.domain}`;
      const { error: uErr } = await sb.from('companies').update(patch).eq('id', company.id);
      if (uErr) throw uErr;
      console.log(`✓ [${fetched.source}] ${fetched.url.slice(0, 70)}`);
      updated++;
      continue;
    }

    // No verifiable logo — clear bad stored value so UI shows initials
    if (
      company.logo &&
      (isUntrustedLogoUrl(company.logo) || isMismatchedJobBoardLogo(company.name, company.logo))
    ) {
      const { error: uErr } = await sb
        .from('companies')
        .update({ logo: null })
        .eq('id', company.id);
      if (uErr) throw uErr;
      console.log('○ cleared → initials');
      cleared++;
    } else {
      console.log('— no verified logo (initials)');
      unchanged++;
    }
  } catch (e) {
    console.log('ERROR', e instanceof Error ? e.message : e);
    errors++;
  }
}

console.log(`\n────────────────────────────────────`);
console.log(`Updated:   ${updated}`);
console.log(`Cleared:   ${cleared}`);
console.log(`Unchanged: ${unchanged}`);
console.log(`Errors:    ${errors}`);
console.log(`────────────────────────────────────`);
