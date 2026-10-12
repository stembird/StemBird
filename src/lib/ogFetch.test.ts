/**
 * Run: npx tsx src/lib/ogFetch.test.ts
 */
import assert from 'node:assert/strict'
import http from 'node:http'
import { fetchWithTimeout } from './ogFetch'

const server = http.createServer(() => {
  // Never respond — the client must abort via timeout.
})

await new Promise<void>((resolve) => {
  server.listen(0, '127.0.0.1', () => resolve())
})

try {
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  const url = `http://127.0.0.1:${address.port}/hang`
  const started = Date.now()
  await assert.rejects(
    () => fetchWithTimeout(url, 80),
    (err: unknown) => {
      assert.ok(err instanceof Error)
      return true
    },
  )
  const elapsed = Date.now() - started
  assert.ok(elapsed < 1500, `timeout should abort quickly, took ${elapsed}ms`)
} finally {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })
}

console.log('ogFetch.test.ts: all assertions passed')
