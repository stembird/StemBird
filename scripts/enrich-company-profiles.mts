/**
 * Reclassify company industries (employer identity, not job role industry)
 * and fill short About blurbs from known profiles / website meta descriptions.
 *
 * Usage:
 *   npx tsx scripts/enrich-company-profiles.mts           # dry-run
 *   npx tsx scripts/enrich-company-profiles.mts --apply   # write changes
 */
import { createClient } from "@supabase/supabase-js";
import {
  inferCompanyIndustry,
  lookupKnownCompanyDescription,
} from "../src/lib/companyIndustryInference.ts";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APPLY = process.argv.includes("--apply");
const FETCH_META = !process.argv.includes("--skip-fetch");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const UA =
  "Mozilla/5.0 (compatible; CareerSasaBot/1.0; +https://careersasa.co.ke)";

function cleanBlurb(raw: string | null | undefined, maxChars = 280): string | null {
  if (!raw) return null;
  let text = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#8217;/gi, "'")
    .replace(/&#8216;/gi, "'")
    .replace(/&#8220;/gi, '"')
    .replace(/&#8221;/gi, '"')
    .replace(/&#(\d+);/g, (_, code) => {
      try {
        return String.fromCharCode(Number(code));
      } catch {
        return " ";
      }
    })
    .replace(/\s+/g, " ")
    .trim();
  if (!text || text.length < 40) return null;
  // Drop boilerplate
  if (/^(welcome to|home page|login|sign in)/i.test(text)) return null;

  if (text.length > maxChars) {
    const sliced = text.slice(0, maxChars);
    const lastStop = Math.max(
      sliced.lastIndexOf(". "),
      sliced.lastIndexOf("! "),
      sliced.lastIndexOf("? ")
    );
    text =
      lastStop > 80
        ? sliced.slice(0, lastStop + 1).trim()
        : sliced.slice(0, sliced.lastIndexOf(" ")).trim();
  }
  return text;
}

function extractMetaDescription(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const cleaned = cleanBlurb(m[1]);
      if (cleaned) return cleaned;
    }
  }
  return null;
}

async function fetchWebsiteBlurb(website: string | null): Promise<string | null> {
  if (!website || !FETCH_META) return null;
  let url = website.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    return extractMetaDescription(html.slice(0, 200_000));
  } catch {
    return null;
  }
}

async function main() {
  console.log(APPLY ? "MODE: APPLY" : "MODE: DRY-RUN");
  console.log(FETCH_META ? "Website meta fetch: on" : "Website meta fetch: off");

  const [{ data: companies, error }, { data: industryRows }] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, website, industry, description")
      .order("name"),
    supabase.from("industries").select("name").order("name"),
  ]);
  if (error) throw error;

  const allowed = (industryRows || []).map((r) => r.name as string);
  let industryUpdates = 0;
  let descriptionUpdates = 0;
  let unchanged = 0;

  for (const company of companies || []) {
    const inferred = inferCompanyIndustry(company.name, company.website, allowed);
    const knownDesc = lookupKnownCompanyDescription(company.name);

    let nextIndustry = company.industry;
    if (inferred) {
      nextIndustry = inferred;
    } else if (company.industry) {
      // Exact case-insensitive map onto the official list only (no fuzzy guesswork)
      const exact = allowed.find(
        (name) => name.toLowerCase() === company.industry!.trim().toLowerCase()
      );
      if (exact) nextIndustry = exact;
    }

    let nextDescription = company.description;
    if (!company.description?.trim() || knownDesc) {
      const preferred = knownDesc || (await fetchWebsiteBlurb(company.website));
      if (preferred) nextDescription = preferred;
    } else {
      const cleaned = cleanBlurb(company.description);
      if (cleaned && cleaned !== company.description) nextDescription = cleaned;
    }

    const patch: { industry?: string | null; description?: string | null } = {};
    if (nextIndustry !== company.industry) patch.industry = nextIndustry;
    if (nextDescription !== company.description) patch.description = nextDescription;

    if (!Object.keys(patch).length) {
      unchanged += 1;
      continue;
    }

    console.log(`\n${company.name}`);
    if (patch.industry !== undefined) {
      console.log(`  industry: ${company.industry || "(none)"} → ${patch.industry}`);
      industryUpdates += 1;
    }
    if (patch.description !== undefined) {
      console.log(
        `  description: ${(patch.description || "").slice(0, 120)}${(patch.description || "").length > 120 ? "…" : ""}`
      );
      descriptionUpdates += 1;
    }

    if (APPLY) {
      const { error: updateError } = await supabase
        .from("companies")
        .update(patch)
        .eq("id", company.id);
      if (updateError) throw updateError;
    }
  }

  console.log("\n════════ SUMMARY ════════");
  console.log(`Companies scanned: ${companies?.length || 0}`);
  console.log(`Industry updates: ${industryUpdates}`);
  console.log(`Description updates: ${descriptionUpdates}`);
  console.log(`Unchanged: ${unchanged}`);
  if (!APPLY) console.log("Dry-run only. Re-run with --apply to write changes.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
