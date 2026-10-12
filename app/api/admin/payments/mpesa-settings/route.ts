import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { clearMpesaTokenCache, isMpesaConfigured } from '@/lib/mpesa';
import { loadMpesaSettings, parseMpesaSettings, saveMpesaSettings } from '@/lib/pricing/catalog';

export const runtime = 'nodejs';

/**
 * GET /api/admin/payments/mpesa-settings
 * PUT /api/admin/payments/mpesa-settings
 *
 * Lets admins switch sandbox vs live and choose Send Money / Buy Goods / STK Push.
 * Daraja secrets stay in environment variables (optionally MPESA_SANDBOX_* / MPESA_PRODUCTION_*).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const settings = await loadMpesaSettings(auth.adminClient);
  return NextResponse.json({
    settings,
    stkConfigured: isMpesaConfigured(settings),
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = parseMpesaSettings(body.settings || body);
    const settings = await saveMpesaSettings(auth.adminClient, parsed);
    clearMpesaTokenCache();
    return NextResponse.json({
      settings,
      stkConfigured: isMpesaConfigured(settings),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to save M-Pesa settings';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
