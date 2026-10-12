import { Resend } from 'resend';
import { supabase } from '@/integrations/supabase/client';

// Initialize Resend client (server-side only)
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }
  resendClient = new Resend(apiKey);
  return resendClient;
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'info@careersasa.co.ke';
}

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://careersasa.co.ke';
}

// =====================================================
// TYPES
// =====================================================

export type EmailType =
  | 'transactional'
  | 'marketing'
  | 'job_alert'
  | 'weekly_digest'
  | 'welcome'
  | 'password_reset'
  | 'application_status'
  | 'new_message'
  | 'newsletter'
  | 'confirmation'
  | 'campaign'
  | 'broadcast'
  | 'reengagement'
  | 'reminder'
  | 'employer_welcome'
  | 'profile_nudge'
  | 'job_expiry';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  emailType: EmailType;
  userId?: string;
  campaignId?: string;
  metadata?: Record<string, unknown>;
}

export interface SendEmailResult {
  success: boolean;
  providerId?: string;
  error?: string;
}

export interface EmailPreferences {
  transactional_emails: boolean;
  marketing_emails: boolean;
  job_alert_emails: boolean;
  weekly_digest: boolean;
}

// =====================================================
// CORE SEND FUNCTION
// =====================================================

/**
 * Send an email via Resend and log it to the database.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, html, text, emailType, userId, campaignId, metadata } = params;

  try {
    const resend = getResendClient();
    const from = getFromEmail();

    const { data, error } = await resend.emails.send({
      from: `CareerSasa <${from}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || undefined,
    });

    if (error) {
      console.error('[Email] Resend API error:', error);
      await logEmail({
        recipient_email: Array.isArray(to) ? to.join(',') : to,
        email_type: emailType,
        subject,
        status: 'failed',
        error_message: error.message,
        user_id: userId,
        campaign_id: campaignId,
        metadata,
      });
      return { success: false, error: error.message };
    }

    // Log successful send
    await logEmail({
      recipient_email: Array.isArray(to) ? to.join(',') : to,
      email_type: emailType,
      subject,
      status: 'sent',
      provider_id: data?.id,
      user_id: userId,
      campaign_id: campaignId,
      sent_at: new Date().toISOString(),
      metadata,
    });

    return { success: true, providerId: data?.id };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] Send failed:', errorMsg);

    await logEmail({
      recipient_email: Array.isArray(to) ? to.join(',') : to,
      email_type: emailType,
      subject,
      status: 'failed',
      error_message: errorMsg,
      user_id: userId,
      campaign_id: campaignId,
      metadata,
    });

    return { success: false, error: errorMsg };
  }
}

// =====================================================
// EMAIL LOGGING
// =====================================================

interface LogEmailParams {
  recipient_email: string;
  email_type: EmailType;
  subject: string;
  status: string;
  provider_id?: string;
  error_message?: string;
  user_id?: string;
  campaign_id?: string;
  sent_at?: string;
  metadata?: Record<string, unknown>;
}

async function logEmail(params: LogEmailParams): Promise<void> {
  try {
    const { createServiceRoleClient } = await import('@/lib/supabaseServiceClient');
    const adminClient = createServiceRoleClient();

    await adminClient.from('email_logs').insert({
      recipient_email: params.recipient_email,
      email_type: params.email_type,
      subject: params.subject,
      status: params.status,
      provider: 'resend',
      provider_id: params.provider_id || null,
      error_message: params.error_message || null,
      user_id: params.user_id || null,
      campaign_id: params.campaign_id || null,
      sent_at: params.sent_at || null,
      metadata: params.metadata || {},
    });
  } catch (error) {
    // Don't fail the email send because logging failed
    console.error('[Email] Failed to log email:', error);
  }
}

// =====================================================
// PREFERENCE CHECKING
// =====================================================

/**
 * Check if a user has opted in to a specific email type.
 * Transactional emails are always sent (opt-out not allowed).
 */
export async function shouldSendEmail(userId: string, emailType: EmailType): Promise<boolean> {
  // Transactional emails always go
  const alwaysSend: EmailType[] = ['transactional', 'password_reset', 'application_status', 'new_message', 'confirmation'];
  if (alwaysSend.includes(emailType)) return true;

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('transactional_emails, marketing_emails, job_alert_emails, weekly_digest')
      .eq('id', userId)
      .single();

    if (error || !data) return true; // Default to sending if we can't check

    const prefs = data as unknown as EmailPreferences;

    switch (emailType) {
      case 'welcome':
        return prefs.transactional_emails;
      case 'marketing':
      case 'newsletter':
      case 'campaign':
        return prefs.marketing_emails;
      case 'job_alert':
        return prefs.job_alert_emails;
      case 'weekly_digest':
        return prefs.weekly_digest;
      default:
        return prefs.transactional_emails;
    }
  } catch {
    return true; // Default to sending
  }
}

