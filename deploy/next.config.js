/**
 * Production-only Next.js config. deploy.yml copies this over the root
 * next.config.js before the standalone build — prod is always root-served,
 * so the divergences from the root config below are INTENTIONAL, not drift.
 * Do not "sync" them blindly; each is load-bearing or behavior-neutral:
 *
 * - output: 'standalone' — the hybrid packaging strategy (package.sh) ships
 *   the standalone server; the root config instead uses distDir '.next_prod'.
 * - No basePath/rewrites() — prod serves at domain root with a root
 *   NEXTAUTH_URL, so the root config's subpath logic would evaluate to ''.
 *   The unconditional '/hrm' redirect matches the root config's root-serving
 *   branch exactly.
 * - env.TESTING only (no NEXT_PUBLIC_TESTING mapping) — keeps
 *   window.__TEST_CONTROLS__ uninstalled in production builds.
 * - No typescript.ignoreBuildErrors — deploy builds stay strict on types.
 * - No bundleAnalyzer wrapper — ANALYZE is never set during deploy.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  poweredByHeader: false,
  images: {
    // Serve AVIF/WebP to supporting browsers (Spotify artwork via next/image).
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
        port: '',
        pathname: '/image/**',
      },
    ],
  },
  output: 'standalone',
  env: {
    TESTING: process.env.TESTING,
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
      {
        source: '/hrm',
        destination: '/client/connect',
        permanent: true,
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
}

export default nextConfig
