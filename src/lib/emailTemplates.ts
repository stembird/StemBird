import { createServiceRoleClient } from "@/lib/supabaseServiceClient";

export const POPUP_NEWSLETTER_WELCOME_SLUG = "popup_newsletter_welcome";
export const EMAIL_TEMPLATES_PAGE_SLUG = "email_templates";

export type EmailTemplateRecord = {
  slug: string;
  name: string;
  description: string | null;
  subject: string;
  html_body: string;
  placeholders: string[];
  metadata: Record<string, unknown>;
  is_active: boolean;
  updated_at: string | null;
  storage: "email_templates" | "page_content";
};

export type EmailTemplateInput = {
  name: string;
  description?: string | null;
  subject: string;
  html_body: string;
  placeholders?: string[];
  metadata?: Record<string, unknown>;
  is_active?: boolean;
};

const DEFAULT_POPUP_PLACEHOLDERS = [
  "name",
  "email",
  "site_url",
  "toolkit_url",
  "unsubscribe_url",
  "year",
];

type PageContentRow = {
  section_key: string;
  content_value: string | null;
  metadata: Record<string, unknown> | null;
  updated_at: string | null;
};

function adminDb() {
  return createServiceRoleClient();
}

/** Default HTML matches the popup subscription welcome currently sent in production. */
export function getDefaultPopupNewsletterWelcomeHtml(): string {
  return `<!DOCTYPE html>
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
</html>`;
}

export function getDefaultPopupNewsletterWelcome(): EmailTemplateRecord {
  return {
    slug: POPUP_NEWSLETTER_WELCOME_SLUG,
    name: "Popup Newsletter Welcome",
    description:
      "Sent automatically when a visitor submits the homepage email subscription popup. Includes the free toolkit download link.",
    subject: "🎁 Welcome to CareerSasa — Your Free Toolkit Is Inside",
    html_body: getDefaultPopupNewsletterWelcomeHtml(),
    placeholders: DEFAULT_POPUP_PLACEHOLDERS,
    metadata: {
      trigger: "lead_magnet_popup",
      popup: {
        title: "Land Your Next Role Faster",
        description:
          "Get our free Kenyan Job Search Toolkit — CV templates, cover letter frameworks, interview prep, and salary negotiation scripts. Plus weekly curated jobs.",
        cta_label: "Send Me the Toolkit",
        disclaimer: "No spam. Unsubscribe anytime. Built for Kenyan job seekers.",
      },
    },
    is_active: true,
    updated_at: null,
    storage: "page_content",
  };
}

function fromEmailTemplatesRow(row: Record<string, unknown>): EmailTemplateRecord {
  return {
    slug: String(row.slug ?? ""),
    name: String(row.name ?? ""),
    description: (row.description as string | null) ?? null,
    subject: String(row.subject ?? ""),
    html_body: String(row.html_body ?? ""),
    placeholders: Array.isArray(row.placeholders)
      ? row.placeholders.map(String)
      : DEFAULT_POPUP_PLACEHOLDERS,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
    is_active: row.is_active !== false,
    updated_at: (row.updated_at as string | null) ?? null,
    storage: "email_templates",
  };
}

function fromPageContentRow(row: PageContentRow): EmailTemplateRecord {
  const meta = row.metadata ?? {};
  const defaults = getDefaultPopupNewsletterWelcome();
  return {
    slug: row.section_key,
    name: String(meta.name ?? row.section_key),
    description: (meta.description as string | null) ?? null,
    subject: String(meta.subject ?? defaults.subject),
    html_body: row.content_value ?? defaults.html_body,
    placeholders: Array.isArray(meta.placeholders)
      ? meta.placeholders.map(String)
      : defaults.placeholders,
    metadata:
      meta.extra && typeof meta.extra === "object"
        ? (meta.extra as Record<string, unknown>)
        : {},
    is_active: meta.is_active !== false,
    updated_at: row.updated_at,
    storage: "page_content",
  };
}

async function listFromEmailTemplatesTable(): Promise<EmailTemplateRecord[] | null> {
  const db = adminDb();
  const { data, error } = await db
    .from("email_templates")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    if (/does not exist|Could not find the table/i.test(error.message)) return null;
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => fromEmailTemplatesRow(row as Record<string, unknown>));
}