// =====================================================
// TRANSACTIONAL EMAIL HELPERS
// =====================================================

/**
 * Send a welcome email to a new user.
 */
export async function sendWelcomeEmail(to: string, name: string, userId?: string): Promise<SendEmailResult> {
  const siteUrl = getSiteUrl();
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
          <img src="${siteUrl}/logo.png" alt="CareerSasa" style="width:60px;height:60px;margin-bottom:10px;" />
          <h1 style="margin:0;font-size:24px;">Welcome to CareerSasa!</h1>
        </td></tr>
        <tr><td style="padding:30px;">
          <p>Hi ${escapeHtml(name || 'there')},</p>
          <p>Welcome aboard! Your CareerSasa account is ready. Here's what you can do:</p>
          <ul style="line-height:2;">
            <li>Browse hundreds of job opportunities across Kenya</li>
            <li>Set up personalized job alerts</li>
            <li>Track your applications in one dashboard</li>
            <li>Access free career tools (CV builder, cover letter generator)</li>
          </ul>
          <p style="text-align:center;margin:30px 0;">
            <a href="${siteUrl}/jobs" style="display:inline-block;padding:12px 30px;background:#0A66C2;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Browse Jobs</a>
          </p>
          <p style="text-align:center;margin:10px 0;">
            <a href="${siteUrl}/dashboard/profile" style="display:inline-block;padding:12px 30px;background:#E8712B;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Complete Your Profile</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
          <p>&copy; ${new Date().getFullYear()} CareerSasa. All rights reserved.</p>
          <p><a href="${siteUrl}/dashboard/preferences" style="color:#666;">Email Preferences</a> | <a href="${siteUrl}/privacy" style="color:#666;">Privacy Policy</a></p>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({ to, subject: 'Welcome to CareerSasa - Start Your Job Search!', html, emailType: 'welcome', userId });
}

/**
 * Send an application confirmation to the candidate.
 */
export async function sendApplicationConfirmation(
  to: string, name: string, jobTitle: string, companyName: string, userId?: string
): Promise<SendEmailResult> {
  const siteUrl = getSiteUrl();
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
          <img src="${siteUrl}/logo.png" alt="CareerSasa" style="width:60px;height:60px;margin-bottom:10px;" />
          <h1 style="margin:0;font-size:24px;">Application Submitted!</h1>
        </td></tr>
        <tr><td style="padding:30px;">
          <p>Hi ${escapeHtml(name)},</p>
          <p>Your application has been successfully submitted:</p>
          <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #0A66C2;">
            <h3 style="margin:0 0 10px;">${escapeHtml(jobTitle)}</h3>
            <p style="margin:0;color:#666;">at ${escapeHtml(companyName)}</p>
          </div>
          <p>The employer will review your application and you'll be notified of any status changes.</p>
          <p style="text-align:center;margin:30px 0;">
            <a href="${siteUrl}/dashboard/applications" style="display:inline-block;padding:12px 30px;background:#0A66C2;color:white;text-decoration:none;border-radius:6px;">Track Applications</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
          <p>&copy; ${new Date().getFullYear()} CareerSasa. All rights reserved.</p>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({ to, subject: `Application Submitted: ${jobTitle} at ${companyName}`, html, emailType: 'transactional', userId });
}

/**
 * Send application status update to candidate.
 */
