import assert from 'node:assert/strict';
import {
  applicationInsertWithoutDocumentFks,
  defaultCvId,
  isBuilderPdfCacheFresh,
  isMissingDbColumnError,
  pickLetterForPrefill,
  sortLettersForJob,
} from './applyDocuments';

{
  const letters = [
    { id: 'a', job_id: null, updated_at: '2026-08-01T00:00:00Z' },
    { id: 'b', job_id: 'job-1', updated_at: '2026-08-02T00:00:00Z' },
    { id: 'c', job_id: 'job-1', updated_at: '2026-08-03T00:00:00Z' },
  ];
  const sorted = sortLettersForJob(letters, 'job-1');
  assert.equal(sorted[0].id, 'c');
  assert.equal(sorted[1].id, 'b');
  assert.equal(sorted[2].id, 'a');
}

{
  assert.equal(defaultCvId([{ id: 'x', is_primary: false }, { id: 'y', is_primary: true }]), 'y');
  assert.equal(defaultCvId([{ id: 'x', is_primary: false }]), 'x');
  assert.equal(defaultCvId([]), '');
}

{
  assert.equal(
    isBuilderPdfCacheFresh({
      file_url: 'https://example.com/a.pdf',
      last_generated_at: '2026-08-29T12:00:02Z',
      updated_at: '2026-08-29T12:00:00Z',
    }),
    true,
  );
  assert.equal(
    isBuilderPdfCacheFresh({
      file_url: 'https://example.com/a.pdf',
      last_generated_at: '2026-08-29T11:00:00Z',
      updated_at: '2026-08-29T12:00:00Z',
    }),
    false,
  );
  assert.equal(
    isBuilderPdfCacheFresh({ file_url: null, last_generated_at: null, updated_at: '2026-08-29T12:00:00Z' }),
    false,
  );
}

{
  const letters = [
    { id: 'a', job_id: null, updated_at: '2026-08-01T00:00:00Z', content: 'A' },
    { id: 'b', job_id: 'job-1', updated_at: '2026-08-02T00:00:00Z', content: 'B' },
  ] as any;
  assert.equal(pickLetterForPrefill(letters, 'job-1')?.id, 'b');
  assert.equal(pickLetterForPrefill(letters, 'job-1', 'a')?.id, 'a');
  assert.equal(pickLetterForPrefill(letters, 'job-2')?.id, undefined);
}

{
  assert.equal(isMissingDbColumnError({ message: "Could not find the 'candidate_cv_id' column of 'job_applications'" }, 'candidate_cv_id'), true);
  assert.equal(isMissingDbColumnError({ message: 'duplicate key' }, 'candidate_cv_id'), false);
  const stripped = applicationInsertWithoutDocumentFks({
    job_id: 'j',
    candidate_cv_id: 'cv',
    candidate_cover_letter_id: 'cl',
    cover_letter: 'hi',
  });
  assert.equal('candidate_cv_id' in stripped, false);
  assert.equal((stripped as any).cover_letter, 'hi');
}

console.log('applyDocuments.test.ts: ok');
