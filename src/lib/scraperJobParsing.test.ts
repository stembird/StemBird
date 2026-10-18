import assert from 'node:assert/strict'
import {
  splitHtmlByHeadings,
  parseScrapedJobFallback,
  promoteInlineSectionLabels,
  matchIndustryName,
  matchJobFunctionName,
  inferJobFunctionFromTitle,
  parseScrapedJobContent,
  mergeManualParseResult,
} from './scraperJobParsing'
import { inferCompanyIndustry } from './companyIndustryInference'

const workable = `
<p>About the role intro.</p>
<p><strong>Key Responsibilities </strong></p>
<ul><li>Do A</li><li>Do B</li></ul>
<p><strong>Requirements</strong></p>
<ul><li>Degree</li></ul>
`
const split = splitHtmlByHeadings(workable)
assert.ok(split.description.includes('About the role'))
assert.ok(split.responsibilities.includes('Do A'))
assert.ok(split.required_qualifications.includes('Degree'))

const nested = `
<p>Overview paragraph.</p>
<p><strong>Responsibilities:</strong></p>
<p><strong>1. Physical Security &amp; Access Control</strong></p>
<ul><li>Enforce policy</li></ul>
<p><strong>2. Vendor Management</strong></p>
<ul><li>Manage vendors</li></ul>
`
const nestedSplit = splitHtmlByHeadings(nested)
assert.ok(nestedSplit.description.includes('Overview'))
assert.ok(nestedSplit.responsibilities.includes('Enforce policy'))
assert.ok(nestedSplit.responsibilities.includes('Manage vendors'))
assert.equal(nestedSplit.responsibilities.includes('Overview'), false)

const sr = parseScrapedJobFallback({
  title: 'Learning Science Manager',
  company: 'iHub',
  descriptionSection: '<p>Company blurb.</p>',
  responsibilitiesSection: '<p>In this role you coach startups.</p>',
  requirementsSection: '<ul><li>Master’s degree</li><li>5 years of experience in edtech</li></ul>',
  industryHint: 'Information Technology And Services',
  jobFunctionHint: 'Education',
})
assert.ok(sr.description.includes('Company blurb'))
assert.ok(sr.responsibilities.includes('coach startups'))
assert.equal(sr.education_level, "Master's")
assert.equal(sr.minimum_experience, 5)

const industries = [
  'Information Technology & Software',
  'Energy, Power & Renewable Energy',
  'Banking, Finance & Insurance',
]
assert.equal(
  matchIndustryName('Information Technology And Services', industries),
  'Information Technology & Software'
)
assert.notEqual(
  matchIndustryName('Information Technology And Services', industries),
  'Banking, Finance & Insurance'
)

const functions = [
  'Mechanical Engineering',
  'Technical Sales & Business Development',
  'Regulatory Affairs & Compliance',
  'Civil & Structural Engineering',
  'Health, Safety & Process Risk Management',
  'Mathematics, Statistics & Actuarial Science',
  'Software Development & Engineering',
  'Technical Project Management & Operations',
  'IT Infrastructure, Systems & Support',
  'Cybersecurity',
]
assert.equal(inferJobFunctionFromTitle('Material Engineer', functions), 'Mechanical Engineering')
assert.equal(inferJobFunctionFromTitle('Sales Representative - Fahari Link', functions), 'Technical Sales & Business Development')
assert.equal(inferJobFunctionFromTitle('Project Architect, Kiswishi City', functions), 'Civil & Structural Engineering')
assert.equal(inferJobFunctionFromTitle('Senior HSE Officer', functions), 'Health, Safety & Process Risk Management')
assert.equal(inferJobFunctionFromTitle('Legal Assistant', functions, 'Legal Department'), 'Regulatory Affairs & Compliance')
assert.equal(
  matchJobFunctionName('Legal Department', functions),
  'Regulatory Affairs & Compliance'
)

const moreFunctions = [
  ...functions,
  'Research & Development (R&D)',
  'Quality Assurance & Quality Management',
  'Quality Control (QC)',
  'Data Science, Analytics & Artificial Intelligence',
  'Laboratory Operations & Testing',
  'Technical Support & Field Service',
  'Networking & Telecommunications',
  'STEM Education, Teaching & Curriculum Development',
]
assert.equal(inferJobFunctionFromTitle('QA Analyst', moreFunctions), 'Quality Assurance & Quality Management')
assert.equal(inferJobFunctionFromTitle('M&E Officer', moreFunctions), 'Research & Development (R&D)')
assert.equal(
  inferJobFunctionFromTitle('Information Security Officer', moreFunctions),
  'Cybersecurity'
)
assert.equal(
  inferJobFunctionFromTitle('Applications Specialist - Customer Experience Systems', moreFunctions),
  'IT Infrastructure, Systems & Support'
)

const industryList = [
  'Construction, Infrastructure & Built Environment',
  'Real Estate & Facilities Management',
  'NGOs, Development & International Organisations',
  'Information Technology & Software',
]
assert.equal(
  inferCompanyIndustry('Tatu City', 'https://tatucity.com', industryList),
  'Construction, Infrastructure & Built Environment'
)
assert.equal(
  inferCompanyIndustry('Inkomoko', 'https://inkomoko.com', industryList),
  'NGOs, Development & International Organisations'
)

