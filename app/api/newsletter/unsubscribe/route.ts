import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabaseServiceClient';

function getAdminClient() {
  return createServiceRoleClient();
}

/**
 * GET /api/newsletter/unsubscribe?token=xxx
 * Called from the unsubscribe link in marketing emails.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    const supabase = getAdminClient();

    // Find by token or email
    let query = supabase.from('email_subscribers').select('id, email, status');
    if (token) {
      query = query.eq('unsubscribe_token', token);
    } else if (email) {
      query = query.ilike('email', email);
    } else {
      return NextResponse.json({ error: 'Token or email is required' }, { status: 400 });
    }

    const { data: subscriber, error } = await query.maybeSingle();

    if (error) {
      console.error('[Newsletter] Unsubscribe lookup error:', error);
      return NextResponse.json({ error: 'Failed to process unsubscribe' }, { status: 500 });
    }

    if (!subscriber) {
      return NextResponse.redirect(new URL('/newsletter/unsubscribed?status=not_found', request.url));
    }

    if (subscriber.status === 'unsubscribed') {
      return NextResponse.redirect(new URL('/newsletter/unsubscribed?status=already', request.url));
    }

    // Unsubscribe
    const { error: updateError } = await supabase
      .from('email_subscribers')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriber.id);

    if (updateError) {
      console.error('[Newsletter] Unsubscribe update error:', updateError);
      return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
    }

    return NextResponse.redirect(new URL('/newsletter/unsubscribed?status=success', request.url));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Newsletter] Unsubscribe error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/newsletter/unsubscribe
 * Body: { email } or { token }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email } = body;

    if (!token && !email) {
      return NextResponse.json({ error: 'Token or email is required' }, { status: 400 });
    }

    const supabase = getAdminClient();

    let query = supabase.from('email_subscribers').select('id, status');
    if (token) {
      query = query.eq('unsubscribe_token', token);
    } else {
      query = query.ilike('email', email);
    }

    const { data: subscriber } = await query.maybeSingle();

    if (!subscriber) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    await supabase
      .from('email_subscribers')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriber.id);

    return NextResponse.json({ message: 'Successfully unsubscribed', success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Newsletter] Unsubscribe error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
