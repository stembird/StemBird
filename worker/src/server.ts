import http from 'http'
import { env } from './env'
import { runDiscover, runProcess, runSocial } from './jobs'

function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 1_000_000) req.destroy()
    })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        resolve({})
      }
    })
    req.on('error', () => resolve({}))
  })
}

function send(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

export function startServer() {
  if (!env.httpPort) {
    console.log('[server] WORKER_HTTP_PORT not set — HTTP trigger disabled')
    return
  }

  const server = http.createServer(async (req, res) => {
    const secret = req.headers['x-worker-secret']
    if (env.workerSecret && secret !== env.workerSecret) {
      return send(res, 401, { error: 'Unauthorized' })
    }

    const url = req.url || '/'
    const path = url.split('?')[0]
    const method = req.method || 'GET'

    try {
      if (method === 'POST' && path === '/discover') {
        const body = await readBody(req)
        const result = await runDiscover(typeof body.source_id === 'string' ? body.source_id : undefined)
        return send(res, 200, result)
      }

      if (method === 'POST' && path === '/process') {
        const body = await readBody(req)
        const max = typeof body.max === 'number' ? body.max : env.processBatch
        const result = await runProcess(max)
        return send(res, 200, result)
      }

      if (method === 'POST' && path === '/social') {
        const body = await readBody(req)
        const result = await runSocial({ dryRun: body.dry_run === true })
        return send(res, 200, result)
      }

      if (method === 'GET' && path === '/health') {
        return send(res, 200, { ok: true, ts: new Date().toISOString() })
      }

      return send(res, 404, { error: 'Not found' })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[server] handler error:', message)
      return send(res, 500, { error: message })
    }
  })

  server.listen(env.httpPort, () => {
    console.log(`[server] HTTP trigger listening on :${env.httpPort}`)
  })

  server.on('error', (err) => {
    console.error('[server] failed to start:', err.message)
  })
}
