import assert from 'node:assert/strict';
import {
  coverLetterClosing,
  coverLetterPlaintext,
  hydrateCoverLetter,
  toCoverLetterContentJson,
} from './coverLetterContent';

assert.equal(coverLetterClosing('Internship / Attachment Cover Letter'), 'Yours faithfully,');
assert.equal(coverLetterClosing('Graduate / Entry-Level Cover Letter'), 'Yours sincerely,');
assert.equal(coverLetterClosing('Short & Direct Cover Letter'), 'Best regards,');
assert.equal(coverLetterClosing('Classic Professional Cover Letter'), 'Sincerely,');

{
  const fields = {
    name: 'John Mwangi',
    phone: '+254700000000',
    email: 'john@email.com',
    location: 'Nairobi',
    date: '24 March 2026',
    hiringManager: 'Hiring Manager',
    company: 'KCB',
    companyAddress: 'Nairobi',
    paragraph1: 'I am applying for Finance Manager.',
    paragraph2: 'I have five years in banking.',
    paragraph3: 'I would welcome an interview.',
  };
  const text = coverLetterPlaintext(fields, 'Classic Professional Cover Letter');
  assert.match(text, /John Mwangi/);
  assert.match(text, /Dear Hiring Manager/);
  assert.match(text, /I am applying for Finance Manager/);
  assert.match(text, /Sincerely,/);
}

{
  const json = toCoverLetterContentJson('Classic Professional Cover Letter', {
    name: 'Amina',
    paragraph1: 'Hello',
  });
  const hydrated = hydrateCoverLetter({
    content: 'ignored when json present',
    content_json: json,
  });
  assert.equal(hydrated.templateName, 'Classic Professional Cover Letter');
  assert.equal(hydrated.fields.name, 'Amina');
  assert.equal(hydrated.fields.paragraph1, 'Hello');
}

{
  const hydrated = hydrateCoverLetter({
    content: 'Legacy plaintext letter body',
  });
  assert.equal(hydrated.templateName, 'Classic Professional Cover Letter');
  assert.equal(hydrated.fields.paragraph1, 'Legacy plaintext letter body');
}

console.log('coverLetterContent.test.ts: ok');
