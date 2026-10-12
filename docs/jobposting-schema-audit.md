# CareerSasa JobPosting Structured Data — Forensic Audit

**Date:** 2026-08-15
**Auditor:** Cursor agent (forensic audit mandate)
**Scope:** The complete `JobPosting` JSON-LD implementation — code that generates it, the ingestion/enrichment pipeline feeding it, the database values behind it, and live production output.
**Method:** Code review of `JobStructuredData.tsx` and all upstream data paths (scraper, AI parse, re-enrichment, salary estimates, expiry) + live production URL extraction + production Supabase data audit. Cross-checked against Google's current [JobPosting structured data documentation](https://developers.google.com/search/docs/appearance/structured-data/job-posting).

> **Baseline document.** Re-run this audit after any change to the scraper, enrichment system, job schema, or structured-data code and diff against this file.

---

## A. COMPLIANT — currently correct

| Area | Status | Evidence |
|---|---|---|
| `baseSalary` excludes estimates | ✅ | `resolveBaseSalary()` returns `undefined` when `salary_is_estimated` — commit `171ac96` fix is correct and live. Only employer-provided actual ranges are emitted (`minValue`/`maxValue` + `unitText`/`currency`). |
| `baseSalary` range handling | ✅ | `minValue`/`maxValue` both emitted when both DB bounds exist. GSC `maxValue` issue now 0 items. |
| `directApply` | ✅ | Now `job.direct_apply === true` (no longer hardcoded `true`). Only 34 active jobs have it `true` (correct — scraped jobs redirect externally). |
| `datePosted` | ✅ | Migration `20260813_reset_scraped_jobs_date_posted.sql` reset scraped jobs' `date_posted` to `created_at`. **0** active jobs have null `date_posted`. |
| `description` | ✅ | **0** active jobs have null `description`; emitted as HTML. |
| `employment_type` DB enum | ✅ | All DB enum values (`FULL_TIME`, `PART_TIME`, `CONTRACTOR`, `INTERN`, `TEMPORARY`, `VOLUNTEER`, `PER_DIEM`) are valid Google values. |
| Required property coverage | ✅ | `title`, `description`, `datePosted`, `validThrough`, `hiringOrganization`, `jobLocation`, `employmentType` all emitted. |
| `hiringOrganization.name` | ✅ | Uses the real employer name (`companies.name` / `company`), e.g. "KCB Bank Kenya" — not the job board. |
| Single schema generator | ✅ | Only `JobStructuredData.tsx` emits `JobPosting` (verified across repo). No duplicate/legacy generator remains. |
| List pages / robots | ✅ | `JobPosting` only on the single-job detail page; `robots.txt` allows crawling. |
| `salary_is_estimated` maintenance | ✅ | Set correctly at publish; `enrichJobById` never touches salary fields, so the flag survives re-enrichment. |
| Fail-safe for estimated salary on page | ✅ | Estimated ranges shown on page are labeled "Estimated Salary Range" but correctly **omitted** from markup. |

---

## B. NON-COMPLIANT — confirmed violations

### B1. `jobLocationType` emits `ON_SITE` / `REMOTE` / `HYBRID` — Google only accepts `TELECOMMUTE`
- **Code:** `"jobLocationType": job.job_location_type || undefined`
- **Impact:** DB enum is `ON_SITE`/`REMOTE`/`HYBRID`. Active: 2,283 `ON_SITE`, 48 `REMOTE`, 30 `HYBRID`. Every recrawled job emits an invalid enum value.
- **GSC:** "Invalid enum value in field `jobLocationType`" — **39 items**.
- **Google rule:** The only supported value is `TELECOMMUTE`, and only for jobs that are *100% remote*. "Don't mark up jobs that allow occasional work-from-home… or have other arrangements that are not 100% remote."

