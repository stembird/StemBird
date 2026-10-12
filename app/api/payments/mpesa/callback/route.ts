import { NextRequest, NextResponse } from 'next/server';
import { handleMpesaCallback } from '@/lib/mpesa/callback';

/**
 * POST /api/payments/mpesa/callback
 *
 * Legacy sandbox callback path. Kept working during the transition; production
 * should use POST /api/payments/callback (Daraja's URL filter drops paths
 * containing "mpesa"/"safaricom" at go-live).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleMpesaCallback(request);
}