export async function sendApplicationStatusUpdate(
  to: string, name: string, jobTitle: string, companyName: string, status: string, message?: string, userId?: string
): Promise<SendEmailResult> {
  const siteUrl = getSiteUrl();
  const statusColors: Record<string, string> = {
    reviewing: '#3b82f6', shortlisted: '#8b5cf6', interviewed: '#6366f1',
    offered: '#10b981', rejected: '#ef4444', accepted: '#059669', pending: '#f59e0b',
  };
  const color = statusColors[status] || '#6b7280';

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
          <img src="${siteUrl}/logo.png" alt="CareerSasa" style="width:60px;height:60px;margin-bottom:10px;" />
          <h1 style="margin:0;font-size:24px;">Application Status Update</h1>
        </td></tr>
        <tr><td style="padding:30px;">
          <p>Hi ${escapeHtml(name)},</p>
          <p>There's been an update on your application:</p>
          <div style="background:${color};color:white;padding:15px;border-radius:8px;text-align:center;margin:20px 0;">
            <h2 style="margin:0;">${escapeHtml(status.charAt(0).toUpperCase() + status.slice(1))}</h2>
          </div>
          <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:15px 0;">
            <h3 style="margin:0 0 10px;">${escapeHtml(jobTitle)}</h3>
            <p style="margin:0;color:#666;">at ${escapeHtml(companyName)}</p>
          </div>
          ${message ? `<div style="background:#fff3cd;padding:15px;border-radius:8px;margin:15px 0;border-left:4px solid #f59e0b;"><p style="margin:0;"><strong>Message from employer:</strong> ${escapeHtml(message)}</p></div>` : ''}
          <p style="text-align:center;margin:30px 0;">
            <a href="${siteUrl}/dashboard/applications" style="display:inline-block;padding:12px 30px;background:#0A66C2;color:white;text-decoration:none;border-radius:6px;">View Details</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
          <p>&copy; ${new Date().getFullYear()} CareerSasa. All rights reserved.</p>
          <p><a href="${siteUrl}/dashboard/preferences" style="color:#666;">Email Preferences</a></p>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({ to, subject: `Application Update: ${jobTitle} - ${status.charAt(0).toUpperCase() + status.slice(1)}`, html, emailType: 'application_status', userId });
}

/**
 * Send new application notification to employer.
 */
export async function sendEmployerNewApplication(
  to: string, employerName: string, jobTitle: string, candidateName: string, userId?: string
): Promise<SendEmailResult> {
  const siteUrl = getSiteUrl();
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
          <img src="${siteUrl}/logo.png" alt="CareerSasa" style="width:60px;height:60px;margin-bottom:10px;" />
          <h1 style="margin:0;font-size:24px;">New Application Received</h1>
        </td></tr>
        <tr><td style="padding:30px;">
          <p>Hi ${escapeHtml(employerName)},</p>
          <p>You have a new application for:</p>
          <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #10b981;">
            <h3 style="margin:0 0 10px;">${escapeHtml(jobTitle)}</h3>
            <p style="margin:0;"><strong>Candidate:</strong> ${escapeHtml(candidateName)}</p>
          </div>
          <p style="text-align:center;margin:30px 0;">
            <a href="${siteUrl}/dashboard/manage-jobs" style="display:inline-block;padding:12px 30px;background:#0A66C2;color:white;text-decoration:none;border-radius:6px;">Review Applications</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
          <p>&copy; ${new Date().getFullYear()} CareerSasa. All rights reserved.</p>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({ to, subject: `New Application: ${candidateName} for ${jobTitle}`, html, emailType: 'transactional', userId });
}

/**
 * Send new message notification.
 */
export async function sendNewMessageEmail(
  to: string, recipientName: string, senderName: string, jobTitle: string, messagePreview: string, userId?: string
): Promise<SendEmailResult> {
  const siteUrl = getSiteUrl();
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
          <img src="${siteUrl}/logo.png" alt="CareerSasa" style="width:60px;height:60px;margin-bottom:10px;" />
          <h1 style="margin:0;font-size:24px;">New Message</h1>
        </td></tr>
        <tr><td style="padding:30px;">
          <p>Hi ${escapeHtml(recipientName)},</p>
          <p>You have a new message regarding <strong>${escapeHtml(jobTitle)}</strong>:</p>
          <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #0A66C2;">
            <p style="margin:0 0 10px;color:#666;">From: <strong>${escapeHtml(senderName)}</strong></p>
            <p style="margin:0;">${escapeHtml(messagePreview)}</p>
          </div>
          <p style="text-align:center;margin:30px 0;">
            <a href="${siteUrl}/dashboard/messages" style="display:inline-block;padding:12px 30px;background:#0A66C2;color:white;text-decoration:none;border-radius:6px;">View Conversation</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
          <p>&copy; ${new Date().getFullYear()} CareerSasa. All rights reserved.</p>
          <p><a href="${siteUrl}/dashboard/preferences" style="color:#666;">Email Preferences</a></p>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({ to, subject: `New Message from ${senderName} - ${jobTitle}`, html, emailType: 'new_message', userId });
}

/**
 * Send password reset email.
 */
export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<SendEmailResult> {
  const siteUrl = getSiteUrl();
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
          <img src="${siteUrl}/logo.png" alt="CareerSasa" style="width:60px;height:60px;margin-bottom:10px;" />
          <h1 style="margin:0;font-size:24px;">Password Reset</h1>
        </td></tr>
        <tr><td style="padding:30px;">
          <p>Hi there,</p>
          <p>We received a request to reset your password. Click the button below to set a new password:</p>
          <p style="text-align:center;margin:30px 0;">
            <a href="${escapeHtml(resetLink)}" style="display:inline-block;padding:12px 30px;background:#E8712B;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Reset Password</a>
          </p>
          <p style="color:#666;font-size:14px;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
          <p>&copy; ${new Date().getFullYear()} CareerSasa. All rights reserved.</p>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({ to, subject: 'Reset Your CareerSasa Password', html, emailType: 'password_reset' });
}