### B2. `experienceRequirements` emits free text ("7 years", "Mid", "Senior") — invalid enum
- **Code:** `job.minimum_experience ? \`${job.minimum_experience} years\` : job.experience_level || undefined`
- **Impact:** 1,804 active jobs have `minimum_experience` → markup emits `"7 years"`. ~417 active jobs have only `experience_level` → markup emits `"Mid"` / `"Senior"` etc.
- **GSC:** "Invalid enum value in field `experienceRequirements`" — **39 items**.
- **Google rule (beta):** Use `OccupationalExperienceRequirements` with numeric `monthsOfExperience`, or the text `no requirements`. Arbitrary strings are rejected by the parser.

### B3. `educationRequirements` emits arbitrary free text — invalid enum
- **Code:** `"educationRequirements": job.education_requirements || undefined`
- **Impact:** 104 active jobs have free-text education requirements (all real sentences, e.g. `"BSC in Electronic/Electrical/Telecommunication Engineering or related field…"`).
- **GSC:** "Invalid enum value in field `educationRequirements`" — **1 item** (will grow as Google reprocesses).
- **Google rule (beta):** Use `EducationalOccupationalCredential` with `credentialCategory` from the enum set (`high school`, `associate degree`, `bachelor degree`, `professional certificate`, `postgraduate degree`, `no requirements`).

### B4. Fabricated values when information is unknown (fail-unsafe)
| Field | Fabrication | Active jobs affected | Risk |
|---|---|---|---|
| `validThrough` | `now() + 30 days` when null | **88** | Google: "If a job posting never expires, or you do not know when the job will expire, **do not include this property**." Jobs with no real deadline get dropped from Google Jobs ~30 days after each crawl even though still open. |
| `employmentType` | `"FULL_TIME"` when null | **110** | Misrepresents job type; page shows no employment type badge. |
| `datePosted` | `now()` when null | 0 (currently) | Latent risk — would fabricate a posting date. |
| `description` | `"Join {org} as a {title}…"` when null | 0 (currently) | Fabricated text is **not on the page** → "Content doesn't match the structured data" policy violation. |

### B5. Expired jobs still emit `JobPosting` markup
- **Code:** `JobStructuredData` is rendered unconditionally on the detail page (expiry only affects the UI banner).
- **Impact:** **502 active jobs have `valid_through` in the past.** Google drops these from the Jobs experience on recrawl. Verified live: `key-stage-2-teacher` (expired 2026-07-27) still contains `JobPosting` markup today.
- **Root cause:** `expire_old_jobs()` only expires rows where `expires_at <= now()`. It never considers `valid_through`, so scraped jobs whose source deadline passed remain `status='active'`.

### B6. `JobPosting` JSON-LD is **not in the server-rendered HTML**
- **Code:** `JobStructuredData.tsx` renders `next/script` (a client component). Result: the `<script type="application/ld+json">` tag is **not present in the initial HTML** — it exists only inside the Next.js RSC flight payload (`self.__next_f.push(...)`) and is injected into the DOM after hydration.
- **Verified live:** curl of production pages (Googlebot UA) shows `application/ld+json` only inside the flight payload, never as a real script tag in HTML.
- **Risk:** Googlebot renders JS, so the markup is usually visible — but this is timing-sensitive (`afterInteractive`), fragile, and against the guideline that structured data must be in the page HTML. Any render/hydration failure → page silently has no structured data → not counted as a valid item.

---

## C. POTENTIAL RISK (depends on data conditions)

1. **Degenerate `jobLocation.address`.** `streetAddress`/`addressLocality`/`addressRegion` all fall back to `job.location`. 674 active jobs have no city; 187 no county. Verified live: `team-leader-fibre-thika-nairobi-region` emits `streetAddress="Kenya", addressLocality="Kenya", addressRegion="Kenya", addressCountry="Kenya"`. → "Job location is missing or incorrect" / low location quality.
2. **`addressCountry` is the full country name** (`"Kenya"`) instead of ISO 3166-1 alpha-2 (`"KE"`). Both parse, but the 2-letter code is the safer form Google uses in examples.
3. **`hiringOrganization.logo` hotlinks third-party/job-board CDNs.** Verified live: KCB logo = `https://www.myjobmag.co.ke/company_logo/…`; HCS Affiliates logo = gstatic favicon CDN URL. Logo guidelines require a real logo with width:height ratio 0.75–2.5; favicons/hotlinked job-board assets are fragile and may be rejected or display wrong.
4. **`experience_level` → months mapping** (when we implement B2) could produce `0` months for `Entry`/`Internship` — better to omit those than emit 0.
5. **GSC "Missing field `baseSalary`" (9 items)** — these are estimated-salary jobs whose page shows an estimate but markup correctly omits `baseSalary`. This warning is expected and permanent by design (Google: "Only employers can provide baseSalary"). Not a violation; accept it.
6. **`industry` / `responsibilities` / `qualifications` / `benefits` / `workHours` free text** — schema.org-valid Text, Google accepts. Low risk. `responsibilities`/`qualifications` are emitted as HTML — fine.
7. **Staffing-agency listings** — some scraped roles may present an agency as the hiring org (e.g., "HCS Affiliates Group"). Allowed by Google when the employer is anonymous, but should stay truthful to the source.

