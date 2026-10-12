import assert from 'node:assert/strict'
import { buildReenrichInput } from './reenrichScrapedJobs'

const gh = buildReenrichInput(
  'instiglio',
  'Senior Manager',
  'Instiglio',
  {
    title: 'Senior Manager',
    content: '&lt;p&gt;About the role&lt;/p&gt;&lt;p&gt;&lt;strong&gt;Responsibilities&lt;/strong&gt;&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Lead teams&lt;/li&gt;&lt;/ul&gt;',
    departments: [{ name: 'Delivery' }],
  }
)
assert.ok(gh)
assert.ok(gh!.descriptionSection.includes('<p>About the role</p>'))
assert.equal(gh!.jobFunctionHint, 'Delivery')

const psc = buildReenrichInput('psc-pdf-adverts', 'Cook III', 'PSC', {
  extracted: {
    title: 'Cook III',
    ministry: 'Ministry of Health',
    description: 'Cook meals',
    responsibilities: 'Prepare food',
    required_qualifications: 'KCSE',
  },
})
assert.ok(psc)
assert.equal(psc!.company, 'Ministry of Health')
assert.ok(psc!.requirementsSection?.includes('KCSE'))

const workable = buildReenrichInput('laterite', 'Analyst', 'Laterite', {
  description: '<p>Role</p>',
  requirements: '<p>Degree</p>',
  department: ['Research'],
})
assert.ok(workable)
assert.equal(workable!.jobFunctionHint, 'Research')

const bm = buildReenrichInput('brightermonday-kenya', 'M&E Officer', 'Anonymous Employer', {
  jobUrl: 'https://www.brightermonday.co.ke/listings/monitoring-and-evaluation-7j8v4g',
  descriptionHtml:
    '<p>Key Responsibilities:</p><p>Monitor KPIs</p><p>Qualifications and Job Requirements:</p><p>• Bachelor’s degree</p><p>• 5+ years experience</p>',
  qualifications: 'Mid level',
  locationName: 'Nairobi',
  industry: 'Water',
})
assert.ok(bm)
assert.equal(bm!.requirementsSection, '')
assert.ok(bm!.descriptionSection.includes('Bachelor'))
assert.ok(!(bm!.requirementsSection || '').includes('Mid'))

const fuzu = buildReenrichInput('fuzu-kenya', 'B2B Sales Executive', 'Identify Africa', {
  jobUrl: 'https://www.fuzu.com/kenya/jobs/b2b-sales-executive-identify-africa',
  descriptionHtml:
    '<p>JOB SUMMARY</p><p>Sell identity products</p><p>Requirements:</p><p>• 3 years experience</p>',
  location: 'Nairobi, Kenya',
  industry: 'Financial Services',
})
assert.ok(fuzu)
assert.equal(fuzu!.requirementsSection, '')
assert.ok(fuzu!.descriptionSection.includes('Sell identity'))
assert.ok((fuzu!.tagsHint || '').includes('Fuzu'))

const mjm = buildReenrichInput('myjobmag-kenya', 'Internal Auditor', 'APDK', {
  jobUrl: 'https://www.myjobmag.co.ke/job/internal-auditor-association-for-the-physically-disabled-of-kenya',
  descriptionHtml:
    '<p>Role Summary</p><p>Audit records</p><p>Requirements:</p><p>• CPA</p>',
  location: 'Nairobi, Kenya',
  industry: 'NGO / Non-Profit Associations',
  occupationalCategory: 'Finance / Accounting / Audit',
})
assert.ok(mjm)
assert.equal(mjm!.requirementsSection, '')
assert.ok(mjm!.descriptionSection.includes('Audit records'))
assert.ok((mjm!.tagsHint || '').includes('MyJobMag'))
assert.equal(mjm!.jobFunctionHint, 'Finance / Accounting / Audit')

console.log('reenrichScrapedJobs.test.ts: all assertions passed')
