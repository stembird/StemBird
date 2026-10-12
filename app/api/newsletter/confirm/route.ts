import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabaseServiceClient';

function getAdminClient() {
  return createServiceRoleClient();
}

/**
 * GET /api/newsletter/confirm?token=xxx
 * Confirms a newsletter subscription via double opt-in.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/newsletter?error=missing_token', request.url));
    }

    const supabase = getAdminClient();

    const { data: subscriber, error } = await supabase
      .from('email_subscribers')
      .select('id, email, status')
      .eq('confirmation_token', token)
      .maybeSingle();

    if (error) {
      console.error('[Newsletter] Confirm lookup error:', error);
      return NextResponse.redirect(new URL('/newsletter?error=lookup_failed', request.url));
    }

    if (!subscriber) {
      return NextResponse.redirect(new URL('/newsletter?error=invalid_token', request.url));
    }

    if (subscriber.status === 'confirmed') {
      return NextResponse.redirect(new URL('/newsletter/confirmed?status=already', request.url));
    }

    // Confirm the subscription
    const { error: updateError } = await supabase
      .from('email_subscribers')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmation_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriber.id);

    if (updateError) {
      console.error('[Newsletter] Confirm update error:', updateError);
      return NextResponse.redirect(new URL('/newsletter?error=update_failed', request.url));
    }

    return NextResponse.redirect(new URL('/newsletter/confirmed?status=success', request.url));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Newsletter] Confirm error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
