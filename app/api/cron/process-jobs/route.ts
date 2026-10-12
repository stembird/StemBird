import { NextRequest, NextResponse } from "next/server";
import { processQueuedJobs } from "@/lib/jobParsingOptimized";

export const runtime = "edge";

// This endpoint can be called by Vercel Cron Jobs or external cron services
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from a cron job (optional security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Process up to 10 jobs at a time
    await processQueuedJobs(10);
    
    return NextResponse.json({
      success: true,
      message: "Background job processing completed",
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Cron job processing error:", error);
    return NextResponse.json(
      { 
        error: "Failed to process background jobs", 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Also allow POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}