// =====================================================
// NEWSLETTER / SUBSCRIPTION HELPERS
// =====================================================

/**
 * Send double opt-in confirmation email to a new subscriber.
 */
export async function sendSubscriptionConfirmation(to: string, confirmToken: string, name?: string): Promise<SendEmailResult> {
  const siteUrl = getSiteUrl();
  const confirmUrl = `${siteUrl}/api/newsletter/confirm?token=${confirmToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
          <img src="${siteUrl}/logo.png" alt="CareerSasa" style="width:60px;height:60px;margin-bottom:10px;" />
          <h1 style="margin:0;font-size:24px;">Confirm Your Subscription</h1>
        </td></tr>
        <tr><td style="padding:30px;">
          <p>Hi ${escapeHtml(name || 'there')},</p>
          <p>Thanks for subscribing to CareerSasa! Please confirm your email address to start receiving:</p>
          <ul style="line-height:2;">
            <li>Weekly featured job picks</li>
            <li>Salary insights and career tips</li>
            <li>Free career tools and templates</li>
          </ul>
          <p style="text-align:center;margin:30px 0;">
            <a href="${confirmUrl}" style="display:inline-block;padding:12px 30px;background:#0A66C2;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Confirm &amp; Get Your Free Toolkit</a>
          </p>
          <div style="background:#f0f7ff;border:1px solid #0A66C2;border-radius:8px;padding:20px;margin:20px 0;">
            <p style="margin:0 0 10px;font-weight:bold;color:#0A66C2;">🎁 Your Free Toolkit Includes:</p>
            <ul style="margin:0;padding-left:20px;line-height:1.8;">
              <li>Professional CV template (ATS-friendly)</li>
              <li>Cover letter template that gets read</li>
              <li>Interview prep checklist</li>
              <li>Salary negotiation script</li>
            </ul>
            <p style="margin:10px 0 0;font-size:14px;color:#666;">Once confirmed, your download link will appear on the confirmation page.</p>
          </div>
          <p style="color:#666;font-size:14px;">If you didn't subscribe, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
          <p>&copy; ${new Date().getFullYear()} CareerSasa. All rights reserved.</p>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({ to, subject: 'Confirm Your CareerSasa Newsletter Subscription', html, emailType: 'confirmation' });
}

/**
 * Send a welcome email to a new newsletter subscriber (auto-confirmed, no double opt-in).
 * Includes direct link to the free toolkit page.
 * Subject/HTML are loaded from the managed "popup_newsletter_welcome" template when available.
 */
export async function sendNewsletterWelcome(to: string, name?: string): Promise<SendEmailResult> {
  const siteUrl = getSiteUrl();
  const displayName = escapeHtml(name || 'there');
  const toolkitUrl = `${siteUrl}/toolkit`;
  const unsubscribeUrl = `${siteUrl}/newsletter/unsubscribe?email=${encodeURIComponent(to)}`;
  const year = String(new Date().getFullYear());

  let subject = '🎁 Welcome to CareerSasa — Your Free Toolkit Is Inside';
  let html = '';

  try {
    const {
      getEmailTemplate,
      getDefaultPopupNewsletterWelcome,
      POPUP_NEWSLETTER_WELCOME_SLUG,
      renderEmailTemplate,
    } = await import('@/lib/emailTemplates');

    const stored = await getEmailTemplate(POPUP_NEWSLETTER_WELCOME_SLUG);
    const template = stored?.is_active !== false && stored?.html_body
      ? stored
      : getDefaultPopupNewsletterWelcome();

    subject = template.subject || subject;
    html = renderEmailTemplate(template.html_body, {
      name: displayName,
      email: escapeHtml(to),
      site_url: siteUrl,
      toolkit_url: toolkitUrl,
      unsubscribe_url: unsubscribeUrl,
      year,
    });
  } catch (err) {
    console.warn('[email] Failed to load popup welcome template, using hardcoded fallback:', err);
  }

  if (!html) {
    html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
          <img src="${siteUrl}/logo.png" alt="CareerSasa" style="width:60px;height:60px;margin-bottom:10px;" />
          <h1 style="margin:0;font-size:24px;">Welcome to CareerSasa!</h1>
          <p style="margin:8px 0 0;opacity:0.9;font-size:16px;">Your free toolkit is ready — no strings attached</p>
        </td></tr>
        <tr><td style="padding:30px;">
          <p>Hi ${displayName},</p>
          <p>Thanks for subscribing! You're now part of a growing community of Kenyan professionals who get:</p>
          <ul style="line-height:2;">
            <li><strong>Weekly featured jobs</strong> — handpicked before they appear on the site</li>
            <li><strong>Salary insights</strong> — know what you're worth in the Kenyan market</li>
            <li><strong>Career tips from hiring managers</strong> — the advice that actually gets you shortlisted</li>
          </ul>
          <div style="background:linear-gradient(135deg,#f0f7ff,#e8f4ff);border:2px solid #0A66C2;border-radius:12px;padding:24px;margin:24px 0;">
            <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#0A66C2;">🎁 Your Free Job Seeker's Toolkit</p>
            <p style="margin:0 0 14px;color:#555;">Everything you need to land more interviews, in one place:</p>
            <table cellspacing="0" cellpadding="4" style="width:100%;">
              <tr><td style="color:#0A66C2;font-weight:bold;">✓</td><td>Professional CV template (ATS-friendly)</td></tr>
              <tr><td style="color:#0A66C2;font-weight:bold;">✓</td><td>Cover letter template that gets read</td></tr>
              <tr><td style="color:#0A66C2;font-weight:bold;">✓</td><td>Interview prep checklist</td></tr>
              <tr><td style="color:#0A66C2;font-weight:bold;">✓</td><td>Salary negotiation script</td></tr>
            </table>
            <p style="text-align:center;margin:20px 0 0;">
              <a href="${toolkitUrl}" style="display:inline-block;padding:14px 36px;background:#0A66C2;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">Access My Free Toolkit →</a>
            </p>
          </div>
          <p style="color:#666;font-size:14px;">If the button above doesn't work, copy this link into your browser:<br>
          <a href="${toolkitUrl}" style="color:#0A66C2;">${toolkitUrl}</a></p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
          <p>&copy; ${year} CareerSasa. All rights reserved.</p>
          <p><a href="${unsubscribeUrl}" style="color:#666;">Unsubscribe</a> | <a href="${siteUrl}/privacy" style="color:#666;">Privacy Policy</a></p>
        </td></tr>
      </table>
    </body>
    </html>
  `;
  }

  return sendEmail({ to, subject, html, emailType: 'welcome' });
}

