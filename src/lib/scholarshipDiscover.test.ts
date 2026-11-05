/**
 * Run: npx tsx src/lib/scholarshipDiscover.test.ts
 *
 * Discover-side rules: tombstone detection (queue in ANY status + the scraped
 * table), failed rows never re-queued, and the cheap "this is a job, not an
 * award" title filter. The Supabase client is a tiny chainable stub — only the
 * queries lookupKnownScholarshipUrls actually makes are implemented, so a
 * wrong table or a missing status filter fails loudly.
 */
import assert from 'node:assert/strict'
import {
  isObviousJobListing,
  filterDiscoveredScholarshipsByTitle,
  scholarshipQueueRowIsKnownToDiscover,
  lookupKnownScholarshipUrls,
} from './scholarshipDiscover'

// ── Queue rows are known in every status, `failed` included ────────────────
for (const status of ['pending', 'processing', 'done', 'failed']) {
  assert.equal(
    scholarshipQueueRowIsKnownToDiscover(status),
    true,
    `queue row with status ${status} is known to discover (failed stays failed)`
  )
}
assert.equal(scholarshipQueueRowIsKnownToDiscover(null), true, 'null status still known')

// ── Stub client: scholarship_queue + scraped_scholarship_sources only ──────
type Row = Record<string, string | null>

function buildStub(queueRows: Row[], scrapedRows: Row[]) {
  const queriedTables: string[] = []

  function table(name: string, rows: Row[]) {
    return {
      select(_cols: string) {
        return {
          in(column: string, values: string[]) {
            queriedTables.push(name)
            const data = rows.filter(r => typeof r[column] === 'string' && values.includes(r[column] as string))
            return Promise.resolve({ data, error: null })
          },
        }
      },
    }
  }

  const supabase = {
    from(name: string) {
      if (name === 'scholarship_queue') return table(name, queueRows)
      if (name === 'scraped_scholarship_sources') return table(name, scrapedRows)
      throw new Error(`scholarship discover must not query ${name}`)
    },
  }
  return { supabase: supabase as never, queriedTables }
}

async function main() {
  const queuedA = 'https://board.test/scholarship/a'
  const failedB = 'https://board.test/scholarship/b'
  const publishedC = 'https://board.test/scholarship/c'
  const skippedD = 'https://board.test/scholarship/d'
  const freshE = 'https://board.test/scholarship/e'

  const { supabase, queriedTables } = buildStub(
    [
      { scholarship_url: queuedA, status: 'pending' },
      // Stored rows are already canonical (Discover normalizes before insert);
      // the listing link below carries a tracking param, so the query side is
      // what must normalize.
      { scholarship_url: failedB, status: 'failed' },
    ],
    [
      { scholarship_url: publishedC, status: 'published' },
      { scholarship_url: skippedD, status: 'skipped' },
    ]
  )

  const known = await lookupKnownScholarshipUrls(supabase, [
    queuedA,
    `${failedB}?utm_source=newsletter`,
    publishedC,
    skippedD,
    freshE,
    // Duplicate of A with a tracking param — must collapse onto the same key.
    `${queuedA}?utm_campaign=list`,
  ])

  assert.ok(queriedTables.includes('scholarship_queue'), 'queue table consulted')
  assert.ok(
    queriedTables.includes('scraped_scholarship_sources'),
    'tombstone table consulted'
  )

  assert.ok(known.has(queuedA), 'pending queue row is known')
  assert.ok(known.has(failedB), 'FAILED queue row is known — never requeued')
  assert.ok(known.has(publishedC), 'published tombstone is known')
  assert.ok(known.has(skippedD), 'skipped tombstone is known')
  assert.equal(known.has(freshE), false, 'unseen URL is not known')
  assert.equal(known.size, 4, 'normalized duplicates collapse to one entry')

  // ── Cheap title filter ──────────────────────────────────────────────────
  assert.equal(isObviousJobListing('Accountant Vacancy — Nairobi'), true, 'vacancy title skips')
  assert.equal(
    isObviousJobListing('Sales Executive — Job Advert 1234'),
    true,
    'explicit job advert skips'
  )
  assert.equal(
    isObviousJobListing('Chevening Scholarship for Kenyan Students'),
    false,
    'funding word keeps the listing'
  )
  assert.equal(
    isObviousJobListing('HESLB Bursary Applications Open — Vacancy Free for All'),
    false,
    'funding word outranks an employment word (accuracy-first)'
  )
  assert.equal(isObviousJobListing(''), false, 'empty title never skips on thin signal')
  assert.equal(isObviousJobListing(null), false, 'missing title never skips')

  const filtered = filterDiscoveredScholarshipsByTitle([
    { job_url: 'https://board.test/1', partial_data: { title: 'Chemistry Lab Technician Vacancy' } },
    { job_url: 'https://board.test/2', partial_data: { title: 'Masters Scholarship in Chemical Engineering' } },
    { job_url: 'https://board.test/3', partial_data: { title: '' } },
    { job_url: 'https://board.test/4' },
  ])
  assert.equal(filtered.kept.length, 3, 'job title dropped, everything else kept')
  assert.deepEqual(
    filtered.skippedUrls,
    ['https://board.test/1'],
    'only the obvious employment post is skipped'
  )

  console.log('scholarshipDiscover: all assertions passed')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
