import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabaseServiceClient';
import {
  sendReengagementEmail,
  sendIncompleteApplicationReminder,
  sendEmployerWelcomeEmail,
  sendProfileCompletionNudge,
  sendJobExpiryWarning,
} from '@/lib/email';

/**
 * GET /api/cron/email-automations
 * Runs all enabled email automation rules.
 * Called daily at 8am by Vercel Cron.
 *
 * Auth: CRON_SECRET Bearer token or Vercel Cron auth.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Load all enabled rules
    const { data: rules, error: rulesError } = await supabase
      .from('email_automation_rules')
      .select('*')
      .eq('enabled', true);

    if (rulesError || !rules) {
      return NextResponse.json({ error: 'Failed to load automation rules' }, { status: 500 });
    }

    const results: Record<string, { sent: number; skipped: number; errors: number }> = {};

    for (const rule of rules) {
      const config = (rule.config as Record<string, unknown>) || {};
      let sent = 0;
      let skipped = 0;
      let errors = 0;

      try {
        switch (rule.type) {
          case 'inactive_reengagement':
            ({ sent, skipped, errors } = await runInactiveReengagement(supabase, rule.id, config));
            break;
          case 'incomplete_application':
            ({ sent, skipped, errors } = await runIncompleteApplication(supabase, rule.id, config));
            break;
          case 'job_expiry_warning':
            ({ sent, skipped, errors } = await runJobExpiryWarning(supabase, rule.id, config));
            break;
          case 'employer_welcome':
            ({ sent, skipped, errors } = await runEmployerWelcome(supabase, rule.id, config));
            break;
          case 'profile_completion_nudge':
            ({ sent, skipped, errors } = await runProfileNudge(supabase, rule.id, config));
            break;
        }
      } catch (err) {
        console.error(`[Automation] Error in ${rule.type}:`, err);
        errors++;
      }

      results[rule.type] = { sent, skipped, errors };

      // Update last_run_at
      await supabase
        .from('email_automation_rules')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', rule.id);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Automation] Runner error:', msg);
    return NextResponse.json({ error: 'Automation runner failed' }, { status: 500 });
  }
}

// =====================================================
// HELPERS
// =====================================================

interface RunResult { sent: number; skipped: number; errors: number }

async function wasRecentlySent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
  ruleId: string,
  userId: string,
  withinDays: number
): Promise<boolean> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - withinDays);

  const { count } = await supabase
    .from('email_automation_log')
    .select('*', { count: 'exact', head: true })
    .eq('rule_id', ruleId)
    .eq('user_id', userId)
    .gte('sent_at', cutoff.toISOString());

  return (count || 0) > 0;
}

async function logAutomationSend(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
  ruleId: string,
  userId: string,
  email: string,
  metadata: Record<string, unknown> = {}
) {
  await supabase.from('email_automation_log').insert({
    rule_id: ruleId,
    user_id: userId,
    email,
    metadata,
  });
}

function getUserEmail(authUsers: { id: string; email?: string }[], userId: string): string | null {
  return authUsers.find(u => u.id === userId)?.email || null;
}

function getUserName(profiles: { id: string; full_name: string | null }[], userId: string): string {
  return profiles.find(p => p.id === userId)?.full_name || 'there';
}

// =====================================================
// AUTOMATION: Inactive Re-engagement
// =====================================================
async function runInactiveReengagement(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
  ruleId: string,
  config: Record<string, unknown>
): Promise<RunResult> {
  const daysInactive = (config.days_inactive as number) || 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysInactive);

  // Get users who haven't logged in since cutoff
  const { data: users } = await supabase.auth.admin.listUsers();
  const allUsers = users?.users || [];

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name, role');

  const profileMap = profiles || [];
  let sent = 0, skipped = 0, errors = 0;

  for (const u of allUsers) {
    if (!u.last_sign_in_at || new Date(u.last_sign_in_at) > cutoff) {
      skipped++;
      continue;
    }

    if (await wasRecentlySent(supabase, ruleId, u.id, 30)) {
      skipped++;
      continue;
    }

    const email = u.email;
    if (!email) { skipped++; continue; }

    const daysSince = Math.floor(
      (Date.now() - new Date(u.last_sign_in_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const name = getUserName(profileMap as { id: string; full_name: string | null }[], u.id);

    const result = await sendReengagementEmail(email, name, daysSince, u.id);
    if (result.success) {
      sent++;
      await logAutomationSend(supabase, ruleId, u.id, email, { days_since_login: daysSince });
    } else {
      errors++;
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 200));
  }

  return { sent, skipped, errors };
}

// =====================================================
// AUTOMATION: Incomplete Application
// =====================================================
async function runIncompleteApplication(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
  ruleId: string,
  config: Record<string, unknown>
): Promise<RunResult> {
  const hoursOld = (config.hours_old as number) || 24;
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hoursOld);

  // Find draft applications older than threshold
  // Note: job_applications doesn't have a 'status' field for draft -
  // we look for applications created more than N hours ago with no cover_letter
  const { data: applications } = await supabase
    .from('job_applications')
    .select('id, email, full_name, job_id, created_at, cover_letter')
    .is('cover_letter', null)
    .lt('created_at', cutoff.toISOString());

  if (!applications || applications.length === 0) {
    return { sent: 0, skipped: 0, errors: 0 };
  }

  // Get job titles
  const jobIds = [...new Set(applications.map(a => a.job_id))];
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title')
    .in('id', jobIds);

  const jobMap = new Map((jobs || []).map(j => [j.id, j.title]));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://careersasa.co.ke';

  let sent = 0, skipped = 0, errors = 0;

  // De-duplicate by email (don't send multiple reminders to same person)
  const seenEmails = new Set<string>();

  for (const app of applications) {
    if (!app.email || seenEmails.has(app.email.toLowerCase())) {
      skipped++;
      continue;
    }
    seenEmails.add(app.email.toLowerCase());

    // Check if user has an associated user_id for logging
    const { data: users } = await supabase.auth.admin.listUsers();
    const matchedUser = users?.users?.find(u => u.email === app.email);
    const userId = matchedUser?.id || '';

    if (userId && await wasRecentlySent(supabase, ruleId, userId, 3)) {
      skipped++;
      continue;
    }

    const jobTitle = jobMap.get(app.job_id) || 'the position';
    const appUrl = `${siteUrl}/jobs/${app.job_id}`;
    const name = app.full_name || 'there';

    const result = await sendIncompleteApplicationReminder(app.email as string, name as string, jobTitle as string, appUrl, userId || undefined);
    if (result.success) {
      sent++;
      if (userId) {
        await logAutomationSend(supabase, ruleId, userId, app.email, { application_id: app.id, job_id: app.job_id });
      }
    } else {
      errors++;
    }

    await new Promise(r => setTimeout(r, 200));
  }

  return { sent, skipped, errors };
}

// =====================================================
// AUTOMATION: Job Expiry Warning
// =====================================================
async function runJobExpiryWarning(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
  ruleId: string,
  config: Record<string, unknown>
): Promise<RunResult> {
  const daysBefore = (config.days_before as number) || 7;
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + daysBefore);

  // Find jobs expiring within N days
  const { data: expiringJobs } = await supabase
    .from('jobs')
    .select('id, title, posted_by, expires_at')
    .lte('expires_at', warningDate.toISOString())
    .gt('expires_at', new Date().toISOString())
    .not('expires_at', 'is', null);

  if (!expiringJobs || expiringJobs.length === 0) {
    return { sent: 0, skipped: 0, errors: 0 };
  }

  const { data: users } = await supabase.auth.admin.listUsers();
  const allUsers = users?.users || [];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://careersasa.co.ke';

  let sent = 0, skipped = 0, errors = 0;

  for (const job of expiringJobs) {
    const employerId = job.posted_by;
    if (!employerId) { skipped++; continue; }

    if (await wasRecentlySent(supabase, ruleId, employerId, 7)) {
      skipped++;
      continue;
    }

    const email = getUserEmail(allUsers as { id: string; email?: string }[], employerId);
    if (!email) { skipped++; continue; }

    const daysUntil = Math.ceil(
      (new Date(job.expires_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const renewUrl = `${siteUrl}/dashboard/manage-jobs`;

    const result = await sendJobExpiryWarning(email, job.title, daysUntil, renewUrl, employerId);
    if (result.success) {
      sent++;
      await logAutomationSend(supabase, ruleId, employerId, email, { job_id: job.id, days_until_expiry: daysUntil });
    } else {
      errors++;
    }

    await new Promise(r => setTimeout(r, 200));
  }

  return { sent, skipped, errors };
}

// =====================================================
// AUTOMATION: Employer Welcome
// =====================================================
async function runEmployerWelcome(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
  ruleId: string,
  config: Record<string, unknown>
): Promise<RunResult> {
  const hoursSinceSignup = (config.hours_since_signup as number) || 24;
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hoursSinceSignup);

  // Find employer users created in the last N hours
  const { data: users } = await supabase.auth.admin.listUsers();
  const allUsers = users?.users || [];

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name, role')
    .eq('role', 'employer');

  const employerIds = new Set((profiles || []).map(p => p.id));
  const profileMap = profiles || [];

  let sent = 0, skipped = 0, errors = 0;

  for (const u of allUsers) {
    if (!employerIds.has(u.id)) continue;
    if (new Date(u.created_at) < cutoff) continue; // Too old
    if (!u.email) { skipped++; continue; }

    if (await wasRecentlySent(supabase, ruleId, u.id, 365)) {
      skipped++;
      continue;
    }

    const name = getUserName(profileMap as { id: string; full_name: string | null }[], u.id);

    // Try to get company name
    const { data: companyJobs } = await supabase
      .from('jobs')
      .select('company')
      .eq('posted_by', u.id)
      .limit(1);

    const companyName = companyJobs?.[0]?.company || 'your company';

    const result = await sendEmployerWelcomeEmail(u.email, name, companyName, u.id);
    if (result.success) {
      sent++;
      await logAutomationSend(supabase, ruleId, u.id, u.email, { company: companyName });
    } else {
      errors++;
    }

    await new Promise(r => setTimeout(r, 200));
  }

  return { sent, skipped, errors };
}

// =====================================================
// AUTOMATION: Profile Completion Nudge
// =====================================================
async function runProfileNudge(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
  ruleId: string,
  config: Record<string, unknown>
): Promise<RunResult> {
  const minDays = (config.min_days as number) || 3;
  const threshold = (config.threshold as number) || 60;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - minDays);

  // Get candidate profiles signed up more than N days ago
  const { data: candidates } = await supabase
    .from('candidate_profiles')
    .select('id, user_id, full_name, bio, phone, location, current_title, highest_education_level, linkedin_url, github_url, portfolio_url')
    .lt('created_at', cutoff.toISOString());

  if (!candidates || candidates.length === 0) {
    return { sent: 0, skipped: 0, errors: 0 };
  }

  const { data: users } = await supabase.auth.admin.listUsers();
  const allUsers = users?.users || [];

  let sent = 0, skipped = 0, errors = 0;

  for (const cp of candidates) {
    const userId = cp.user_id;
    const email = getUserEmail(allUsers as { id: string; email?: string }[], userId);
    if (!email) { skipped++; continue; }

    if (await wasRecentlySent(supabase, ruleId, userId, 7)) {
      skipped++;
      continue;
    }

    // Calculate rough profile completion percentage
    const fields = [
      cp.bio, cp.phone, cp.location, cp.current_title,
      cp.highest_education_level, cp.linkedin_url
    ];
    const filledCount = fields.filter(f => f && f.toString().trim().length > 0).length;
    const completionPercent = Math.round((filledCount / fields.length) * 100);

    if (completionPercent >= threshold) {
      skipped++;
      continue;
    }

    const result = await sendProfileCompletionNudge(email, cp.full_name || 'there', completionPercent, userId);
    if (result.success) {
      sent++;
      await logAutomationSend(supabase, ruleId, userId, email, { completion_percent: completionPercent });
    } else {
      errors++;
    }

    await new Promise(r => setTimeout(r, 200));
  }

  return { sent, skipped, errors };
}
