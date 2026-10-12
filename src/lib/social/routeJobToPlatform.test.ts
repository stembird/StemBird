/**
 * Assertions for exclusive job → platform routing and daily slot math.
 * Run: npx tsx src/lib/social/routeJobToPlatform.test.ts
 */

import assert from 'node:assert/strict'
import {
  BUFFER_FREE_QUEUE_CAP,
  SOCIAL_DAILY_CAP_PER_CHANNEL,
  countsTowardToday,
  nairobiDayBounds,
  occupiesBufferQueue,
  rankJobForPlatform,
  remainingDailySlots,
  routeJobToPlatform,
  selectJobsForQueue,
  slotsFromCounts,
  type RoutableJob,
} from './routeJobToPlatform'

function job(partial: Partial<RoutableJob> & { id: string; title: string }): RoutableJob {
  return {
    job_function: null,
    job_functions: null,
    industry: null,
    experience_level: null,
    employment_type: null,
    is_featured: false,
    is_promoted: false,
    date_posted: '2026-08-22T08:00:00.000Z',
    created_at: '2026-08-22T08:00:00.000Z',
    ...partial,
  }
}

assert.equal(SOCIAL_DAILY_CAP_PER_CHANNEL, 3, 'daily cap is 3')
assert.equal(BUFFER_FREE_QUEUE_CAP, 10, 'free Buffer queue is 10')

// Featured / promoted always LinkedIn
assert.equal(
  routeJobToPlatform(job({ id: '1', title: 'Intern Graphic Designer', is_featured: true })),
  'linkedin',
  'featured intern → LinkedIn'
)
assert.equal(
  routeJobToPlatform(job({ id: '2', title: 'Sales Agent', is_promoted: true })),
  'linkedin',
  'promoted sales → LinkedIn'
)

// Professional
assert.equal(
  routeJobToPlatform(
    job({
      id: '3',
      title: 'Senior Software Engineer',
      job_function: 'IT & Software',
      experience_level: 'Senior',
    })
  ),
  'linkedin',
  'senior engineer → LinkedIn'
)
assert.equal(
  routeJobToPlatform(
    job({
      id: '4',
      title: 'Finance Manager',
      job_function: 'Accounting, Auditing & Finance',
      experience_level: 'Managerial',
    })
  ),
  'linkedin',
  'finance manager → LinkedIn'
)
assert.equal(
  routeJobToPlatform(
    job({
      id: '5',
      title: 'Data Analyst',
      job_function: 'Data, Analytics & AI',
      experience_level: 'Mid',
    })
  ),
  'linkedin',
  'mid analyst → LinkedIn'
)

// Visual / youth → Instagram
assert.equal(
  routeJobToPlatform(
    job({
      id: '6',
      title: 'Graphic Designer',
      job_function: 'Creative & Design',
      experience_level: 'Entry',
    })
  ),
  'instagram',
  'entry designer → Instagram'
)
assert.equal(
  routeJobToPlatform(
    job({
      id: '7',
      title: 'Social Media Intern',
      job_function: 'Marketing & Communications',
      employment_type: 'INTERN',
      experience_level: 'Internship',
    })
  ),
  'instagram',
  'social media intern → Instagram'
)
assert.equal(
  routeJobToPlatform(
    job({
      id: '8',
      title: 'Graduate Marketing Assistant',
      job_function: 'Marketing & Communications',
      experience_level: 'Entry',
    })
  ),
  'instagram',
  'graduate marketing → Instagram'
)

// High-volume / entry → Facebook
assert.equal(
  routeJobToPlatform(
    job({
      id: '9',
      title: 'Sales Agent',
      job_function: 'Sales',
      experience_level: 'Entry',
    })
  ),
  'facebook',
  'entry sales → Facebook'
)
assert.equal(
  routeJobToPlatform(
    job({
      id: '10',
      title: 'Truck Driver',
      job_function: 'Driver & Transport Services',
    })
  ),
  'facebook',
  'driver → Facebook'
)
assert.equal(
  routeJobToPlatform(
    job({
      id: '11',
      title: 'Accounting Intern',
      job_function: 'Accounting, Auditing & Finance',
      experience_level: 'Internship',
      employment_type: 'INTERN',
    })
  ),
  'facebook',
  'accounting intern is entry, not visual → Facebook'
)
assert.equal(
  routeJobToPlatform(
    job({
      id: '11b',
      title: 'Software Engineer',
      job_function: 'IT & Software',
      experience_level: 'Entry',
    })
  ),
  'linkedin',
  'entry engineer is still a professional title → LinkedIn'
)
assert.equal(
  routeJobToPlatform(
    job({
      id: '12',
      title: 'Customer Service Representative',
      job_function: 'Customer Service & Support',
      experience_level: 'Entry',
    })
  ),
  'facebook',
  'customer service → Facebook'
)

// One job, one platform — never duplicated across the three lists
{
  const jobs = [
    job({ id: 'a', title: 'Senior Software Engineer', job_function: 'IT & Software', experience_level: 'Senior' }),
    job({ id: 'b', title: 'Graphic Designer', job_function: 'Creative & Design', experience_level: 'Entry' }),
    job({ id: 'c', title: 'Sales Agent', job_function: 'Sales', experience_level: 'Entry' }),
    job({ id: 'd', title: 'Featured Nurse', job_function: 'Healthcare & Medical', is_featured: true }),
  ]
  const picked = selectJobsForQueue(jobs, new Set(), {
    linkedin: 3,
    facebook: 3,
    instagram: 3,
  })
  const ids = [...picked.linkedin, ...picked.facebook, ...picked.instagram].map((j) => j.id)
  assert.equal(ids.length, new Set(ids).size, 'no job appears on two platforms')
  assert.deepEqual(
    picked.linkedin.map((j) => j.id).sort(),
    ['a', 'd'],
    'linkedin gets professional + featured'
  )
  assert.deepEqual(
    picked.instagram.map((j) => j.id),
    ['b'],
    'instagram gets visual'
  )
  assert.deepEqual(
    picked.facebook.map((j) => j.id),
    ['c'],
    'facebook gets high-volume entry'
  )
}

