import { NextRequest, NextResponse } from 'next/server'

/** Career tips backfill is disabled. Ingest-time generation is unchanged. */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function authorize(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

async function handle(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    mode: 'tips',
    disabled: true,
    scanned: 0,
    missing: 0,
    examined: 0,
    updated: 0,
    failed: 0,
    remaining: 0,
    timestamp: new Date().toISOString(),
  })
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
