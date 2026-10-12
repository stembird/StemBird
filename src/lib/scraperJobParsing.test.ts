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
  'ICT & Telecommunications',
  'Energy, Utilities & Waste Management',
  'Banking, Insurance & Financial Services',
]
assert.equal(
  matchIndustryName('Information Technology And Services', industries),
  'ICT & Telecommunications'
)
assert.notEqual(
  matchIndustryName('Information Technology And Services', industries),
  'Banking, Insurance & Financial Services'
)

const functions = [
  'Engineering & Technology',
  'Sales',
  'Legal Services',
  'Building & Architecture',
  'Real Estate & Construction',
  'Health & Safety',
  'Accounting, Auditing & Finance',
  'IT & Software',
  'Human Resources & Recruitment',
  'Community & Social Services',
  'Admin & Office',
]
assert.equal(inferJobFunctionFromTitle('Material Engineer', functions), 'Engineering & Technology')
assert.equal(inferJobFunctionFromTitle('Sales Representative - Fahari Link', functions), 'Sales')
assert.equal(inferJobFunctionFromTitle('Project Architect, Kiswishi City', functions), 'Building & Architecture')
assert.equal(inferJobFunctionFromTitle('Senior HSE Officer', functions), 'Health & Safety')
assert.equal(inferJobFunctionFromTitle('Legal Assistant', functions, 'Legal Department'), 'Legal Services')
assert.equal(inferJobFunctionFromTitle('Executive Assistant', functions), 'Admin & Office')
assert.equal(
  matchJobFunctionName('Legal Department', functions),
  'Legal Services'
)

const moreFunctions = [
  ...functions,
  'Driver & Transport Services',
  'Food Services & Catering',
  'Creative & Design',
  'Quality Control & Assurance',
  'Research, Teaching & Training',
  'Retail, Fashion & FMCG',
  'Accounting, Auditing & Finance',
  'Management & Business Development',
  'Customer Service & Support',
]
assert.equal(inferJobFunctionFromTitle('Truck Driver', moreFunctions), 'Driver & Transport Services')
assert.equal(inferJobFunctionFromTitle('Sous Chef', moreFunctions), 'Food Services & Catering')
assert.equal(inferJobFunctionFromTitle('Graphic Designer', moreFunctions), 'Creative & Design')
assert.equal(inferJobFunctionFromTitle('QA Analyst', moreFunctions), 'Quality Control & Assurance')
assert.equal(inferJobFunctionFromTitle('M&E Officer', moreFunctions), 'Research, Teaching & Training')
assert.equal(inferJobFunctionFromTitle('Bank Teller', moreFunctions), 'Retail, Fashion & FMCG')
assert.equal(
  inferJobFunctionFromTitle('Information Risk Manager', moreFunctions),
  'IT & Software'
)
assert.equal(
  inferJobFunctionFromTitle('Applications Specialist - Customer Experience Systems', moreFunctions),
  'IT & Software'
)

const industryList = [
  'Building, Construction & Real Estate',
  'Real Estate & Property Management',
  'Charity, NGO & Non-Profit',
  'ICT & Telecommunications',
]
assert.equal(
  inferCompanyIndustry('Tatu City', 'https://tatucity.com', industryList),
  'Building, Construction & Real Estate'
)
assert.equal(
  inferCompanyIndustry('Inkomoko', 'https://inkomoko.com', industryList),
  'Charity, NGO & Non-Profit'
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
assert.equal(tatuParsed.industry, 'Building, Construction & Real Estate')
assert.equal(tatuParsed.job_function, 'Community & Social Services')

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
  industry: 'Manufacturing & Warehousing',
  industries: ['Manufacturing & Warehousing'],
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
  job_function: 'Quality Control & Assurance',
  job_functions: ['Quality Control & Assurance'],
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

