import { NextRequest, NextResponse } from "next/server";
import { callAI, hasAIConfigured } from "@/lib/aiProviders";
import { createServiceRoleClient } from "@/lib/supabaseServiceClient";

export const runtime = "nodejs";

function getAdminClient() {
  try {
    return createServiceRoleClient();
  } catch {
    return null;
  }
}

async function dbSalarySearch(
  jobTitle: string,
  location?: string,
  experienceLevel?: string
) {
  const admin = getAdminClient();
  if (!admin) return null;

  const { data, error } = await (admin.rpc as any)("get_salary_insights", {
    p_job_title: jobTitle,
    p_location: location || null,
    p_experience_level: experienceLevel || null,
  });

  if (error || !data || data.length === 0) return null;
  return data[0];
}

async function cacheSalaryResult(
  jobTitle: string,
  location: string,
  experienceLevel: string,
  insight: Record<string, any>
) {
  const admin = getAdminClient();
  if (!admin) return;
  try {
    await admin.from("salary_data").insert({
      job_title: jobTitle,
      location: location || "Nairobi",
      country: "Kenya",
      experience_level: experienceLevel || "mid",
      min_salary: insight.min_salary,
      max_salary: insight.max_salary,
      median_salary: insight.median_salary,
      currency: insight.currency || "KES",
      sample_size: 0,
      industry: "Smart Estimate",
      company_size: "any",
      remote_type: "any",
      data_source: "ai_estimate",
    });
  } catch (err) {
    console.error("Failed to cache salary estimate:", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { jobTitle, location, experienceLevel } = await request.json();

    if (!jobTitle || typeof jobTitle !== "string") {
      return NextResponse.json({ error: "jobTitle is required" }, { status: 400 });
    }

    // 1. Try database first
    const dbResult = await dbSalarySearch(jobTitle, location, experienceLevel);
    if (dbResult) {
      return NextResponse.json({ success: true, data: dbResult, source: "database" });
    }

    // 2. AI fallback via unified provider chain
    if (!hasAIConfigured()) {
      return NextResponse.json({
        success: false,
        data: null,
        source: "none",
        reason: "No AI API keys configured on the server",
      });
    }

    try {
      const loc = location || "Nairobi, Kenya";
      const level = experienceLevel || "mid";

      const result = await callAI(
        `Job Title: ${jobTitle}\nLocation: ${loc}\nExperience Level: ${level}\n\nReturn monthly salary estimates in KES (Kenyan Shillings). Respond ONLY with valid JSON, no markdown or extra text:
{"min_salary":<number>,"max_salary":<number>,"median_salary":<number>,"percentile_25":<number>,"percentile_75":<number>,"currency":"KES"}`,
        {
          systemPrompt: "You are a salary data expert for the Kenyan and East African job market. Given a job title, location, and experience level, return realistic monthly salary estimates. Respond ONLY with valid JSON.",
          maxTokens: 500,
          temperature: 0.2,
          json: true,
        }
      );

      const parsed = result.parsed;
      if (typeof parsed?.min_salary === "number" && typeof parsed?.median_salary === "number") {
        const insight = { ...parsed, sample_size: 0, ai_generated: true };
        // Cache for future lookups (fire-and-forget)
        cacheSalaryResult(jobTitle, location || "Nairobi", experienceLevel || "mid", insight);
        return NextResponse.json({ success: true, data: insight, source: "ai" });
      }

      throw new Error("AI returned invalid salary structure");
    } catch (aiErr: any) {
      console.error("[salary-search] AI failed:", aiErr.message);
      return NextResponse.json({
        success: false,
        data: null,
        source: "none",
        reason: aiErr.message,
      });
    }
  } catch (err: any) {
    console.error("Salary search error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
