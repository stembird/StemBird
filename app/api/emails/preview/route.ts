import { NextRequest, NextResponse } from 'next/server';
import {
  getDefaultPopupNewsletterWelcome,
  getEmailTemplate,
  POPUP_NEWSLETTER_WELCOME_SLUG,
  renderEmailTemplate,
} from '@/lib/emailTemplates';

/**
 * GET /api/emails/preview?template=welcome
 * Renders email templates as HTML for browser preview (dev/admin only).
 *
 * Available templates: popup-newsletter-welcome, welcome, application-confirmation,
 * application-status, employer-new-application, new-message, password-reset,
 * subscription-confirmation, campaign, job-alert-digest, weekly-digest, test
 */

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://careersasa.co.ke';
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const TEMPLATES: Record<string, () => string> = {
  welcome: () => {
    const siteUrl = getSiteUrl();
    return `
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
          <img src="${siteUrl}/logo.png" alt="CareerSasa" style="width:60px;height:60px;margin-bottom:10px;" />
          <h1 style="margin:0;font-size:24px;">Welcome to CareerSasa!</h1>
        </td></tr>
        <tr><td style="padding:30px;">
          <p>Hi John,</p>
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
    </body>`;
  },

  'application-confirmation': () => {
    const siteUrl = getSiteUrl();
    return `
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
          <img src="${siteUrl}/logo.png" alt="CareerSasa" style="width:60px;height:60px;margin-bottom:10px;" />
          <h1 style="margin:0;font-size:24px;">Application Submitted!</h1>
        </td></tr>
        <tr><td style="padding:30px;">
          <p>Hi John,</p>
          <p>Your application has been successfully submitted:</p>
          <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #0A66C2;">
            <h3 style="margin:0 0 10px;">Senior Software Engineer</h3>
            <p style="margin:0;color:#666;">at Safaricom PLC</p>
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
    </body>`;
  },

  'application-status': () => {
    const siteUrl = getSiteUrl();
    return `
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
          <img src="${siteUrl}/logo.png" alt="CareerSasa" style="width:60px;height:60px;margin-bottom:10px;" />
          <h1 style="margin:0;font-size:24px;">Application Status Update</h1>
        </td></tr>
        <tr><td style="padding:30px;">
          <p>Hi John,</p>
          <p>There's been an update on your application:</p>
          <div style="background:#8b5cf6;color:white;padding:15px;border-radius:8px;text-align:center;margin:20px 0;">
            <h2 style="margin:0;">Shortlisted</h2>
          </div>
          <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:15px 0;">
            <h3 style="margin:0 0 10px;">Senior Software Engineer</h3>
            <p style="margin:0;color:#666;">at Safaricom PLC</p>
          </div>
          <div style="background:#fff3cd;padding:15px;border-radius:8px;margin:15px 0;border-left:4px solid #E8712B;">
            <p style="margin:0;"><strong>Message from employer:</strong> We'd like to schedule an interview next week.</p>
          </div>
          <p style="text-align:center;margin:30px 0;">
            <a href="${siteUrl}/dashboard/applications" style="display:inline-block;padding:12px 30px;background:#0A66C2;color:white;text-decoration:none;border-radius:6px;">View Details</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
          <p>&copy; ${new Date().getFullYear()} CareerSasa. All rights reserved.</p>
          <p><a href="${siteUrl}/dashboard/preferences" style="color:#666;">Email Preferences</a></p>
        </td></tr>
      </table>
    </body>`;
  },

  'employer-new-application': () => {
    const siteUrl = getSiteUrl();
    return `
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
          <img src="${siteUrl}/logo.png" alt="CareerSasa" style="width:60px;height:60px;margin-bottom:10px;" />
          <h1 style="margin:0;font-size:24px;">New Application Received</h1>
        </td></tr>
        <tr><td style="padding:30px;">
          <p>Hi Jane,</p>
          <p>You have a new application for:</p>
          <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #10b981;">
            <h3 style="margin:0 0 10px;">Senior Software Engineer</h3>
            <p style="margin:0;"><strong>Candidate:</strong> John Doe</p>
          </div>
          <p style="text-align:center;margin:30px 0;">
            <a href="${siteUrl}/dashboard/manage-jobs" style="display:inline-block;padding:12px 30px;background:#0A66C2;color:white;text-decoration:none;border-radius:6px;">Review Applications</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
          <p>&copy; ${new Date().getFullYear()} CareerSasa. All rights reserved.</p>
        </td></tr>
      </table>
    </body>`;
  },

  'new-message': () => {
    const siteUrl = getSiteUrl();
    return `
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
          <img src="${siteUrl}/logo.png" alt="CareerSasa" style="width:60px;height:60px;margin-bottom:10px;" />
          <h1 style="margin:0;font-size:24px;">New Message</h1>
        </td></tr>
        <tr><td style="padding:30px;">
          <p>Hi John,</p>
          <p>You have a new message regarding <strong>Senior Software Engineer</strong>:</p>
          <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #0A66C2;">
            <p style="margin:0 0 10px;color:#666;">From: <strong>Jane Recruiter</strong></p>
            <p style="margin:0;">Hi John, we'd love to schedule a call to discuss the role further...</p>
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
    </body>`;
  },

  'password-reset': () => {
    const siteUrl = getSiteUrl();
    return `
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
            <a href="#" style="display:inline-block;padding:12px 30px;background:#E8712B;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Reset Password</a>
          </p>
          <p style="color:#666;font-size:14px;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
          <p>&copy; ${new Date().getFullYear()} CareerSasa. All rights reserved.</p>
        </td></tr>
      </table>
    </body>`;
  },

  'subscription-confirmation': () => {
    const siteUrl = getSiteUrl();
    return `
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
          <img src="${siteUrl}/logo.png" alt="CareerSasa" style="width:60px;height:60px;margin-bottom:10px;" />
          <h1 style="margin:0;font-size:24px;">Confirm Your Subscription</h1>
        </td></tr>
        <tr><td style="padding:30px;">
          <p>Hi John,</p>
          <p>Thanks for subscribing to the CareerSasa newsletter! Please confirm your email address to start receiving:</p>
          <ul style="line-height:2;">
            <li>Weekly featured job picks</li>
            <li>Career tips and advice</li>
            <li>Industry news and updates</li>
          </ul>
          <p style="text-align:center;margin:30px 0;">
            <a href="#" style="display:inline-block;padding:12px 30px;background:#0A66C2;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Confirm Subscription</a>
          </p>
          <p style="color:#666;font-size:14px;">If you didn't subscribe, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
          <p>&copy; ${new Date().getFullYear()} CareerSasa. All rights reserved.</p>
        </td></tr>
      </table>
    </body>`;
  },

  'job-alert-digest': () => {
    const siteUrl = getSiteUrl();
    const jobs = [
      { id: '1', title: 'Senior Software Engineer', company: 'Safaricom PLC', location: 'Nairobi', type: 'Full-time' },
      { id: '2', title: 'Product Manager', company: 'M-Pesa', location: 'Nairobi', type: 'Full-time' },
      { id: '3', title: 'UX Designer', company: 'Cellulant', location: 'Remote', type: 'Contract' },
      { id: '4', title: 'Data Analyst', company: 'Equity Bank', location: 'Nairobi', type: 'Full-time' },
    ];
    const jobRows = jobs.map(job => `
      <tr>
        <td style="padding:15px;border-bottom:1px solid #eee;">
          <a href="${siteUrl}/jobs/${job.id}" style="color:#0A66C2;text-decoration:none;font-weight:bold;">${job.title}</a>
          <p style="margin:5px 0 0;color:#666;font-size:14px;">${job.company} &middot; ${job.location} &middot; ${job.type}</p>
        </td>
      </tr>
    `).join('');
    return `
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
          <h1 style="margin:0;font-size:24px;">Your Job Alert</h1>
          <p style="margin:5px 0 0;opacity:0.8;">4 new jobs matching your search</p>
        </td></tr>
        <tr><td style="padding:20px;">
          <p>Hi John,</p>
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
    </body>`;
  },

  'weekly-digest': () => {
    const siteUrl = getSiteUrl();
    return `
    <body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
        <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
          <h1 style="margin:0;font-size:24px;">CareerSasa Weekly Digest</h1>
          <p style="margin:5px 0 0;opacity:0.8;">Your weekly career roundup</p>
        </td></tr>
        <tr><td style="padding:20px;">
          <p>Hi John,</p>
          <h2 style="color:#0A66C2;border-bottom:2px solid #0A66C2;padding-bottom:10px;">Featured Jobs This Week</h2>
          <div style="padding:12px 0;border-bottom:1px solid #eee;">
            <a href="#" style="color:#0A66C2;text-decoration:none;font-weight:bold;">Senior Software Engineer</a>
            <p style="margin:3px 0 0;color:#666;font-size:14px;">Safaricom PLC &middot; Nairobi</p>
          </div>
          <div style="padding:12px 0;border-bottom:1px solid #eee;">
            <a href="#" style="color:#0A66C2;text-decoration:none;font-weight:bold;">Product Manager</a>
            <p style="margin:3px 0 0;color:#666;font-size:14px;">M-Pesa &middot; Nairobi</p>
          </div>
          <div style="padding:12px 0;border-bottom:1px solid #eee;">
            <a href="#" style="color:#0A66C2;text-decoration:none;font-weight:bold;">UX Designer</a>
            <p style="margin:3px 0 0;color:#666;font-size:14px;">Cellulant &middot; Remote</p>
          </div>
          <h2 style="color:#E8712B;border-bottom:2px solid #E8712B;padding-bottom:10px;margin-top:30px;">Career Tips</h2>
          <div style="padding:10px 0;border-bottom:1px solid #eee;">
            <a href="#" style="color:#E8712B;text-decoration:none;font-weight:bold;">5 Tips for Acing Your Next Tech Interview</a>
          </div>
          <div style="padding:10px 0;border-bottom:1px solid #eee;">
            <a href="#" style="color:#E8712B;text-decoration:none;font-weight:bold;">How to Optimize Your CV for ATS Systems</a>
          </div>
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
    </body>`;
  },

  test: () => {
    return `
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
    </body>`;
  },
};

