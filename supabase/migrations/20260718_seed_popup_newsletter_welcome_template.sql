-- Store the homepage popup newsletter welcome email template in page_content
-- (email management Templates tab). Safe to re-run.

INSERT INTO public.page_content (
  page_slug,
  section_key,
  content_type,
  content_value,
  metadata
) VALUES (
  'email_templates',
  'popup_newsletter_welcome',
  'html',
  $html$<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f5f5f5;margin:0;padding:0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:white;">
    <tr><td style="background:#0A66C2;color:white;padding:30px;text-align:center;">
      <img src="{{site_url}}/logo.png" alt="CareerSasa" style="width:60px;height:60px;margin-bottom:10px;" />
      <h1 style="margin:0;font-size:24px;">Welcome to CareerSasa!</h1>
      <p style="margin:8px 0 0;opacity:0.9;font-size:16px;">Your free toolkit is ready — no strings attached</p>
    </td></tr>
    <tr><td style="padding:30px;">
      <p>Hi {{name}},</p>
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
          <a href="{{toolkit_url}}" style="display:inline-block;padding:14px 36px;background:#0A66C2;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">Access My Free Toolkit →</a>
        </p>
      </div>

      <p style="color:#666;font-size:14px;">If the button above doesn't work, copy this link into your browser:<br>
      <a href="{{toolkit_url}}" style="color:#0A66C2;">{{toolkit_url}}</a></p>
    </td></tr>
    <tr><td style="padding:20px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
      <p>&copy; {{year}} CareerSasa. All rights reserved.</p>
      <p><a href="{{unsubscribe_url}}" style="color:#666;">Unsubscribe</a> | <a href="{{site_url}}/privacy" style="color:#666;">Privacy Policy</a></p>
    </td></tr>
  </table>
</body>
</html>$html$,
  jsonb_build_object(
    'name', 'Popup Newsletter Welcome',
    'description', 'Sent automatically when a visitor submits the homepage email subscription popup. Includes the free toolkit download link.',
    'subject', '🎁 Welcome to CareerSasa — Your Free Toolkit Is Inside',
    'placeholders', jsonb_build_array('name', 'email', 'site_url', 'toolkit_url', 'unsubscribe_url', 'year'),
    'extra', jsonb_build_object(
      'trigger', 'lead_magnet_popup',
      'popup', jsonb_build_object(
        'title', 'Land Your Next Role Faster',
        'description', 'Get our free Kenyan Job Search Toolkit — CV templates, cover letter frameworks, interview prep, and salary negotiation scripts. Plus weekly curated jobs.',
        'cta_label', 'Send Me the Toolkit',
        'disclaimer', 'No spam. Unsubscribe anytime. Built for Kenyan job seekers.'
      )
    ),
    'is_active', true
  )
)
ON CONFLICT (page_slug, section_key) DO UPDATE SET
  content_type = EXCLUDED.content_type,
  content_value = EXCLUDED.content_value,
  metadata = EXCLUDED.metadata,
  updated_at = NOW()
WHERE
  page_content.content_value IS NULL
  OR length(trim(page_content.content_value)) < 80
  OR page_content.content_value = '<p>test</p>';
