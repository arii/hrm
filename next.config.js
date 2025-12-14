import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/**
 * @returns {Promise<import('next').NextConfig>}
 */
async function createConfig() {
  const { env } = await import('./lib/env.js')

  /** @type {import('next').NextConfig} */
  const nextConfig = {
    output: 'standalone',
    env: {
      TESTING: `${env.TESTING}`,
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

  return withBundleAnalyzer(nextConfig)
}

export default createConfig