---

## D. LEGACY DATA RISK (existing DB records)

1. **1,378 active jobs with estimated salaries stored in `salary_min`/`salary_max`** (`salary_is_estimated=true`). Correctly excluded from markup today — but any regression that re-enables estimate emission would instantly re-introduce the fabricated-`baseSalary` violation that caused the 110→55 drop. **Guard the flag.**
2. **502 active jobs with past `valid_through`** — being dropped from Google Jobs on recrawl (see B5). This is the single largest driver of the declining valid-item count.
3. **88 active jobs with null `valid_through`** — fabricating a rolling 30-day expiry (see B4).
4. **110 active jobs with null `employment_type`** — fabricating `FULL_TIME`.
5. **104 active jobs with free-text `education_requirements`** — invalid-enum risk grows as Google reprocesses.
6. **2,283 active jobs with `job_location_type='ON_SITE'`** — every one emits an invalid enum (B1).
7. **Scraped jobs published 2026-07-31 → 2026-08-13** still carry the estimated-salary *values*; the current markup is correct, but these pages must be recrawled before Google sees the corrected markup.

---

## E. DUPLICATE / LEGACY CODE

- **None.** `src/components/JobStructuredData.tsx` is the only `JobPosting` generator. The old on-the-fly `estimateKenyanSalary` emission was removed in commit `171ac96`.
- `CompanyStructuredData.tsx` emits `Organization` schema on company pages only — not a `JobPosting` generator.
- No legacy schema templates found in the repo.

---

## F. GOOGLE GUIDELINE CHANGES (relevant to CareerSasa)

1. **`validThrough`** — Google now explicitly says: "This is **required for job postings that have an expiration date**… If a job posting never expires, or you do not know when the job will expire, **do not include this property**." The `+30d` fabrication directly contradicts this.
2. **`jobLocationType`** — only `TELECOMMUTE` is supported, and only for genuinely 100%-remote jobs; required if the job is 100% remote.
3. **`experienceRequirements` / `educationRequirements` (beta)** — Google now wants typed objects (`OccupationalExperienceRequirements.monthsOfExperience`, `EducationalOccupationalCredential.credentialCategory`). Free-text values are being reported as "invalid enum value".
4. **`baseSalary`** — "**Only employers can provide `baseSalary`**… the actual base salary… (not an estimate)". Reinforces the 2026-08-13 fix.
5. **`applicantLocationRequirements`** — required for 100%-remote jobs with geographic eligibility. Not currently emitted anywhere; must be added whenever `TELECOMMUTE` is emitted.
6. **Indexing API** — Google explicitly recommends the **Indexing API for job URLs** ("prompts Googlebot to crawl your page sooner") in addition to a sitemap. Not currently integrated.
7. **Sitemap `lastmod`** — "We ingest the entire sitemap and recrawl the pages with `lastmod` times that are more recent than the last time those pages were crawled." A stale sitemap blocks the recovery of the 2026-08-13 fix.

---

## G. RECOMMENDED FIXES

