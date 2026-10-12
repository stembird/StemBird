import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabaseServiceClient';

/**
 * POST /api/emails/webhooks/resend
 * Handles Resend webhook events for bounce/complaint/delivery/open tracking.
 *
 * Resend webhook payload:
 * {
 *   type: "email.bounced" | "email.complained" | "email.delivered" | "email.opened",
 *   data: {
 *     email_id: string,
 *     from: string,
 *     to: string[],
 *     created_at: string,
 *     // ... other fields
 *   }
 * }
 *
 * Setup: Go to Resend Dashboard > Webhooks > Add webhook
 * URL: https://careersasa.co.ke/api/emails/webhooks/resend
 * Events: email.bounced, email.complained, email.delivered, email.opened
 */

function getAdminClient() {
  return createServiceRoleClient();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    const emailId = data.email_id as string;
    const recipients = (data.to || []) as string[];
    const recipientEmail = recipients[0] || '';

    switch (type) {
      case 'email.bounced':
        await handleBounce(adminClient, emailId, recipientEmail, data);
        break;

      case 'email.complained':
        await handleComplaint(adminClient, emailId, recipientEmail);
        break;

      case 'email.delivered':
        await handleDelivered(adminClient, emailId);
        break;

      case 'email.opened':
        await handleOpened(adminClient, emailId, data);
        break;

      default:
        // Ignore unknown event types
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Webhook] Resend webhook error:', msg);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// =====================================================
// EVENT HANDLERS
// =====================================================

async function handleBounce(
  adminClient: ReturnType<typeof getAdminClient>,
  emailId: string,
  recipientEmail: string,
  data: Record<string, unknown>
) {
  console.log(`[Webhook] Bounce: ${recipientEmail} (${emailId})`);

  // Update email_logs status
  await adminClient
    .from('email_logs')
    .update({ status: 'bounced', error_message: JSON.stringify(data.reason || 'Bounced') })
    .eq('provider_id', emailId);

  // Mark subscriber as bounced
  if (recipientEmail) {
    await adminClient
      .from('email_subscribers')
      .update({ status: 'bounced', updated_at: new Date().toISOString() })
      .eq('email', recipientEmail);
  }

  // Increment bounce count on campaign
  const { data: logs } = await adminClient
    .from('email_logs')
    .select('campaign_id')
    .eq('provider_id', emailId)
    .limit(1);

  if (logs?.[0]?.campaign_id) {
    const campaignId = logs[0].campaign_id;
    const { data: campaign } = await adminClient
      .from('email_campaigns')
      .select('bounce_count')
      .eq('id', campaignId)
      .single();

    if (campaign) {
      await adminClient
        .from('email_campaigns')
        .update({ bounce_count: (campaign.bounce_count || 0) + 1 })
        .eq('id', campaignId);
    }
  }
}

async function handleComplaint(
  adminClient: ReturnType<typeof getAdminClient>,
  emailId: string,
  recipientEmail: string
) {
  console.log(`[Webhook] Complaint: ${recipientEmail} (${emailId})`);

  // Auto-unsubscribe on complaint
  if (recipientEmail) {
    await adminClient
      .from('email_subscribers')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('email', recipientEmail);
  }

  // Update log
  await adminClient
    .from('email_logs')
    .update({ status: 'failed', error_message: 'Recipient complained' })
    .eq('provider_id', emailId);
}

async function handleDelivered(
  adminClient: ReturnType<typeof getAdminClient>,
  emailId: string
) {
  // Update email_logs status to delivered
  await adminClient
    .from('email_logs')
    .update({ status: 'delivered' })
    .eq('provider_id', emailId);
}

async function handleOpened(
  adminClient: ReturnType<typeof getAdminClient>,
  emailId: string,
  data: Record<string, unknown>
) {
  // Update email_logs status to opened
  await adminClient
    .from('email_logs')
    .update({ status: 'opened' })
    .eq('provider_id', emailId);

  // Get campaign_id and metadata for A/B tracking
  const { data: logs } = await adminClient
    .from('email_logs')
    .select('campaign_id, metadata')
    .eq('provider_id', emailId)
    .limit(1);

  if (!logs?.[0]?.campaign_id) return;

  const campaignId = logs[0].campaign_id;
  const metadata = (logs[0].metadata as Record<string, unknown>) || {};
  const abVariant = metadata.ab_variant as string | undefined;

  // Increment open count
  await adminClient
    .from('email_campaigns')
    .select('open_count, ab_opens_a, ab_opens_b, ab_test_sample_size, sent_count, ab_winner_subject, subject, subject_b')
    .eq('id', campaignId)
    .single()
    .then(async ({ data: campaign }) => {
      if (!campaign) return;

      const updates: Record<string, unknown> = {
        open_count: (campaign.open_count || 0) + 1,
      };

      // Track A/B opens
      if (abVariant === 'A') {
        updates.ab_opens_a = (campaign.ab_opens_a || 0) + 1;
      } else if (abVariant === 'B') {
        updates.ab_opens_b = (campaign.ab_opens_b || 0) + 1;
      }

      await adminClient
        .from('email_campaigns')
        .update(updates)
        .eq('id', campaignId);

      // Auto-pick A/B winner if sample size reached
      if (
        campaign.subject_b &&
        !campaign.ab_winner_subject &&
        campaign.sent_count &&
        campaign.sent_count >= (campaign.ab_test_sample_size || 100) * 2
      ) {
        const opensA = campaign.ab_opens_a || 0;
        const opensB = campaign.ab_opens_b || 0;

        if (opensA > 0 || opensB > 0) {
          const winner = opensA >= opensB ? campaign.subject : campaign.subject_b;
          await adminClient
            .from('email_campaigns')
            .update({ ab_winner_subject: winner })
            .eq('id', campaignId);
        }
      }
    });
}
