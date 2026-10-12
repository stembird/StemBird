import assert from 'node:assert/strict';
import {
  buildJobDescriptionText,
  collectCvPlaintext,
  compareCvToJd,
  extractJdKeywords,
  tailoredCvTitle,
  targetingHeadline,
  withoutTargetingFields,
} from './jobTargeting';

{
  const text = buildJobDescriptionText({
    title: 'Finance Officer',
    company: 'Acme',
    description: '<p>Manage <strong>QuickBooks</strong> and IFRS reporting.</p>',
    responsibilities: '<ul><li>Month-end close</li></ul>',
    required_qualifications: 'CPA(K) required',
    qualifications: null,
    additional_info: null,
  });
  assert.match(text, /Finance Officer at Acme/);
  assert.match(text, /QuickBooks/);
  assert.match(text, /IFRS/);
  assert.match(text, /Month-end close/);
  assert.match(text, /CPA\(K\)/);
  assert.doesNotMatch(text, /<p>/);
}

{
  const keywords = extractJdKeywords(`
    We are looking for an excellent candidate to join our team.
    Required: QuickBooks, IFRS, CPA, Excel, month-end close, and stakeholder reporting.
    Nice to have: Power BI and SAP.
  `);
  assert.ok(keywords.includes('quickbooks'));
  assert.ok(keywords.includes('ifrs'));
  assert.ok(keywords.includes('excel'));
  assert.ok(!keywords.includes('candidate'));
  assert.ok(!keywords.includes('team'));
  assert.ok(!keywords.includes('excellent'));
}

{
  const cv = {
    personal: { title: 'Accountant', summary: 'CPA(K) with month-end close experience.' },
    skills: ['Excel', 'QuickBooks'],
    experience: [{ jobTitle: 'Accountant', company: 'Bank', details: ['Prepared IFRS packs'] }],
    education: [],
    certifications: ['CPA'],
    achievements: [],
    languages: [],
    tools: ['Power BI'],
  };
  const jd = 'Need QuickBooks, IFRS, Excel, SAP, and stakeholder management.';
  const gap = compareCvToJd(cv, jd);
  assert.ok(gap.matched.includes('quickbooks'));
  assert.ok(gap.matched.includes('ifrs'));
  assert.ok(gap.matched.includes('excel'));
  assert.ok(gap.missing.includes('sap'));
  assert.equal(gap.matchedCount + gap.missingCount, gap.totalCount);
  assert.ok(collectCvPlaintext(cv).toLowerCase().includes('quickbooks'));
}

{
  assert.equal(targetingHeadline('Data Analyst at Safaricom\nBuild dashboards'), 'Data Analyst at Safaricom');
  assert.equal(tailoredCvTitle('Graduate CV', 'Fineract Developer'), 'Graduate CV — Fineract Developer');
  const stripped = withoutTargetingFields({
    title: 'Mine',
    parent_cv_id: 'p',
    target_job_id: 'j',
    target_jd_text: 'jd',
  });
  assert.equal('parent_cv_id' in stripped, false);
  assert.equal((stripped as { title: string }).title, 'Mine');
}

console.log('jobTargeting.test.ts: ok');
