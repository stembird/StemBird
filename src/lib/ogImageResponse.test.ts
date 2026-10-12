/**
 * Run: npx tsx src/lib/ogImageResponse.test.ts
 */
import assert from 'node:assert/strict'
import {
  OG_IMAGE_CACHE_CONTROL,
  OG_IMAGE_CONTENT_TYPE,
  finalizeOgPngResponse,
  ogImageHeadResponse,
} from './ogImageResponse'

{
  const res = ogImageHeadResponse()
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-type'), OG_IMAGE_CONTENT_TYPE)
  assert.equal(res.headers.get('content-disposition'), 'inline; filename="job-card.png"')
  assert.match(
    (res.headers.get('cache-control') || '').toLowerCase(),
    /no-store/,
    'HEAD must not share GET CDN cache or an empty body poisons the PNG'
  )
  assert.equal(res.body, null, 'HEAD must not generate a PNG body')
}

{
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  const streamed = new Response(png, {
    status: 200,
    headers: { 'Content-Type': 'image/png' },
  })
  const res = await finalizeOgPngResponse(streamed)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-type'), 'image/png')
  assert.equal(res.headers.get('content-length'), String(png.byteLength))
  assert.equal(res.headers.get('cache-control'), OG_IMAGE_CACHE_CONTROL)
  const body = new Uint8Array(await res.arrayBuffer())
  assert.deepEqual(Array.from(body), Array.from(png))
}

console.log('ogImageResponse.test.ts: all assertions passed')
