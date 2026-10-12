import assert from 'node:assert/strict';
import {
  DEFAULT_DESIGN,
  designCssVars,
  designFromTemplateData,
  emptyHiddenSections,
  isSectionHidden,
  mergeDesign,
  normalizeHexColor,
} from './cvDesign';

{
  const design = designFromTemplateData(
    {
      colors: { primary: '#1D4ED8', accent: '#f59e0b' },
      fonts: { primary: 'Georgia, serif' },
      sections: ['header', 'experience'],
    },
    'Classic Professional',
  );
  assert.equal(design.primaryColor, '#1d4ed8');
  assert.equal(design.fontFamily, 'serif');
  assert.deepEqual(design.sectionOrder, ['header', 'experience']);
  assert.deepEqual(design.hiddenSections, []);
}

{
  const academic = designFromTemplateData({}, 'Academic / Research CV');
  assert.equal(academic.fontFamily, 'serif');
  assert.equal(academic.primaryColor, DEFAULT_DESIGN.primaryColor);
}

{
  const merged = mergeDesign(
    { primaryColor: '#111827', fontFamily: 'sans', hiddenSections: ['grants'] },
    { primaryColor: '#be123c', fontSize: 'lg' },
  );
  assert.equal(merged.primaryColor, '#be123c');
  assert.equal(merged.fontFamily, 'sans');
  assert.equal(merged.fontSize, 'lg');
  assert.deepEqual(merged.hiddenSections, ['grants']);
}

{
  assert.equal(normalizeHexColor('#ABC'), '#aabbcc');
  assert.equal(normalizeHexColor('not-a-color'), DEFAULT_DESIGN.primaryColor);
}

{
  const vars = designCssVars({ fontFamily: 'serif', fontSize: 'sm', lineSpacing: 1.7, primaryColor: '#047857' });
  const style = vars as Record<string, string>;
  assert.equal(style['--cv-primary'], '#047857');
  assert.match(style['--cv-font'], /Georgia/);
  assert.equal(style['--cv-font-size'], '13px');
  assert.equal(style['--cv-line-height'], '1.7');
}

{
  assert.equal(isSectionHidden({ hiddenSections: ['publications'] }, 'publications'), true);
  assert.equal(isSectionHidden({ hiddenSections: ['publications'] }, 'conferences'), false);
  const hidden = emptyHiddenSections(
    { hiddenSections: ['publications', 'projects'] },
    { publications: ['A paper'], projects: [{ title: 'X' }], skills: ['SQL'] },
  );
  assert.deepEqual(hidden.publications, []);
  assert.deepEqual(hidden.projects, []);
  assert.deepEqual(hidden.skills, ['SQL']);
}

console.log('cvDesign.test.ts: ok');
