// User-uploaded media (profile photos, documents) is served off the BACKEND
// origin — `lib/api.ts#resolveMediaUrl` builds those URLs from the origin of
// NEXT_PUBLIC_API_URL (protocol+host+port only, via the URL API), whatever
// path that base carries (`/api`, `/api/v1`, …). next/image refuses any host
// that isn't allowlisted here and throws "Invalid src prop", which breaks the
// whole page, so the allowlist is DERIVED from the same env var rather than
// hardcoded. A static list silently drifts the moment the backend moves
// (localhost → hosted IP → prod domain) and every user with a profile photo
// hits a blank screen.
// A scheme-less value (`localhost:5000/api/v1`, missing the `http://`) does
// NOT throw here — the WHATWG URL parser treats it as an opaque URL with an
// empty hostname, which would otherwise silently allowlist nothing (every
// profile photo then fails next/image's host check) with no build-time
// warning. Guarded explicitly below, alongside the genuinely-throwing case,
// so a misconfigured NEXT_PUBLIC_API_URL is loud in the build log.
const apiOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'
  try {
    const parsed = new URL(raw)
    if (!parsed.hostname) throw new Error('no scheme')
    return parsed
  } catch {
    console.error(
      `[next.config.js] NEXT_PUBLIC_API_URL ("${raw}") is missing its http:// ` +
        `or https:// scheme, so no media host could be determined. Falling ` +
        `back to http://localhost:5000 — profile photos and documents will ` +
        `not load until this is fixed.`
    )
    return new URL('http://localhost:5000')
  }
})()

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Emit a self-contained server build (.next/standalone) for lean Docker images.
  // Required by the Dockerfile in this repo. Has no effect on `next start` / `next dev`.
  output: 'standalone',

  // Do not fail the production build on ESLint errors — lint is run as a
  // separate dev/CI step (`npm run lint`). TypeScript type-checking still
  // runs during the build and WILL block on real type errors.
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Image optimization
  images: {
    // `domains` is deprecated; remotePatterns also pins the path, so only the
    // uploads directory of our own backend is proxyable — not any URL on that host.
    remotePatterns: [
      {
        protocol: apiOrigin.protocol.replace(':', ''),
        hostname: apiOrigin.hostname,
        ...(apiOrigin.port ? { port: apiOrigin.port } : {}),
        pathname: '/uploads/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // i18n is handled client-side via react-i18next (see src/i18n + Q-FE-05); the
  // pages-router `i18n` key is unsupported under the app router, so it is omitted.

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_NAME: 'Job Portal',
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            // microphone=() — audio was removed from the product, so nothing in
            // the app requests the mic. Denying it outright shrinks the attack
            // surface (and stops a browser prompt ever appearing).
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)'
          }
        ],
      },
    ]
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
