import assert from 'node:assert/strict';
import { buildCoverLetterWordBlob, letterPlaintextForApply, planCoverLetterWord } from './coverLetterExport';
import { toCoverLetterContentJson } from './coverLetterContent';

{
  const planned = planCoverLetterWord({
    name: 'John Mwangi',
    phone: '+254700000000',
    email: 'john@email.com',
    location: 'Nairobi',
    institution: 'University of Nairobi',
    course: 'BCom',
    date: '24 March 2026',
    hiringManager: 'Hiring Manager',
    company: 'KCB',
    companyAddress: 'Nairobi',
    paragraph1: 'I am applying for Finance Manager.',
    paragraph2: 'I have five years in banking.',
    paragraph3: 'I would welcome an interview.',
  }, 'Internship / Attachment Cover Letter');

  assert.equal(planned.name, 'John Mwangi');
  assert.equal(planned.greeting, 'Dear Hiring Manager,');
  assert.equal(planned.closing, 'Yours faithfully,');
  assert.deepEqual(planned.extras, ['University of Nairobi', 'BCom']);
  assert.equal(planned.paragraphs.length, 3);
}

{
  const fromJson = letterPlaintextForApply({
    content: '',
    content_json: toCoverLetterContentJson('Classic Professional Cover Letter', {
      name: 'Amina',
      hiringManager: 'Talent Team',
      paragraph1: 'I am writing to apply.',
    }),
  });
  assert.match(fromJson, /Amina/);
  assert.match(fromJson, /Dear Talent Team/);
  assert.match(fromJson, /I am writing to apply/);
}

{
  assert.equal(
    letterPlaintextForApply({ content: 'Already written letter', content_json: null }),
    'Already written letter',
  );
}

{
  const blob = await buildCoverLetterWordBlob({
    name: 'Amina Njeri',
    email: 'amina@email.com',
    date: '30 August 2026',
    hiringManager: 'Hiring Manager',
    company: 'Safaricom',
    paragraph1: 'I am applying for the analyst role.',
    paragraph2: 'I have interned in finance.',
    paragraph3: 'I would welcome an interview.',
  }, 'Classic Professional Cover Letter');
  assert.ok(blob.size > 1000);
}

console.log('coverLetterExport.test.ts: ok');
