/**
 * One-shot: find logos for companies missing them (known brands + optional AI),
 * then sync hiring_organization_logo onto related jobs.
 *
 * HARD RULE: never invent domains or logos — only persist live domains +
 * image-verified logo URLs. Clears dead website hints when found.
 *
 *   npx tsx scripts/enrich-company-logos-now.mts
 *   npx tsx scripts/enrich-company-logos-now.mts --apply
 *   npx tsx scripts/enrich-company-logos-now.mts --apply --allow-ai
 *   npx tsx scripts/enrich-company-logos-now.mts --apply --limit=100
 */
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { extractDomain, isUsableLogoUrl, lookupBrand } from '../src/lib/companyLogo'
import { fetchCompanyLogoUrl } from '../src/lib/companyLogoFetch'
import { resolveCompanyDomainSmart } from '../src/lib/companyDomainLookup'

config({ path: '.env' })
config({ path: '.env.local', override: true })

const apply = process.argv.includes('--apply')
const allowAI = process.argv.includes('--allow-ai')
const limitArg = process.argv.find(a => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 100

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env')

  const supabase = createClient(url, key)

  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, logo, website')
    .is('logo', null)
    .order('name')
    .limit(limit)

  if (error) throw error
  console.log(`${apply ? 'APPLY' : 'DRY-RUN'}: ${companies?.length || 0} companies without logo (allowAI=${allowAI})`)

  let updated = 0
  let syncedJobs = 0
  let clearedDead = 0

  for (const company of companies || []) {
    const domainLookup = await resolveCompanyDomainSmart(company.name, {
      websiteHint: company.website,
      allowAI,
    })

    const patch: { logo?: string | null; website?: string | null } = {}

    if (domainLookup.domain) {
      const next = `https://${domainLookup.domain}`
      const currentHost = extractDomain(company.website)
      if (!company.website || currentHost !== domainLookup.domain) {
        if (
          !company.website ||
          domainLookup.deadHint ||
          domainLookup.source === 'known_brand' ||
          lookupBrand(company.name)?.domain === domainLookup.domain
        ) {
          patch.website = next
          if (domainLookup.deadHint) clearedDead++
        }
      }
    } else if (domainLookup.deadHint && company.website) {
      patch.website = null
      clearedDead++
      console.log(`clear dead website: ${company.name} ← ${company.website}`)
    }

    const domain =
      domainLookup.domain ||
      extractDomain(patch.website || company.website) ||
      lookupBrand(company.name)?.domain ||
      null

    if (!domain) {
      console.log(`skip (no verified domain): ${company.name}`)
      if (apply && Object.keys(patch).length > 0) {
        await supabase.from('companies').update(patch).eq('id', company.id)
      }
      continue
    }

    const result = await fetchCompanyLogoUrl(domain, company.name)
    if (!result) {
      console.log(`no logo: ${company.name} (${domain}, via ${domainLookup.source})`)
      if (apply && Object.keys(patch).length > 0) {
        await supabase.from('companies').update(patch).eq('id', company.id)
      }
      continue
    }

    patch.logo = result.url
    if (patch.website === undefined && !company.website && result.domain) {
      patch.website = `https://${result.domain}`
    }

    const website = patch.website ?? company.website ?? `https://${result.domain || domain}`
    console.log(
      `${apply ? 'update' : 'would update'}: ${company.name} ← ${result.source} ${result.url.slice(0, 90)}`
    )

    if (!apply) {
      updated++
      continue
    }

    const { error: upErr } = await supabase
      .from('companies')
      .update(patch)
      .eq('id', company.id)
    if (upErr) {
      console.error('  company update failed', upErr.message)
      continue
    }
    updated++

    const { data: jobs, error: jobErr } = await supabase
      .from('jobs')
      .update({
        hiring_organization_logo: result.url,
        hiring_organization_url: website,
      })
      .eq('company_id', company.id)
      .select('id')

    if (jobErr) {
      console.error('  job sync failed', jobErr.message)
    } else {
      syncedJobs += jobs?.length || 0
    }
  }

  // Also sync jobs that have company.logo but empty hiring_organization_logo
  if (apply) {
    const { data: withLogo } = await supabase
      .from('companies')
      .select('id, logo, website')
      .not('logo', 'is', null)
      .limit(500)

    for (const c of withLogo || []) {
      if (!isUsableLogoUrl(c.logo)) continue
      const { data: jobs } = await supabase
        .from('jobs')
        .update({
          hiring_organization_logo: c.logo,
          ...(c.website ? { hiring_organization_url: c.website } : {}),
        })
        .eq('company_id', c.id)
        .or('hiring_organization_logo.is.null,hiring_organization_logo.eq.')
        .select('id')
      syncedJobs += jobs?.length || 0
    }
  }

  console.log(`Done. companies=${updated} jobs_synced=${syncedJobs} cleared_dead=${clearedDead}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