/**
 * Send a marketing campaign to a list of recipients.
 */
export async function sendCampaignEmail(
  to: string,
  subject: string,
  htmlBody: string,
  campaignId: string,
  unsubscribeToken?: string
): Promise<SendEmailResult> {
  const siteUrl = getSiteUrl();
  const unsubUrl = unsubscribeToken
    ? `${siteUrl}/newsletter/unsubscribe?token=${unsubscribeToken}`
    : `${siteUrl}/newsletter/unsubscribe`;

  // Append unsubscribe link to the HTML body
  const htmlWithUnsub = htmlBody + `
    <div style="margin-top:30px;padding-top:20px;border-top:1px solid #eee;text-align:center;font-size:12px;color:#999;">
      <p>You're receiving this email because you subscribed to CareerSasa updates.</p>
      <p><a href="${unsubUrl}" style="color:#999;">Unsubscribe</a></p>
      <p>&copy; ${new Date().getFullYear()} CareerSasa. All rights reserved.</p>
    </div>
  `;

  return sendEmail({ to, subject, html: htmlWithUnsub, emailType: 'campaign', campaignId });
}

/**
 * Send job alert digest email.
 */
export async function sendJobAlertDigest(
  to: string,
  name: string,
  jobs: Array<{ id: string; title: string; company: string; location: string; type: string }>,
  userId?: string
): Promise<SendEmailResult> {
  const siteUrl = getSiteUrl();
  const jobRows = jobs.map(job => `
    <tr>
      <td style="padding:15px;border-bottom:1px solid #eee;">
        <a href="${siteUrl}/jobs/${job.id}" style="color:#0A66C2;text-decoration:none;font-weight:bold;">${escapeHtml(job.title)}</a>
        <p style="margin:5px 0 0;color:#666;font-size:14px;">${escapeHtml(job.company)} &middot; ${escapeHtml(job.location)} &middot; ${escapeHtml(job.type)}</p>
      </td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
          <h1 style="margin:0;font-size:24px;">Your Job Alert</h1>
          <p style="margin:5px 0 0;opacity:0.8;">${jobs.length} new jobs matching your search</p>
        </td></tr>
        <tr><td style="padding:20px;">
          <p>Hi ${escapeHtml(name)},</p>
          <p>Here are new jobs matching your preferences:</p>
          <table width="100%" cellspacing="0" cellpadding="0">${jobRows}</table>
          <p style="text-align:center;margin:30px 0;">
            <a href="${siteUrl}/jobs" style="display:inline-block;padding:12px 30px;background:#0A66C2;color:white;text-decoration:none;border-radius:6px;">View All Jobs</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
          <p>&copy; ${new Date().getFullYear()} CareerSasa. All rights reserved.</p>
          <p><a href="${siteUrl}/dashboard/saved-searches" style="color:#666;">Manage Alerts</a> | <a href="${siteUrl}/dashboard/preferences" style="color:#666;">Email Preferences</a></p>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({ to, subject: `${jobs.length} New Jobs Matching Your Search`, html, emailType: 'job_alert', userId });
}

/**
 * Send weekly digest email.
 */
export async function sendWeeklyDigest(
  to: string,
  name: string,
  featuredJobs: Array<{ id: string; title: string; company: string; location: string }>,
  tips: Array<{ title: string; url: string }>,
  userId?: string
): Promise<SendEmailResult> {
  const siteUrl = getSiteUrl();
  const jobRows = featuredJobs.map(job => `
    <div style="padding:12px 0;border-bottom:1px solid #eee;">
      <a href="${siteUrl}/jobs/${job.id}" style="color:#0A66C2;text-decoration:none;font-weight:bold;">${escapeHtml(job.title)}</a>
      <p style="margin:3px 0 0;color:#666;font-size:14px;">${escapeHtml(job.company)} &middot; ${escapeHtml(job.location)}</p>
    </div>
  `).join('');

  const tipRows = tips.map(tip => `
    <div style="padding:10px 0;border-bottom:1px solid #eee;">
      <a href="${tip.url}" style="color:#E8712B;text-decoration:none;font-weight:bold;">${escapeHtml(tip.title)}</a>
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
          <h1 style="margin:0;font-size:24px;">CareerSasa Weekly Digest</h1>
          <p style="margin:5px 0 0;opacity:0.8;">Your weekly career roundup</p>
        </td></tr>
        <tr><td style="padding:20px;">
          <p>Hi ${escapeHtml(name)},</p>

          <h2 style="color:#0A66C2;border-bottom:2px solid #0A66C2;padding-bottom:10px;">Featured Jobs This Week</h2>
          ${jobRows || '<p style="color:#666;">No featured jobs this week. Check back soon!</p>'}

          ${tips.length > 0 ? `
            <h2 style="color:#E8712B;border-bottom:2px solid #E8712B;padding-bottom:10px;margin-top:30px;">Career Tips</h2>
            ${tipRows}
          ` : ''}

          <p style="text-align:center;margin:30px 0;">
            <a href="${siteUrl}/jobs" style="display:inline-block;padding:12px 30px;background:#0A66C2;color:white;text-decoration:none;border-radius:6px;margin:5px;">Browse All Jobs</a>
            <a href="${siteUrl}/blog" style="display:inline-block;padding:12px 30px;background:#E8712B;color:white;text-decoration:none;border-radius:6px;margin:5px;">Read Blog</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
          <p>&copy; ${new Date().getFullYear()} CareerSasa. All rights reserved.</p>
          <p><a href="${siteUrl}/dashboard/preferences" style="color:#666;">Email Preferences</a> | <a href="${siteUrl}/newsletter/unsubscribe" style="color:#666;">Unsubscribe</a></p>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({ to, subject: 'CareerSasa Weekly Digest: Top Jobs & Career Tips', html, emailType: 'weekly_digest', userId });
}

// =====================================================
// UTILITIES
// =====================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Send a test email (for admin dashboard).
 */
export async function sendTestEmail(to: string): Promise<SendEmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
      <div style="max-width:600px;margin:0 auto;background:white;padding:30px;">
        <h1 style="color:#0A66C2;">CareerSasa Email Test</h1>
        <p>If you're reading this, the email system is working correctly!</p>
        <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0;">
          <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
          <p><strong>Provider:</strong> Resend</p>
        </div>
        <p style="color:#666;font-size:14px;">This is an automated test email. You can safely ignore it.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to, subject: '[Test] CareerSasa Email System', html, emailType: 'transactional' });
}

