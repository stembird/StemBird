import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { sendCampaignEmail } from '@/lib/email';

/**
 * POST /api/emails/send
 * Admin-triggered campaign send. Requires admin auth.
 * Body: { campaign_id }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.ok === false) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }
    const { adminClient } = auth;

    const body = await request.json();
    const { campaign_id } = body;

    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 });
    }

    // Fetch the campaign
    const { data: campaign, error: campaignError } = await adminClient
      .from('email_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return NextResponse.json({ error: `Campaign cannot be sent (status: ${campaign.status})` }, { status: 400 });
    }

    // Mark campaign as sending
    await adminClient
      .from('email_campaigns')
      .update({ status: 'sending' })
      .eq('id', campaign_id);

    // Get confirmed subscribers
    const { data: subscribers } = await adminClient
      .from('email_subscribers')
      .select('id, email, unsubscribe_token')
      .eq('status', 'confirmed');

    if (!subscribers || subscribers.length === 0) {
      await adminClient
        .from('email_campaigns')
        .update({ status: 'sent', sent_at: new Date().toISOString(), sent_count: 0 })
        .eq('id', campaign_id);

      return NextResponse.json({ message: 'No subscribers to send to', sent: 0 });
    }

    // Send emails (batch to respect rate limits)
    let sentCount = 0;
    let failedCount = 0;
    const batchSize = 5; // Resend free tier: be conservative

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (sub) => {
          const result = await sendCampaignEmail(
            sub.email,
            campaign.subject,
            campaign.html_body,
            campaign_id,
            sub.unsubscribe_token
          );

          if (result.success) {
            sentCount++;
          } else {
            failedCount++;
          }
        })
      );

      // Small delay between batches
      if (i + batchSize < subscribers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update campaign status
    await adminClient
      .from('email_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_count: sentCount,
        failed_count: failedCount,
      })
      .eq('id', campaign_id);

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      total: subscribers.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] Campaign send error:', msg);
    return NextResponse.json({ error: 'Failed to send campaign' }, { status: 500 });
  }
}