| # | Fix | Where |
|---|---|---|
| 1 | **Regenerate the sitemap** with all current live job URLs and fresh `lastmod` (today). Long-term: generate it automatically on publish; or integrate the Indexing API for job URLs. | `public/sitemap-0.xml` + publishing pipeline |
| 2 | **Render the JSON-LD server-side** — replace `next/script` with a plain `<script type="application/ld+json">` tag (escape `</script>` in the JSON) so the markup is in the initial HTML. | `src/components/JobStructuredData.tsx` |
| 3 | **`jobLocationType`**: emit `TELECOMMUTE` only when the job is 100% remote (`job_location_type = 'REMOTE'`); **omit** for `ON_SITE`; for `HYBRID`, emit `TELECOMMUTE` only if the description explicitly confirms hybrid, otherwise omit. | `JobStructuredData.tsx` |
| 4 | **When `TELECOMMUTE` is emitted, also emit `applicantLocationRequirements`** (`{ "@type": "Country", "name": job.job_location_country }`). | `JobStructuredData.tsx` |
| 5 | **`experienceRequirements`**: emit `{ "@type": "OccupationalExperienceRequirements", "monthsOfExperience": N }` where `N = minimum_experience * 12`; else map `experience_level` (`Mid`→24, `Senior`→48, `Managerial`→60; omit `Entry`/`Internship`/unknown). | `JobStructuredData.tsx` |
| 6 | **`educationRequirements`**: detect credential category from the text (Master→`postgraduate degree`, Bachelor/Degree→`bachelor degree`, Diploma→`associate degree`, Certificate→`professional certificate`, KCSE/High school→`high school`) and emit `{ "@type": "EducationalOccupationalCredential", "credentialCategory": "…" }`; else omit. | `JobStructuredData.tsx` |
| 7 | **`validThrough` fail-safe**: emit only when `job.valid_through` (or `expires_at`) is set; **omit** when unknown. Never fabricate `+30d`. | `JobStructuredData.tsx` |
| 8 | **`employmentType` fail-safe**: emit `job.employment_type` only; omit when null. Never fabricate `FULL_TIME`. | `JobStructuredData.tsx` |
| 9 | **Expire jobs properly**: make `expire_old_jobs()` also expire rows where `valid_through <= now()` (and `auto_renew=false`), or add a cron sweep over scraped jobs, so expired jobs stop being served as active with markup. | `app/api/cron/expire-jobs/route.ts` + SQL function |
| 10 | **`datePosted` / `description` fail-safe**: omit the property (or the whole markup) rather than fabricate when missing. | `JobStructuredData.tsx` |
| 11 | **`jobLocation.address` quality**: parse `job.location` into locality/region where city/county are null; never put "Kenya" in `streetAddress`/`addressLocality`; prefer ISO country code `KE`; add `postalCode` when known. | `JobStructuredData.tsx` |
| 12 | **`identifier`**: add `{ "@type": "PropertyValue", "name": "CareerSasa", "value": job.id }` to improve matching/dedup. | `JobStructuredData.tsx` |
| 13 | **Logo hygiene**: prefer verified company logos; avoid hotlinking job-board CDNs and generic gstatic favicons in `hiringOrganization.logo`. | `companyLogo.ts` / enrichment |

---

## H. PRIORITY

| Issue | Priority |
|---|---|
| Stale sitemap / no recrawl signal → Aug-13 fix cannot propagate | **CRITICAL** |
| JSON-LD only in flight payload (not in raw HTML) | **HIGH** |
| `jobLocationType` invalid enum (2,283+ jobs) | **HIGH** |
| `experienceRequirements` invalid enum (1,804+ jobs) | **HIGH** |
| `validThrough` fabricated `+30d` (88 jobs) + rolling-expiry attrition | **HIGH** |
| Expired-but-active jobs (502) keep getting dropped on recrawl | **HIGH** |
| `employmentType` fabricated `FULL_TIME` (110 jobs) | **MEDIUM** |
| `educationRequirements` invalid enum (104 jobs) | **MEDIUM** |
| `datePosted` / `description` fabricated fallbacks (latent) | **MEDIUM** |
| Degenerate `jobLocation.address` (674 jobs) | **MEDIUM** |
| `applicantLocationRequirements` missing for remote jobs | **MEDIUM** (once B1 is fixed) |
| `hiringOrganization.logo` hotlinks/favicons | **LOW** |
| `identifier` not emitted | **LOW** |
| `addressCountry` full name vs ISO code | **LOW** |
| GSC "Missing baseSalary" (9 items, by design for estimates) | **LOW / accepted** |

