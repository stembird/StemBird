/**
 * Run: npx tsx src/lib/chemistryRelevance.test.ts
 *
 * Job-publish compatibility tests for the shared STEM subject gate.
 */
import assert from 'node:assert/strict'
import { matchesChemistryFocus, SKIPPED_NON_CHEMISTRY_MESSAGE } from './chemistryRelevance'

// The job-publish compatibility wrapper uses the complete STEM subject gate.
assert.equal(
  matchesChemistryFocus({
    title: 'QC Analyst',
    jobFunctions: ['Quality Control (QC)'],
  }),
  false,
  'generic quality-control classification does not establish a STEM role'
)
assert.equal(
  matchesChemistryFocus({
    title: 'Analytical Officer',
    jobFunctions: ['Analytical & Instrumental Chemistry'],
  }),
  false,
  'an AI chemistry function tag does not establish a STEM role'
)
assert.equal(
  matchesChemistryFocus({
    title: 'IT Support Associate',
    jobFunctions: ['Laboratory Information Systems (LIMS) & Informatics'],
  }),
  false,
  'T1 with mismatched title and no prose corroboration is a stale tag → reject'
)

// Explicit STEM degree requirements can rescue otherwise generic job titles.
assert.equal(
  matchesChemistryFocus({
    title: 'Production Supervisor',
    jobFunctions: ['Production & Plant Operations Management'],
    requiredQualifications: '<ul><li>Bachelor of Science in Industrial Chemistry</li></ul>',
  }),
  true,
  'an industrial chemistry degree requirement qualifies'
)
assert.equal(
  matchesChemistryFocus({
    title: 'Production Supervisor',
    requiredQualifications: '<ul><li>Degree in Business Administration</li></ul>',
  }),
  false,
  'a business degree does not qualify the role'
)

// A STEM title is enough; unrelated duty phrases are not.
assert.equal(
  matchesChemistryFocus({
    title: 'Laboratory Assistant',
    description: '<p>Perform HPLC and titration on incoming raw materials.</p>',
  }),
  true,
  'a laboratory title qualifies'
)
assert.equal(
  matchesChemistryFocus({
    title: 'Quality Officer',
    description:
      '<p>Conduct raw material testing, batch analysis, and finished product testing per ISO 17025.</p>',
  }),
  false,
  'generic quality duties do not establish that the job is STEM'
)
assert.equal(
  matchesChemistryFocus({
    title: 'Quality Assurance Officer',
    requiredQualifications:
      '<p>Degree in Food Science, Nutrition, or related field.</p>',
  }),
  true,
  'T2 — "or related field" phrasing on Food Science/Nutrition admits chemists'
)

// Sales titles qualify only when their posting explicitly requires a STEM degree.
assert.equal(
  matchesChemistryFocus({
    title: 'Sales Representative',
    description:
      '<p>Sell HPLC columns and chromatography consumables. Candidates must have a BSc in Chemistry.</p>',
  }),
  true,
  'a chemistry degree requirement qualifies the sales role'
)
assert.equal(
  matchesChemistryFocus({
    title: 'Sales Representative',
    description: '<p>Sell insurance policies across Nairobi.</p>',
  }),
  false,
  'non-STEM sales does not qualify'
)

// Healthcare is part of StemBird's STEM scope.
assert.equal(
  matchesChemistryFocus({
    title: 'Registered Nurse',
    jobFunctions: ['Laboratory Operations & Management'],
  }),
  true,
  'healthcare roles are in StemBird scope'
)
assert.equal(
  matchesChemistryFocus({
    title: 'Geneticist',
    description: '<p>Runs PCR panels for rare disease research.</p>',
  }),
  true,
  'genetics is a science role in StemBird scope'
)

// A STEM degree requirement can rescue a generic management title.
assert.equal(
  matchesChemistryFocus({
    title: 'Operations Manager',
    requiredQualifications: '<p>Must hold a BSc in Analytical Chemistry.</p>',
    description: '<p>Oversee wet chemistry and ICP-OES sample preparation for the refinery lab.</p>',
  }),
  true,
  'a chemistry degree requirement qualifies the role'
)

assert.equal(SKIPPED_NON_CHEMISTRY_MESSAGE, 'Skipped: outside STEM focus')

console.log('chemistryRelevance.test.ts: all assertions passed')
