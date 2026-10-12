#!/usr/bin/env node
/**
 * TEMP audit script: queries production Supabase (public/anon read) to
 * analyze jobs data that feeds the JobPosting JSON-LD.
 * Anon key is a public credential shipped to browsers.
 */
const SUPABASE_URL = 'https://qxuvqrfqkdpfjfwkqatf.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dXZxcmZxa2RwZmpmd2txYXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjcxNTIsImV4cCI6MjA3NTAwMzE1Mn0.mAiL1p6YqlSaSFOIDW_G-3e_Mqck0cFqLl74_jyNpk8'

if (!ANON_KEY) {
  console.error('ANON_KEY missing')
  process.exit(1)
}

async function q(path, params = {}) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}${qs ? `?${qs}` : ''}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  })
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text().catch(() => '')}`)
  return res.json()
}

async function main() {
  // 1. Total counts by source / status
  const counts = await q('jobs', {
    select: 'source,status',
    limit: '0',
  })
  // group counts by fetching everything? too big. Use count=exact with group.
  // Supabase supports `select=source` + `order` but grouping needs postgrest aggregate or client side.
  // Instead, query counts per bucket via REST count header.
  const countOf = async (filter) => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/jobs?select=id&${filter}&limit=0`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, Prefer: 'count=exact' } }
    )
    const ct = res.headers.get('content-range') || ''
    const m = ct.match(/\/(\d+)$/)
    return m ? Number(m[1]) : -1
  }
  const total = await countOf('')
  console.log('TOTAL jobs rows:', total)
  console.log('active:', await countOf('status=eq.active'))
  console.log('expired:', await countOf('status=eq.expired'))
  console.log('draft:', await countOf('status=eq.draft'))
  console.log('pending:', await countOf('status=eq.pending'))
  console.log('source=Scraper:', await countOf('source=eq.Scraper'))
  console.log('source=Employer:', await countOf('source=eq.Employer'))
  console.log('source=Admin:', await countOf('source=eq.Admin'))
  console.log('salary_is_estimated=true:', await countOf('salary_is_estimated=eq.true'))
  console.log('salary_is_estimated=true AND active:', await countOf('salary_is_estimated=eq.true&status=eq.active'))
  console.log('has salary_min (not null) active:', await countOf('salary_min=not.is.null&status=eq.active'))
  console.log('no salary_min&max active:', await countOf('status=eq.active&salary_min=is.null&salary_max=is.null'))
  console.log('job_location_type=ON_SITE active:', await countOf('job_location_type=eq.ON_SITE&status=eq.active'))
  console.log('job_location_type=REMOTE active:', await countOf('job_location_type=eq.REMOTE&status=eq.active'))
  console.log('job_location_type=HYBRID active:', await countOf('job_location_type=eq.HYBRID&status=eq.active'))
  console.log('education_requirements set active:', await countOf('status=eq.active&education_requirements=not.is.null'))
  console.log('minimum_experience set active:', await countOf('status=eq.active&minimum_experience=not.is.null'))
  console.log('employment_type null active:', await countOf('status=eq.active&employment_type=is.null'))
  console.log('valid_through null active:', await countOf('status=eq.active&valid_through=is.null'))
  console.log('valid_through past active:', await countOf('status=eq.active&valid_through=lt.2026-08-15'))
  console.log('job_location_country null active:', await countOf('status=eq.active&job_location_country=is.null'))
  console.log('job_location_city null active:', await countOf('status=eq.active&job_location_city=is.null'))
  console.log('job_location_county null active:', await countOf('status=eq.active&job_location_county=is.null'))
  console.log('description null active:', await countOf('status=eq.active&description=is.null'))
  console.log('date_posted null active:', await countOf('status=eq.active&date_posted=is.null'))
  console.log('direct_apply true active:', await countOf('status=eq.active&direct_apply=eq.true'))
  console.log('direct_apply null active:', await countOf('status=eq.active&direct_apply=is.null'))

  // 2. Sample recent active scraped jobs with key fields
  const sample = await q('jobs', {
    select: 'job_slug,title,source,date_posted,valid_through,salary_min,salary_max,salary_currency,salary_period,salary_is_estimated,job_location_type,experience_level,minimum_experience,education_requirements,employment_type,direct_apply,job_location_country,job_location_city,job_location_county',
    status: 'eq.active',
    source: 'eq.Scraper',
    order: 'date_posted.desc',
    limit: '15',
  })
  console.log('\n=== Recent 15 active SCRAPED jobs ===')
  for (const j of sample) {
    console.log(JSON.stringify({
      slug: j.job_slug,
      title: (j.title || '').slice(0, 40),
      posted: (j.date_posted || '').slice(0, 10),
      valid: (j.valid_through || '').slice(0, 10),
      sal: [j.salary_min, j.salary_max, j.salary_currency, j.salary_period, j.salary_is_estimated ? 'EST' : 'REAL'],
      loc: [j.job_location_type, j.job_location_country, j.job_location_city, j.job_location_county],
      exp: [j.experience_level, j.minimum_experience],
      edu: j.education_requirements,
      emp: j.employment_type,
      direct: j.direct_apply,
    }))
  }

  // 3. Recent manual jobs
  const manual = await q('jobs', {
    select: 'job_slug,title,source,date_posted,valid_through,salary_min,salary_max,salary_currency,salary_period,salary_is_estimated,job_location_type,experience_level,minimum_experience,education_requirements,employment_type,direct_apply',
    status: 'eq.active',
    source: 'in.(Employer,Admin)',
    order: 'date_posted.desc',
    limit: '10',
  })
  console.log('\n=== Recent 10 active MANUAL jobs ===')
  for (const j of manual) {
    console.log(JSON.stringify({
      slug: j.job_slug,
      title: (j.title || '').slice(0, 40),
      posted: (j.date_posted || '').slice(0, 10),
      valid: (j.valid_through || '').slice(0, 10),
      sal: [j.salary_min, j.salary_max, j.salary_currency, j.salary_period, j.salary_is_estimated ? 'EST' : 'REAL'],
      loc: j.job_location_type,
      exp: [j.experience_level, j.minimum_experience],
      edu: j.education_requirements,
      emp: j.employment_type,
      direct: j.direct_apply,
    }))
  }

  // 4. Distinct education_requirements values
  const edu = await q('jobs', {
    select: 'education_requirements',
    education_requirements: 'not.is.null',
    limit: '100',
  })
  const eduSet = new Set(edu.map((e) => e.education_requirements).filter(Boolean))
  console.log('\n=== Distinct education_requirements (up to 100) ===')
  for (const v of eduSet) console.log('-', v)

  // 5. Distinct job_location_type/experience_level distributions on active
  const locTypes = await q('jobs', { select: 'job_location_type', status: 'eq.active', limit: '5000' })
  const expLevels = await q('jobs', { select: 'experience_level', status: 'eq.active', limit: '5000' })
  const empTypes = await q('jobs', { select: 'employment_type', status: 'eq.active', limit: '5000' })
  const countBy = (rows, key) => {
    const m = {}
    for (const r of rows) { const v = r[key]; m[v === null ? '(null)' : v] = (m[v === null ? '(null)' : v] || 0) + 1 }
    return m
  }
  console.log('\n=== job_location_type distribution (active, up to 5000) ===')
  console.log(JSON.stringify(countBy(locTypes, 'job_location_type'), null, 2))
  console.log('\n=== experience_level distribution (active, up to 5000) ===')
  console.log(JSON.stringify(countBy(expLevels, 'experience_level'), null, 2))
  console.log('\n=== employment_type distribution (active, up to 5000) ===')
  console.log(JSON.stringify(countBy(empTypes, 'employment_type'), null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })
