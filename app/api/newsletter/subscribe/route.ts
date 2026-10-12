import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabaseServiceClient';
import { sendNewsletterWelcome } from '@/lib/email';

function getAdminClient() {
  return createServiceRoleClient();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Check if subscriber already exists
    const { data: existing } = await supabase
      .from('email_subscribers')
      .select('id, status')
      .ilike('email', email)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'confirmed') {
        return NextResponse.json({
          message: 'You are already subscribed!',
          already_subscribed: true,
          redirect_url: '/toolkit',
        });
      }
      if (existing.status === 'unsubscribed') {
        // Re-subscribe as confirmed immediately
        await supabase
          .from('email_subscribers')
          .update({
            status: 'confirmed' as string,
            confirmation_token: null,
            unsubscribed_at: null,
            confirmed_at: new Date().toISOString(),
            name: name || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        // Fire welcome email (non-blocking)
        sendNewsletterWelcome(email, name).catch((err) =>
          console.error('[Newsletter] Welcome email failed (re-subscribe):', err)
        );

        return NextResponse.json({
          message: 'Welcome back! Your subscription is confirmed.',
          redirect_url: '/toolkit',
        });
      }
      // Was pending — auto-confirm now
      await supabase
        .from('email_subscribers')
        .update({
          status: 'confirmed' as string,
          confirmation_token: null,
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      sendNewsletterWelcome(email, name).catch((err) =>
        console.error('[Newsletter] Welcome email failed (pending→confirmed):', err)
      );

      return NextResponse.json({
        message: "You're all set! Access your free toolkit now.",
        redirect_url: '/toolkit',
      });
    }

    // Create new subscriber — auto-confirmed (no double opt-in)
    const { error: insertError } = await supabase.from('email_subscribers').insert({
      email: email.toLowerCase(),
      name: name || null,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      source: 'website',
    });

    if (insertError) {
      console.error('[Newsletter] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to subscribe. Please try again.' }, { status: 500 });
    }

    // Fire welcome email (non-blocking so response is fast)
    sendNewsletterWelcome(email, name).catch((err) =>
      console.error('[Newsletter] Welcome email failed:', err)
    );

    return NextResponse.json({
      message: "You're subscribed! Access your free toolkit now.",
      redirect_url: '/toolkit',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Newsletter] Subscribe error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