// =====================================================
// AUTOMATED EMAIL TEMPLATES
// =====================================================

/**
 * Send re-engagement email to inactive users.
 */
export async function sendReengagementEmail(
  to: string, name: string, daysSinceLogin: number, userId?: string
): Promise<SendEmailResult> {
  const siteUrl = getSiteUrl();
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
          <img src="${siteUrl}/logo.png" alt="CareerSasa" style="width:60px;height:60px;margin-bottom:10px;" />
          <h1 style="margin:0;font-size:24px;">We Miss You, ${escapeHtml(name)}!</h1>
          <p style="margin:5px 0 0;opacity:0.8;">It's been ${daysSinceLogin} days since your last visit</p>
        </td></tr>
        <tr><td style="padding:30px;">
          <p>A lot has happened since you were last on CareerSasa. Here's what you're missing:</p>
          <ul style="line-height:2;">
            <li>New job opportunities posted daily</li>
            <li>Featured positions from top Kenyan employers</li>
            <li>Career tips and industry insights</li>
          </ul>
          <p>Your dream job could be waiting for you right now.</p>
          <p style="text-align:center;margin:30px 0;">
            <a href="${siteUrl}/jobs" style="display:inline-block;padding:12px 30px;background:#0A66C2;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Browse Latest Jobs</a>
          </p>
          <p style="text-align:center;margin:10px 0;">
            <a href="${siteUrl}/dashboard/profile" style="display:inline-block;padding:12px 30px;background:#E8712B;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Update Your Profile</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
          <p>&copy; ${new Date().getFullYear()} CareerSasa. All rights reserved.</p>
          <p><a href="${siteUrl}/dashboard/preferences" style="color:#666;">Email Preferences</a></p>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({ to, subject: `We miss you! ${daysSinceLogin} days of new opportunities await`, html, emailType: 'reengagement', userId });
}

