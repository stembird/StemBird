import assert from 'node:assert/strict';
import {
  applySuggestionToList,
  buildSuggestMessages,
  canConsumeUsage,
  filterGroundedSuggestions,
  hasEnoughSourceFacts,
  isGroundedSuggestion,
  parseSuggestRequest,
  parseSuggestResponse,
  suggestCorpus,
  usageSnapshot,
} from './careerSuggest';

{
  const parsed = parseSuggestRequest({
    kind: 'summary',
    cv: { personal: { title: 'Accountant' }, skills: ['Excel'] },
    jdText: 'Need Excel',
  });
  assert.equal('error' in parsed, false);
  if (!('error' in parsed)) assert.equal(parsed.kind, 'summary');
  assert.equal('error' in parseSuggestRequest({ kind: 'rewrite-all' }), true);
}

{
  const cv = {
    personal: { title: 'Accountant', profile: 'CPA with month-end experience' },
    skills: ['Excel', 'QuickBooks'],
    experience: [{ jobTitle: 'Accountant', company: 'KCB', details: ['Prepared IFRS packs in Excel'] }],
    education: [],
    certifications: ['CPA'],
  };
  const request = parseSuggestRequest({
    kind: 'experience_bullets',
    cv,
    experienceIndex: 0,
    currentText: 'Prepared IFRS packs in Excel',
    jdText: 'Need IFRS and Excel',
  });
  assert.equal('error' in request, false);
  if (!('error' in request)) {
    assert.equal(hasEnoughSourceFacts(request), true);
    const messages = buildSuggestMessages(request);
    assert.match(messages.systemPrompt, /Never invent/);
    assert.match(messages.userPrompt, /KCB/);
    assert.match(messages.userPrompt, /IFRS/);
    assert.match(messages.userPrompt, /experience_bullets/);
    const corpus = suggestCorpus(request);
    assert.match(corpus.toLowerCase(), /quickbooks|excel|ifrs/);
    assert.equal(
      isGroundedSuggestion('Prepared IFRS financial packs in Excel for KCB month-end', corpus),
      true,
    );
    assert.equal(
      isGroundedSuggestion('Led a Series B fundraise at SpaceX and shipped a quantum OS', corpus),
      false,
    );
    const kept = filterGroundedSuggestions(
      [
        'Prepared IFRS packs in Excel at KCB',
        'Invented a fusion reactor in 2020',
        'short',
      ],
      corpus,
    );
    assert.ok(kept.some((item) => /ifrs/i.test(item)));
    assert.equal(kept.some((item) => /fusion/i.test(item)), false);
  }
}

{
  assert.deepEqual(parseSuggestResponse({ suggestions: [' One ', 2, 'Two'] }), ['One', 'Two']);
  assert.deepEqual(parseSuggestResponse({}), []);
  assert.deepEqual(applySuggestionToList('- Excel\n- IFRS, SAP', 'lines'), ['Excel', 'IFRS, SAP']);
  assert.deepEqual(applySuggestionToList('Excel, IFRS, SAP', 'comma'), ['Excel', 'IFRS', 'SAP']);
}

{
  assert.equal(canConsumeUsage(19), true);
  assert.equal(canConsumeUsage(20), false);
  assert.deepEqual(usageSnapshot(4), { used: 4, limit: 20, remaining: 16 });
  assert.equal(usageSnapshot(30).remaining, 0);
}

console.log('careerSuggest.test.ts: ok');
