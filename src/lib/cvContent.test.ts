import assert from 'node:assert/strict';
import { normalizeCVContent, toTemplateProps } from './cvContent';

{
  const normalized = normalizeCVContent({
    personal: { name: 'Jane Wanjiku', summary: 'Operations lead in Nairobi.' },
    experience: [
      {
        role: 'Operations Officer',
        company: 'ABC Ltd',
        startDate: 'Jan 2021',
        current: true,
        responsibilities: ['Ran daily dispatch'],
      },
    ],
    education: [{ degree: 'BCom', institution: 'UoN', dates: '2014 – 2018' }],
    skills: ['Excel', 'Reporting'],
    publications: ['A paper'],
  });

  assert.equal(normalized.personal.name, 'Jane Wanjiku');
  assert.equal(normalized.personal.profile, 'Operations lead in Nairobi.');
  assert.equal(normalized.personal.summary, 'Operations lead in Nairobi.');
  assert.equal(normalized.experience[0].jobTitle, 'Operations Officer');
  assert.equal(normalized.experience[0].dates, 'Jan 2021 – Present');
  assert.deepEqual(normalized.experience[0].details, ['Ran daily dispatch']);
  assert.deepEqual(normalized.publications, ['A paper']);
}

{
  const props = toTemplateProps({
    personal: { name: 'Jane', profile: 'Hello', title: 'Analyst', phone: '1', email: 'a@b.c', location: 'Nairobi' },
    skills: ['SQL'],
    experience: [{ jobTitle: 'Analyst', company: 'KCB', dates: '2020 – 2022', details: ['Built reports'] }],
    education: [{ degree: 'BSc', institution: 'KU', dates: '2016 – 2020' }],
  });

  assert.equal(props.name, 'Jane');
  assert.equal(props.summary, 'Hello');
  assert.equal(props.experience[0].role, 'Analyst');
  assert.equal(props.experience[0].jobTitle, 'Analyst');
  assert.deepEqual(props.experience[0].responsibilities, ['Built reports']);
  assert.equal(props.internships[0].role, 'Analyst');
}

{
  const empty = normalizeCVContent(null);
  assert.deepEqual(empty.skills, []);
  assert.deepEqual(empty.experience, []);
  assert.equal(empty.personal.name, '');
}

{
  const props = toTemplateProps({
    personal: { name: 'Jane' },
    skills: [],
    experience: [],
    education: [{ degree: 'Diploma', institution: 'NITA', dates: '2022' }],
    internships: [{ role: 'Trainee', organization: 'Kenya Power', dates: '2024', details: ['Wired boards'] }],
    projects: [{ title: 'Street lights', client: 'County', year: '2023', description: 'LDR circuit' }],
    publications: [{ title: 'A paper', platform: 'Journal', year: '2024' }],
    design: { primaryColor: '#be123c', hiddenSections: ['publications'] },
  });

  assert.equal(props.design?.primaryColor, '#be123c');
  assert.deepEqual(props.publications, []);
  assert.equal(props.education[0].program, 'Diploma');
  assert.equal(props.attachment[0].organization, 'Kenya Power');
  assert.equal(props.projects[0].company, 'County');
  assert.equal(props.projects[0].dates, '2023');
}

{
  const hiddenInternships = toTemplateProps({
    personal: { name: 'Jane' },
    skills: [],
    experience: [],
    education: [],
    internships: [{ role: 'Trainee', company: 'Kenya Power', dates: '2024', details: ['Wired boards'] }],
    design: { hiddenSections: ['internships'] },
  });
  assert.deepEqual(hiddenInternships.internships, []);
  assert.deepEqual(hiddenInternships.attachment, []);
}

console.log('cvContent.test.ts: ok');
