import { NextRequest, NextResponse } from "next/server";
import { processQueuedJobs } from "@/lib/jobParsingOptimized";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const { batchSize = 5 } = await request.json().catch(() => ({}));

    // Process queued jobs
    await processQueuedJobs(batchSize);
    
    return NextResponse.json({
      success: true,
      message: `Processed up to ${batchSize} queued jobs`
    });

  } catch (error: any) {
    console.error("Queue processing error:", error);
    return NextResponse.json(
      { 
        error: "Failed to process queue", 
        details: error.message 
      },
      { status: 500 }
    );
  }
}