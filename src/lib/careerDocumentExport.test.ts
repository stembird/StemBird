import assert from 'node:assert/strict';
import { getTemplateDefaultContent } from '../data/templateDefaultContent';
import { buildCvWordBlob, cvPlaintext, planCvWordSections } from './careerDocumentExport';
import { fileBasename, isLikelyIos, isLikelyMobile, mimeForFilename, wordFilename } from './downloadBlob';

{
  const planned = planCvWordSections({
    personal: {
      name: 'Jane Wanjiku',
      title: 'Operations Lead',
      profile: 'Operations lead in Nairobi.',
      phone: '0700000000',
      email: 'jane@email.com',
      location: 'Nairobi',
    },
    skills: ['Excel'],
    experience: [{ jobTitle: 'Officer', company: 'ABC', dates: '2021 – Present', details: ['Ran dispatch'] }],
    education: [{ degree: 'BCom', institution: 'UoN', dates: '2018' }],
    publications: [{ title: 'A paper', platform: 'Journal', year: '2024' }],
    projects: [{ title: 'Street lights', client: 'County', year: '2023', description: 'LDR circuit' }],
    internships: [{ role: 'Trainee', company: 'Kenya Power', dates: '2024', details: ['Wired boards'] }],
    design: { primaryColor: '#be123c', fontFamily: 'serif' },
  }, 'Academic / Research CV');

  assert.equal(planned.name, 'Jane Wanjiku');
  assert.equal(planned.headingColor, 'be123c');
  assert.equal(planned.font, 'Georgia');
  assert.match(planned.contact, /Nairobi/);
  const headings = planned.sections.map((section) => section.heading);
  assert.ok(headings.includes('PROFESSIONAL SUMMARY'));
  assert.ok(headings.includes('RESEARCH INTERESTS') || headings.includes('KEY SKILLS'));
  assert.ok(headings.includes('PUBLICATIONS'));
  assert.ok(headings.includes('PROJECTS'));
  assert.ok(headings.includes('INDUSTRIAL ATTACHMENT') || headings.includes('INTERNSHIPS'));
  const pubs = planned.sections.find((section) => section.heading === 'PUBLICATIONS');
  assert.equal((pubs?.items[0] as { text?: string })?.text, 'A paper — Journal — 2024');
}

{
  const academic = planCvWordSections(
    getTemplateDefaultContent('Academic / Research CV'),
    'Academic / Research CV',
  );
  const headings = academic.sections.map((section) => section.heading);
  assert.ok(headings.includes('RESEARCH INTERESTS'));
  assert.ok(headings.includes('PUBLICATIONS'));
  assert.ok(headings.includes('CONFERENCES'));
  assert.ok(headings.includes('GRANTS & FUNDING'));
}

{
  const hidden = planCvWordSections({
    personal: { name: 'Jane', profile: 'Hello' },
    skills: ['SQL'],
    experience: [],
    education: [],
    publications: ['Hidden paper'],
    design: { hiddenSections: ['publications'] },
  });
  assert.equal(hidden.sections.some((section) => section.heading === 'PUBLICATIONS'), false);
}

{
  const text = cvPlaintext({
    personal: { name: 'Jane', profile: 'Hello' },
    skills: ['Excel'],
    experience: [],
    education: [{ degree: 'BCom', institution: 'UoN', dates: '2018' }],
    projects: [{ title: 'Dashboards', description: 'Looker studio' }],
  });
  assert.match(text, /Jane/);
  assert.match(text, /PROFESSIONAL SUMMARY/);
  assert.match(text, /Dashboards/);
  assert.match(text, /REFEREES/);
}

{
  const blob = await buildCvWordBlob({
    personal: { name: 'Jane Wanjiku', title: 'Analyst' },
    skills: ['SQL'],
    experience: [],
    education: [],
  });
  assert.ok(blob.size > 1000);
}

{
  assert.equal(wordFilename('My CV'), 'My_CV.docx');
  assert.equal(fileBasename('already.docx', 'docx'), 'already.docx');
  assert.equal(mimeForFilename('a.pdf'), 'application/pdf');
  assert.ok(isLikelyIos('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'));
  assert.equal(isLikelyIos('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), false);
  assert.ok(isLikelyMobile('Mozilla/5.0 (Linux; Android 14)'));
}

console.log('careerDocumentExport.test.ts: ok');