---

## I. PRODUCTION TEST RESULTS

| URL | Type | Result |
|---|---|---|
| `https://www.careersasa.co.ke/jobs/senior-relationship-manager-energy` | Scraped, live (posted 2026-08-15) | `JobPosting` present but **only in flight payload**, not raw HTML. `datePosted` ✓, `validThrough` 2026-08-21 ✓, `employmentType` ✓, `baseSalary` correctly omitted (estimated) ✓, `experienceRequirements:"7 years"` ✗, `jobLocationType:"ON_SITE"` ✗, `streetAddress:"Nairobi, Kenya"` ⚠, logo hotlinks MyJobMag CDN ⚠ |
| `https://www.careersasa.co.ke/jobs/team-leader-fibre-thika-nairobi-region` | Manual, live | `validThrough` = fabricated now+30d (DB null) ✗, `jobLocation.address` = "Kenya" × 4 ✗, `educationRequirements` free text ✗, `experienceRequirements:"2 years"` ✗, logo = gstatic favicon ⚠ |
| `https://www.careersasa.co.ke/jobs/key-stage-2-teacher` | Manual, **expired** (2026-07-27) | Still emits `JobPosting` markup with past `validThrough` → Google drops it on recrawl |
| `public/sitemap.xml` / `sitemap-0.xml` | — | **Stale since 2026-03-11**; contains job URLs from Oct 2025–Mar 2026; no April–August jobs; `lastmod` values are old → no recrawl signal |
| Production Supabase (`jobs` table) | — | 2,377 active; 1,378 estimated-salary; 832 no salary; 2,283 ON_SITE; 502 past `valid_through`; 88 null `valid_through`; 110 null `employment_type`; 104 free-text education; 0 null description/date_posted |

---

## J. FINAL VERDICT

> **NOT FULLY COMPLIANT**

The critical `baseSalary` fix (2026-08-13) is correct and live, and the GSC issues on the current valid items are warning-level ("Improve item appearance"), not errors — so there is **no manual action** against the site and the current decline is consistent with a recrawl/propagation window.

However, the implementation is **not** fully compliant and, more importantly, several mechanisms are actively keeping the valid-item count falling and will slow/block recovery:

1. **Attrition without replenishment:** 502 expired-but-active jobs are dropped by Google on recrawl, while the **stale sitemap** (5 months old) gives Google no reason to recrawl corrected/new pages. New valid items cannot appear if Google never re-crawls them.
2. **Fabricated data that fails safe the wrong way:** `validThrough +30d`, `employmentType FULL_TIME`, `datePosted now()` — these contradict Google's "do not include if unknown" guidance.
3. **Three confirmed enum violations** (`jobLocationType`, `experienceRequirements`, `educationRequirements`) that will keep limiting appearance as Google reprocesses.
4. **Structured data not in the raw HTML** (flight-payload-only) — a fragility that can silently drop pages from the valid-item count.

Recommended next step: approve and apply the G/H fixes (starting with sitemap regeneration and server-rendered JSON-LD), then request revalidation in Search Console and monitor the valid-item trend for ~2 weeks.

---

## K. FIXES IMPLEMENTED — 2026-08-15 (post-audit)

Status: fixes requested, approved, and implemented. Re-run this audit against production after the next deploy + DB migration.

