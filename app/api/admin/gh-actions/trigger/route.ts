import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'

export const runtime = 'nodejs'

const OWNER = 'CareerSasaKenya'
const REPO = 'careerninja'
const BASE_REF = 'main'

const WORKFLOWS = {
  discover: { file: 'discover.yml' },
  process: { file: 'process.yml' },
  enrich: { file: 'enrich.yml' },
  social: { file: 'social.yml' },
} as const

type Action = keyof typeof WORKFLOWS

/**
 * POST /api/admin/gh-actions/trigger
 * Admin-only: dispatch a scraper workflow on GitHub Actions so heavy scraping
 * runs off-Vercel. Requires a GitHub Personal Access Token with the `workflow`
 * scope stored as GITHUB_ACTIONS_TOKEN in the Vercel app env.
 *
 * Body:
 *   action:     'discover' | 'process' | 'enrich' | 'social'
 *   source_id?: string               (discover / enrich-scraped)
 *   max?:       number               (process)
 *   mode?:      'scraped' | 'sparse' (enrich)
 *   limit?:     number               (enrich)
 *   dry_run?:   boolean              (social)
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const token = process.env.GITHUB_ACTIONS_TOKEN
  if (!token) {
    return NextResponse.json(
      {
        error:
          'GitHub Actions dispatch is not configured: GITHUB_ACTIONS_TOKEN is missing on the server.',
      },
      { status: 503 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const action = body.action as Action
  const workflow = WORKFLOWS[action]
  if (!workflow) {
    return NextResponse.json(
      { error: 'Unknown action. Use "discover", "process", "enrich", or "social".' },
      { status: 400 }
    )
  }

  const inputs: Record<string, string> = {}
  if (typeof body.source_id === 'string' && body.source_id.trim()) {
    inputs.source_id = body.source_id.trim()
  }
  if (action === 'process' && typeof body.max === 'number' && body.max > 0) {
    inputs.max = String(Math.min(Math.max(1, body.max), 25))
  }
  if (action === 'enrich') {
    if (body.mode === 'sparse' || body.mode === 'scraped') inputs.mode = body.mode
    if (typeof body.limit === 'number' && body.limit > 0) {
      inputs.limit = String(Math.min(Math.max(1, body.limit), 15))
    }
  }
  if (action === 'social' && body.dry_run === true) {
    inputs.dry_run = 'true'
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${workflow.file}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({ ref: BASE_REF, inputs }),
      }
    )

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[gh-actions/trigger] dispatch failed:', res.status, detail)
      return NextResponse.json(
        {
          error: `GitHub Actions dispatch failed (HTTP ${res.status}). Check GITHUB_ACTIONS_TOKEN has the workflow scope and ${workflow.file} exists on ${BASE_REF}.`,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      action,
      dispatched_workflow: workflow.file,
      inputs,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[gh-actions/trigger] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
