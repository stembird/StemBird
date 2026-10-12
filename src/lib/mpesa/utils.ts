import { randomBytes } from 'crypto';
import type {
  ParsedStkCallback,
  PaymentStatus,
  StkCallbackPayload,
} from './types';

export function generateTransactionReference(prefix = 'CS'): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(3).toString('hex').toUpperCase();
  // Daraja AccountReference max ~12 chars — keep compact
  return `${prefix}${stamp.slice(-6)}${rand}`.slice(0, 12);
}

export function isStkCallbackPayload(body: unknown): body is StkCallbackPayload {
  if (!body || typeof body !== 'object') return false;
  const maybe = body as StkCallbackPayload;
  return Boolean(maybe.Body?.stkCallback?.CheckoutRequestID);
}

export function parseStkCallback(payload: StkCallbackPayload): ParsedStkCallback {
  const cb = payload.Body.stkCallback;
  const items = cb.CallbackMetadata?.Item ?? [];

  const getValue = (name: string): string | number | undefined => {
    const item = items.find((i) => i.Name === name);
    return item?.Value;
  };

  const amountRaw = getValue('Amount');
  const receiptRaw = getValue('MpesaReceiptNumber');
  const dateRaw = getValue('TransactionDate');
  const phoneRaw = getValue('PhoneNumber');

  let status: PaymentStatus;
  if (cb.ResultCode === 0) {
    status = 'SUCCESS';
  } else if (cb.ResultCode === 1032) {
    // User cancelled the STK prompt
    status = 'CANCELLED';
  } else {
    status = 'FAILED';
  }

  return {
    merchantRequestId: cb.MerchantRequestID,
    checkoutRequestId: cb.CheckoutRequestID,
    resultCode: cb.ResultCode,
    resultDesc: cb.ResultDesc,
    amount: amountRaw !== undefined ? Number(amountRaw) : undefined,
    mpesaReceiptNumber: receiptRaw !== undefined ? String(receiptRaw) : undefined,
    transactionDate: dateRaw !== undefined ? String(dateRaw) : undefined,
    phoneNumber: phoneRaw !== undefined ? String(phoneRaw) : undefined,
    status,
  };
}
