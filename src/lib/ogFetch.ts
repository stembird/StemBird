/**
 * Bounded fetches for OG image generation.
 * Facebook's crawler gives up around 4–5s; unbounded logo/font/asset
 * requests are the usual reason a share card stays blank.
 */

export const OG_FETCH_TIMEOUT_MS = {
  logo: 800,
  asset: 2000,
  font: 2000,
} as const

export async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
