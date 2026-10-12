import { NextRequest } from "next/server";
import { 
  queueJobForParsing, 
  getJobParsingStatus,
  processQueuedJobs 
} from "@/lib/jobParsingOptimized";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const { jobText } = await request.json();

  if (!jobText || typeof jobText !== "string") {
    return new Response("Job text is required", { status: 400 });
  }

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      const sendEvent = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        // Send initial status
        sendEvent({ 
          type: 'status', 
          message: 'Queuing job for processing...', 
          progress: 10 
        });

        // Queue the job
        const jobId = await queueJobForParsing(jobText);
        
        sendEvent({ 
          type: 'queued', 
          jobId, 
          message: 'Job queued successfully', 
          progress: 20 
        });

        // Trigger processing
        processQueuedJobs(1).catch(console.error);

        // Poll for status updates
        let attempts = 0;
        const maxAttempts = 60; // 60 seconds max
        
        const pollStatus = async () => {
          try {
            const status = await getJobParsingStatus(jobId);
            
            sendEvent({
              type: 'progress',
              status: status.status,
              progress: status.progress,
              message: getStatusMessage(status.status)
            });

            if (status.status === 'completed') {
              sendEvent({
                type: 'completed',
                data: status.result,
                progress: 100,
                message: 'Job parsing completed successfully!'
              });
              controller.close();
              return;
            }

            if (status.status === 'failed') {
              sendEvent({
                type: 'error',
                error: status.error || 'Job processing failed',
                progress: 0
              });
              controller.close();
              return;
            }

            attempts++;
            if (attempts >= maxAttempts) {
              sendEvent({
                type: 'timeout',
                error: 'Job processing timed out',
                progress: 0
              });
              controller.close();
              return;
            }

            // Continue polling
            setTimeout(pollStatus, 1000);
          } catch (error: any) {
            sendEvent({
              type: 'error',
              error: error.message,
              progress: 0
            });
            controller.close();
          }
        };

        // Start polling after a short delay
        setTimeout(pollStatus, 1000);

      } catch (error: any) {
        sendEvent({
          type: 'error',
          error: error.message,
          progress: 0
        });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function getStatusMessage(status: string): string {
  switch (status) {
    case 'pending':
      return 'Job is waiting in queue...';
    case 'processing':
      return 'AI is parsing the job text...';
    case 'completed':
      return 'Job parsing completed!';
    case 'failed':
      return 'Job parsing failed';
    default:
      return 'Processing...';
  }
}