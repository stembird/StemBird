import assert from 'node:assert/strict';
import {
  applyHrefForJob,
  careerToolsHrefForJob,
  documentsForSavedJob,
  pickCvForJob,
  pickLetterForJob,
} from './savedJobDocuments';

const cvs = [
  { id: 'primary', is_primary: true, target_job_id: null, updated_at: '2026-08-01T00:00:00Z', title: 'Primary' },
  { id: 'old-target', is_primary: false, target_job_id: 'job-1', updated_at: '2026-08-02T00:00:00Z', title: 'Old' },
  { id: 'new-target', is_primary: false, target_job_id: 'job-1', updated_at: '2026-08-03T00:00:00Z', title: 'New' },
] as any;

{
  assert.equal(pickCvForJob(cvs, 'job-1')?.id, 'new-target');
  assert.equal(pickCvForJob(cvs, 'job-2')?.id, 'primary');
  assert.equal(pickCvForJob([], 'job-1'), null);
}

{
  const letters = [
    { id: 'a', job_id: null, updated_at: '2026-08-04T00:00:00Z' },
    { id: 'b', job_id: 'job-1', updated_at: '2026-08-02T00:00:00Z' },
    { id: 'c', job_id: 'job-1', updated_at: '2026-08-03T00:00:00Z' },
  ] as any;
  assert.equal(pickLetterForJob(letters, 'job-1')?.id, 'c');
  assert.equal(pickLetterForJob(letters, 'job-9'), null);
}

{
  const docs = documentsForSavedJob('job-1', cvs, [
    { id: 'letter', job_id: 'job-1', updated_at: '2026-08-03T00:00:00Z' } as any,
  ]);
  assert.equal(docs.cv?.id, 'new-target');
  assert.equal(docs.cvIsTargeted, true);
  assert.equal(docs.extraTargetedCount, 1);
  assert.equal(docs.letter?.id, 'letter');
  assert.equal(applyHrefForJob({ id: 'job-1', job_slug: 'ops-lead-nairobi' }, docs), '/jobs/ops-lead-nairobi?cvId=new-target&letterId=letter');
  assert.equal(careerToolsHrefForJob('job-1', 'new-target'), '/dashboard/career-tools?jobId=job-1&cvId=new-target');
}

{
  const empty = documentsForSavedJob('job-9', [], []);
  assert.equal(applyHrefForJob({ id: 'job-9' }, empty), '/jobs/job-9');
}

console.log('savedJobDocuments.test.ts: ok');
