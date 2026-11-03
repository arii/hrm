import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/**
 * Optional subpath serving (e.g. '/hrm' when proxied under a subpath).
 * '' (default) preserves root serving for local dev and production.
 * Explicit NEXT_PUBLIC_BASE_PATH wins, else derived from NEXTAUTH_URL so
 * OAuth callbacks and routing agree. Runtime code must use getBasePath()
 * in utils/urls.ts (same rule) instead of reading env directly.
 * NOTE: NextAuth v4 replaces (not prefixes) its internal /api/auth path with
 * any NEXTAUTH_URL subpath, generating {subpath}/callback/{provider} (see
 * parseUrl in node_modules/next-auth/src/utils/parse-url.ts). rewrites()
 * maps that generated path back onto the real [...nextauth] route.
 */
const basePath = (
  process.env.NEXT_PUBLIC_BASE_PATH ||
  (() => {
    try {
      return new URL(process.env.NEXTAUTH_URL || '').pathname
    } catch {
      return ''
    }
  })()
).replace(/\/$/, '')

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath,
  distDir: process.env.NODE_ENV === 'production' ? '.next_prod' : '.next',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
        port: '',
        pathname: '/image/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_TESTING: process.env.TESTING ?? process.env.NEXT_PUBLIC_TESTING,
  },
  async redirects() {
    return [
      {
        source: '/phone',
        destination: '/client/control',
        permanent: true,
      },
      {
        source: '/control',
        destination: '/client/control',
        permanent: true,
      },
      {
        source: '/connect',
        destination: '/client/connect',
        permanent: true,
      },
      {
        source: '/mock',
        destination: '/client/mock',
        permanent: true,
      },
      // Root serving only: under a basePath '/hrm' is the app root itself,
      // so this shortcut would be nonsense there (production unaffected).
      ...(!basePath
        ? [
            {
              source: '/hrm',
              destination: '/client/connect',
              permanent: true,
            },
          ]
        : []),
    ]
  },
  async rewrites() {
    // Only when serving under a subpath: route NextAuth's generated
    // {subpath}/callback/* onto the real [...nextauth] handler.
    // Empty (no-op) for root serving.
    if (!basePath) return []
    return [
      {
        source: '/callback/:path*',
        destination: '/api/auth/callback/:path*',
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/api/auth/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream', 'ws'],
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // We delegate type checking to a separate parallel CI job for better performance.
    // !! WARN !!
    ignoreBuildErrors: process.env.IGNORE_BUILD_ERRORS === 'true',
  },
}

export default withBundleAnalyzer(nextConfig)