/**
 * Send incomplete application reminder.
 */
export async function sendIncompleteApplicationReminder(
  to: string, name: string, jobTitle: string, applicationUrl: string, userId?: string
): Promise<SendEmailResult> {
  const siteUrl = getSiteUrl();
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
          <img src="${siteUrl}/logo.png" alt="CareerSasa" style="width:60px;height:60px;margin-bottom:10px;" />
          <h1 style="margin:0;font-size:24px;">Don't Forget Your Application!</h1>
        </td></tr>
        <tr><td style="padding:30px;">
          <p>Hi ${escapeHtml(name)},</p>
          <p>You started applying for <strong>${escapeHtml(jobTitle)}</strong> but didn't finish. This role might be a great fit for you!</p>
          <div style="background:#fff3cd;padding:15px;border-radius:8px;margin:20px 0;border-left:4px solid #E8712B;">
            <p style="margin:0;"><strong>Reminder:</strong> Applications left incomplete may miss the deadline. Complete yours now!</p>
          </div>
          <p style="text-align:center;margin:30px 0;">
            <a href="${applicationUrl}" style="display:inline-block;padding:12px 30px;background:#E8712B;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Complete Application</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
          <p>&copy; ${new Date().getFullYear()} CareerSasa. All rights reserved.</p>
          <p><a href="${siteUrl}/dashboard/preferences" style="color:#666;">Email Preferences</a></p>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({ to, subject: `Reminder: Complete your application for ${jobTitle}`, html, emailType: 'reminder', userId });
}

/**
 * Send employer welcome/onboarding email.
 */
export async function sendEmployerWelcomeEmail(
  to: string, name: string, companyName: string, userId?: string
): Promise<SendEmailResult> {
  const siteUrl = getSiteUrl();
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
          <img src="${siteUrl}/logo.png" alt="CareerSasa" style="width:60px;height:60px;margin-bottom:10px;" />
          <h1 style="margin:0;font-size:24px;">Welcome to CareerSasa for Employers!</h1>
          <p style="margin:5px 0 0;opacity:0.8;">${escapeHtml(companyName)}</p>
        </td></tr>
        <tr><td style="padding:30px;">
          <p>Hi ${escapeHtml(name)},</p>
          <p>Welcome aboard! Your employer account for <strong>${escapeHtml(companyName)}</strong> is ready. Here's how to get the most out of CareerSasa:</p>
          <div style="margin:20px 0;">
            <div style="padding:15px;border-bottom:1px solid #eee;">
              <h3 style="margin:0 0 5px;color:#0A66C2;">1. Post Your First Job</h3>
              <p style="margin:0;color:#666;">Create a detailed listing with requirements, benefits, and company culture to attract top talent.</p>
            </div>
            <div style="padding:15px;border-bottom:1px solid #eee;">
              <h3 style="margin:0 0 5px;color:#0A66C2;">2. Manage Applications</h3>
              <p style="margin:0;color:#666;">Review, shortlist, and communicate with candidates all from your dashboard.</p>
            </div>
            <div style="padding:15px;border-bottom:1px solid #eee;">
              <h3 style="margin:0 0 5px;color:#0A66C2;">3. Message Candidates</h3>
              <p style="margin:0;color:#666;">Use our built-in messaging to schedule interviews and answer questions.</p>
            </div>
            <div style="padding:15px;">
              <h3 style="margin:0 0 5px;color:#0A66C2;">4. Promote Your Listings</h3>
              <p style="margin:0;color:#666;">Featured and promoted jobs get up to 5x more applications.</p>
            </div>
          </div>
          <p style="text-align:center;margin:30px 0;">
            <a href="${siteUrl}/post-job" style="display:inline-block;padding:12px 30px;background:#0A66C2;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Post a Job</a>
          </p>
          <p style="text-align:center;margin:10px 0;">
            <a href="${siteUrl}/dashboard/manage-jobs" style="display:inline-block;padding:12px 30px;background:#E8712B;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Employer Dashboard</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
          <p>&copy; ${new Date().getFullYear()} CareerSasa. All rights reserved.</p>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({ to, subject: `Welcome to CareerSasa for Employers - Let's Find Great Talent!`, html, emailType: 'employer_welcome', userId });
}

