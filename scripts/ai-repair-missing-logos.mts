/**
 * Broader DeepSeek-assisted repair for companies missing logos.
 * - Prefer curated official logos
 * - Use website / brand map / AI-suggested domain
 * - Only store image-verified logos; otherwise leave null (initials)
 *
 * Run: npx tsx scripts/ai-repair-missing-logos.mts
 */
import { createClient } from '@supabase/supabase-js';
import { callAI, aiProviderSummary, hasAIConfigured } from '../src/lib/aiProviders';
import { extractDomain, lookupBrand } from '../src/lib/companyLogo';
import { lookupOfficialLogo } from '../src/lib/officialCompanyLogos';
import { fetchCompanyLogoUrl, verifyImageUrl } from '../src/lib/companyLogoFetch';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const ANONYMOUS =
  /^(a |an |the )?(leading|reputable|fast-growing|anonymous|confidential|undisclosed|premium|well[- ]known|social enterprise)/i;

if (!hasAIConfigured()) {
  console.error('No AI keys configured');
  process.exit(1);
}
console.log('AI:', aiProviderSummary());

const { data: all, error } = await sb
  .from('companies')
  .select('id,name,logo,website')
  .order('name')
  .limit(1000);
if (error) throw error;

const targets = (all || []).filter((c) => {
  if (ANONYMOUS.test(c.name.trim())) return false;
  const official = lookupOfficialLogo(c.name);
  if (official && c.logo !== official) return true;
  if (!c.logo) return true;
  return /unavatar|icon\.horse|website-thumbnail|_1200x630_crop/i.test(c.logo);
});

console.log(`Missing/bad logo companies: ${targets.length}\n`);

let updated = 0;
let cleared = 0;
let skipped = 0;
let websitesPatched = 0;

for (const company of targets) {
  process.stdout.write(`  ${company.name.padEnd(55)} `);
  try {
    const official = lookupOfficialLogo(company.name);
    if (official && (await verifyImageUrl(official))) {
      const brandDomain = lookupBrand(company.name)?.domain;
      const patch: { logo: string; website?: string } = { logo: official };
      if (brandDomain) {
        const want = `https://${brandDomain}`;
        if (!company.website || extractDomain(company.website) !== brandDomain) {
          patch.website = want;
          websitesPatched++;
        }
      }
      await sb.from('companies').update(patch).eq('id', company.id);
      console.log('✓ official');
      updated++;
      continue;
    }

    let domain = extractDomain(company.website) || lookupBrand(company.name)?.domain || null;

    if (!domain) {
      const ai = await callAI(
        `Company name: ${company.name}\nWebsite hint: ${company.website || 'none'}\nReturn JSON: {"domain":"example.org"|null,"confidence":"high"|"medium"|"low"}`,
        {
          systemPrompt:
            'Identify the official primary website hostname for employers operating in Kenya/Africa (HR firms, banks, NGOs, schools, manufacturers). JSON only. No protocol/www. Use null unless confidence is high or medium for a clearly known org.',
          maxTokens: 90,
          temperature: 0,
          json: true,
        },
      );
      const d = ai.parsed?.domain;
      const conf = ai.parsed?.confidence;
      if (
        typeof d === 'string' &&
        d.includes('.') &&
        (conf === 'high' || conf === 'medium')
      ) {
        domain = d.replace(/^www\./i, '').toLowerCase();
        await sb
          .from('companies')
          .update({ website: `https://${domain}` })
          .eq('id', company.id);
        websitesPatched++;
        process.stdout.write(`[ai:${domain}] `);
      }
    }

    if (!domain) {
      console.log('— no domain');
      skipped++;
      continue;
    }

    const fetched = await fetchCompanyLogoUrl(domain, company.name);
    if (fetched) {
      const patch: { logo: string; website?: string } = { logo: fetched.url };
      if (!company.website && fetched.domain) patch.website = `https://${fetched.domain}`;
      await sb.from('companies').update(patch).eq('id', company.id);
      console.log(`✓ ${fetched.source}`);
      updated++;
    } else if (company.logo && /unavatar|icon\.horse|website-thumbnail/i.test(company.logo)) {
      await sb.from('companies').update({ logo: null }).eq('id', company.id);
      console.log('○ cleared');
      cleared++;
    } else {
      console.log('— no verified logo');
      skipped++;
    }
  } catch (e) {
    console.log('ERR', e instanceof Error ? e.message.slice(0, 100) : e);
    skipped++;
  }
}

console.log(`\nUpdated: ${updated}  Cleared: ${cleared}  Skipped: ${skipped}  Websites: ${websitesPatched}`);
