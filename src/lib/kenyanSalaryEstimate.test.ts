import assert from 'node:assert/strict'
import {
  applyKenyanSalaryEstimateIfMissing,
  estimateKenyanSalary,
  formatKenyanSalaryRange,
  isKenyanLocalJob,
  isMissingSalaryEstimatedColumnError,
  narrowSalaryRange,
  normalizeExperienceLevelKey,
  resolveJobSalaryDisplay,
  roundKes,
  withoutSalaryEstimatedFlag,
} from './kenyanSalaryEstimate'

assert.equal(isKenyanLocalJob('Kenya'), true)
assert.equal(isKenyanLocalJob('KE'), true)
assert.equal(isKenyanLocalJob(null), true)
assert.equal(isKenyanLocalJob('United States'), false)
assert.equal(isKenyanLocalJob(null, false), false)

assert.equal(normalizeExperienceLevelKey('Entry'), 'entry')
assert.equal(normalizeExperienceLevelKey('Senior'), 'senior')
assert.equal(normalizeExperienceLevelKey('Managerial'), 'managerial')
assert.equal(normalizeExperienceLevelKey('Internship'), 'internship')
assert.equal(normalizeExperienceLevelKey(null), 'mid')

assert.equal(roundKes(123456), 125000)
assert.equal(roundKes(1000), 5000)

{
  const narrowed = narrowSalaryRange(50000, 400000, 150000)
  assert.ok(narrowed.max / narrowed.min <= 1.55)
  assert.ok(narrowed.min < narrowed.max)
}

{
  const est = estimateKenyanSalary({
    title: 'Software Engineer',
    experienceLevel: 'Mid',
    locationCountry: 'Kenya',
  })
  assert.ok(est)
  assert.equal(est!.salary_currency, 'KES')
  assert.equal(est!.salary_period, 'MONTH')
  assert.equal(est!.is_estimated, true)
  assert.ok(est!.salary_min >= 100000)
  assert.ok(est!.salary_max <= 280000)
  assert.ok(est!.salary_max / est!.salary_min <= 1.55)
}

{
  const entry = estimateKenyanSalary({
    title: 'Accountant',
    experienceLevel: 'Entry',
    locationCountry: 'Kenya',
  })
  const senior = estimateKenyanSalary({
    title: 'Accountant',
    experienceLevel: 'Senior',
    locationCountry: 'Kenya',
  })
  assert.ok(entry && senior)
  assert.ok(senior!.median > entry!.median)
}

{
  const fromTitle = estimateKenyanSalary({
    title: 'Senior Software Developer',
    experienceLevel: 'Mid',
    locationCountry: 'Kenya',
  })
  const mid = estimateKenyanSalary({
    title: 'Software Developer',
    experienceLevel: 'Mid',
    locationCountry: 'Kenya',
  })
  assert.ok(fromTitle && mid)
  assert.ok(fromTitle!.median > mid!.median)
}

{
  const foreign = estimateKenyanSalary({
    title: 'Software Engineer',
    experienceLevel: 'Mid',
    locationCountry: 'Germany',
  })
  assert.equal(foreign, null)
}

{
  const display = resolveJobSalaryDisplay({
    title: 'Data Analyst',
    experienceLevel: 'Mid',
    locationCountry: 'Kenya',
  })
  assert.equal(display.isEstimated, true)
  assert.match(display.display, /^Est\. KES /)
  assert.doesNotMatch(display.display, /Negotiable/i)
}

{
  const display = resolveJobSalaryDisplay({
    salaryMin: 100000,
    salaryMax: 150000,
    salaryCurrency: 'KES',
    salaryPeriod: 'MONTH',
    salaryIsEstimated: false,
  })
  assert.equal(display.isEstimated, false)
  assert.equal(display.display, 'KES 100,000 – 150,000 / month')
}

{
  const display = resolveJobSalaryDisplay({
    salaryMin: 100000,
    salaryMax: 140000,
    salaryCurrency: 'KES',
    salaryPeriod: 'MONTH',
    salaryIsEstimated: true,
  })
  assert.equal(display.isEstimated, true)
  assert.match(display.display, /^Est\. KES /)
}

{
  const display = resolveJobSalaryDisplay({
    salary: 'Negotiable',
    title: 'Nurse',
    experienceLevel: 'Entry',
    locationCountry: 'Kenya',
  })
  assert.equal(display.isEstimated, true)
  assert.doesNotMatch(display.display, /Negotiable/i)
}

{
  const display = resolveJobSalaryDisplay({
    salaryMin: 55000,
    salaryMax: 75000,
    salaryCurrency: 'KES',
    salaryPeriod: 'MONTH',
    salaryIsEstimated: true,
    salaryVisibility: 'Hide',
    title: 'Accounting Clerk - Weighbridge Operations',
    locationCountry: 'Kenya',
  })
  assert.equal(display.isEstimated, true)
  assert.match(display.display, /KES 55,000/)
}

{
  const display = resolveJobSalaryDisplay({
    salaryMin: 100000,
    salaryMax: 150000,
    salaryCurrency: 'KES',
    salaryPeriod: 'MONTH',
    salaryIsEstimated: false,
    salaryVisibility: 'Hide',
  })
  assert.equal(display.display, 'Negotiable')
  assert.equal(display.isEstimated, false)
}

{
  const payload = applyKenyanSalaryEstimateIfMissing(
    {
      title: 'Finance Internship',
      experience_level: 'Internship',
      job_location_country: 'Kenya',
      salary_min: null,
      salary_max: null,
      salary_currency: 'KES',
      salary_period: 'MONTH',
      salary_visibility: 'Hide',
    },
    {}
  )
  assert.equal(payload.salary_is_estimated, true)
  assert.equal(payload.salary_visibility, 'Show')
}

{
  const payload = applyKenyanSalaryEstimateIfMissing(
    {
      title: 'Marketing Manager',
      experience_level: 'Senior',
      job_location_country: 'Kenya',
      salary_min: 200000,
      salary_max: 280000,
      salary_currency: 'KES',
      salary_period: 'MONTH',
    },
    {}
  )
  assert.equal(payload.salary_is_estimated, false)
  assert.equal(payload.salary_min, 200000)
  assert.equal(payload.salary_max, 280000)
}

{
  const payload = applyKenyanSalaryEstimateIfMissing(
    {
      listing_kind: 'scholarship',
      title: 'STEM Scholarship',
      experience_level: 'Entry',
      job_location_country: 'Kenya',
      salary_min: null,
      salary_max: null,
      salary_currency: 'KES',
      salary_period: 'MONTH',
    },
    {}
  )
  assert.equal(payload.salary_is_estimated, false)
  assert.equal(payload.salary_min, null)
  assert.equal(payload.salary_max, null)
}

{
  assert.equal(
    isMissingSalaryEstimatedColumnError({
      message: "Could not find the 'salary_is_estimated' column of 'jobs' in the schema cache",
    }),
    true
  )
  assert.equal(isMissingSalaryEstimatedColumnError({ message: 'duplicate key' }), false)
  const stripped = withoutSalaryEstimatedFlag({
    title: 'x',
    salary_min: 1,
    salary_is_estimated: true,
  })
  assert.equal('salary_is_estimated' in stripped, false)
  assert.equal(stripped.salary_min, 1)
}

{
  const formatted = formatKenyanSalaryRange(
    {
      salary_min: 80000,
      salary_max: 110000,
      salary_currency: 'KES',
      salary_period: 'MONTH',
    },
    { estimated: true }
  )
  assert.equal(formatted, 'Est. KES 80,000 – 110,000 / month')
}

console.log('kenyanSalaryEstimate.test.ts: ok')
