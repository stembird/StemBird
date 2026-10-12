/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qxuvqrfqkdpfjfwkqatf.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'randomuser.me',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
      },
      {
        protocol: 'https',
        hostname: 't1.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'img.logo.dev',
      },
      {
        protocol: 'https',
        hostname: 'unavatar.io',
      },
    ],
  },
  // PDF parsing (server-only). Keep canvas external so the native binary
  // is available at runtime on Vercel (needed for pdfjs DOMMatrix polyfill).
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', '@napi-rs/canvas'],
  // Ensure native canvas + pdfjs worker files are traced into serverless
  // functions that parse PSC PDFs. Discover no longer loads pdf-parse.
  outputFileTracingIncludes: {
    '/api/admin/scraper-sources/**/*': [
      './node_modules/@napi-rs/canvas/**/*',
      './node_modules/@napi-rs/canvas-linux-x64-gnu/**/*',
      './node_modules/@napi-rs/canvas-linux-x64-musl/**/*',
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs',
      './node_modules/pdf-parse/dist/worker/**/*',
    ],
    '/api/cron/scrape-process/**/*': [
      './node_modules/@napi-rs/canvas/**/*',
      './node_modules/@napi-rs/canvas-linux-x64-gnu/**/*',
      './node_modules/@napi-rs/canvas-linux-x64-musl/**/*',
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs',
      './node_modules/pdf-parse/dist/worker/**/*',
    ],
    '/api/scrape-jobs/**/*': [
      './node_modules/@napi-rs/canvas/**/*',
      './node_modules/@napi-rs/canvas-linux-x64-gnu/**/*',
      './node_modules/@napi-rs/canvas-linux-x64-musl/**/*',
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs',
      './node_modules/pdf-parse/dist/worker/**/*',
    ],
  },
  // Disable x-powered-by header
  poweredByHeader: false,
  // Add empty turbopack config to resolve conflict
  turbopack: {},
  // Exclude old pages from TypeScript checking
  typescript: {
    ignoreBuildErrors: false,
  },
  // Handle trailing slashes consistently
  trailingSlash: false,
  // Skip trailing slash redirect for better compatibility
  skipTrailingSlashRedirect: false,
  async rewrites() {
    return [
      { source: '/og/jobs/:id.png', destination: '/api/og/job/:id' },
      { source: '/og/scholarships/:id.png', destination: '/api/og/job/:id' },
    ]
  },
  // Add headers to prevent Facebook WebView caching issues
  async headers() {
    return [
      {
        source: '/og/jobs/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'image/png',
          },
          {
            key: 'Content-Disposition',
            value: 'inline; filename="job-card.png"',
          },
        ],
      },
      {
        source: '/og/scholarships/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'image/png',
          },
          {
            key: 'Content-Disposition',
            value: 'inline; filename="scholarship-card.png"',
          },
        ],
      },
      {
        source: '/dashboard/admin/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
}

export default nextConfig;