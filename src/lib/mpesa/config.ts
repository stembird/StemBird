import { getEnvVar } from '@/lib/env';
import type { MpesaConfig, MpesaEnvironment } from './types';
import type { MpesaPaymentSettings, MpesaStkMode } from '@/lib/pricing/types';

const SANDBOX_BASE = 'https://sandbox.safaricom.co.ke';
const PRODUCTION_BASE = 'https://api.safaricom.co.ke';

function envCredential(environment: MpesaEnvironment, name: string): string | undefined {
  const scoped =
    environment === 'production'
      ? process.env[`MPESA_PRODUCTION_${name}`]
      : process.env[`MPESA_SANDBOX_${name}`];
  return scoped || process.env[`MPESA_${name}`];
}

function requiredCredential(environment: MpesaEnvironment, name: string): string {
  const value = envCredential(environment, name);
  if (value) return value;
  return getEnvVar(`MPESA_${name}`);
}

export function resolveMpesaEnvironment(
  settings?: Pick<MpesaPaymentSettings, 'environment'> | null
): MpesaEnvironment {
  const fromSettings = settings?.environment;
  if (fromSettings === 'sandbox' || fromSettings === 'production') return fromSettings;

  const fromEnv = (process.env.MPESA_ENV || 'sandbox').toLowerCase();
  if (fromEnv !== 'sandbox' && fromEnv !== 'production') {
    throw new Error(`Invalid MPESA_ENV "${fromEnv}". Use "sandbox" or "production".`);
  }
  return fromEnv as MpesaEnvironment;
}

export function resolveStkShortCode(
  settings?: Pick<MpesaPaymentSettings, 'stkMode' | 'tillNumber' | 'paybillNumber'> | null
): { shortCode: string; stkMode: MpesaStkMode } {
  const stkMode: MpesaStkMode = settings?.stkMode === 'till' ? 'till' : 'paybill';
  if (stkMode === 'till' && settings?.tillNumber) {
    return { shortCode: settings.tillNumber, stkMode };
  }
  if (settings?.paybillNumber) {
    return { shortCode: settings.paybillNumber, stkMode: 'paybill' };
  }
  const environment = resolveMpesaEnvironment(settings as MpesaPaymentSettings | null);
  return {
    shortCode: requiredCredential(environment, 'BUSINESS_SHORT_CODE'),
    stkMode,
  };
}

/**
 * Required server-only env vars (unprefixed, or MPESA_SANDBOX_* / MPESA_PRODUCTION_*):
 * - MPESA_CONSUMER_KEY
 * - MPESA_CONSUMER_SECRET
 * - MPESA_BUSINESS_SHORT_CODE
 * - MPESA_PASSKEY
 * - MPESA_CALLBACK_URL (public HTTPS URL Safaricom can reach)
 * - MPESA_ENV (sandbox | production) — used when dashboard settings are missing
 *
 * Dashboard `mpesa_settings` overlay environment + till/paybill shortcodes.
 */
export function getMpesaConfig(
  settings?: Pick<
    MpesaPaymentSettings,
    'environment' | 'stkMode' | 'tillNumber' | 'paybillNumber'
  > | null
): MpesaConfig {
  const environment = resolveMpesaEnvironment(settings);
  const { shortCode, stkMode } = resolveStkShortCode(settings);
  const baseUrl = environment === 'production' ? PRODUCTION_BASE : SANDBOX_BASE;

  return {
    consumerKey: requiredCredential(environment, 'CONSUMER_KEY'),
    consumerSecret: requiredCredential(environment, 'CONSUMER_SECRET'),
    businessShortCode: shortCode,
    passkey: requiredCredential(environment, 'PASSKEY'),
    callbackUrl:
      envCredential(environment, 'CALLBACK_URL') || getEnvVar('MPESA_CALLBACK_URL'),
    environment,
    baseUrl,
    stkMode,
    transactionType:
      stkMode === 'till' ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline',
  };
}

export function isMpesaConfigured(
  settings?: Pick<MpesaPaymentSettings, 'environment'> | null
): boolean {
  try {
    const environment = resolveMpesaEnvironment(settings);
    return Boolean(
      envCredential(environment, 'CONSUMER_KEY') &&
        envCredential(environment, 'CONSUMER_SECRET') &&
        envCredential(environment, 'BUSINESS_SHORT_CODE') &&
        envCredential(environment, 'PASSKEY') &&
        (envCredential(environment, 'CALLBACK_URL') || process.env.MPESA_CALLBACK_URL)
    );
  } catch {
    return false;
  }
}
