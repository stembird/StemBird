/**
 * Ensure a company row exists for a job post and has a logo when one can be found.
 *
 * Behavior:
 * 1. Reuse existing companies.logo if already stored (future posts of same company).
 * 2. Persist a manually/parsed/portal logo URL only after image verification.
 * 3. Otherwise fetch a verified logo from website / known brand and store it
 *    so the next job for this company skips the fetch.
 * 4. Fill empty profile fields (website, description, location, size, industry)
 *    from job-board company tabs when provided — never overwrite non-empty values.
 *
 * HARD RULE: never invent domains or logos. Websites are stored only when live;
 * logos are stored only when image bytes verify as a real mark.
 *
 * Matching order:
 * 1. Explicit companyId
 * 2. Case-insensitive exact name
 * 3. Identity key (Equity Bank Group → Equity Bank)
 *
 * Server-only — imports companyLogoFetch.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  extractDomain,
  isUsableLogoUrl,
  lookupBrand,
} from './companyLogo';
import { fetchCompanyLogoUrl, verifyImageUrl } from './companyLogoFetch';
import {
  isMismatchedJobBoardLogo,
  isUntrustedLogoUrl,
  lookupOfficialLogo,
} from './officialCompanyLogos';
import { resolveCompanyDomainSmart } from './companyDomainLookup';
import { normalizeCompanyIdentityKey } from './companyIdentity';
import { inferCompanyIndustry } from './companyIndustryInference';
import {
  cleanJobBoardCompanyDescription,
  sanitizeEmployerWebsite,
} from './jobBoardCompany';

export type EnsureCompanyForJobInput = {
  name: string;
  userId: string;
  companyId?: string | null;
  website?: string | null;
  /** Manual, parsed, or portal logo URL — stored after image verification. */
  logo?: string | null;
  /**
   * Optional employer-profile industry only.
   * Do NOT pass the job posting's industry — agencies/gov advertise across sectors.
   */
  industry?: string | null;
  /** Portal / employer about blurb — only fills empty companies.description. */
  description?: string | null;
  /** HQ or operating location from the portal company tab. */
  location?: string | null;
  /** Headcount band from the portal (e.g. "1-10 people"). */
  size?: string | null;
};

export type EnsureCompanyForJobResult = {
  companyId: string | null;
  logo: string | null;
  website: string | null;
  reusedLogo: boolean;
  fetchedLogo: boolean;
};

type CompanyRow = {
  id: string;
  name: string;
  logo: string | null;
  website: string | null;
  description: string | null;
  location: string | null;
  size: string | null;
  industry: string | null;
};

const COMPANY_SELECT =
  'id, name, logo, website, description, location, size, industry';

async function findCompanyByExactName(
  supabase: SupabaseClient,
  name: string,
): Promise<CompanyRow | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  // Case-insensitive exact match (DB unique index is LOWER(name))
  const { data } = await supabase
    .from('companies')
    .select(COMPANY_SELECT)
    .ilike('name', trimmed)
    .limit(5);

  if (!data?.length) return null;

  const exact = data.find(
    (row) => row.name.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  return exact ?? data[0] ?? null;
}

/**
 * Match variant names ("Equity Bank Group" ↔ "Equity Bank") via identity key.
 * Uses a token ILIKE prefilter then exact identity-key compare in memory.
 */
async function findCompanyByIdentity(
  supabase: SupabaseClient,
  name: string,
): Promise<CompanyRow | null> {
  const key = normalizeCompanyIdentityKey(name);
  if (!key) return null;

  const token =
    key.split(/\s+/).find((part) => part.length >= 3) || key.split(/\s+/)[0];
  if (!token) return null;

  const { data, error } = await supabase
    .from('companies')
    .select(COMPANY_SELECT)
    .ilike('name', `%${token}%`)
    .limit(100);

  if (error || !data?.length) return null;

  const matches = data.filter(
    (row) => normalizeCompanyIdentityKey(row.name) === key,
  );
  if (!matches.length) return null;

  // Prefer the row with a logo/website already filled
  matches.sort((a, b) => {
    const score = (c: CompanyRow) => (c.logo ? 2 : 0) + (c.website ? 1 : 0);
    return score(b) - score(a);
  });
  return matches[0] ?? null;
}

