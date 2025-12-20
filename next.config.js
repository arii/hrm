import { env, publicEnv } from '@/lib/env.js' // Early validation of environment variables
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    ...publicEnv,
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

export default withBundleAnalyzer(nextConfig)
