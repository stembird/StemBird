/**
 * Normalize Kenyan phone numbers to Daraja format: 2547XXXXXXXX
 */
export function normalizeKenyanPhone(input: string): string {
  const digits = String(input || '').replace(/\D/g, '');

  if (!digits) {
    throw new Error('Phone number is required');
  }

  let normalized: string;

  if (digits.startsWith('254') && digits.length === 12) {
    normalized = digits;
  } else if (digits.startsWith('0') && digits.length === 10) {
    normalized = `254${digits.slice(1)}`;
  } else if (digits.length === 9 && (digits.startsWith('7') || digits.startsWith('1'))) {
    normalized = `254${digits}`;
  } else {
    throw new Error('Invalid Kenyan phone number. Use format 07XXXXXXXX or 2547XXXXXXXX');
  }

  // Safaricom M-Pesa mobiles are typically 2547…; Airtel 2541… also supported on Lipa Na M-Pesa
  if (!/^254[17]\d{8}$/.test(normalized)) {
    throw new Error('Phone number must be a valid Kenyan mobile (07… or 01…)');
  }

  return normalized;
}

export function isValidKenyanPhone(input: string): boolean {
  try {
    normalizeKenyanPhone(input);
    return true;
  } catch {
    return false;
  }
}