// Used jobs are skipped entirely
{
  const jobs = [
    job({ id: 'used', title: 'Senior Engineer', job_function: 'IT & Software', experience_level: 'Senior' }),
    job({ id: 'fresh', title: 'Finance Manager', job_function: 'Accounting, Auditing & Finance', experience_level: 'Managerial' }),
  ]
  const picked = selectJobsForQueue(jobs, new Set(['used']), {
    linkedin: 3,
    facebook: 3,
    instagram: 3,
  })
  assert.deepEqual(
    picked.linkedin.map((j) => j.id),
    ['fresh'],
    'already-posted job is not selected again'
  )
}

// Cap at remaining slots (3)
{
  const jobs = Array.from({ length: 8 }, (_, i) =>
    job({
      id: `li-${i}`,
      title: `Senior Engineer ${i}`,
      job_function: 'IT & Software',
      experience_level: 'Senior',
      is_featured: i === 0,
      date_posted: `2026-08-2${i}T08:00:00.000Z`,
    })
  )
  const picked = selectJobsForQueue(jobs, new Set(), {
    linkedin: 3,
    facebook: 0,
    instagram: 0,
  })
  assert.equal(picked.linkedin.length, 3, 'linkedin capped at 3')
  assert.equal(picked.facebook.length, 0)
  assert.equal(picked.instagram.length, 0)
  assert.equal(picked.linkedin[0].id, 'li-0', 'featured ranks first')
}

// Daily slot math
assert.equal(remainingDailySlots(0, 0), 3, 'empty day → 3')
assert.equal(remainingDailySlots(1, 0), 2, 'one sent today → 2 left')
assert.equal(remainingDailySlots(3, 0), 0, 'daily cap reached')
assert.equal(remainingDailySlots(0, 10), 0, 'Buffer queue full')
assert.equal(remainingDailySlots(0, 8), 2, 'queue almost full limits below daily cap')
assert.equal(remainingDailySlots(2, 9), 1, 'min of daily leftover and queue leftover')

{
  const now = new Date('2026-09-04T07:00:00.000Z')
  assert.equal(
    occupiesBufferQueue({ scheduled_at: '2026-09-04T14:00:00.000Z', created_at: '2026-09-04T03:00:00.000Z' }, now),
    true,
    'future Buffer slot still occupies the queue'
  )
  assert.equal(
    occupiesBufferQueue({ scheduled_at: '2026-09-03T14:00:00.000Z', created_at: '2026-09-03T03:00:00.000Z' }, now),
    false,
    'past Buffer slot does not occupy the Free-plan cap'
  )
  assert.equal(
    occupiesBufferQueue({ scheduled_at: null, created_at: '2026-09-04T03:00:00.000Z' }, now),
    true,
    'undated queue row created today still occupies'
  )
  assert.equal(
    occupiesBufferQueue({ scheduled_at: null, created_at: '2026-09-02T03:00:00.000Z' }, now),
    false,
    'undated queue row from two days ago does not occupy'
  )
}

{
  const remaining = slotsFromCounts({
    linkedin: { todayCount: 3, scheduledCount: 0 },
    facebook: { todayCount: 1, scheduledCount: 1 },
    instagram: { todayCount: 0, scheduledCount: 10 },
  })
  assert.deepEqual(remaining, { linkedin: 0, facebook: 2, instagram: 0 })
}

// Nairobi day bounds: midnight EAT = 21:00 UTC previous calendar day
{
  const noonEat = new Date('2026-08-23T09:00:00.000Z') // 12:00 EAT
  const bounds = nairobiDayBounds(noonEat)
  assert.equal(bounds.start.toISOString(), '2026-08-22T21:00:00.000Z')
  assert.equal(bounds.end.toISOString(), '2026-08-23T21:00:00.000Z')
  assert.equal(
    countsTowardToday({ created_at: '2026-08-22T20:59:59.000Z' }, bounds),
    false,
    'just before EAT midnight does not count'
  )
  assert.equal(
    countsTowardToday({ created_at: '2026-08-22T21:00:00.000Z' }, bounds),
    true,
    'EAT midnight counts'
  )
  assert.equal(
    countsTowardToday({ created_at: '2026-08-23T12:00:00.000Z' }, bounds),
    true,
    'afternoon EAT counts'
  )
  assert.equal(
    countsTowardToday({ created_at: '2026-08-23T21:00:00.000Z' }, bounds),
    false,
    'next EAT midnight does not count'
  )
}

{
  const featured = job({
    id: 'feat',
    title: 'Nurse',
    is_featured: true,
    date_posted: '2026-08-01T00:00:00.000Z',
  })
  const recent = job({
    id: 'new',
    title: 'Nurse',
    date_posted: '2026-08-22T00:00:00.000Z',
  })
  assert.ok(
    rankJobForPlatform(featured, 'linkedin') > rankJobForPlatform(recent, 'linkedin'),
    'featured outranks recency'
  )
}

console.log('routeJobToPlatform.test.ts: all assertions passed')