const INDEX_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CareerSasa Email Template Previews</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; background: #f5f5f5; }
    h1 { color: #0A66C2; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-top: 30px; }
    a { display: block; padding: 20px; background: white; border-radius: 8px; text-decoration: none; color: #333; border: 1px solid #e0e0e0; transition: all 0.2s; }
    a:hover { border-color: #0A66C2; box-shadow: 0 4px 12px rgba(0,0,0,0.1); transform: translateY(-2px); }
    .name { font-weight: 600; color: #0A66C2; margin-bottom: 4px; }
    .desc { font-size: 13px; color: #666; }
    .badge { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 4px; margin-top: 8px; }
    .tx { background: #dbeafe; color: #1e40af; }
    .mk { background: #fef3c7; color: #92400e; }
    .cr { background: #d1fae5; color: #065f46; }
  </style>
</head>
<body>
  <h1>CareerSasa Email Templates</h1>
  <p>Click any template to preview it rendered with sample data.</p>
  <div class="grid">
    <a href="/api/emails/preview?template=popup-newsletter-welcome">
      <div class="name">Popup Newsletter Welcome</div>
      <div class="desc">Homepage subscription popup welcome + toolkit</div>
      <span class="badge mk">Marketing</span>
    </a>
    <a href="/api/emails/preview?template=welcome">
      <div class="name">Welcome Email</div>
      <div class="desc">Sent to new users on signup</div>
      <span class="badge tx">Transactional</span>
    </a>
    <a href="/api/emails/preview?template=application-confirmation">
      <div class="name">Application Confirmation</div>
      <div class="desc">Sent to candidate after applying</div>
      <span class="badge tx">Transactional</span>
    </a>
    <a href="/api/emails/preview?template=application-status">
      <div class="name">Application Status</div>
      <div class="desc">Employer updates candidate status</div>
      <span class="badge tx">Transactional</span>
    </a>
    <a href="/api/emails/preview?template=employer-new-application">
      <div class="name">Employer Notification</div>
      <div class="desc">Employer notified of new application</div>
      <span class="badge tx">Transactional</span>
    </a>
    <a href="/api/emails/preview?template=new-message">
      <div class="name">New Message</div>
      <div class="desc">In-app message notification</div>
      <span class="badge tx">Transactional</span>
    </a>
    <a href="/api/emails/preview?template=password-reset">
      <div class="name">Password Reset</div>
      <div class="desc">Auth password reset link</div>
      <span class="badge tx">Transactional</span>
    </a>
    <a href="/api/emails/preview?template=subscription-confirmation">
      <div class="name">Subscription Confirmation</div>
      <div class="desc">Newsletter double opt-in</div>
      <span class="badge cr">Confirmation</span>
    </a>
    <a href="/api/emails/preview?template=job-alert-digest">
      <div class="name">Job Alert Digest</div>
      <div class="desc">Matching jobs sent to user</div>
      <span class="badge mk">Marketing</span>
    </a>
    <a href="/api/emails/preview?template=weekly-digest">
      <div class="name">Weekly Digest</div>
      <div class="desc">Featured jobs + career tips</div>
      <span class="badge mk">Marketing</span>
    </a>
    <a href="/api/emails/preview?template=test">
      <div class="name">Test Email</div>
      <div class="desc">Admin test email</div>
      <span class="badge tx">Transactional</span>
    </a>
  </div>
</body>
</html>`;

async function renderPopupNewsletterWelcomePreview(): Promise<string> {
  const siteUrl = getSiteUrl();
  const stored = await getEmailTemplate(POPUP_NEWSLETTER_WELCOME_SLUG);
  const template = stored?.html_body
    ? stored
    : getDefaultPopupNewsletterWelcome();
  return renderEmailTemplate(template.html_body, {
    name: 'John',
    email: 'john@example.com',
    site_url: siteUrl,
    toolkit_url: `${siteUrl}/toolkit`,
    unsubscribe_url: `${siteUrl}/newsletter/unsubscribe?email=${encodeURIComponent('john@example.com')}`,
    year: String(new Date().getFullYear()),
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const template = searchParams.get('template');

  if (!template) {
    // Show the index page with links to all templates
    return new NextResponse(INDEX_HTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (template === 'popup-newsletter-welcome') {
    try {
      const body = await renderPopupNewsletterWelcomePreview();
      const html = body.includes('<!DOCTYPE') || body.includes('<html')
        ? body
        : `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Preview: ${template}</title></head><body>${body}</body></html>`;
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to render template';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  const renderer = TEMPLATES[template];
  if (!renderer) {
    return NextResponse.json(
      {
        error: `Unknown template: ${template}`,
        available: ['popup-newsletter-welcome', ...Object.keys(TEMPLATES)],
      },
      { status: 404 }
    );
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Preview: ${template}</title></head>${renderer()}</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