/**
 * Send profile completion nudge to candidates.
 */
export async function sendProfileCompletionNudge(
  to: string, name: string, completionPercent: number, userId?: string
): Promise<SendEmailResult> {
  const siteUrl = getSiteUrl();
  const remaining = 100 - completionPercent;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
          <img src="${siteUrl}/logo.png" alt="CareerSasa" style="width:60px;height:60px;margin-bottom:10px;" />
          <h1 style="margin:0;font-size:24px;">Your Profile is ${completionPercent}% Complete</h1>
        </td></tr>
        <tr><td style="padding:30px;">
          <p>Hi ${escapeHtml(name)},</p>
          <p>Employers are <strong>3x more likely</strong> to contact candidates with complete profiles. You're just ${remaining}% away!</p>
          <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0;">
            <div style="background:#e0e0e0;border-radius:10px;height:20px;overflow:hidden;">
              <div style="background:#0A66C2;height:100%;width:${completionPercent}%;border-radius:10px;transition:width 0.3s;"></div>
            </div>
            <p style="text-align:center;margin:10px 0 0;color:#666;font-size:14px;">${completionPercent}% complete</p>
          </div>
          <p>Complete these sections to boost your visibility:</p>
          <ul style="line-height:2;">
            <li>Add your work experience</li>
            <li>Upload your CV</li>
            <li>Set your salary expectations</li>
            <li>Add your skills and education</li>
          </ul>
          <p style="text-align:center;margin:30px 0;">
            <a href="${siteUrl}/dashboard/profile" style="display:inline-block;padding:12px 30px;background:#E8712B;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Complete Your Profile</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
          <p>&copy; ${new Date().getFullYear()} CareerSasa. All rights reserved.</p>
          <p><a href="${siteUrl}/dashboard/preferences" style="color:#666;">Email Preferences</a></p>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({ to, subject: `Your profile is ${completionPercent}% complete - employers are looking!`, html, emailType: 'profile_nudge', userId });
}

/**
 * Send job expiry warning to employer.
 */
export async function sendJobExpiryWarning(
  to: string, jobTitle: string, daysUntilExpiry: number, renewUrl: string, userId?: string
): Promise<SendEmailResult> {
  const siteUrl = getSiteUrl();
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#E8712B;color:white;padding:30px;text-align:center;">
          <img src="${siteUrl}/logo.png" alt="CareerSasa" style="width:60px;height:60px;margin-bottom:10px;" />
          <h1 style="margin:0;font-size:24px;">Job Listing Expiring Soon</h1>
        </td></tr>
        <tr><td style="padding:30px;">
          <p>Your job listing is about to expire:</p>
          <div style="background:#fef2f2;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #dc2626;">
            <h3 style="margin:0 0 10px;">${escapeHtml(jobTitle)}</h3>
            <p style="margin:0;color:#dc2626;font-weight:bold;">Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}</p>
          </div>
          <p>Don't miss out on potential candidates! Renew your listing to keep it visible to job seekers.</p>
          <p style="text-align:center;margin:30px 0;">
            <a href="${renewUrl}" style="display:inline-block;padding:12px 30px;background:#dc2626;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Renew Listing</a>
          </p>
          <p style="text-align:center;margin:10px 0;">
            <a href="${siteUrl}/dashboard/manage-jobs" style="display:inline-block;padding:12px 30px;background:#0A66C2;color:white;text-decoration:none;border-radius:6px;">Manage All Jobs</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
          <p>&copy; ${new Date().getFullYear()} CareerSasa. All rights reserved.</p>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({ to, subject: `Action needed: "${jobTitle}" expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`, html, emailType: 'job_expiry', userId });
}
