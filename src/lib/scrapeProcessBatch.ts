/** Admin Process queue and scrape-process cron size. Keep UI label in sync. */
export const PROCESS_QUEUE_BATCH = 10
export const PROCESS_QUEUE_BATCH_CAP = 15

/**
 * Stale dashboard JS can still POST `{ max: 6 }`. Never run fewer than
 * PROCESS_QUEUE_BATCH for an admin/cron process click.
 */
export function resolveProcessQueueBatch(requested: unknown): number {
  const n = typeof requested === 'number' && Number.isFinite(requested)
    ? Math.floor(requested)
    : PROCESS_QUEUE_BATCH
  return Math.min(PROCESS_QUEUE_BATCH_CAP, Math.max(PROCESS_QUEUE_BATCH, n))
}
