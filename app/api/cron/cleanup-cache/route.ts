import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/supabaseEnv";

export const runtime = "edge";

function getCleanupClient() {
  try {
    return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } catch {
    return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from a cron job (optional security)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getCleanupClient();

    // Clean up expired cache entries
    const { error } = await (supabase as any)
      .from("ai_response_cache")
      .delete()
      .lt("expires_at", new Date().toISOString());

    if (error) {
      throw new Error(`Failed to clean cache: ${error.message}`);
    }

    // Clean up old failed jobs (older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { error: jobCleanupError } = await (supabase as any)
      .from("job_parsing_queue")
      .delete()
      .eq("status", "failed")
      .lt("created_at", sevenDaysAgo.toISOString());

    if (jobCleanupError) {
      console.warn("Failed to clean old jobs:", jobCleanupError);
    }

    return NextResponse.json({
      success: true,
      message: "Cache cleanup completed",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Cache cleanup error:", error);
    return NextResponse.json(
      {
        error: "Failed to cleanup cache",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