async function findCompany(
  supabase: SupabaseClient,
  input: EnsureCompanyForJobInput,
): Promise<CompanyRow | null> {
  if (input.companyId) {
    const { data } = await supabase
      .from('companies')
      .select(COMPANY_SELECT)
      .eq('id', input.companyId)
      .maybeSingle();
    if (data) return data;
  }

  const name = input.name.trim();
  if (!name) return null;

  const exact = await findCompanyByExactName(supabase, name);
  if (exact) return exact;

  return findCompanyByIdentity(supabase, name);
}

/** Portal / parsed logo URLs — keep only if image bytes verify. Never invent. */
async function verifiedPortalLogo(
  logo: string | null | undefined,
): Promise<string | null> {
  if (!isUsableLogoUrl(logo)) return null;
  const url = logo!.trim();
  if (await verifyImageUrl(url)) return url;
  return null;
}

function profileFieldsFromInput(input: EnsureCompanyForJobInput): {
  website: string | null;
  logo: string | null;
  industry: string | null;
  description: string | null;
  location: string | null;
  size: string | null;
} {
  // Website is resolved + live-verified later in ensureCompanyForJob.
  // Do not invent from brand map / slug here — prevents dead-end domains on insert.
  const website = sanitizeEmployerWebsite(input.website);
  const logo = isUsableLogoUrl(input.logo) ? input.logo!.trim() : null;
  const industry =
    input.industry?.trim() ||
    inferCompanyIndustry(input.name.trim(), website) ||
    null;
  return {
    website,
    logo,
    industry,
    description: cleanJobBoardCompanyDescription(input.description),
    location: input.location?.trim() || null,
    size: input.size?.trim() || null,
  };
}

/** Only fill empty columns — never clobber employer-edited profile data. */
function emptyProfilePatch(
  company: CompanyRow,
  input: EnsureCompanyForJobInput,
): Record<string, string> {
  const fields = profileFieldsFromInput({ ...input, name: company.name });
  const patch: Record<string, string> = {};

  // Website only from sanitizeEmployerWebsite (hint) — live check happens below
  if (!company.website && fields.website) patch.website = fields.website;
  if (!isUsableLogoUrl(company.logo) && fields.logo) patch.logo = fields.logo;
  if (!company.description?.trim() && fields.description) {
    patch.description = fields.description;
  }
  if (!company.location?.trim() && fields.location) patch.location = fields.location;
  if (!company.size?.trim() && fields.size) patch.size = fields.size;
  if (!company.industry?.trim() && fields.industry) patch.industry = fields.industry;

  return patch;
}

async function createCompany(
  supabase: SupabaseClient,
  input: EnsureCompanyForJobInput,
): Promise<CompanyRow | null> {
  const name = input.name.trim();
  const fields = profileFieldsFromInput(input);
  // Defer website/logo until live + image verification in ensureCompanyForJob
  const logo = await verifiedPortalLogo(fields.logo);

  const { data, error } = await supabase
    .from('companies')
    .insert({
      name,
      user_id: input.userId,
      website: null,
      logo,
      industry: fields.industry,
      description: fields.description,
      location: fields.location,
      size: fields.size,
    })
    .select(COMPANY_SELECT)
    .single();

  if (!error && data) return data;

  // Race / unique constraint — re-read by exact name (case-insensitive) or identity
  const raced =
    (await findCompanyByExactName(supabase, name)) ||
    (await findCompanyByIdentity(supabase, name));
  return raced;
}

/**
 * Look up or create the company, then ensure logo/website/profile are populated when possible.
 */
