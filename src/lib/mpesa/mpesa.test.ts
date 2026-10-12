import assert from 'node:assert/strict';
import { normalizeKenyanPhone, isValidKenyanPhone } from './phone';
import { generateTransactionReference, parseStkCallback } from './utils';
import { getPaidJobActionPricing } from './pricing';
import type { StkCallbackPayload } from './types';

function testPhoneNormalization() {
  assert.equal(normalizeKenyanPhone('0712345678'), '254712345678');
  assert.equal(normalizeKenyanPhone('+254712345678'), '254712345678');
  assert.equal(normalizeKenyanPhone('254712345678'), '254712345678');
  assert.equal(normalizeKenyanPhone('712345678'), '254712345678');
  assert.equal(normalizeKenyanPhone('0112345678'), '254112345678');
  assert.equal(isValidKenyanPhone('0712345678'), true);
  assert.equal(isValidKenyanPhone('123'), false);
  assert.throws(() => normalizeKenyanPhone('12345'));
  console.log('✓ phone normalization');
}

function testTransactionReference() {
  const ref = generateTransactionReference();
  assert.ok(ref.length > 0 && ref.length <= 12);
  assert.notEqual(generateTransactionReference(), generateTransactionReference());
  console.log('✓ transaction reference');
}

function testParseCallbackSuccess() {
  const payload: StkCallbackPayload = {
    Body: {
      stkCallback: {
        MerchantRequestID: 'm-1',
        CheckoutRequestID: 'c-1',
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully.',
        CallbackMetadata: {
          Item: [
            { Name: 'Amount', Value: 10 },
            { Name: 'MpesaReceiptNumber', Value: 'ABC123XYZ' },
            { Name: 'TransactionDate', Value: 20260720183000 },
            { Name: 'PhoneNumber', Value: 254712345678 },
          ],
        },
      },
    },
  };

  const parsed = parseStkCallback(payload);
  assert.equal(parsed.status, 'SUCCESS');
  assert.equal(parsed.mpesaReceiptNumber, 'ABC123XYZ');
  assert.equal(parsed.amount, 10);
  assert.equal(parsed.phoneNumber, '254712345678');
  console.log('✓ parse success callback');
}

function testParseCallbackCancelled() {
  const payload: StkCallbackPayload = {
    Body: {
      stkCallback: {
        MerchantRequestID: 'm-2',
        CheckoutRequestID: 'c-2',
        ResultCode: 1032,
        ResultDesc: 'Request cancelled by user',
      },
    },
  };

  const parsed = parseStkCallback(payload);
  assert.equal(parsed.status, 'CANCELLED');
  assert.equal(parsed.mpesaReceiptNumber, undefined);
  console.log('✓ parse cancelled callback');
}

function testPaidJobActionPricing() {
  const promote = getPaidJobActionPricing('promote', 'basic');
  assert.ok(promote, 'basic promote pricing exists');
  assert.equal(promote.amount, 1000);
  assert.equal(promote.durationDays, 7);

  const feature = getPaidJobActionPricing('feature');
  assert.ok(feature, 'feature pricing exists');
  assert.equal(feature.amount, 2000);

  assert.equal(getPaidJobActionPricing('feature', 'basic'), undefined);
  assert.equal(getPaidJobActionPricing('promote', 'enterprise'), undefined);
  console.log('✓ paid job action pricing');
}

function main() {
  testPhoneNormalization();
  testTransactionReference();
  testParseCallbackSuccess();
  testParseCallbackCancelled();
  testPaidJobActionPricing();
  console.log('All M-Pesa unit tests passed');
}

main();
