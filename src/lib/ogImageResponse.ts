/**
 * Headers / responses for job OG PNGs.
 *
 * Facebook often HEADs an og:image URL before GET. If HEAD runs the full
 * @vercel/og render (3–6s on a cache miss), the crawler times out and the
 * post shows a blank image slot. HEAD must return image/png immediately.
 */

export const OG_IMAGE_CACHE_CONTROL =
  'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800'

/** HEAD must not share GET's long CDN cache — an empty HEAD would poison the PNG. */
export const OG_IMAGE_HEAD_CACHE_CONTROL = 'private, no-store'

export const OG_IMAGE_CONTENT_TYPE = 'image/png'

export const OG_IMAGE_DISPOSITION = 'inline; filename="job-card.png"'

export function ogImageHeaders(extra?: Record<string, string>): Headers {
  const headers = new Headers()
  headers.set('Content-Type', OG_IMAGE_CONTENT_TYPE)
  headers.set('Cache-Control', OG_IMAGE_CACHE_CONTROL)
  headers.set('Content-Disposition', OG_IMAGE_DISPOSITION)
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      headers.set(key, value)
    }
  }
  return headers
}

/** Fast HEAD for crawlers — do not generate the PNG, and do not cache emptiness. */
export function ogImageHeadResponse(): Response {
  return new Response(null, {
    status: 200,
    headers: ogImageHeaders({
      'Cache-Control': OG_IMAGE_HEAD_CACHE_CONTROL,
      'CDN-Cache-Control': OG_IMAGE_HEAD_CACHE_CONTROL,
      'Vercel-CDN-Cache-Control': OG_IMAGE_HEAD_CACHE_CONTROL,
    }),
  })
}

/**
 * Buffer the ImageResponse body so Facebook gets Content-Length instead of
 * a chunked stream (another common cause of blank link-preview images).
 */
export async function finalizeOgPngResponse(image: Response): Promise<Response> {
  const body = await image.arrayBuffer()
  return new Response(body, {
    status: image.status,
    headers: ogImageHeaders({
      'Content-Length': String(body.byteLength),
    }),
  })
}
