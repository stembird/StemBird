import { NextRequest, NextResponse } from "next/server";
import { 
  getCachedResponse, 
  callAIWithRetry, 
  saveToCache, 
  queueJobForParsing,
  getJobParseSystemPrompt,
  ParsedJobData 
} from "@/lib/jobParsingOptimized";

export const runtime = "nodejs";
export const maxDuration = 120;

// Interface moved to shared library

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { jobText, async: useAsync = false } = await request.json();

    if (!jobText || typeof jobText !== "string") {
      return NextResponse.json(
        { error: "Job text is required" },
        { status: 400 }
      );
    }

    // Check if any API keys are configured (DeepSeek primary, Gemini backup)
    const deepseekKey = process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY_2;
    const geminiApiKeys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
    ].filter(Boolean);

    if (!deepseekKey && geminiApiKeys.length === 0) {
      return NextResponse.json(
        {
          error:
            "No AI API key configured. Please add DEEPSEEK_API_KEY and/or GEMINI_API_KEY to environment variables.",
        },
        { status: 500 }
      );
    }

    // For async processing, queue the job and return immediately
    if (useAsync) {
      try {
        const jobId = await queueJobForParsing(jobText);
        return NextResponse.json({
          success: true,
          jobId,
          message: "Job queued for processing. Use the job ID to check status."
        });
      } catch (error: any) {
        return NextResponse.json(
          { error: `Failed to queue job: ${error.message}` },
          { status: 500 }
        );
      }
    }

    // Check cache first for immediate response
    const cachedResult = await getCachedResponse(jobText);
    if (cachedResult) {
      const processingTime = Date.now() - startTime;
      return NextResponse.json({
        success: true,
        data: cachedResult,
        cached: true,
        processingTime
      });
    }

    // Use optimized AI parsing with caching
    try {
      const { response: parsedJob, modelUsed } = await callAIWithRetry(jobText, await getJobParseSystemPrompt());
      
      // Save to cache for future requests
      await saveToCache(jobText, parsedJob, modelUsed);
      
      const processingTime = Date.now() - startTime;
      
      return NextResponse.json({
        success: true,
        data: parsedJob,
        cached: false,
        processingTime,
        modelUsed
      });
    } catch (error: any) {
      console.error("AI parsing error:", error);
      return NextResponse.json(
        { 
          error: "Failed to parse job text with AI", 
          details: error.message 
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error("Job parsing error:", error);
    return NextResponse.json(
      { 
        error: "Failed to parse job text", 
        details: error.message 
      },
      { status: 500 }
    );
  }
}