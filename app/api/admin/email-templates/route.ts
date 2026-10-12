import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import {
  ensurePopupNewsletterWelcomeSeeded,
  listEmailTemplates,
} from "@/lib/emailTemplates";

export const runtime = "nodejs";

/**
 * GET /api/admin/email-templates
 * Lists managed email templates (seeds popup welcome if missing).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    await ensurePopupNewsletterWelcomeSeeded();
    const templates = await listEmailTemplates();
    return NextResponse.json({ templates });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[admin/email-templates] GET error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
