import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabaseServiceClient';
import { extractDomain, isUsableLogoUrl, lookupBrand } from '@/lib/companyLogo';
import { fetchCompanyLogoUrl } from '@/lib/companyLogoFetch';
import { resolveCompanyDomainSmart } from '@/lib/companyDomainLookup';

/**
 * Backfill companies.logo / companies.website for rows missing them.
 *
 * HARD RULE: never invent domains or logos.
 * - Domains are live-checked before save
 * - Dead website hints are cleared
 * - Logos are stored only after image-byte verification
 * - Known brand domains are tried before wrong stored websites
 *
 * Auth: Authorization: Bearer $CRON_SECRET
 * Optional query params:
 *   ?limit=50       (max companies to process per run, default 50)
 *   ?company_id=... (process a single company for testing)
 *   ?allow_ai=0     (disable AI domain lookup)
 *   ?fix_dead=1   (also scan companies that already have a website — clear dead ones)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const singleId = searchParams.get('company_id');
    const allowAI = searchParams.get('allow_ai') !== '0';
    const fixDead = searchParams.get('fix_dead') === '1';

    const supabase = createServiceRoleClient();

    let companies: Array<{ id: string; name: string; logo: string | null; website: string | null }> = [];

    if (singleId) {
      const { data } = await supabase
        .from('companies')
        .select('id, name, logo, website')
        .eq('id', singleId)
        .limit(1);
      companies = data || [];
    } else if (fixDead) {
      const { data } = await supabase
        .from('companies')
        .select('id, name, logo, website')
        .not('website', 'is', null)
        .limit(limit);
      companies = data || [];
    } else {
      const { data } = await supabase
        .from('companies')
        .select('id, name, logo, website')
        .is('logo', null)
        .limit(limit);
      companies = data || [];
    }

    const results: Array<{
      name: string
      action: string
      source?: string
      url?: string
      domain?: string | null
      domain_source?: string
      cleared_dead_website?: boolean
    }> = [];

    for (const company of companies) {
      const patch: { logo?: string | null; website?: string | null } = {};
      let clearedDead = false;

      const domainLookup = await resolveCompanyDomainSmart(company.name, {
        websiteHint: company.website,
        allowAI,
      });

      if (domainLookup.domain) {
        const next = `https://${domainLookup.domain}`;
        const currentHost = extractDomain(company.website);
        if (!company.website || currentHost !== domainLookup.domain) {
          // Replace wrong/dead hint with verified domain (esp. known brands)
          if (
            !company.website ||
            domainLookup.deadHint ||
            domainLookup.source === 'known_brand' ||
            lookupBrand(company.name)?.domain === domainLookup.domain
          ) {
            patch.website = next;
            if (domainLookup.deadHint) clearedDead = true;
          }
        }
      } else if (domainLookup.deadHint && company.website) {
        patch.website = null;
        clearedDead = true;
      }

      const effectiveDomain =
        domainLookup.domain ||
        extractDomain(patch.website || company.website || null) ||
        lookupBrand(company.name)?.domain ||
        null;

      if (!effectiveDomain && !isUsableLogoUrl(company.logo)) {
        results.push({
          name: company.name,
          action: 'skipped-no-domain',
          domain_source: domainLookup.source,
          cleared_dead_website: clearedDead || undefined,
        });
        if (Object.keys(patch).length > 0) {
          await supabase.from('companies').update(patch).eq('id', company.id);
        }
        continue;
      }

      if (!isUsableLogoUrl(company.logo)) {
        const result = await fetchCompanyLogoUrl(effectiveDomain, company.name);
        if (result) {
          patch.logo = result.url;
          if (!patch.website && !company.website && result.domain) {
            patch.website = `https://${result.domain}`;
          }
          results.push({
            name: company.name,
            action: 'updated',
            source: result.source,
            url: result.url,
            domain: result.domain || effectiveDomain,
            domain_source: domainLookup.source,
            cleared_dead_website: clearedDead || undefined,
          });
        } else {
          results.push({
            name: company.name,
            action: clearedDead ? 'cleared-dead-website' : 'no-logo-found',
            domain: effectiveDomain,
            domain_source: domainLookup.source,
            cleared_dead_website: clearedDead || undefined,
          });
        }
      } else {
        results.push({
          name: company.name,
          action: clearedDead ? 'cleared-dead-website' : 'already-has-logo',
          domain: effectiveDomain,
          domain_source: domainLookup.source,
          cleared_dead_website: clearedDead || undefined,
        });
      }

      if (Object.keys(patch).length > 0) {
        await supabase.from('companies').update(patch).eq('id', company.id);

        // Keep job cards in sync when we just found a logo
        if (patch.logo) {
          await supabase
            .from('jobs')
            .update({
              hiring_organization_logo: patch.logo,
              ...(patch.website
                ? { hiring_organization_url: patch.website }
                : {}),
            })
            .eq('company_id', company.id)
            .or('hiring_organization_logo.is.null,hiring_organization_logo.eq.');
        }
      }
    }

    const updated = results.filter(r => r.action === 'updated').length;
    const noLogo = results.filter(r => r.action === 'no-logo-found').length;
    const skipped = results.filter(r => r.action.startsWith('skipped')).length;
    const alreadyHas = results.filter(r => r.action === 'already-has-logo').length;
    const cleared = results.filter(r => r.cleared_dead_website).length;

    return NextResponse.json({
      success: true,
      scanned: companies.length,
      updated,
      no_logo_found: noLogo,
      skipped,
      already_has_logo: alreadyHas,
      cleared_dead_websites: cleared,
      details: results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