| # | Fix | File(s) | Status |
|---|---|---|---|
| 1 | Sitemap regenerated with all 2,377 active jobs + 1,109 companies + 46 industries + static pages. Root cause of the stale sitemap was also fixed: `next-sitemap` `additionalPaths` only fetched 1,000 rows (Supabase REST cap) → added pagination so every deploy produces a complete sitemap. A standalone script `scripts/generate-sitemap.mjs` regenerates it on demand. | `next-sitemap.config.js`, `public/sitemap-0.xml`, `scripts/generate-sitemap.mjs` | ✅ committed |
| 2 | JSON-LD now server-rendered: `next/script` → plain `<script type="application/ld+json">` in the HTML (with `</script>` escaping). Verified by SSR render test and full `next build`. | `src/components/JobStructuredData.tsx` | ✅ committed |
| 3 | `jobLocationType` only emits `TELECOMMUTE` for 100%-remote jobs; `ON_SITE`/`HYBRID` omitted (invalid enums gone). | `src/lib/jobStructuredDataMapping.ts` | ✅ committed |
| 4 | `applicantLocationRequirements` emitted for remote jobs (`Country`). | same | ✅ committed |
| 5 | `experienceRequirements` → `OccupationalExperienceRequirements.monthsOfExperience` (years×12, or `experience_level` fallback map: Mid→24, Senior→48, Managerial→60). | same | ✅ committed |
| 6 | `educationRequirements` → `EducationalOccupationalCredential.credentialCategory` enum detected from text (minimum level; "Master's added advantage" handled; certificate dropped when a degree/diploma is present). | same | ✅ committed |
| 7 | `validThrough` emitted only when a real deadline exists (`valid_through`/`expires_at`); never fabricated +30d. | same | ✅ committed |
| 8 | `employmentType` emitted only when a valid Google value exists; never fabricated `FULL_TIME`. | `JobStructuredData.tsx` | ✅ committed |
| 9 | Jobs now expire on `valid_through`: `expire_old_jobs()` considers `valid_through <= now()` (in addition to `expires_at`) + backfills the 502 active-but-past-deadline jobs. **Apply with `supabase db push`.** | `supabase/migrations/20260815_expire_jobs_on_valid_through.sql` | ⏳ awaiting DB push |
| 10 | `datePosted`/`description` never fabricated (omitted when missing). | `JobStructuredData.tsx` + mappers | ✅ committed |
| 11 | `jobLocation.address` quality: ISO country codes (`KE`), real locality/region only, no more "Kenya" in all four fields, street only for street-like strings, degenerate addresses collapse to `{addressCountry}`. | mappers | ✅ committed |
| 12 | `identifier` (`PropertyValue` with org name + job id) added. | `JobStructuredData.tsx` | ✅ committed |
| 13 | Logo hygiene: favicon-CDN placeholders (gstatic/logo.dev/clearbit) no longer emitted as `hiringOrganization.logo`. | mappers | ✅ committed |

