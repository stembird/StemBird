import assert from 'node:assert/strict';
import { getTemplateDefaultContent } from '../data/templateDefaultContent';
import { extraFieldKeys, extraFieldsForTemplate } from './cvTemplateExtras';

{
  const academic = extraFieldKeys('Academic / Research CV');
  assert.deepEqual(academic, ['researchInterests', 'publications', 'conferences', 'grants']);
}

{
  const functional = extraFieldsForTemplate('Skills-Based (Functional)');
  assert.equal(functional[0].kind, 'skillCategories');
}

{
  assert.ok(extraFieldKeys('Creative Portfolio').includes('projects'));
  assert.ok(extraFieldKeys('Executive Leadership').includes('boardMemberships'));
  assert.ok(extraFieldKeys('Graduate Starter CV').includes('activities'));
  assert.ok(extraFieldKeys('Internship / Industrial Attachment').includes('internships'));
  assert.ok(extraFieldKeys('Personal Brand CV').includes('speaking'));
  assert.ok(extraFieldKeys('Technical / Engineering CV').includes('projects'));
  assert.deepEqual(extraFieldKeys('Classic Professional'), []);
  assert.deepEqual(extraFieldKeys(undefined), []);
}

{
  const academic = getTemplateDefaultContent('Academic / Research CV') as Record<string, unknown>;
  const personal = academic.personal as { name?: string };
  assert.equal(personal.name, 'Dr. Daniel Mwangi Njoroge');
  assert.ok(Array.isArray(academic.publications) && (academic.publications as unknown[]).length > 0);

  const technical = getTemplateDefaultContent('Technical / Engineering CV') as Record<string, unknown>;
  assert.ok(Array.isArray(technical.projects) && (technical.projects as unknown[]).length > 0);
}

console.log('cvTemplateExtras.test.ts: ok');
