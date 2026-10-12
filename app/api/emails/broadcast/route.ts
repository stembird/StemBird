import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/adminAuth';
import { sendEmail } from '@/lib/email';

/**
 * POST /api/emails/broadcast
 * Admin-triggered broadcast to filtered users. Requires admin auth.
 * Body: {
 *   subject: string,
 *   html_body: string,
 *   subject_b?: string,          // optional A/B variant
 *   filters: {
 *     role?: 'candidate' | 'employer' | 'admin',
 *     location?: string,
 *     applied_to_job_id?: string,
 *     company_id?: string,
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.ok === false) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }
    const { adminClient, user } = auth;

    // Parse body
    const body = await request.json();
    const { subject, html_body, subject_b, filters = {} } = body;

    if (!subject || !html_body) {
      return NextResponse.json({ error: 'subject and html_body are required' }, { status: 400 });
    }

    // Build recipient list from filters
    const recipients = await getRecipients(adminClient, filters);

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients match the selected filters' }, { status: 400 });
    }

    // Create campaign record
    const { data: campaign, error: campaignErr } = await adminClient
      .from('email_campaigns')
      .insert({
        title: `Broadcast: ${subject}`,
        subject,
        html_body,
        campaign_type: 'broadcast',
        target_audience: filters,
        subject_b: subject_b || null,
        status: 'sending',
        created_by: user.id,
      })
      .select()
      .single();

    if (campaignErr || !campaign) {
      return NextResponse.json({ error: 'Failed to create campaign record' }, { status: 500 });
    }

    // A/B split: if subject_b provided, split recipients in half
    const abTest = !!subject_b;
    const halfIndex = abTest ? Math.ceil(recipients.length / 2) : recipients.length;

    let sentCount = 0;
    let failedCount = 0;
    const batchSize = 5;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (recipient, batchIdx) => {
          const globalIdx = i + batchIdx;
          const useSubjectB = abTest && globalIdx >= halfIndex;
          const emailSubject = useSubjectB ? subject_b! : subject;

          const result = await sendEmail({
            to: recipient.email,
            subject: emailSubject,
            html: html_body,
            emailType: 'broadcast',
            userId: recipient.user_id,
            campaignId: campaign.id,
            metadata: { ab_variant: useSubjectB ? 'B' : 'A' },
          });

          if (result.success) {
            sentCount++;
          } else {
            failedCount++;
          }
        })
      );

      // Rate limit: small delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update campaign
    await adminClient
      .from('email_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_count: sentCount,
        failed_count: failedCount,
      })
      .eq('id', campaign.id);

    return NextResponse.json({
      success: true,
      campaign_id: campaign.id,
      sent: sentCount,
      failed: failedCount,
      total: recipients.length,
      ab_test: abTest,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] Broadcast error:', msg);
    return NextResponse.json({ error: 'Failed to send broadcast' }, { status: 500 });
  }
}

/**
 * GET /api/emails/broadcast?role=...&location=...
 * Count recipients matching filters (for preview before sending).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.ok === false) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      role: searchParams.get('role') || undefined,
      location: searchParams.get('location') || undefined,
      applied_to_job_id: searchParams.get('applied_to_job_id') || undefined,
      company_id: searchParams.get('company_id') || undefined,
    };

    const recipients = await getRecipients(auth.adminClient, filters);

    return NextResponse.json({
      count: recipients.length,
      filters,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] Broadcast count error:', msg);
    return NextResponse.json({ error: 'Failed to count recipients' }, { status: 500 });
  }
}

// =====================================================
// RECIPIENT BUILDER
// =====================================================

interface Recipient {
  email: string;
  user_id: string;
  name: string;
}

interface BroadcastFilters {
  role?: string;
  location?: string;
  applied_to_job_id?: string;
  company_id?: string;
}

async function getRecipients(
  adminClient: SupabaseClient,
  filters: BroadcastFilters
): Promise<Recipient[]> {
  // Build base query: user_profiles joined with auth.users email
  let query = adminClient
    .from('user_profiles')
    .select('id, full_name, role');

  if (filters.role) {
    query = query.eq('role', filters.role);
  }

  const { data: profiles, error } = await query;
  if (error || !profiles) return [];

  // Get user emails via auth.users (service role can access)
  const userIds = profiles.map(p => p.id);
  if (userIds.length === 0) return [];

  // Fetch emails from auth.users
  const { data: authUsers } = await adminClient.auth.admin.listUsers();
  const emailMap = new Map<string, string>();
  if (authUsers?.users) {
    for (const u of authUsers.users) {
      emailMap.set(u.id, u.email || '');
    }
  }

  let results: Recipient[] = profiles
    .map(p => ({
      user_id: p.id,
      name: p.full_name || 'there',
      email: emailMap.get(p.id) || '',
    }))
    .filter(r => r.email);

  // Location filter: cross-reference with candidate_profiles
  if (filters.location) {
    const candidateIds = results.map(r => r.user_id);
    const { data: candidates } = await adminClient
      .from('candidate_profiles')
      .select('user_id, location')
      .in('user_id', candidateIds)
      .ilike('location', `%${filters.location}%`);

    const locationUserIds = new Set((candidates || []).map(c => c.user_id));
    results = results.filter(r => locationUserIds.has(r.user_id));
  }

  // Applied to job filter
  if (filters.applied_to_job_id) {
    const { data: applications } = await adminClient
      .from('job_applications')
      .select('candidate_profile_id, email')
      .eq('job_id', filters.applied_to_job_id);

    const applicantEmails = new Set((applications || []).map(a => a.email).filter(Boolean));
    const applicantCpIds = new Set((applications || []).map(a => a.candidate_profile_id).filter(Boolean));

    // Also get candidate_profiles to map user_id
    const cpIds = Array.from(applicantCpIds);
    const cpToUserId = new Map<string, string>();
    if (cpIds.length > 0) {
      const { data: cps } = await adminClient
        .from('candidate_profiles')
        .select('id, user_id')
        .in('id', cpIds);
      if (cps) {
        for (const cp of cps) {
          cpToUserId.set(cp.id, cp.user_id);
        }
      }
    }

    const applicantUserIds = new Set<string>();
    for (const cpId of applicantCpIds) {
      const uid = cpToUserId.get(cpId);
      if (uid) applicantUserIds.add(uid);
    }

    results = results.filter(r =>
      applicantUserIds.has(r.user_id) || applicantEmails.has(r.email)
    );
  }

  // Company filter: employers who posted jobs at this company
  if (filters.company_id) {
    const { data: companyJobs } = await adminClient
      .from('jobs')
      .select('posted_by')
      .eq('company_id', filters.company_id);

    const employerIds = new Set(
      (companyJobs || []).map(j => j.posted_by).filter(Boolean)
    );

    results = results.filter(r => employerIds.has(r.user_id));
  }

  // De-duplicate by email
  const seen = new Set<string>();
  return results.filter(r => {
    const lower = r.email.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}
