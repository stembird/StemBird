import assert from 'node:assert/strict';
import {
  buildPublicCvPath,
  buildPublicCvUrl,
  generateShareToken,
  isShareColumnMissing,
  isShareToken,
  withoutShareFields,
} from './cvShare';

{
  const token = generateShareToken();
  assert.equal(isShareToken(token), true);
  assert.equal(token.length, 32);
  assert.notEqual(generateShareToken(), token);
}

{
  assert.equal(isShareToken('not-a-token'), false);
  assert.equal(isShareToken(''), false);
  assert.equal(isShareToken(null), false);
}

{
  const token = 'a'.repeat(32);
  assert.equal(buildPublicCvPath(token), `/cv/${token}`);
  assert.equal(buildPublicCvUrl(token, 'https://www.careersasa.co.ke/'), `https://www.careersasa.co.ke/cv/${token}`);
  assert.equal(buildPublicCvUrl(token), `/cv/${token}`);
}

{
  const stripped = withoutShareFields({
    title: 'Ops CV',
    share_token: 'abc',
    is_public: true,
    shared_at: '2026-08-30T00:00:00Z',
  });
  assert.equal(stripped.title, 'Ops CV');
  assert.equal('share_token' in stripped, false);
  assert.equal('is_public' in stripped, false);
}

{
  assert.equal(
    isShareColumnMissing({ message: "Could not find the 'share_token' column of 'candidate_cvs'" }),
    true,
  );
  assert.equal(isShareColumnMissing({ message: 'duplicate key' }), false);
}

console.log('cvShare.test.ts: ok');
