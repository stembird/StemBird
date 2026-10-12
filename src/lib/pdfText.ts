/**
 * Extract plain text from a PDF buffer (Node.js / serverless).
 *
 * pdf-parse → pdfjs-dist expects browser canvas globals (DOMMatrix, etc.).
 * On Vercel those are missing unless we polyfill from @napi-rs/canvas
 * *before* pdfjs evaluates.
 */

let polyfillsReady: Promise<void> | null = null

async function ensurePdfDomPolyfills(): Promise<void> {
  if (polyfillsReady) return polyfillsReady

  polyfillsReady = (async () => {
    // Use a loose bag — @napi-rs/canvas DOMMatrix is not identical to DOM lib types.
    const g = globalThis as Record<string, unknown>

    if (typeof g.DOMMatrix === 'function') return

    try {
      const canvas = await import('@napi-rs/canvas')
      if (canvas.DOMMatrix) g.DOMMatrix = canvas.DOMMatrix
      if (canvas.ImageData) g.ImageData = canvas.ImageData
      if (canvas.Path2D) g.Path2D = canvas.Path2D
    } catch (err) {
      console.warn(
        '[pdfText] @napi-rs/canvas unavailable; installing minimal DOMMatrix stub',
        err instanceof Error ? err.message : err
      )
      // Enough for pdfjs module init; text extraction may still succeed.
      class DOMMatrixStub {
        constructor(_init?: unknown) {}
        multiplySelf() {
          return this
        }
        preMultiplySelf() {
          return this
        }
        invertSelf() {
          return this
        }
        translateSelf() {
          return this
        }
        scaleSelf() {
          return this
        }
        translate() {
          return this
        }
        scale() {
          return this
        }
        multiply() {
          return this
        }
        inverse() {
          return this
        }
      }
      g.DOMMatrix = DOMMatrixStub
    }

    if (typeof g.DOMMatrix !== 'function') {
      throw new Error('DOMMatrix polyfill failed; cannot parse PDFs in this runtime')
    }
  })()

  return polyfillsReady
}

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  await ensurePdfDomPolyfills()
  // Dynamic import so discover routes never load pdfjs at module eval time.
  // setWorker(getData()) inlines the worker as a data: URL — required on Vercel
  // where pdf.worker.mjs is often missing from the serverless bundle
  // ("Setting up fake worker failed: Cannot find module .../pdf.worker.mjs").
  const [{ PDFParse }, { getData }] = await Promise.all([
    import('pdf-parse'),
    import('pdf-parse/worker'),
  ])
  PDFParse.setWorker(getData())
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return result.text?.trim() || ''
  } finally {
    await parser.destroy()
  }
}

export async function downloadPdfBuffer(url: string): Promise<Buffer> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; careersasa-scraper/1.0)',
        Accept: 'application/pdf,*/*',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to download PDF (${response.status}): ${url}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } finally {
    clearTimeout(timeout)
  }
}
