/**
 * Use DeepSeek/Gemini to suggest official domains for notable employers,
 * then fetch+verify real logos. Clears bad logos when none verify.
 *
 * Run: npx tsx scripts/ai-repair-notable-logos.mts
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

const NOTABLE =
  /\b(bank|un |united nations|unicef|undp|unhcr|unops|unep|wfp|world food|safaricom|airtel|kenya airways|nation media|equity|kcb|absa|standard chartered|jubilee|britam|ncba|coop|world bank|giz|usaid|amnesty|red cross|microsoft|google|oracle|ibm|telkom|nhif|nssf|kra|psc)\b/i;

const ANONYMOUS =
  /^(a |an |the )?(leading|reputable|fast-growing|anonymous|confidential|undisclosed|premium|well[- ]known)/i;

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
  if (!NOTABLE.test(c.name)) return false;
  return !c.logo || /unavatar|icon\.horse|website-thumbnail|_1200x630_crop/i.test(c.logo || '');
});

console.log(`Targets: ${targets.length}\n`);

let updated = 0;
let cleared = 0;
let skipped = 0;

for (const company of targets.slice(0, 100)) {
  process.stdout.write(`  ${company.name.padEnd(52)} `);
  try {
    const official = lookupOfficialLogo(company.name);
    if (official && (await verifyImageUrl(official))) {
      await sb.from('companies').update({ logo: official }).eq('id', company.id);
      console.log('✓ official');
      updated++;
      continue;
    }

    let domain = extractDomain(company.website) || lookupBrand(company.name)?.domain || null;
    if (!domain) {
      const ai = await callAI(
        `Company name: ${company.name}\nWebsite hint: ${company.website || 'none'}\nReturn JSON: {"domain":"example.org"|null,"confidence":"high"|"low"}`,
        {
          systemPrompt:
            'Identify the official primary website hostname for well-known employers (banks, UN agencies, NGOs, large Kenyan firms). JSON only. No protocol/www. Use null if uncertain.',
          maxTokens: 80,
          temperature: 0,
          json: true,
        },
      );
      const d = ai.parsed?.domain;
      const conf = ai.parsed?.confidence;
      if (typeof d === 'string' && d.includes('.') && conf === 'high') {
        domain = d.replace(/^www\./i, '').toLowerCase();
        if (!company.website) {
          await sb
            .from('companies')
            .update({ website: `https://${domain}` })
            .eq('id', company.id);
        }
        process.stdout.write(`[ai:${domain}] `);
      } else {
        console.log('— ai uncertain');
        skipped++;
        continue;
      }
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
      console.log('○ cleared → initials');
      cleared++;
    } else {
      console.log('— no verified logo (initials)');
      skipped++;
    }
  } catch (e) {
    console.log('ERR', e instanceof Error ? e.message.slice(0, 100) : e);
    skipped++;
  }
}

console.log(`\nUpdated: ${updated}  Cleared: ${cleared}  Skipped: ${skipped}`);
