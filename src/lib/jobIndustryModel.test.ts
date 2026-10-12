/**
 * Run: npx tsx src/lib/jobIndustryModel.test.ts
 */
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { FALLBACK_JOB_FUNCTIONS } from './jobParseNormalization'
import {
  JOB_FUNCTION_MODEL_CATEGORY,
  INDUSTRY_MODEL_FILENAMES,
  categoryFromFunctionName,
  getModelForJob,
  hasPhrase,
  type JobIndustryModelCategory,
} from './jobIndustryModel'

assert.equal(
  hasPhrase('Hospitality & Leisure', 'hospital'),
  false,
  'hospital must not match inside hospitality — this was the chef/nurse bug',
)
assert.equal(hasPhrase('Nairobi', 'ai'), false, 'ai must not match inside Nairobi')
assert.equal(hasPhrase('retail', 'ai'), false, 'ai must not match inside retail')
assert.equal(hasPhrase('waiter', 'ai'), false, 'ai must not match inside waiter')
assert.equal(hasPhrase('training', 'ai'), false, 'ai must not match inside training')
assert.equal(hasPhrase('Aga Khan Hospital', 'hospital'), true)
assert.equal(hasPhrase('Hospitality & Leisure', 'hospitality'), true)
assert.equal(hasPhrase('nursery teacher', 'nurse'), false, 'nurse must not match nursery')

assert.equal(
  getModelForJob('Chef', 'Safari Hotel Nairobi', 'Hospitality & Leisure'),
  'food-services',
  'Chef title wins over Hospitality function — never the nurse portrait',
)
assert.equal(
  getModelForJob('Restaurant Sous Chef', 'Carnivore Restaurant', 'Hospitality & Leisure'),
  'food-services',
)
assert.equal(
  getModelForJob('Chef de Partie', 'Nairobi Hospitality College'),
  'food-services',
  'title Chef + hospitality in company still food-services, not healthcare',
)
assert.equal(
  getModelForJob('Head Chef', 'Fairmont The Norfolk', 'Food Services & Catering'),
  'food-services',
)
assert.equal(
  getModelForJob('Hotel Manager', 'Serena Hotel', 'Hospitality & Leisure'),
  'hospitality',
)
assert.equal(
  getModelForJob('Front Office Supervisor', 'Sarova', 'Hospitality & Leisure'),
  'hospitality',
)
assert.equal(
  getModelForJob('Tour Guide', 'Kenya Wildlife Service', 'Travel, Tourism & Leisure'),
  'tourism',
)

assert.equal(
  getModelForJob('Registered Nurse', 'Aga Khan Hospital', 'Healthcare & Medical'),
  'healthcare',
)
assert.equal(
  getModelForJob('Safety Officer', 'Bamburi Cement', 'Health & Safety'),
  'health-safety',
  'Health & Safety is not a nurse',
)
assert.equal(
  getModelForJob('HSE Manager', 'Base Titanium', 'Health & Safety'),
  'health-safety',
)

assert.equal(
  getModelForJob('Software Engineer', 'Safaricom', 'IT & Software'),
  'technology',
)
assert.equal(
  getModelForJob('Data Analyst', 'Equity Bank Nairobi', 'Data, Analytics & AI'),
  'technology',
  'Nairobi / AI function must not be confused by substring ai',
)
assert.equal(
  getModelForJob('Waiter', 'Nairobi Cafe', 'Food Services & Catering'),
  'food-services',
)
assert.equal(
  getModelForJob('Sales Associate', 'Naivas Retail', 'Retail, Fashion & FMCG'),
  'retail',
)

assert.equal(
  getModelForJob('Agricultural Officer', 'Ministry of Agriculture'),
  'agriculture',
  'officer must not force government',
)
assert.equal(
  getModelForJob('Fisheries Officer', 'Lake Victoria Fisheries'),
  'agriculture',
)
assert.equal(
  getModelForJob('Police Officer', 'Kenya Police', 'Government & Public Service'),
  'government',
)
assert.equal(
  getModelForJob('Civil Engineer', 'Bamburi Cement'),
  'engineering',
)
assert.equal(
  getModelForJob('Accountant', 'KPMG Kenya', 'Accounting, Auditing & Finance'),
  'finance',
)
assert.equal(
  getModelForJob('High School Teacher', 'Kenya High School', 'Education & Training'),
  'education',
)
assert.equal(
  getModelForJob('Graphic Designer', 'Creative Agency', 'Creative & Design'),
  'creative',
)
assert.equal(
  getModelForJob('Program Manager', 'Amref Health Africa', 'NGO, NPO & Charity'),
  'community',
  'Health in an NGO name must not select the nurse portrait',
)
assert.equal(
  getModelForJob('Operations Manager', 'Generic Company'),
  'professional',
)
assert.equal(
  getModelForJob('Driver', 'Multiple Hauliers', 'Driver & Transport Services'),
  'driver',
)
assert.equal(
  getModelForJob('Security Guard', 'G4S Kenya', 'Security'),
  'security',
)
assert.equal(
  getModelForJob('Legal Officer', 'Kaplan & Stratton', 'Legal Services'),
  'legal',
)
assert.equal(
  getModelForJob('Sales Executive', 'Unilever Kenya', 'Sales'),
  'sales',
)
assert.equal(
  getModelForJob('Environmental Officer', 'NEMA', 'Environment, Energy & Natural Resources'),
  'environment',
)
assert.equal(
  getModelForJob('Fibre Technician', 'Safaricom', 'Telecommunications'),
  'telecommunications',
)

for (const name of FALLBACK_JOB_FUNCTIONS) {
  const category = categoryFromFunctionName(name)
  assert.ok(category, `missing portrait mapping for function: ${name}`)
  assert.equal(category, JOB_FUNCTION_MODEL_CATEGORY[name])
  const filename = INDUSTRY_MODEL_FILENAMES[category as JobIndustryModelCategory]
  const publicPath = resolve('public/assets/job-thumbnails', filename)
  const srcPath = resolve('src/assets/job-thumbnails', filename)
  assert.equal(existsSync(publicPath), true, `missing public thumbnail ${filename} for ${name}`)
  assert.equal(existsSync(srcPath), true, `missing src thumbnail ${filename} for ${name}`)
}

assert.notEqual(
  INDUSTRY_MODEL_FILENAMES['food-services'],
  INDUSTRY_MODEL_FILENAMES.healthcare,
)
assert.notEqual(
  INDUSTRY_MODEL_FILENAMES.hospitality,
  INDUSTRY_MODEL_FILENAMES.healthcare,
)
assert.notEqual(
  INDUSTRY_MODEL_FILENAMES['food-services'],
  INDUSTRY_MODEL_FILENAMES.hospitality,
  'chef and hotel portraits must be different files',
)

console.log('jobIndustryModel.test.ts: all assertions passed')
