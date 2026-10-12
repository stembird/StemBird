import { NextRequest, NextResponse } from 'next/server';
import { handleMpesaCallback } from '@/lib/mpesa/callback';

/**
 * POST /api/payments/callback
 *
 * Go-live-safe callback path for Daraja STK Push. Path intentionally avoids
 * the strings "mpesa", "m-pesa", and "safaricom", which Daraja's URL
 * registration filter silently drops.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleMpesaCallback(request);
}
