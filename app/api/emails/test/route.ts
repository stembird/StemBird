import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { sendTestEmail } from '@/lib/email';

/**
 * POST /api/emails/test
 * Send a test email. Admin only.
 * Body: { to?: string } (defaults to admin email)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.ok === false) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const to = body.to || auth.user.email;

    if (!to) {
      return NextResponse.json({ error: 'No recipient email specified' }, { status: 400 });
    }

    const result = await sendTestEmail(to);

    return NextResponse.json({
      success: result.success,
      message: result.success ? `Test email sent to ${to}` : `Failed: ${result.error}`,
      provider_id: result.providerId,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] Test email error:', msg);
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
  }
}
