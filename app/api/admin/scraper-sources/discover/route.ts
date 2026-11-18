import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { runScrapeDiscover } from '@/lib/scrapeDiscover'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * POST /api/admin/scraper-sources/discover
 * Admin-only: run scrape discover for all active sources or one source.
 * Body: { source_id?: string }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const sourceId = typeof body.source_id === 'string' ? body.source_id : undefined

    // Soft budget under maxDuration so Vercel never returns an HTML timeout page
    const result = await runScrapeDiscover(auth.adminClient, {
      sourceId,
      budgetMs: 240_000,
    })

    // 502 when every source failed / zero yield with errors — admin UI treats !ok as failure.
    // Partial success (some sources OK) still returns 200 with sources_failed > 0.
    const status = result.success ? 200 : 502
    return NextResponse.json(result, { status })
  } catch (err: unknown) {
    // Extract error message with maximum defensive handling
    let message: string;
    if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === 'string') {
      message = err;
    } else if (err && typeof err === 'object') {
      // Try to extract message from object
      if ('message' in err && typeof (err as any).message === 'string') {
        message = (err as any).message;
      } else if ('error' in err && typeof (err as any).error === 'string') {
        message = (err as any).error;
      } else {
        // Last resort: stringify the object
        try {
          message = JSON.stringify(err);
        } catch {
          message = 'Unknown error occurred';
        }
      }
    } else {
      message = 'Unknown error occurred';
    }
    
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('[admin/scraper-sources/discover] Error:', message);
    console.error('[admin/scraper-sources/discover] Raw error:', err);
    if (stack) console.error('[admin/scraper-sources/discover] Stack:', stack);
    
    return NextResponse.json({ 
      error: message,
      success: false,
      ...(process.env.NODE_ENV === 'development' && stack ? { stack } : {})
    }, { status: 500 });
  }
}
