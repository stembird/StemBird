import cron, { ScheduledTask } from 'node-cron'
import { env } from './env'
import { runDiscover, runProcess, runSocial } from './jobs'

const running = new Set<string>()

async function guarded(name: string, fn: () => Promise<unknown>) {
  if (running.has(name)) {
    console.log(`[scheduler] ${name} already running, skipping tick`)
    return
  }
  running.add(name)
  const started = Date.now()
  try {
    console.log(`[scheduler] ${name} started`)
    const result = await fn()
    console.log(`[scheduler] ${name} finished in ${Date.now() - started}ms`, JSON.stringify(result))
  } catch (err) {
    console.error(`[scheduler] ${name} failed:`, err instanceof Error ? err.message : err)
  } finally {
    running.delete(name)
  }
}

export function startScheduler(): ScheduledTask[] {
  const tasks: ScheduledTask[] = []

  if (
    !cron.validate(env.cronDiscover) ||
    !cron.validate(env.cronProcess) ||
    !cron.validate(env.cronSocial)
  ) {
    throw new Error('Invalid WORKER_CRON_DISCOVER / WORKER_CRON_PROCESS / WORKER_CRON_SOCIAL expression')
  }

  tasks.push(cron.schedule(env.cronDiscover, () => guarded('discover', () => runDiscover())))
  tasks.push(cron.schedule(env.cronProcess, () => guarded('process', () => runProcess(env.processBatch))))
  tasks.push(cron.schedule(env.cronSocial, () => guarded('social', () => runSocial())))

  console.log(`[scheduler] discover: "${env.cronDiscover}"`)
  console.log(`[scheduler] process:  "${env.cronProcess}" (batch=${env.processBatch})`)
  console.log(`[scheduler] social:   "${env.cronSocial}" (3/channel/day via Buffer queue; runs before 08:00/12:30 EAT slots)`)
  console.log('[scheduler] running — press Ctrl+C to stop')

  return tasks
}
