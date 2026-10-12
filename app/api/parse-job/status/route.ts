import { NextRequest, NextResponse } from "next/server";
import { getJobParsingStatus } from "@/lib/jobParsingOptimized";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    const status = await getJobParsingStatus(jobId);
    
    return NextResponse.json({
      success: true,
      ...status
    });

  } catch (error: any) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { 
        error: "Failed to get job status", 
        details: error.message 
      },
      { status: 500 }
    );
  }
}