**Remaining manual steps:**
1. `supabase db push` (or the project's normal migration flow) to apply `20260815_expire_jobs_on_valid_through.sql`.
2. Deploy the code changes.
3. In Search Console: Jobs report → **Validate Fix**, then monitor the valid-item trend for ~2 weeks.
4. Optional (recommended by Google): integrate the Indexing API for job URLs to prompt faster recrawls.

**Regression guard:** the mappings in `src/lib/jobStructuredDataMapping.ts` fail safe — any future data path change that produces missing/estimated/invalid values results in property omission, never fabrication.

---

## L. FOLLOW-UP FIX — 2026-08-16: "Missing field `address` (in `jobLocation`)"

**Symptom (Search Console):** 68 invalid JobPosting items (rising) with `Missing field "address" (in "jobLocation")`.

**Root cause:** structural, not data. In the 2026-08-15 refactor, `resolveJobAddress` (in `src/lib/jobStructuredDataMapping.ts`) returned the *PostalAddress contents* as a flat object, and `JobStructuredData.tsx` emitted that object **directly as `jobLocation`** — so the markup had no `address` property at all:

```json
// Before (live, broken)
"jobLocation": { "addressCountry": "KE", "addressLocality": "Nairobi", "addressRegion": "Nairobi" }
```

Google requires a `Place` whose `address` is a `PostalAddress`. Affected **all 1,765 active jobs**; the 68 were just the pages Google had processed first.

**Fix (committed `8f5e258`, deployed):** `resolveJobAddress` now returns the full `Place → PostalAddress` structure; pure `REMOTE` jobs omit `jobLocation` entirely (`jobLocationType: TELECOMMUTE` + `applicantLocationRequirements` already represent them); text-remote-but-typed-other jobs keep a country-level address so the posting retains a location signal. No invented streets, postal codes, or cities — city/county are emitted only when genuinely known, `addressCountry` is an ISO code (default `KE`, the site's operating country).

```json
// After (live, corrected)
"jobLocation": {
  "@type": "Place",
  "address": { "@type": "PostalAddress", "addressCountry": "KE", "addressLocality": "Nairobi", "addressRegion": "Nairobi" }
}
```

**Verified live (2026-08-16) after deploy:**
- `/jobs/senior-relationship-manager-energy` → `Place → PostalAddress` ✓
- `/jobs/terminal-manager` → `Place → PostalAddress`, `baseSalary` correctly absent (estimated) ✓
- `/jobs/wellness-lead` → `Place → PostalAddress` (no county, locality only) ✓
- `/jobs/senior-associate-education-and-mel` (REMOTE) → `jobLocation` omitted, `jobLocationType: TELECOMMUTE`, `applicantLocationRequirements: { "@type": "Country", name }` ✓
- SSR render test against 20 production records across all location patterns → 20/20 pass; `tsc --noEmit` clean.

**Remaining:** wait for Google to recrawl and reprocess; request Validate Fix in Search Console after the crawl has had time to pick up corrected pages.

---

## M. FOLLOW-UP AUDIT — 2026-08-16: cross-check against Google's current docs

A ChatGPT discussion summarizing Google's current JobPosting documentation was reviewed against the actual Google docs (fetched live) and production data. Summary of the check:

**Confirmed compliant:**
- 5 required properties (`datePosted`, `description`, `hiringOrganization`, `jobLocation`, `title`) present on all 1,765 active jobs.
- Descriptions complete + HTML (`<p>`/`\n`), never equal to title, never ultra-short.
- Remote jobs emit `TELECOMMUTE` + `applicantLocationRequirements` and omit `jobLocation` (Google: *"jobLocation isn't required if applicantLocationRequirements is present"*).
- Hybrid jobs correctly **do not** get `TELECOMMUTE` (Google requires it only for 100% remote; ChatGPT's hybrid suggestion was less strict than Google — we follow Google).
- `baseSalary` only for employer-provided, non-estimated, visible salaries; `unitText` always a valid Google value (`MONTH`).
- `directApply` only when the DB flag is true (15 jobs).
- `employmentType` restricted to Google's 8 case-sensitive values.
- `validThrough` emitted only when a real deadline exists (88 jobs without one correctly omit it).
- Expired jobs: 0 active with past `validThrough`; expired pages serve 200 with `validThrough` in the past — one of Google's three accepted "remove a posting" options.
- `JobPosting` only on single-job pages; every job has a way to apply (portal form).
- Sitemap `lastmod` = `updated_at` (accurate last-content-change).

**Fixes applied in this round (per user decisions):**

1. **`identifier` omitted** (`JobStructuredData.tsx`). CareerSasa only holds its internal UUID; Google defines `identifier` as the *hiring organization's* unique job ID. Emitting our UUID with the employer's name misrepresented it as employer-provided. Now omitted entirely.

2. **`experienceRequirements` only from real numbers** (`jobStructuredDataMapping.ts`). The `experience_level` → months fallback (Mid→24, Senior→48, Managerial→60) manufactured a requirement number. Now emitted only when `minimum_experience` is a genuine parsed value; 462 label-only jobs omit the property instead of guessing.

3. **`datePosted` = source board's original date** for scraped jobs (`scrapePublish.ts`, `scrapeProcess.ts`, new migration `20260816_restore_scraped_jobs_board_date_posted.sql`). Google requires the original employer posting date. The 2026-08-13 reset had set scraped jobs to `created_at`; the publish path now preserves the adapter's `date_posted` when present, and the migration backfills existing rows from `scraped_job_sources.raw_data->>'datePosted'` where recoverable.

**Verified:** `tsc --noEmit` clean; mapper/component render tests confirm `identifier` absent, `experienceRequirements` omitted for label-only jobs, and `jobLocation` structure intact.