export async function ensureCompanyForJob(
  supabase: SupabaseClient,
  input: EnsureCompanyForJobInput,
): Promise<EnsureCompanyForJobResult> {
  const name = input.name?.trim();
  if (!name && !input.companyId) {
    return {
      companyId: null,
      logo: null,
      website: null,
      reusedLogo: false,
      fetchedLogo: false,
    };
  }

  let company = await findCompany(supabase, { ...input, name: name || '' });
  if (!company && name) {
    company = await createCompany(supabase, { ...input, name });
  }
  if (!company) {
    return {
      companyId: null,
      logo: null,
      website: null,
      reusedLogo: false,
      fetchedLogo: false,
    };
  }

  // Fill any empty profile fields from the portal payload (even when logo exists)
  // Skip website here — handled with live verification below
  const profilePatch = emptyProfilePatch(company, input);
  delete profilePatch.website;
  if (profilePatch.logo) {
    const ok = await verifiedPortalLogo(profilePatch.logo);
    if (ok) profilePatch.logo = ok;
    else delete profilePatch.logo;
  }
  if (Object.keys(profilePatch).length > 0) {
    await supabase.from('companies').update(profilePatch).eq('id', company.id);
    company = { ...company, ...profilePatch };
  }

  const patch: { logo?: string | null; website?: string | null } = {};
  let fetchedLogo = false;

  // Resolve a LIVE domain only — never invent, never keep dead-end sites
  const smart = await resolveCompanyDomainSmart(company.name, {
    websiteHint: sanitizeEmployerWebsite(input.website) || company.website,
    allowAI: true,
  });

  if (smart.domain) {
    const nextWebsite = `https://${smart.domain}`;
    const currentHost = extractDomain(company.website);
    if (!company.website || currentHost !== smart.domain) {
      // Prefer curated/verified domain over a wrong stored hint
      if (
        !company.website ||
        smart.source === 'known_brand' ||
        smart.deadHint ||
        (lookupBrand(company.name)?.domain === smart.domain &&
          currentHost !== smart.domain)
      ) {
        patch.website = nextWebsite;
      }
    }
  } else if (smart.deadHint && company.website) {
    // Clear dead-end website rather than leave users on a 404
    patch.website = null;
  }

  const storedLogoTrusted =
    isUsableLogoUrl(company.logo) &&
    !isUntrustedLogoUrl(company.logo) &&
    !isMismatchedJobBoardLogo(company.name, company.logo);

  const official = lookupOfficialLogo(company.name);
  if (official && company.logo !== official) {
    // Prefer curated official mark over wrong Twitter / job-board logos
    if (await verifyImageUrl(official)) {
      patch.logo = official;
      fetchedLogo = true;
    }
  } else if (storedLogoTrusted) {
    // Fast path: trusted logo already on the company — reuse for future jobs
    if (Object.keys(patch).length > 0) {
      await supabase.from('companies').update(patch).eq('id', company.id);
    }
    return {
      companyId: company.id,
      logo: company.logo,
      website: patch.website !== undefined ? patch.website : company.website,
      reusedLogo: true,
      fetchedLogo: false,
    };
  }

  // Prefer explicit manual / parsed / portal logo after image verification
  if (!patch.logo) {
    const portalLogo = await verifiedPortalLogo(input.logo);
    if (
      portalLogo &&
      !isUntrustedLogoUrl(portalLogo) &&
      !isMismatchedJobBoardLogo(company.name, portalLogo)
    ) {
      patch.logo = portalLogo;
    } else {
      const domain =
        smart.domain ||
        extractDomain(patch.website || company.website || input.website || null) ||
        lookupBrand(company.name)?.domain ||
        null;

      const result = await fetchCompanyLogoUrl(domain, company.name);
      if (result) {
        patch.logo = result.url;
        fetchedLogo = true;
        if (!company.website && patch.website === undefined && result.domain) {
          patch.website = `https://${result.domain}`;
        }
      } else if (
        company.logo &&
        (isUntrustedLogoUrl(company.logo) ||
          isMismatchedJobBoardLogo(company.name, company.logo))
      ) {
        // Clear bad logo so UI shows initials instead of a wrong mark
        patch.logo = null;
      }
    }
  }

  if (Object.keys(patch).length > 0) {
    await supabase.from('companies').update(patch).eq('id', company.id);
  }

  return {
    companyId: company.id,
    logo: patch.logo !== undefined ? patch.logo : company.logo,
    website: patch.website !== undefined ? patch.website : company.website,
    reusedLogo: false,
    fetchedLogo,
  };
}