// Greenhouse-style: entity-escaped HTML must be decoded before split
import { decodeGreenhouseHtml } from './greenhouse-adapter'
const greenhouseEncoded =
  '&lt;h3&gt;About the role&lt;/h3&gt;&lt;p&gt;Intro with R&amp;amp;D.&lt;/p&gt;' +
  '&lt;p&gt;&lt;strong&gt;Accountabilities include:&lt;/strong&gt;&lt;/p&gt;' +
  '&lt;ul&gt;&lt;li&gt;Ship features&lt;/li&gt;&lt;/ul&gt;' +
  '&lt;p&gt;&lt;strong&gt;Skills and qualifications&lt;/strong&gt;&lt;/p&gt;' +
  '&lt;ul&gt;&lt;li&gt;5 years experience&lt;/li&gt;&lt;/ul&gt;'
const greenhouseHtml = decodeGreenhouseHtml(greenhouseEncoded)
assert.ok(greenhouseHtml.includes('<h3>About the role</h3>'), 'decodes tags')
assert.ok(greenhouseHtml.includes('R&D'), 'decodes ampersands')
const ghSplit = splitHtmlByHeadings(greenhouseHtml)
assert.ok(ghSplit.description.includes('Intro'), 'greenhouse description')
assert.ok(ghSplit.responsibilities.includes('Ship features'), 'accountabilities → responsibilities')
assert.ok(ghSplit.required_qualifications.includes('5 years'), 'skills/qualifications → requirements')

const tatuParsed = await parseScrapedJobContent(
  {
    title: 'Community Relations Manager',
    company: 'Tatu City',
    descriptionSection: '<p>About Tatu City.</p>',
    requirementsSection: '<ul><li>Bachelor’s degree</li><li>10 years experience</li></ul>',
    tagsHint: 'City Management Department',
    jobFunctionHint: 'City Management Department',
  },
  { industryNames: industryList, jobFunctionNames: functions, attachCareerTips: false }
)
assert.equal(tatuParsed.industry, 'Construction, Infrastructure & Built Environment')
assert.equal(tatuParsed.job_function, 'Technical Project Management & Operations')

// Full manual-parse merge must retain enrichment fields (study, apply, tips, types)
const baseFallback = parseScrapedJobFallback({
  title: 'QA Analyst',
  company: 'Acme',
  descriptionSection: '<p>About the role.</p>',
  requirementsSection: '<ul><li>Bachelor’s in Chemistry</li></ul>',
})
const merged = mergeManualParseResult(baseFallback, {
  title: 'QA Analyst',
  company: 'Acme',
  description: '<p>Role overview from AI</p>',
  responsibilities: '<ul><li>Test batches</li></ul>',
  required_qualifications: '<ul><li>BSc Chemistry</li></ul>',
  employment_type: 'FULL_TIME',
  employment_types: ['FULL_TIME', 'CONTRACTOR'],
  job_location_type: 'ON_SITE',
  job_location_types: ['ON_SITE', 'HYBRID'],
  job_location_country: 'Kenya',
  job_location_county: 'Nairobi',
  job_location_city: 'Nairobi',
  industry: 'Manufacturing & Industrial Production',
  industries: ['Manufacturing & Industrial Production'],
  education_level_name: "Bachelor's Degree",
  area_of_study: 'Science',
  field_of_study: 'Industrial Chemistry',
  experience_level: 'Mid',
  language_requirements: 'English',
  minimum_experience: '3',
  valid_through: '2026-08-01',
  apply_email: 'careers@acme.com',
  apply_link: 'https://acme.com/apply',
  tags: 'qa, chemistry, iso',
  additional_info:
    '<p><strong>How to Apply:</strong> Email CV</p><h3>Tips:</h3><p>1. Highlight lab experience</p>',
  job_function: 'Quality Control (QC)',
  job_functions: ['Quality Control (QC)'],
  additional_locations: [{ county: 'Mombasa', city: 'Mombasa' }],
})
assert.equal(merged.area_of_study, 'Science')
assert.equal(merged.field_of_study, 'Industrial Chemistry')
assert.equal(merged.language_requirements, 'English')
assert.equal(merged.apply_email, 'careers@acme.com')
assert.equal(merged.apply_link, 'https://acme.com/apply')
assert.deepEqual(merged.employment_types, ['FULL_TIME', 'CONTRACTOR'])
assert.deepEqual(merged.job_location_types, ['ON_SITE', 'HYBRID'])
assert.equal(merged.deadline, '2026-08-01')
assert.equal(merged.education_level, "Bachelor's Degree")
assert.ok(merged.additional_info.includes('Tips'))
assert.equal(merged.minimum_experience, 3)
assert.deepEqual(merged.additional_locations, [{ county: 'Mombasa', city: 'Mombasa' }])

const educationExpHtml = `
<p>Do intake work</p>
<p>Education and Experience</p>
<ul><li>Bachelor's Degree</li><li>Customer service experience</li></ul>
<p>Key Competencies</p>
<ul><li>Attention to detail</li></ul>
`
const eduSplit = splitHtmlByHeadings(educationExpHtml)
assert.ok(eduSplit.required_qualifications.includes("Bachelor's Degree"))
assert.ok(eduSplit.required_qualifications.includes('Attention to detail'))

const candidateProfileHtml = `
<p>• Clean books with no backlog. Candidate Profile Required </p>
<p>• Bachelor's degree in Finance</p>
<p>• CPA or equivalent</p>
`
const promoted = promoteInlineSectionLabels(candidateProfileHtml)
assert.ok(promoted.includes('<p>Candidate Profile Required</p>'))
const financeFb = parseScrapedJobFallback({
  title: 'Finance Manager',
  company: 'Acme',
  descriptionSection: candidateProfileHtml,
  requirementsSection: 'Mid level',
})
assert.ok(financeFb.required_qualifications.includes("Bachelor's degree"))
assert.ok(!/^mid level$/i.test(financeFb.required_qualifications.trim()))

console.log('scraperJobParsing.test.ts: all assertions passed')