async function listFromPageContent(): Promise<EmailTemplateRecord[]> {
  const db = adminDb();
  const { data, error } = await db
    .from("page_content")
    .select("section_key, content_value, metadata, updated_at")
    .eq("page_slug", EMAIL_TEMPLATES_PAGE_SLUG)
    .order("section_key", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => fromPageContentRow(row as PageContentRow));
}

export async function listEmailTemplates(): Promise<EmailTemplateRecord[]> {
  const fromTable = await listFromEmailTemplatesTable();
  if (fromTable && fromTable.length > 0) return fromTable;
  if (fromTable) {
    const fromPage = await listFromPageContent();
    if (fromPage.length > 0) return fromPage;
    return fromTable;
  }
  return listFromPageContent();
}

export async function getEmailTemplate(
  slug: string,
): Promise<EmailTemplateRecord | null> {
  const db = adminDb();

  const { data: tableRow, error: tableError } = await db
    .from("email_templates")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!tableError && tableRow) {
    return fromEmailTemplatesRow(tableRow as Record<string, unknown>);
  }
  if (tableError && !/does not exist|Could not find the table/i.test(tableError.message)) {
    throw new Error(tableError.message);
  }

  const { data: pageRow, error: pageError } = await db
    .from("page_content")
    .select("section_key, content_value, metadata, updated_at")
    .eq("page_slug", EMAIL_TEMPLATES_PAGE_SLUG)
    .eq("section_key", slug)
    .maybeSingle();

  if (pageError) throw new Error(pageError.message);
  if (!pageRow) return null;
  return fromPageContentRow(pageRow as PageContentRow);
}

export async function upsertEmailTemplate(
  slug: string,
  input: EmailTemplateInput,
): Promise<EmailTemplateRecord> {
  const db = adminDb();
  const placeholders = input.placeholders ?? DEFAULT_POPUP_PLACEHOLDERS;
  const metadata = input.metadata ?? {};
  const isActive = input.is_active !== false;

  const { data: tableRow, error: tableError } = await db
    .from("email_templates")
    .upsert(
      {
        slug,
        name: input.name,
        description: input.description ?? null,
        subject: input.subject,
        html_body: input.html_body,
        placeholders,
        metadata,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    )
    .select("*")
    .maybeSingle();

  if (!tableError && tableRow) {
    return fromEmailTemplatesRow(tableRow as Record<string, unknown>);
  }
  if (tableError && !/does not exist|Could not find the table/i.test(tableError.message)) {
    throw new Error(tableError.message);
  }

  const { data: pageRow, error: pageError } = await db
    .from("page_content")
    .upsert(
      {
        page_slug: EMAIL_TEMPLATES_PAGE_SLUG,
        section_key: slug,
        content_type: "html",
        content_value: input.html_body,
        metadata: {
          name: input.name,
          description: input.description ?? null,
          subject: input.subject,
          placeholders,
          extra: metadata,
          is_active: isActive,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "page_slug,section_key" },
    )
    .select("section_key, content_value, metadata, updated_at")
    .single();

  if (pageError) throw new Error(pageError.message);
  return fromPageContentRow(pageRow as PageContentRow);
}

export async function ensurePopupNewsletterWelcomeSeeded(): Promise<EmailTemplateRecord> {
  const existing = await getEmailTemplate(POPUP_NEWSLETTER_WELCOME_SLUG);
  // Replace placeholder/test seed with real default if content looks like a stub
  if (existing && existing.html_body.trim().length > 80) {
    return existing;
  }
  const defaults = getDefaultPopupNewsletterWelcome();
  return upsertEmailTemplate(POPUP_NEWSLETTER_WELCOME_SLUG, {
    name: defaults.name,
    description: defaults.description,
    subject: defaults.subject,
    html_body: defaults.html_body,
    placeholders: defaults.placeholders,
    metadata: defaults.metadata,
    is_active: true,
  });
}

export function renderEmailTemplate(
  html: string,
  vars: Record<string, string>,
): string {
  return Object.entries(vars).reduce(
    (out, [key, value]) => out.replaceAll(`{{${key}}}`, value),
    html,
  );
}
