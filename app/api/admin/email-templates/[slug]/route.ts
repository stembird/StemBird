import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import {
  getEmailTemplate,
  upsertEmailTemplate,
  type EmailTemplateInput,
} from "@/lib/emailTemplates";

export const runtime = "nodejs";

/**
 * GET /api/admin/email-templates/[slug]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAdmin(request);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { slug } = await params;
    const template = await getEmailTemplate(slug);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    return NextResponse.json({ template });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[admin/email-templates] GET slug error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PUT /api/admin/email-templates/[slug]
 * Body: { name, description?, subject, html_body, placeholders?, metadata?, is_active? }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAdmin(request);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { slug } = await params;
    const body = (await request.json()) as Partial<EmailTemplateInput>;

    if (!body.name?.trim() || !body.subject?.trim() || !body.html_body?.trim()) {
      return NextResponse.json(
        { error: "name, subject, and html_body are required" },
        { status: 400 },
      );
    }

    const existing = await getEmailTemplate(slug);
    const template = await upsertEmailTemplate(slug, {
      name: body.name.trim(),
      description: body.description ?? existing?.description ?? null,
      subject: body.subject.trim(),
      html_body: body.html_body,
      placeholders: body.placeholders ?? existing?.placeholders,
      metadata: body.metadata ?? existing?.metadata ?? {},
      is_active: body.is_active ?? existing?.is_active ?? true,
    });

    return NextResponse.json({ template });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[admin/email-templates] PUT error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
