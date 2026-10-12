import { env } from './env'
import { runDiscover, runEnrich, runProcess, runSocial } from './jobs'
import { startScheduler } from './scheduler'
import { startServer } from './server'

const mode = process.argv[2] || 'schedule'
const extra = process.argv[3]
const dryRun = process.argv.includes('--dry-run')

async function main() {
  switch (mode) {
    case 'discover': {
      const result = await runDiscover(extra || undefined)
      console.log(JSON.stringify(result, null, 2))
      // Exit non-zero so GitHub Actions marks a fully-failed run red instead
      // of green — success:false means every source errored or nothing queued.
      if (result.success === false) process.exit(1)
      break
    }

    case 'process': {
      const batch = extra ? parseInt(extra, 10) || 1 : env.processBatch
      console.log(`[worker] processing batch of ${batch}`)
      const result = await runProcess(batch)
      console.log(JSON.stringify(result, null, 2))
      // Fail loudly when the batch produced nothing (all items errored with no
      // publishes/duplicates), so outages show as red X instead of green no-ops.
      const madeProgress =
        (result.results || []).some(r => r.success || r.published || r.duplicates) ||
        (result.results || []).some(r => r.message === 'No pending jobs in queue')
      if (!madeProgress && (result.results || []).length > 0) process.exit(1)
      break
    }

    case 'enrich': {
      // tsx worker/src/index.ts enrich [scraped|sparse] [limit] [source_id]
      const enrichMode =
        extra === 'sparse' ? 'sparse' : extra === 'tips' ? 'tips' : 'scraped'
      const limit =
        parseInt(process.argv[4], 10) || (enrichMode === 'tips' ? 80 : 10)
      const sourceId = enrichMode === 'tips' ? undefined : process.argv[5]
      const days =
        enrichMode === 'tips' ? parseInt(process.argv[5], 10) || 7 : undefined
      const result = await runEnrich({ mode: enrichMode, limit, sourceId, days })
      console.log(JSON.stringify(result, null, 2))
      // Fail when every examined job errored with nothing updated/skipped.
      // Sparse mode returns results[] with per-job status; scraped mode
      // returns top-level counters — handle both shapes.
      const asCounters = result as {
        examined?: number
        updated?: number
        failed?: number
        skipped?: number
      }
      const asResults = result as { results?: Array<{ status?: string }> }
      const statuses = asResults.results ?? []
      const examined = asCounters.examined ?? statuses.length
      const updated = asCounters.updated ?? statuses.filter(s => s.status === 'updated').length
      const failed = asCounters.failed ?? statuses.filter(s => s.status === 'failed').length
      const skipped = asCounters.skipped ?? statuses.filter(s => s.status === 'skipped').length
      if (examined > 0 && updated === 0 && skipped === 0 && failed === examined) {
        process.exit(1)
      }
      break
    }

    case 'social': {
      const result = await runSocial({ dryRun })
      console.log(JSON.stringify(result, null, 2))
      const queued =
        result.queued.linkedin.length + result.queued.facebook.length + result.queued.instagram.length
      const selected =
        result.selected.linkedin.length + result.selected.facebook.length + result.selected.instagram.length
      // Skip (Buffer disconnected) and empty leftover slots are healthy no-ops.
      if (result.skipped) break
      if (!result.dry_run && selected > 0 && queued === 0 && result.failed.length === selected) {
        process.exit(1)
      }
      break
    }

    case 'schedule':
      startScheduler()
      startServer()
      // Keep the process alive for cron to fire
      setInterval(() => {}, 1 << 30)
      break

    case 'server':
      startServer()
      setInterval(() => {}, 1 << 30)
      break

    default:
      console.error(
        'Usage: tsx src/index.ts <discover|process [batch]|enrich [scraped|sparse] [limit] [source_id]|social [--dry-run]|schedule|server>'
      )
      process.exit(1)
  }
}

main().catch((err) => {
  console.error('[worker] fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
