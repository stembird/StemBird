import { getMpesaConfig } from './config';
import type {
  MpesaConfig,
  OAuthTokenResponse,
  StkPushApiResponse,
  StkPushRequest,
  StkPushSuccessResponse,
} from './types';

let cachedToken: { key: string; accessToken: string; expiresAt: number } | null = null;

function isStkPushSuccess(data: StkPushApiResponse): data is StkPushSuccessResponse {
  return 'CheckoutRequestID' in data && 'MerchantRequestID' in data;
}

/** Daraja timestamp: YYYYMMDDHHmmss (Africa/Nairobi / local server time is fine for sandbox) */
export function buildTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

export function buildPassword(shortCode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
}

export async function getAccessToken(config = getMpesaConfig()): Promise<string> {
  const now = Date.now();
  const cacheKey = `${config.environment}:${config.consumerKey}`;
  if (cachedToken && cachedToken.key === cacheKey && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.accessToken;
  }

  const credentials = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString(
    'base64'
  );

  const url = `${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${credentials}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    console.error('[M-Pesa] OAuth failed:', response.status, body);
    throw new Error('Failed to authenticate with M-Pesa Daraja API');
  }

  const data = (await response.json()) as OAuthTokenResponse;
  if (!data.access_token) {
    console.error('[M-Pesa] OAuth response missing access_token:', data);
    throw new Error('Invalid OAuth response from M-Pesa Daraja API');
  }

  const expiresInSec = Number.parseInt(data.expires_in || '3599', 10);
  cachedToken = {
    key: cacheKey,
    accessToken: data.access_token,
    expiresAt: now + expiresInSec * 1000,
  };

  return data.access_token;
}

export async function initiateStkPush(
  request: StkPushRequest,
  config = getMpesaConfig()
): Promise<StkPushSuccessResponse> {
  const accessToken = await getAccessToken(config);
  const timestamp = buildTimestamp();
  const password = buildPassword(config.businessShortCode, config.passkey, timestamp);

  const amount = Math.round(request.amount);
  if (!Number.isFinite(amount) || amount < 1) {
    throw new Error('Amount must be at least 1 KES');
  }

  const transactionType = config.transactionType || 'CustomerPayBillOnline';

  const payload = {
    BusinessShortCode: config.businessShortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: transactionType,
    Amount: amount,
    PartyA: request.phoneNumber,
    PartyB: config.businessShortCode,
    PhoneNumber: request.phoneNumber,
    CallBackURL: config.callbackUrl,
    AccountReference: request.accountReference.slice(0, 12),
    TransactionDesc: request.transactionDesc.slice(0, 13),
  };

  const url = `${config.baseUrl}/mpesa/stkpush/v1/processrequest`;
  console.info('[M-Pesa] Initiating STK Push', {
    amount,
    phone: request.phoneNumber,
    accountReference: payload.AccountReference,
    env: config.environment,
    transactionType,
    shortCode: config.businessShortCode,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const data = (await response.json()) as StkPushApiResponse;

  if (!response.ok || !isStkPushSuccess(data)) {
    const err = data as { errorMessage?: string; errorCode?: string };
    console.error('[M-Pesa] STK Push failed:', response.status, data);
    throw new Error(err.errorMessage || 'STK Push request failed');
  }

  if (data.ResponseCode !== '0') {
    console.error('[M-Pesa] STK Push non-zero ResponseCode:', data);
    throw new Error(data.ResponseDescription || 'STK Push was not accepted');
  }

  return data;
}

/** Clear cached OAuth token (useful in tests). */
export function clearMpesaTokenCache(): void {
  cachedToken = null;
}
